import { Camera } from "../../core/Camera";
import { Geodetic2, GeoExtension, Vector3 } from "../../math";
import { Ellipsoid } from "../Ellipsoid";
import { Tile } from "./Tile";

interface CornerInfo {
  geodetic2: Geodetic2;
  worldPos: Vector3;
  ndcPos: Vector3;
  visible: boolean;
}

export class TileDetails {
  lt: CornerInfo = Object.create(null);
  lb: CornerInfo = Object.create(null);
  rt: CornerInfo = Object.create(null);
  rb: CornerInfo = Object.create(null);

  geoExtension: GeoExtension;
  visibleCount: number = 0;
  isClockWise: boolean;
  width: number;
  height: number;
  area: number;

  constructor(camera: Camera, tile: Tile) {
    this._initCornerCoord(camera, tile);
    this._initCornerArea(camera);
  }

  _initCornerCoord(camera: Camera, tile: Tile) {
    const cornerArray = [this.lt, this.lb, this.rt, this.rb];

    const { level, row, col } = tile;
    const geoExtension = Tile.getTileGeodeticByGrid(level, row, col);
    this.geoExtension = geoExtension;
    this.lb.geodetic2 = new Geodetic2(geoExtension.min.longitude, geoExtension.min.latitude);
    this.lt.geodetic2 = new Geodetic2(geoExtension.min.longitude, geoExtension.max.latitude);
    this.rt.geodetic2 = new Geodetic2(geoExtension.max.longitude, geoExtension.max.latitude);
    this.rb.geodetic2 = new Geodetic2(geoExtension.max.longitude, geoExtension.min.latitude);

    for (const corrner of cornerArray) {
      corrner.worldPos = corrner.geodetic2.toCartesian(Ellipsoid.Wgs84);
      corrner.ndcPos = camera.cartesianToNDC(corrner.worldPos);
      corrner.visible = camera.isWorldVisibleInDevice(corrner.worldPos, corrner.ndcPos);
      if (corrner.visible) this.visibleCount++;
    }
  }

  _initCornerArea(camera: Camera) {
    const { canvas } = camera.engine;
    const vector03 = new Vector3();
    Vector3.subtract(this.rb.ndcPos, this.lb.ndcPos, vector03);
    const vector01 = new Vector3();
    Vector3.subtract(this.lt.ndcPos, this.lb.ndcPos, vector01);
    const cross = new Vector3();
    Vector3.cross(vector03, vector01, cross);
    this.isClockWise = cross.z > 0;

    const topWidth =
      (Math.sqrt((this.lt.ndcPos.x - this.rt.ndcPos.x) ** 2 + (this.lt.ndcPos.y - this.rt.ndcPos.y) ** 2) *
        canvas.width) /
      2;
    const bottomWidth =
      (Math.sqrt((this.lb.ndcPos.x - this.rb.ndcPos.x) ** 2 + (this.lb.ndcPos.y - this.rb.ndcPos.y) ** 2) *
        canvas.width) /
      2;
    this.width = Math.floor((topWidth + bottomWidth) / 2);
    const leftHeight =
      (Math.sqrt((this.lb.ndcPos.x - this.lt.ndcPos.x) ** 2 + (this.lb.ndcPos.y - this.lt.ndcPos.y) ** 2) *
        canvas.height) /
      2;
    const rightHeight =
      (Math.sqrt((this.rb.ndcPos.x - this.rt.ndcPos.x) ** 2 + (this.rb.ndcPos.y - this.rt.ndcPos.y) ** 2) *
        canvas.height) /
      2;
    this.height = Math.floor((leftHeight + rightHeight) / 2);
    this.area = this.height * this.width;
  }
}
