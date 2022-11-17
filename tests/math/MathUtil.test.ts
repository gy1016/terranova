import { Vector3 } from "../../src";
import { Ellipsoid } from "../../src/geographic";
import { MathUtil } from "../../src/math/MathUtil";

describe("MathUtil test", () => {
  it("gridToWebMercator test", () => {
    const extend = MathUtil.gridToWebMercator(1, 0, 0);
    expect(extend.min.x).toBe(-Math.PI * 6378137.0);
    expect(extend.min.y).toBe(0);
    expect(extend.max.x).toBe(0);
    expect(extend.max.y).toBe(Math.PI * 6378137.0);
  });

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
});
