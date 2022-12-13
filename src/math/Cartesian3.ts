export class Cartesian3 {
  _x: number;
  _y: number;
  _z: number;

  public get x(): number {
    return this._x;
  }

  public set x(value: number) {
    this._x = value;
  }

  public get y(): number {
    return this._y;
  }

  public set y(value: number) {
    this._y = value;
  }

  public get z(): number {
    return this._z;
  }

  public set z(value: number) {
    this._z = value;
  }

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this._x = x;
    this._y = y;
    this._z = z;
  }
}
