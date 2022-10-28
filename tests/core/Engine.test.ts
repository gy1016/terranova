import { Engine } from "../../src/core";

describe("webgl engine test", () => {
  beforeEach(() => {
    const createElement = document.createElement.bind(document);
    document.createElement = (tagName: string) => {
      if (tagName === "canvas") {
        return {
          getContext: (mode: string) => {
            if (mode === "webgl" || mode === "webgl2") {
              return "test";
            } else {
              return null;
            }
          },
        };
      }
      return createElement(tagName);
    };
  });

  it("create a webgl engine", () => {
    const canvas = document.createElement("canvas");
    const engine = new Engine(canvas);
    expect(engine).not.toBe(null);
  });
});
