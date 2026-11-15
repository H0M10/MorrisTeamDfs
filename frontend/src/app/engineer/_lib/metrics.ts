import type { CqrPoint } from "./types";

function assertValidPoints(points: readonly CqrPoint[]): void {
  for (const point of points) {
    if (
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.lo) ||
      !Number.isFinite(point.hi) ||
      point.hi < point.lo
    ) {
      throw new RangeError("CQR points must contain finite values with hi >= lo.");
    }
  }
}

export function empiricalCoverage(points: readonly CqrPoint[]): number | null {
  assertValidPoints(points);
  if (points.length === 0) return null;
  const covered = points.filter((point) => point.y >= point.lo && point.y <= point.hi).length;
  return covered / points.length;
}

export function meanWidth(points: readonly CqrPoint[]): number | null {
  assertValidPoints(points);
  if (points.length === 0) return null;
  return points.reduce((total, point) => total + point.hi - point.lo, 0) / points.length;
}
