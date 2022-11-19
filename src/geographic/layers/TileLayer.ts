import { Engine, ImageMaterial, Shader } from "../../core";
import { TILE_SERVICE_MAP, TileServiceMap } from "../../config";
import { Tile } from "./Tile";
import { TileDetails } from "./TileDetails";
import { MathUtil } from "../../math";

export class TileLayer {
  // 每帧下面，当前层级当前相机位置，记录某行是否进行了可见性判断
  private _oneFrameRowRecords: Record<number, boolean>;
  protected _address: string | string[];

  engine: Engine;
  level: number;
  // TODO: 改成lru容器会更好一点
  tiles: Tile[] = [];

  private _loopLimit: number;

  constructor(engine: Engine, level: number, service: keyof TileServiceMap) {
    this.engine = engine;
    this.level = level;
    this._address = TILE_SERVICE_MAP[service];
    this._loopLimit = Math.min(10, (1 << level) - 1);
    this._oneFrameRowRecords = Object.create(null);
    this._getVisibleTilesByLevel();
    this._refreshTiles();
  }

  /**
   * Select the base Url according to the service provider, and then obtain its url according to the tile instance.
   * @param str Tile address url
   * @param tile Tile instance
   * @returns The tile instance url.
   */
  private _initTileUrl(str: string, tile: Tile) {
    const res = [...str.matchAll(/(level|row|col)/gi)];
    for (let i = 0; i < res.length; ++i) {
      const key: string = res[i][0];
      str = str.replace(key, tile[key]);
    }
    return str;
  }

  private _isTileVisible(level: number, row: number, col: number): boolean {
    const tileDetails: TileDetails = new TileDetails(this.engine.scene.camera, level, row, col);

    // return tileDetails.area >= 500 && tileDetails.visibleCount >= 1 && tileDetails.isClockWise;
    return tileDetails.area >= 500 && tileDetails.visibleCount >= 1;
  }

  _getVisibleTilesByLevel() {
    let res: Tile[] = [];

    const engine = this.engine;
    const camera = this.engine.scene.camera;
    const level = this.level;
    const loopLimit = this._loopLimit;

    const cameraWordPos = MathUtil.rightToGeographic(camera.transform.worldPosition);
    const cameraGeodeticPos = cameraWordPos.toGeodetic3(engine.scene.globe.shape);
    const cameraMercatorPos = cameraGeodeticPos.toMercator();
    const { row, col } = Tile.getTileRowAndCol(cameraMercatorPos.x, cameraMercatorPos.y, level);
    const rowResult = this._handleRow(level, row, col);
    this._oneFrameRowRecords[row] = true;
    res = res.concat(rowResult);

    let cursor = row;
    for (let i = 0; i < loopLimit; ++i) {
      const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, cursor, col, "bottom");
      cursor = newRow;
      const nextRowRes = this._handleRow(level, cursor, newCol);
      this._oneFrameRowRecords[newRow] = true;
      if (nextRowRes.length === 0) break;
      res = res.concat(nextRowRes);
    }

    cursor = row;
    for (let i = 0; i < loopLimit; ++i) {
      const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, cursor, col, "top");
      cursor = newRow;
      const lastRowRes = this._handleRow(level, cursor, newCol);
      this._oneFrameRowRecords[newRow] = true;
      if (lastRowRes.length === 0) break;
      res = res.concat(lastRowRes);
    }

    console.log(res);
    this.tiles = res;
  }

  _handleRow(level: number, row: number, col: number) {
    const result: Tile[] = [];
    if (this._oneFrameRowRecords[row]) return result;

    const loopLimit = this._loopLimit;
    const visible = this._isTileVisible(level, row, col);

    if (visible) {
      let cursor = col;
      result.push(new Tile(this.engine, this.level, row, cursor));

      for (let i = 0; i < loopLimit; ++i) {
        const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, row, cursor, "left");
        const leftTileVisible = this._isTileVisible(level, newRow, newCol);
        if (!leftTileVisible) break;
        result.push(new Tile(this.engine, this.level, newRow, newCol));
        cursor = newCol;
      }

      cursor = col;
      for (let i = 0; i < loopLimit; ++i) {
        const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, row, cursor, "right");
        const rightTileVisible = this._isTileVisible(level, newRow, newCol);
        if (!rightTileVisible) break;
        result.push(new Tile(this.engine, this.level, newRow, newCol));
        cursor = newCol;
      }
    }

    return result;
  }

  _refreshTiles() {
    let url: string;
    let str: string;

    for (const tile of this.tiles) {
      // TODO: 这段代码也可以优化
      if (this._address instanceof Array) {
        str = this._address[Math.floor(this._address.length * Math.random())];
      } else {
        str = this._address;
      }
      url = this._initTileUrl(str, tile);

      const material = new ImageMaterial(this.engine, Shader.find("tile"), url);
      tile.material = material;
    }
  }

  _render() {
    // TODO: 待优化，如果相机的位置没有发生改变，可以不用重新渲染与计算。

    const tiles = this.tiles;
    const engine = this.engine;
    const camera = engine.scene.camera;

    for (let i = 0; i < tiles.length; ++i) {
      const { mesh, material } = tiles[i];
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      mesh._draw(program, mesh.subMesh);
    }
  }
}
