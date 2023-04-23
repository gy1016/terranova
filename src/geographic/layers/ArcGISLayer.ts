import { Engine } from "../../core";
import { TileLayer } from "./TileLayer";
import { TileServiceType } from "../../config";

export class ArcGISLayer extends TileLayer {
  constructor(engine: Engine, level: number, mode: TileServiceType) {
    super(engine, level, "ArcGIS", mode);
  }
}
