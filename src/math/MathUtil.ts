import { Ellipsoid } from "../geographic";
import { ELLIPSOID_LONG_RADIUS, ELLIPSOID_SHORT_RADIUS } from "../config";
import { Extend } from "./Extend";
import { Geodetic2 } from "./Geodetic2";
import { Geodetic3 } from "./Geodetic3";
import { Vector2 } from "./Vector2";
import { Vector3 } from "./Vector3";

/**
 * Common utility methods for math operations.
 */
export class MathUtil {
  /** The value for which all absolute numbers smaller than are considered equal to zero. */
  static readonly zeroTolerance: number = 1e-6;
  /** The conversion factor that radian to degree. */
  static readonly radToDegreeFactor: number = 180 / Math.PI;
  /** The conversion factor that degree to radian. */
  static readonly degreeToRadFactor: number = Math.PI / 180;

  /**
   * Clamps the specified value.
   * @param v - The specified value
   * @param min - The min value
   * @param max - The max value
   * @returns The result of clamping a value between min and max
   */
  static clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  /**
   * Checks if a and b are almost equals.
   * The absolute value of the difference between a and b is close to zero.
   * @param a - The left value to compare
   * @param b - The right value to compare
   * @returns True if a almost equal to b, false otherwise
   */
  static equals(a: number, b: number): boolean {
    return Math.abs(a - b) <= MathUtil.zeroTolerance;
  }

  /**
   * Determines whether the specified v is pow2.
   * @param v - The specified v
   * @returns True if the specified v is pow2, false otherwise
   */
  static isPowerOf2(v: number): boolean {
    return (v & (v - 1)) === 0;
  }

  /**
   * Modify the specified r from radian to degree.
   * @param r - The specified r
   * @returns The degree value
   */
  static radianToDegree(r: number): number {
    return r * MathUtil.radToDegreeFactor;
  }

  /**
   * Modify the specified d from degree to radian.
   * @param d - The specified d
   * @returns The radian value
   */
  static degreeToRadian(d: number): number {
    return d * MathUtil.degreeToRadFactor;
  }

  /**
   * According the tile row and column get the web mercator extend.
   * @param level LOD tile level
   * @param row Tile row
   * @param col Tile column
   * @returns The tile extend
   */
  static gridToWebMercator(level: number, row: number, col: number) {
    const k = Math.PI * ELLIPSOID_LONG_RADIUS;
    const size = (2 * k) / Math.pow(2, level);
    const minX = -k + col * size;
    const maxX = minX + size;
    const maxY = k - row * size;
    const minY = maxY - size;
    const min = new Vector2(minX, minY);
    const max = new Vector2(maxX, maxY);
    return new Extend(min, max);
  }

  /**
   * Returns the corresponding geodetic coordinates based on Mercator coordinates.
   * @param mercator Web mercator coordinate
   * @returns The geodetic coordinate
   */
  static webMercatorToGeodetic(mercator: Vector2): Geodetic2 {
    const radLon = mercator.x / ELLIPSOID_LONG_RADIUS;
    const a = mercator.y / ELLIPSOID_LONG_RADIUS;
    const b = Math.pow(Math.E, a);
    const c = Math.atan(b);
    const radLat = 2 * c - Math.PI / 2;
    // TODO: 待优化，Geodetic2应该也有弧度制的构造函数;
    return new Geodetic2(MathUtil.radianToDegree(radLon), MathUtil.radianToDegree(radLat));
  }

  /**
   * Cartesian coordinates corresponding to 2D or 3D geographic coordinates.
   * @param geodetic 2D or 3D geodetic coordinates
   * @returns Cartesian coordinates
   */
  static geodeticToCartesian(geodetic: Geodetic2 | Geodetic3) {
    let height: number;
    if (geodetic instanceof Geodetic2) {
      height = 0;
    } else {
      height = geodetic.height;
    }

    const n = MathUtil.geodeticSurfaceNormal(geodetic);
    const radiiSquared = new Vector3(
      ELLIPSOID_LONG_RADIUS * ELLIPSOID_LONG_RADIUS,
      ELLIPSOID_LONG_RADIUS * ELLIPSOID_LONG_RADIUS,
      ELLIPSOID_SHORT_RADIUS * ELLIPSOID_SHORT_RADIUS
    );
    const k = new Vector3();

    Vector3.multiply(radiiSquared, n, k);
    const gamma = Math.sqrt(k.x * n.x + k.y * n.y + k.z * n.z);
    k.scale(1 / gamma);

    return k.add(n.scale(height));
  }

