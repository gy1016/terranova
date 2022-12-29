import { Engine } from "../../core";

export abstract class Layer {
  engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  /**
   * Generate URL of network resources based on row and column numbers.
   * @param str Network resources address url
   * @param target Tile or terrain
   * @returns The target instance url.
   */
  protected _initUrl<T>(str: string, target: T): string {
    const res = [...str.matchAll(/(level|row|col)/gi)];
    for (let i = 0; i < res.length; ++i) {
      const key: string = res[i][0];
      str = str.replace(key, target[key]);
    }
    return str;
  }

  abstract _render(level: number): void;
}
