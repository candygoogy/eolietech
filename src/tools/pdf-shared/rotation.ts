/** Any angle in degrees -> 0 | 90 | 180 | 270 (snapped to the nearest quarter turn). Dependency-free. */
export const normaliseAngle = (angle: number): number => (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
