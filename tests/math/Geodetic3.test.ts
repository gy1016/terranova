import { Ellipsoid } from "../../src/geographic";
import { Geodetic2 } from "../../src/math/Geodetic2";
import { Geodetic3 } from "../../src/math/Geodetic3";

describe("Geodetic3 test", () => {
  it("geodetic3 constructor", () => {
    const g1 = new Geodetic3(0, 0);
    expect(g1.longitude).toEqual(0);
    expect(g1.latitude).toEqual(0);
    expect(g1.height).toEqual(0);

    const g2 = new Geodetic2(90, 90);
    const g3 = new Geodetic3(g2);
    expect(g3.radLon).toEqual(Math.PI / 2);
    expect(g3.radLat).toEqual(Math.PI / 2);
    expect(g3.height).toEqual(0);

    const g4 = new Geodetic3(0, 0, 0);
    expect(g4.longitude).toEqual(0);
    expect(g4.latitude).toEqual(0);
    expect(g4.height).toEqual(0);
  });

  it("geodetic3 clone and copy", () => {
    const g3 = new Geodetic3(45, 45);
    const g4 = g3.clone();
    expect(g4.longitude).toBe(45);
    expect(g4.latitude).toBe(45);
    const g5 = g3.copyFrom(g3);
    expect(g5.longitude).toBe(45);
    expect(g5.latitude).toBe(45);
  });

  it("geodetic3 toCartesian test", () => {
    const geodetic3 = new Geodetic3(45, 45, 10000);
    const cartesian3 = geodetic3.toCartesian(Ellipsoid.Wgs84);
    expect(cartesian3.x).toBeCloseTo(3199419.14506062);
    expect(cartesian3.y).toBeCloseTo(3199419.14506062);
    expect(cartesian3.z).toBeCloseTo(4494419.476);
  });
});
