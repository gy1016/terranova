import { Logger } from "../core/base/Logger";
import { MathUtil } from "./MathUtil";
import { IClone } from "./IClone";
import { ICopy } from "./ICopy";

export class Geodetic2 implements IClone<Geodetic2>, ICopy<Geodetic2, Geodetic2> {
  private _longitude: number;
  private _latitude: number;
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

  get radLon(): number {
    return this._radLon;
  }

  get radLat(): number {
    return this._radLat;
  }

  constructor(longitude: number, latitude: number) {
    this.longitude = longitude;
    this.latitude = latitude;
    this._radLon = MathUtil.degreeToRadian(longitude);
    this._radLat = MathUtil.degreeToRadian(latitude);
  }

  clone(): Geodetic2 {
    return new Geodetic2(this.longitude, this.latitude);
  }

  copyFrom(source: Geodetic2): Geodetic2 {
    this.longitude = source.longitude;
    this.latitude = source.latitude;

    return this;
  }
}
