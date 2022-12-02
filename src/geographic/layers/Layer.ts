import { Engine } from "../../core";

export abstract class Layer {
  engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  abstract _render(level: number);
}
