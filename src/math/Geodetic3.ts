import { Logger } from "../core/base/Logger";
import { Geodetic2 } from "./Geodetic2";
import { MathUtil } from "./MathUtil";
import { IClone } from "./IClone";
import { ICopy } from "./ICopy";
import { Vector2 } from "./Vector2";
import { Vector3 } from "./Vector3";
import { ELLIPSOID_LONG_RADIUS } from "../config";
import { Ellipsoid } from "../geographic";

export class Geodetic3 implements IClone<Geodetic3>, ICopy<Geodetic3, Geodetic3> {
  private _longitude: number;
  private _latitude: number;
  private _height: number;

  get longitude(): number {
    return this._longitude;
  }

  set longitude(value: number) {
    if (value < -180 - MathUtil.zeroTolerance || value > 180 + MathUtil.zeroTolerance) {
      Logger.error("Longitude between -180 and 180 degreed.");
      return;
    }
    this._longitude = value;
  }

  get latitude(): number {
    return this._latitude;
  }

  set latitude(value: number) {
    if (value < -90 - MathUtil.zeroTolerance || value > 90 + MathUtil.zeroTolerance) {
      Logger.error("Latitude between -90 and 90 degreed.");
      return;
    }
    this._latitude = value;
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  get radLon(): number {
    return MathUtil.degreeToRadian(this.longitude);
  }

  get radLat(): number {
    return MathUtil.degreeToRadian(this.latitude);
  }

  constructor(geodetic2: Geodetic2, height?: number);

  // constructor(longitude: number, latitude: number);

  constructor(longitude: number, latitude: number, height?: number);

  constructor(geodetic2OrLon: Geodetic2 | number, latitude?: number, height?: number) {
    if (geodetic2OrLon instanceof Geodetic2) {
      this.longitude = geodetic2OrLon.longitude;
      this.latitude = geodetic2OrLon.latitude;
      this.height = latitude === undefined ? 0 : latitude;
    } else {
      this.longitude = geodetic2OrLon;
      this.latitude = latitude;
      this.height = height === undefined ? 0 : height;
    }
  }

  /**
   * Geographic coordinate system to Mercator coordinate system.
   * @returns Mercator value
   */
  toMercator(): Vector2 {
    // 弧长为 弧长 = 弧度 * 半径
    const x = this.radLon * ELLIPSOID_LONG_RADIUS;
    const a = Math.PI / 4 + this.radLat / 2;
    const b = Math.tan(a);
    const c = Math.log(b);
    const y = ELLIPSOID_LONG_RADIUS * c;
    return new Vector2(x, y);
  }

  /**
   * Convert three-dimensional geographic coordinates to Cartesian coordinate system.
   * @param ellipsoid Ellipsoid datum
   * @returns Cartesian coordinates
   */
  toCartesian(ellipsoid: Ellipsoid): Vector3 {
    const height = this.height;
    const n = MathUtil.geodeticSurfaceNormal(this);
    const radiiSquared = ellipsoid.radiiSquared;
    const k = new Vector3();

    Vector3.multiply(radiiSquared, n, k);
    const gamma = Math.sqrt(k.x * n.x + k.y * n.y + k.z * n.z);
    k.scale(1 / gamma);

    return k.add(n.scale(height));
  }

  clone(): Geodetic3 {
    return new Geodetic3(this.longitude, this.latitude, this.height);
  }

  copyFrom(source: Geodetic3): Geodetic3 {
    this.longitude = source.longitude;
    this.latitude = source.latitude;
    this.height = source.height;

    return this;
  }
}
