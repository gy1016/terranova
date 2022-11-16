import { Vector3 } from "../../src";
import { Ellipsoid } from "../../src/geographic";
import { Geodetic2 } from "../../src/math/Geodetic2";
import { Geodetic3 } from "../../src/math/Geodetic3";
import { MathUtil } from "../../src/math/MathUtil";
import { Vector2 } from "../../src/math/Vector2";

describe("MathUtil test", () => {
  it("gridToWebMercator test", () => {
    const extend = MathUtil.gridToWebMercator(1, 0, 0);
    expect(extend.min.x).toBe(-Math.PI * 6378137.0);
    expect(extend.min.y).toBe(0);
    expect(extend.max.x).toBe(0);
    expect(extend.max.y).toBe(Math.PI * 6378137.0);
  });

  it("webMercatorToGeodetic test", () => {
    const mercator = new Vector2(0, 0);
    const geodetic2 = MathUtil.webMercatorToGeodetic(mercator);
    expect(geodetic2.longitude).toBe(0);
    expect(geodetic2.latitude).toBe(0);

    mercator.x = Math.PI * 6378137;
    const geodetic3 = MathUtil.webMercatorToGeodetic(mercator);
    expect(geodetic3.longitude).toBeCloseTo(180);
  });

  it("geodeticToCartesian test", () => {
    const geodetic2 = new Geodetic2(45, 45);
    const cartesian2 = MathUtil.geodeticToCartesian(geodetic2);
    expect(cartesian2.x).toBeCloseTo(3194419.145);
    expect(cartesian2.y).toBeCloseTo(3194419.145);
    expect(cartesian2.z).toBeCloseTo(4487348.408);

    const geodetic3 = new Geodetic3(45, 45, 10000);
    const cartesian3 = MathUtil.geodeticToCartesian(geodetic3);
    expect(cartesian3.x).toBeCloseTo(3199419.14506062);
    expect(cartesian3.y).toBeCloseTo(3199419.14506062);
    expect(cartesian3.z).toBeCloseTo(4494419.476);
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
