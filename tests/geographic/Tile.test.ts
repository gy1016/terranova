import { Tile } from "../../src/geographic";

describe("Tile test", () => {
  it("gridToWebMercator test", () => {
    const extend = Tile.gridToWebMercator(1, 0, 0);
    expect(extend.min.x).toBe(-Math.PI * 6378137.0);
    expect(extend.min.y).toBe(0);
    expect(extend.max.x).toBe(0);
    expect(extend.max.y).toBe(Math.PI * 6378137.0);
  });

  it("getTileGridByBrother test", () => {
    const { col, row } = Tile.getTileGridByBrother(1, 0, 0, "left");
    expect(col).toBe(1);
    expect(row).toBe(0);
  });
});
