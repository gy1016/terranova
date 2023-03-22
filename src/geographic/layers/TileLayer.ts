import { Engine, ImageMaterial, Material, Shader } from "../../core";
import { TILE_SERVICE_MAP, TileServiceMap } from "../../config";
import { Tile } from "./Tile";
import { TileDetails } from "./TileDetails";
import { MathUtil, Vector3 } from "../../math";
import { LRU } from "../LRU";
import { Ellipsoid } from "../Ellipsoid";
import { Layer } from "./Layer";
import { loadImage } from "../../core/base";

export class TileLayer extends Layer {
  // 每帧下面，当前层级当前相机位置，记录某行是否进行了可见性判断
  private _oneFrameRowRecords: Record<number, boolean>;
  protected _address: string | string[];

  level: number;
  lruCache: LRU<string, Tile> = new LRU(50);
  tiles: Tile[] = [];

  private _loopLimit: number;
  // TODO: 应该在Transform里面做
  private _cameraLastPos: Vector3 = new Vector3();

  constructor(engine: Engine, level: number, service: keyof TileServiceMap) {
    super(engine);
    this.level = level;
    this._address = TILE_SERVICE_MAP[service];
    this._loopLimit = Math.min(10, (1 << level) - 1);
    this._oneFrameRowRecords = Object.create(null);
  }

  private _isTileVisible(level: number, row: number, col: number): boolean {
    const tileDetails: TileDetails = new TileDetails(this.engine.scene.camera, level, row, col);

    // return tileDetails.area >= 500 && tileDetails.visibleCount >= 1 && tileDetails.isClockWise;
    return tileDetails.area >= 500 && tileDetails.visibleCount >= 1;
  }

  _getVisibleTilesByLevel(level: number) {
    let res: Tile[] = [];

    this.level = level;

    const camera = this.engine.scene.camera;
    const loopLimit = this._loopLimit;

    const cameraWordPos = MathUtil.rightToGeographic(camera.transform.worldPosition);
    const cameraGeodeticPos = cameraWordPos.toGeodetic3(Ellipsoid.Wgs84);
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

    this.tiles = res;
  }

  _handleRow(level: number, row: number, col: number) {
    const result: Tile[] = [];
    // 如果当前帧这行处理过了，直接返回
    if (this._oneFrameRowRecords[row]) return result;

    const loopLimit = this._loopLimit;
    const visible = this._isTileVisible(level, row, col);

    if (visible) {
      let cursor = col;

      result.push(this._queryTile(level, row, cursor));

      for (let i = 0; i < loopLimit; ++i) {
        const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, row, cursor, "left");
        const leftTileVisible = this._isTileVisible(level, newRow, newCol);
        if (!leftTileVisible) break;
        result.push(this._queryTile(level, newRow, newCol));
        cursor = newCol;
      }

      cursor = col;
      for (let i = 0; i < loopLimit; ++i) {
        const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, row, cursor, "right");
        const rightTileVisible = this._isTileVisible(level, newRow, newCol);
        if (!rightTileVisible) break;
        result.push(this._queryTile(level, newRow, newCol));
        cursor = newCol;
      }
    }

    return result;
  }

  /**
   * Find whether there are tiles in the cache according to the rank and column numbers of the hierarchy, return if there is, and generate a tile instance if not.
   * @param level Target tile level
   * @param row Target tile row
   * @param col Target tile col
   */
  _queryTile(level: number, row: number, col: number): Tile {
    const key = `_${level}_${row}_${col}_`;
    const cacheTile = this.lruCache.get(key);
    if (cacheTile instanceof Tile) {
      return cacheTile;
    }

    // ! 新生成的并不着急推入LRU，因为此时他没有挂载材质
    return new Tile(this.engine, this.level, row, col);
  }

  _refreshTiles() {
    let url: string;
    let str: string;

    for (const tile of this.tiles) {
      if (this.lruCache.get(tile.key)) continue;

      // TODO: 这段代码也可以优化
      if (this._address instanceof Array) {
        str = this._address[Math.floor(this._address.length * Math.random())];
      } else {
        str = this._address;
      }
      url = this._initUrl(str, tile);
      tile.material = new Material(this.engine, Shader.find("tile"));
      loadImage(url).then((image) => {
        const material = new ImageMaterial(this.engine, Shader.find("tile"), { image, flipY: true });

        tile.material = material;
        this.lruCache.put(tile.key, tile);
      });
    }
  }

  _render(level: number) {
    const engine = this.engine;
    const camera = engine.scene.camera;
    // 位置不相等才进行重新计算，否则只进行绘制
    if (!Vector3.equals(this._cameraLastPos, camera.transform.worldPosition)) {
      this._cameraLastPos = camera.transform.worldPosition.clone();
      this._oneFrameRowRecords = Object.create(null);
      this._getVisibleTilesByLevel(level);
      this._refreshTiles();
    }

    const tiles = this.tiles;
    for (let i = 0; i < tiles.length; ++i) {
      const { mesh, material } = tiles[i];
      // 材质准备好了才绘制，否则下一个
      if (!material) continue;
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      mesh._draw(program, mesh.subMesh);
    }
  }
}
