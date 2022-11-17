import { Vector3 } from "../../src";
import { Ellipsoid } from "../../src/geographic";
import { MathUtil } from "../../src/math/MathUtil";

describe("MathUtil test", () => {
  it("scaleToGeocentricSurface test", () => {
    const ellipsoid = Ellipsoid.Wgs84;
    const position = new Vector3(6378137, 6378137, 6378137);
    const res = MathUtil.scaleToGeocentricSurface(ellipsoid, position);
    expect(res.x).toBeCloseTo(3678289.7946902825);
    expect(res.y).toBeCloseTo(3678289.7946902825);
    expect(res.z).toBeCloseTo(3678289.7946902825);
  });

  it("scaleToGeodeticSufrace test", () => {
    const ellipsoid = Ellipsoid.Wgs84;
    const position = new Vector3(6378137, 6378137, 6378137);
    const res = MathUtil.scaleToGeodeticSufrace(ellipsoid, position);
    expect(res.x).toBeCloseTo(3681788.7890320364);
    expect(res.y).toBeCloseTo(3681788.7890320364);
    expect(res.z).toBeCloseTo(3671328.760294296);
  });

  it("rayIntersectEllipsoid test", () => {
    const res = MathUtil.rayIntersectEllipsoid(
      new Vector3(6378137, 6378137, 6378137),
      new Vector3(6378137 ** 2, 6378137 ** 2, 6378137 ** 2),
      new Vector3(0, -6378137, -6378137).normalize(),
      Ellipsoid.Wgs84.oneOverRadiiSquared
    );
    expect(res.intersects).toBe(true);
    expect(res.near).toBe(9020047.746221097);
    expect(res.far).toBe(9020047.949926192);
  });
});
