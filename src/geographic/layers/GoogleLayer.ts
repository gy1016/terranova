import { Engine } from "../../core";
import { TileLayer } from "./TileLayer";

export class GoogleLayer extends TileLayer {
  constructor(engine: Engine, level: number) {
    super(engine, level, "Google");
  }
}
