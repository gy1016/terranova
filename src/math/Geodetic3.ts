import { Logger } from "../core/base/Logger";
import { Geodetic2 } from "./Geodetic2";
import { MathUtil } from "./MathUtil";
import { IClone } from "./IClone";
import { ICopy } from "./ICopy";

export class Geodetic3 implements IClone<Geodetic3>, ICopy<Geodetic3, Geodetic3> {
  private _longitude: number;
  private _latitude: number;
  private _height: number;
  private _radLon: number;
  private _radLat: number;

  get longitude(): number {
    return this._longitude;
  }

  set longitude(value: number) {
    if (value < -180 || value > 180) {
      Logger.error("Longitude between -180 and 180 degreed.");
      return;
    }
    this._longitude = value;
  }

  get latitude(): number {
    return this._latitude;
  }

  set latitude(value: number) {
    if (value < -90 || value > 90) {
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
    return this._radLon;
  }

  get radLat(): number {
    return this._radLat;
  }

  constructor(geodetic2: Geodetic2);

  constructor(longitude: number, latitude: number);

  constructor(longitude: number, latitude: number, height: number);

  constructor(geodetic2OrLon: Geodetic2 | number, latitude?: number, height?: number) {
    if (geodetic2OrLon instanceof Geodetic2) {
      this.longitude = geodetic2OrLon.longitude;
      this.latitude = geodetic2OrLon.latitude;
      this.height = 0;
    } else {
      this.longitude = geodetic2OrLon;
      this.latitude = latitude;
      this.height = height === undefined ? 0 : height;
    }
    this._radLon = MathUtil.degreeToRadian(this.longitude);
    this._radLat = MathUtil.degreeToRadian(this.latitude);
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
