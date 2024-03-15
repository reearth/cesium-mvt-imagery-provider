import { TileCoordinates, URLTemplate } from "./types";
import Point from "@mapbox/point-geometry";
import md5 from "js-md5";

export const buildURLWithTileCoordinates = (template: URLTemplate, tile: TileCoordinates) => {
  const decodedTemplate = decodeURIComponent(template);
  const z = decodedTemplate.replace("{z}", String(tile.level));
  const x = z.replace("{x}", String(tile.x));
  const y = x.replace("{y}", String(tile.y));
  return y;
};

/**
 * Often we want to make an array of keys of an object type,
 * but if we just specify the key names directly, we may forget to change the array if the object type is changed.
 * With this function, the compiler checks the object keys for completeness, so the array of keys is always up to date.
 */
export function objKeys<T extends string | number | symbol>(obj: { [k in T]: 1 }): T[] {
  return Object.keys(obj) as T[];
}

export function defined(value: any) {
  return value !== undefined && value !== null;
}

export function defaultValue(a: any, b: any) {
  if (a !== undefined && a !== null) {
    return a;
  }
  return b;
}

const tempPoint = new Point(0, 0);

export function isPointClicked(feature: Point[][], clicked: Point, radius: number): boolean {
  if (feature.length === 0 || feature[0].length === 0) return false;
  const point = feature[0][0];
  const distSquared = point.distSqr(clicked);
  return distSquared <= radius ** 2;
}

export function isLineStringClicked(feature: Point[][], mouse: Point, lineWidth: number): boolean {
  if (feature.length === 0) return false;
  const points = feature[0];
  const dist = lineWidth / 2;

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (isLineSegmentClicked(start, end, mouse, dist, tempPoint)) {
      return true;
    }
  }

  return false;
}

function isLineSegmentClicked(
  start: Point,
  end: Point,
  mouse: Point,
  dist: number,
  tempPoint = new Point(0, 0),
): boolean {
  const lineLengthSquared = start.distSqr(end);
  if (lineLengthSquared === 0) return false;

  const t =
    ((mouse.x - start.x) * (end.x - start.x) + (mouse.y - start.y) * (end.y - start.y)) /
    lineLengthSquared;
  const tClamped = Math.max(0, Math.min(1, t));

  const nearest = tempPoint;
  nearest.x = start.x + tClamped * (end.x - start.x);
  nearest.y = start.y + tClamped * (end.y - start.y);

  const distanceSquared = mouse.distSqr(nearest);
  return distanceSquared <= dist ** 2;
}

export const generateIDWithMD5 = (id: string) => {
  const hash = md5.create();
  hash.update(id);

  return hash.hex();
};
