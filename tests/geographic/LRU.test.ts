import { LRU } from "../../src/geographic/LRU";

describe("LRU test", () => {
  it("initial test", () => {
    const lru = new LRU<number, string>(3);
    lru.put(1, "sgy");
    lru.put(2, "ygs");
    lru.put(3, "yyg");
    expect(lru.get(1)).toBe("sgy");
    lru.put(4, "gyy");
    expect(lru.get(2)).toBeUndefined();
  });
});
