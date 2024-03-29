import { Ellipsoid } from "../geographic";
import { Geodetic2 } from "./Geodetic2";
import { Geodetic3 } from "./Geodetic3";
import { Matrix } from "./Matrix";
import { Vector3 } from "./Vector3";

interface RayIntersect {
  intersects: boolean;
  near: number;
  far: number;
}

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

  static geodeticSurfaceNormal(geodetic: Geodetic2 | Geodetic3): Vector3;

  static geodeticSurfaceNormal(vector3: Vector3, ellipsoid: Ellipsoid): Vector3;

  /**
   * Calculate surface normals from geodetic coordinates.
   * @param geodetic Geodetic2 or Geodetic3
   * @returns The surface normal for this geographic coordinate
   */
  static geodeticSurfaceNormal(geodeticOrVector3: Vector3 | Geodetic2 | Geodetic3, ellipsoid?: Ellipsoid): Vector3 {
    let res = new Vector3();
    if (geodeticOrVector3 instanceof Vector3) {
      Vector3.multiply(geodeticOrVector3, ellipsoid.oneOverRadiiSquared, res);
    } else {
      const cosLat = Math.cos(geodeticOrVector3.radLat);
      res = new Vector3(
        cosLat * Math.cos(geodeticOrVector3.radLon),
        cosLat * Math.sin(geodeticOrVector3.radLon),
        Math.sin(geodeticOrVector3.radLat)
      );
    }
    return res.normalize();
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

  /**
   * Using ray tracing to find the intersection point of ray and ellipsoid.
   * @param rayOrigin The ray origin position
   * @param rayOriginSquared The ray origin position squared
   * @param rayDirection The ray direction and need to normal
   * @param oneOverEllipsoidRadiiSquared The inverse of the square of the radius of the ellipsoid
   * @returns Intersection information
   */
  static rayIntersectEllipsoid(
    rayOrigin: Vector3,
    rayOriginSquared: Vector3,
    rayDirection: Vector3,
    oneOverEllipsoidRadiiSquared: Vector3
  ): RayIntersect {
    const tmp1 = new Vector3();
    Vector3.multiply(rayDirection, rayDirection, tmp1);
    const tmp2 = new Vector3();
    Vector3.multiply(rayOrigin, rayDirection, tmp2);
    const a = Vector3.dot(tmp1, oneOverEllipsoidRadiiSquared);
    const b = 2.0 * Vector3.dot(tmp2, oneOverEllipsoidRadiiSquared);
    const c = Vector3.dot(rayOriginSquared, oneOverEllipsoidRadiiSquared) - 1.0;
    const discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) {
      return {
        intersects: false,
        near: 0.0,
        far: 0.0,
      };
    } else if (discriminant == 0.0) {
      const time = (-0.5 * b) / a;
      return {
        intersects: true,
        near: time,
        far: time,
      };
    }
    const t = -0.5 * (b + (b > 0.0 ? 1.0 : -1.0) * Math.sqrt(discriminant));
    const root1 = t / a;
    const root2 = c / t;
    return {
      intersects: true,
      near: Math.min(root1, root2),
      far: Math.max(root1, root2),
    };
  }

  /**
   * Points in the right-hand coordinate system are transferred to the geographic coordinate system.
   * @param position Points in the right-hand coordinate system
   * @returns Coordinates in geographic coordinate system
   */
  static rightToGeographic(position: Vector3) {
    return new Vector3(position.z, position.x, position.y);
  }

  /**
   * Calculate the rotation matrix between vector a and vector b.
   * @param a vector, must be a unit vector.
   * @param b vector, must be a unit vector.
   * @returns rotation matrix from a to b.
   */
  static rotationMatrix(a: Vector3, b: Vector3): Matrix {
    const cosTheta = Math.max(Math.min(Vector3.dot(a, b), 1.0), 0.0);
    const theta = Math.acos(cosTheta);
    const transformMatrix = new Matrix();
    if (theta <= 1e-6) {
      return transformMatrix;
    }
    // 计算旋转轴
    const axis = new Vector3();
    Vector3.cross(a, b, axis);
    axis.normalize();
    // 计算旋转矩阵的各项系数
    const ux = axis.x;
    const uy = axis.y;
    const uz = axis.z;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const oneMinusCos = 1 - cos;
    // 计算旋转矩阵
    const m11 = cos + ux ** 2 * oneMinusCos;
    const m12 = ux * uy * oneMinusCos - uz * sin;
    const m13 = ux * uz * oneMinusCos + uy * sin;
    const m21 = uy * ux * oneMinusCos + uz * sin;
    const m22 = cos + uy ** 2 * oneMinusCos;
    const m23 = uy * uz * oneMinusCos - ux * sin;
    const m31 = uz * ux * oneMinusCos - uy * sin;
    const m32 = uz * uy * oneMinusCos + ux * sin;
    const m33 = cos + uz ** 2 * oneMinusCos;

    transformMatrix.set(m11, m21, m31, 0, m12, m22, m32, 0, m13, m23, m33, 0, 0, 0, 0, 1);
    return transformMatrix;
  }
}
