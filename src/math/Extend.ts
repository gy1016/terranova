import { IClone } from "./IClone";
import { ICopy } from "./ICopy";
import { Vector2 } from "./Vector2";

export class Extend implements IClone<Extend>, ICopy<Extend, Extend> {
  public readonly min: Vector2 = new Vector2();
  public readonly max: Vector2 = new Vector2();

  constructor(min: Vector2, max: Vector2) {
    this.min.copyFrom(min);
    this.max.copyFrom(max);
  }

  clone(): Extend {
    return new Extend(this.min, this.max);
  }

  copyFrom(source: Extend): Extend {
    this.min.copyFrom(source.min);
    this.max.copyFrom(source.max);
    return this;
  }
}
