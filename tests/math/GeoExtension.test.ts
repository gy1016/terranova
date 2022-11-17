import { GeoExtension } from "../../src/math/GeoExtension";
import { Geodetic2 } from "../../src/math/Geodetic2";

describe("GeoExtension test", () => {
  it("GeoExtension constructor", () => {
    const min = new Geodetic2(-1, -2);
    const max = new Geodetic2(3, 4);
    const e = new GeoExtension(min, max);

    expect(e.min.longitude).toBe(-1);
    expect(e.min.latitude).toBe(-2);
    expect(e.max.longitude).toBe(3);
    expect(e.max.latitude).toBe(4);
  });

  it("GeoExtension copy", () => {
    const min = new Geodetic2(-1, -2);
    const max = new Geodetic2(3, 4);
    const e1 = new GeoExtension(min, max);
    const e2 = e1.clone();
    min.longitude = -5;
    min.latitude = -5;
    e1.copyFrom(new GeoExtension(min, max));

    expect(e2.min.longitude).toBe(-1);
    expect(e2.min.latitude).toBe(-2);
    expect(e2.max.longitude).toBe(3);
    expect(e2.max.latitude).toBe(4);

    expect(e1.min.longitude).toBe(-5);
    expect(e1.min.latitude).toBe(-5);
    expect(e1.max.longitude).toBe(3);
    expect(e1.max.latitude).toBe(4);
  });
});
