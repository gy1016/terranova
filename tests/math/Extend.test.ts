import { Extend } from "../../src/math/Extend";
import { Vector2 } from "../../src/math/Vector2";

describe("Extend test", () => {
  it("extend constructor", () => {
    const min = new Vector2(-1, -2);
    const max = new Vector2(3, 4);
    const e = new Extend(min, max);

    expect(e.min.x).toBe(-1);
    expect(e.min.y).toBe(-2);
    expect(e.max.x).toBe(3);
    expect(e.max.y).toBe(4);
  });

  it("extend copy", () => {
    const min = new Vector2(-1, -2);
    const max = new Vector2(3, 4);
    const e1 = new Extend(min, max);
    const e2 = e1.clone();
    min.x = -5;
    min.y = -5;
    e1.copyFrom(new Extend(min, max));

    expect(e2.min.x).toBe(-1);
    expect(e2.min.y).toBe(-2);
    expect(e2.max.x).toBe(3);
    expect(e2.max.y).toBe(4);

    expect(e1.min.x).toBe(-5);
    expect(e1.min.y).toBe(-5);
    expect(e1.max.x).toBe(3);
    expect(e1.max.y).toBe(4);
  });
});
