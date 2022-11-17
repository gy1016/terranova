import { Vector4 } from "../../src";
import { Matrix } from "../../src/math/Matrix";

describe("Matrix test", () => {
  it("toGeodetic2 test", () => {
    const m = new Matrix(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
    const v = new Vector4(10, 11, 12, 13);
    const res = Matrix.multiplyVector4(m, v);
    expect(res.x).toBe(342);
    expect(res.y).toBe(388);
    expect(res.z).toBe(434);
    expect(res.w).toBe(480);
  });
});
