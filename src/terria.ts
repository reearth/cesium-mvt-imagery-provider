/**
 * These functions are referred from TerriaJS.
 * https://github.com/TerriaJS/terriajs/blob/d639269644ab7f6aa9f1670fd20c77dfc63f504f/lib/Map/ImageryProvider/MapboxVectorTileImageryProvider.ts#L578-L635
 */

import Point from "@mapbox/point-geometry";
import { WindingOrder } from "cesium";

function isExteriorRing(ring: Point[]) {
  // Normally an exterior ring would be clockwise but because these coordinates are in "canvas space" the ys are inverted
  // hence check for counter-clockwise ring
  const windingOrder = computeRingWindingOrder(ring) as unknown as WindingOrder;
  return windingOrder === WindingOrder.COUNTER_CLOCKWISE;
}

// Adapted from npm package "point-in-polygon" by James Halliday
// Licence included in LICENSE.md
function inside(point: Point, vs: Point[]) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  const x = point.x,
    y = point.y;

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x,
      yi = vs[i].y;
    const xj = vs[j].x,
      yj = vs[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// According to the Mapbox Vector Tile specifications, a polygon consists of one exterior ring followed by 0 or more interior rings. Therefore:
// for each ring:
//   if point in ring:
//     for each interior ring (following the exterior ring):
//       check point in interior ring
//     if point not in any interior rings, feature is clicked
export function isFeatureClicked(rings: Point[][], point: Point) {
  for (let i = 0; i < rings.length; i++) {
    if (inside(point, rings[i])) {
      // Point is in an exterior ring
      // Check whether point is in any interior rings
      let inInteriorRing = false;
      while (i + 1 < rings.length && !isExteriorRing(rings[i + 1])) {
        i++;
        if (!inInteriorRing && inside(point, rings[i])) {
          inInteriorRing = true;
          // Don't break. Still need to iterate over the rest of the interior rings but don't do point-in-polygon tests on those
        }
      }
      // Point is in exterior ring, but not in any interior ring. Therefore point is in the feature region
      if (!inInteriorRing) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Determine the winding order of a polygon ring.
 * See https://github.com/mapbox/vector-tile-spec/tree/master/2.0#4344-polygon-geometry-type && https://en.wikipedia.org/wiki/Shoelace_formula
 * @param  {Point[]} ring The polygon ring as an array of '@mapbox/point-geometry' Points (or any points conforming to {x: number, y: number}).
 * @return {WindingOrder} The winding order of the polygon ring.
 */
function computeRingWindingOrder(ring: Point[]): WindingOrder {
  const n = ring.length;
  let twiceArea =
    ring[n - 1].x * (ring[0].y - ring[n - 2].y) + ring[0].x * (ring[1].y - ring[n - 1].y);
  for (let i = 1; i <= n - 2; i++) {
    twiceArea += ring[i].x * (ring[i + 1].y - ring[i - 1].y);
  }
  if (isNaN(twiceArea)) {
    throw new Error();
  }
  return twiceArea > 0.0 ? WindingOrder.COUNTER_CLOCKWISE : WindingOrder.CLOCKWISE;
}