  /**
   * Calculate surface normals from geodetic coordinates.
   * @param geodetic Geodetic2 or Geodetic3
   * @returns The surface normal for this geographic coordinate
   */
  static geodeticSurfaceNormal(geodetic: Geodetic2 | Geodetic3): Vector3 {
    const cosLat = Math.cos(geodetic.radLat);
    return new Vector3(
      cosLat * Math.cos(geodetic.radLon),
      cosLat * Math.sin(geodetic.radLon),
      Math.sin(geodetic.radLat)
    );
  }

  /**
   * Scales a point in a Cartesian coordinate system onto the surface of an ellipsoid according to the geocentric normal.
   * @param ellipsoid Ellipsoid datum
   * @param position Cartesian point
   * @returns Ellipsoid surface point
   */
  static scaleToGeocentricSurface(ellipsoid: Ellipsoid, position: Vector3): Vector3 {
    const beta =
      1.0 /
      Math.sqrt(
        position.x * position.x * ellipsoid.oneOverRadiiSquared.x +
          position.y * position.y * ellipsoid.oneOverRadiiSquared.y +
          position.z * position.z * ellipsoid.oneOverRadiiSquared.z
      );
    return position.clone().scale(beta);
  }

  /**
   * Scales a point in a Cartesian coordinate system onto the surface of an ellipsoid according to the surface normal.
   * @param ellipsoid Ellipsoid datum
   * @param position Cartesian point
   * @returns Ellipsoid surface point
   */
  static scaleToGeodeticSufrace(ellipsoid: Ellipsoid, position: Vector3): Vector3 {
    const beta =
      1.0 /
      Math.sqrt(
        position.x * position.x * ellipsoid.oneOverRadiiSquared.x +
          position.y * position.y * ellipsoid.oneOverRadiiSquared.y +
          position.z * position.z * ellipsoid.oneOverRadiiSquared.z
      );
    const n = new Vector3(
      beta * position.x * ellipsoid.oneOverRadiiSquared.x,
      beta * position.y * ellipsoid.oneOverRadiiSquared.y,
      beta * position.z * ellipsoid.oneOverRadiiSquared.z
    ).length();
    let alpha = (1.0 - beta) * (position.length() / n);

    const x2 = position.x * position.x;
    const y2 = position.y * position.y;
    const z2 = position.z * position.z;

    let da = 0.0;
    let db = 0.0;
    let dc = 0.0;

    let s = 0.0;
    let dSdA = 1.0;

    do {
      alpha -= s / dSdA;

      da = 1.0 + alpha * ellipsoid.oneOverRadiiSquared.x;
      db = 1.0 + alpha * ellipsoid.oneOverRadiiSquared.y;
      dc = 1.0 + alpha * ellipsoid.oneOverRadiiSquared.z;

      const da2 = da * da;
      const db2 = db * db;
      const dc2 = dc * dc;

      const da3 = da * da2;
      const db3 = db * db2;
      const dc3 = dc * dc2;

      s =
        x2 / (ellipsoid.radiiSquared.x * da2) +
        y2 / (ellipsoid.radiiSquared.y * db2) +
        z2 / (ellipsoid.radiiSquared.z * dc2) -
        1.0;

      dSdA =
        -2.0 *
        (x2 / (ellipsoid.radiiToTheFourth.x * da3) +
          y2 / (ellipsoid.radiiToTheFourth.y * db3) +
          z2 / (ellipsoid.radiiToTheFourth.z * dc3));
    } while (Math.abs(s) > 1e-10);

    return new Vector3(position.x / da, position.y / db, position.z / dc);
  }
}
