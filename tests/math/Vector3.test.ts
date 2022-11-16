import { Ellipsoid } from "../../src/geographic";
import { Vector3 } from "../../src/math/Vector3";

describe("Vector3 test", () => {
  it("toGeodetic2 constructor", () => {
    const v = new Vector3(6378137, 6378137, 6378137);
    const geo2 = v.toGeodetic2(Ellipsoid.Wgs84);
    expect(geo2.radLat).toBeCloseTo(0.6186496060902668);
    expect(geo2.radLon).toBeCloseTo(0.7853981633974483);
  });

  it("toGeodetic3 constructor", () => {
    const v = new Vector3(6378137, 6378137, 6378137);
    const geo3 = v.toGeodetic3(Ellipsoid.Wgs84);
    expect(geo3.radLat).toBeCloseTo(0.6186496060902668);
    expect(geo3.radLon).toBeCloseTo(0.7853981633974483);
    expect(geo3.height).toBeCloseTo(4676258.99583406);
  });
});
