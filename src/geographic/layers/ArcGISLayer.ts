import { Engine } from "../../core";
import { TileLayer } from "./TileLayer";

export class ArcGISLayer extends TileLayer {
  constructor(engine: Engine, level: number) {
    super(engine, level, "ArcGIS");
  }
}
