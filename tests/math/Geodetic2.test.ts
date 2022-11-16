import { Geodetic2 } from "../../src/math/Geodetic2";

describe("Geodetic2 test", () => {
  it("geodetic2 constructor", () => {
    const g1 = new Geodetic2(0, 0);
    expect(g1.longitude).toEqual(0);
    expect(g1.latitude).toEqual(0);
    const g2 = new Geodetic2(90, 90);
    expect(g2.radLon).toEqual(Math.PI / 2);
    expect(g2.radLat).toEqual(Math.PI / 2);
  });

  it("geodetic2 clone and copy", () => {
    const g3 = new Geodetic2(45, 45);
    const g4 = g3.clone();
    expect(g4.longitude).toBe(45);
    expect(g4.latitude).toBe(45);
    const g5 = g3.copyFrom(g3);
    expect(g5.longitude).toBe(45);
    expect(g5.latitude).toBe(45);
  });

  it("geodetic2 initial value error", () => {
    const g6 = new Geodetic2(181, 91);
    expect(g6.longitude).toBeUndefined();
    expect(g6.latitude).toBeUndefined();
  });

  it("geodetic2 toMercator test", () => {
    const geo2 = new Geodetic2(45, 45);
    const v2 = geo2.toMercator();
    expect(v2.x).toBeCloseTo(5009377.085697311);
    expect(v2.y).toBeCloseTo(5621521.486192066);
  });
});
