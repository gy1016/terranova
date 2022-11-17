import { IClone } from "./IClone";
import { ICopy } from "./ICopy";
import { Geodetic2 } from "./Geodetic2";

export class GeoExtension implements IClone<GeoExtension>, ICopy<GeoExtension, GeoExtension> {
  public readonly min: Geodetic2 = new Geodetic2();
  public readonly max: Geodetic2 = new Geodetic2();

  constructor(min: Geodetic2, max: Geodetic2) {
    this.min.copyFrom(min);
    this.max.copyFrom(max);
  }

  clone(): GeoExtension {
    return new GeoExtension(this.min, this.max);
  }

  copyFrom(source: GeoExtension): GeoExtension {
    this.min.copyFrom(source.min);
    this.max.copyFrom(source.max);
    return this;
  }
}
