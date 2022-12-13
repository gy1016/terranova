import { Ellipsoid } from "../../src/geographic/Ellipsoid";
import { Vector2 } from "../../src/math/Vector2";

describe("Vector2 test", () => {
  it("toGeodetic2 test", () => {
    const v2 = new Vector2(0, 0);
    const geo2 = v2.toGeodetic2(Ellipsoid.Wgs84);
    expect(geo2.latitude).toBe(0);
    expect(geo2.longitude).toBe(0);
  });
});
