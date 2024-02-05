import Point from "@mapbox/point-geometry";

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
