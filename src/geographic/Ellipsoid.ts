import { Vector3 } from "../math";
import { ELLIPSOID_LONG_RADIUS, ELLIPSOID_SHORT_RADIUS } from "../config";

export class Ellipsoid {
  public static readonly Wgs84: Ellipsoid = new Ellipsoid(
    ELLIPSOID_LONG_RADIUS,
    ELLIPSOID_LONG_RADIUS,
    ELLIPSOID_SHORT_RADIUS
  );
  public static readonly ScaledWgs84: Ellipsoid = new Ellipsoid(
    1.0,
    1.0,
    ELLIPSOID_SHORT_RADIUS / ELLIPSOID_LONG_RADIUS
  );
  public static readonly UnitSphere: Ellipsoid = new Ellipsoid(1.0, 1.0, 1.0);

  private readonly _radii: Vector3;
  private readonly _radiiSquared: Vector3;
  private readonly _radiiToTheFourth: Vector3;
  private readonly _oneOverRadiiSquared: Vector3;

  /** The tree radii of the ellipsoid. */
  get radii(): Vector3 {
    return this._radii;
  }

  /** The squares corresponding to the three radii of the ellipsoid. */
  get radiiSquared(): Vector3 {
    return this._radiiSquared;
  }

  /** The fourth corresponding to the three radii of the ellipsoid. */
  get radiiToTheFourth(): Vector3 {
    return this._radiiToTheFourth;
  }

  /** The inverse of the square corresponding to the three radii of the ellipsoid. */
  get oneOverRadiiSquared(): Vector3 {
    return this._oneOverRadiiSquared;
  }

  get maximumRadius() {
    return Math.max(this._radii._x, this._radii._y, this._radii._z);
  }

  get minimumRadius() {
    return Math.min(this._radii._x, this._radii._y, this._radii._z);
  }

  constructor(a: number, b: number, c: number) {
    if (a <= 0 || b <= 0 || c <= 0) {
      throw new Error("Ellipsoid parameters are not allowed to be set to less than or equal to 0.");
    }
    this._radii = new Vector3(a, b, c);
    this._radiiSquared = new Vector3(a * a, b * b, c * c);
    this._radiiToTheFourth = new Vector3(a ** 4, b ** 4, c ** 4);
    this._oneOverRadiiSquared = new Vector3(
      1 / (this._radii.x * this._radii.x),
      1 / (this._radii.y * this._radii.y),
      1 / (this._radii.z * this._radii.z)
    );
  }
}
