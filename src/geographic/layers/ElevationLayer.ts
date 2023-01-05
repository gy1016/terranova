import { Engine, ImageMaterial, Shader } from "../../core";
import { Terrain } from "../Terrain";
import { Layer } from "./Layer";
import { LRU } from "../LRU";
import { TERRAIN_SERVICE, TILE_SERVICE_MAP, LERC_WASM } from "../../config";
import * as Lerc from "lerc";
import { TileDetails } from "./TileDetails";
import { Tile } from "./Tile";
import { MathUtil, Vector3 } from "../../math";
import { Ellipsoid } from "../Ellipsoid";

interface ElevationLayerConfig {
  level?: number;
  terrainAddress?: string;
  tileAddress?: string | string[];
  exaggerationFactor?: number;
}

export class ElevationLayer extends Layer {
  level: number;
  terrains: Terrain[] = [];

  private _terrainAddress: string;
  private _tileAddress: string | string[];
  private _exaggerationFactor: number = 1;
  private _isLercLoad: boolean = false;
  private _lruCache: LRU<string, Terrain> = new LRU(50);
  private _oneFrameRowRecords: Record<number, boolean>;
  private _cameraLastPos: Vector3 = new Vector3();

  constructor(engine: Engine, config: ElevationLayerConfig = {}) {
    super(engine);

    const { terrainAddress, tileAddress, exaggerationFactor } = config;
    this._terrainAddress = terrainAddress ? terrainAddress : TERRAIN_SERVICE;
    this._tileAddress = tileAddress ? tileAddress : TILE_SERVICE_MAP["Google"];
    if (exaggerationFactor !== undefined) {
      this._exaggerationFactor = exaggerationFactor;
    }
    Lerc.load({
      locateFile: () => {
        return LERC_WASM;
      },
    }).then(() => {
      this._isLercLoad = true;
    });
  }

  private _isTileVisible(level: number, row: number, col: number): boolean {
    const tileDetails: TileDetails = new TileDetails(this.engine.scene.camera, level, row, col);

    // return tileDetails.area >= 500 && tileDetails.visibleCount >= 1 && tileDetails.isClockWise;
    return tileDetails.area >= 500 && tileDetails.visibleCount >= 1;
  }

  private _handleRow(level: number, row: number, col: number) {
    const result: Terrain[] = [];
    // 如果当前帧这行处理过了，直接返回
    if (this._oneFrameRowRecords[row]) return result;

    const loopLimit = Math.min(10, (1 << level) - 1);
    const visible = this._isTileVisible(level, row, col);

    if (visible) {
      let cursor = col;

      result.push(this._queryTerrain(level, row, cursor));

      for (let i = 0; i < loopLimit; ++i) {
        const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, row, cursor, "left");
        const leftTileVisible = this._isTileVisible(level, newRow, newCol);
        if (!leftTileVisible) break;
        result.push(this._queryTerrain(level, newRow, newCol));
        cursor = newCol;
      }

      cursor = col;
      for (let i = 0; i < loopLimit; ++i) {
        const { row: newRow, col: newCol } = Tile.getTileGridByBrother(level, row, cursor, "right");
        const rightTileVisible = this._isTileVisible(level, newRow, newCol);
        if (!rightTileVisible) break;
        result.push(this._queryTerrain(level, newRow, newCol));
        cursor = newCol;
      }
    }

    return result;
  }

  private _getVisibleTilesByLevel(level: number) {
    let res: Terrain[] = [];

    this.level = level;

    const camera = this.engine.scene.camera;
    const loopLimit = Math.min(10, (1 << level) - 1);

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

    this.terrains = res;
  }

  private _queryTerrain(level: number, row: number, col: number): Terrain {
    const key = `_${level}_${row}_${col}_`;
    const cacheTerrain = this._lruCache.get(key);
    if (cacheTerrain instanceof Terrain) {
      return cacheTerrain;
    }

    // ! 新生成的并不着急推入LRU，因为此时他没有挂载材质
    return new Terrain(this.engine, this.level, row, col);
  }

  // 生成可见地形的格网和材质
  async _refresh() {
    if (this._isLercLoad === false) return;
    const terrainAddress = this._terrainAddress;
    const exaggerationFactor = this._exaggerationFactor;

    let tileAddress: string;
    let terrainUrl: string;
    let tileUrl: string;

    for (const terrain of this.terrains) {
      if (this._lruCache.get(terrain.key)) {
        continue;
      }

      if (this._tileAddress instanceof Array) {
        tileAddress = this._tileAddress[Math.floor(this._tileAddress.length * Math.random())];
      } else {
        tileAddress = this._tileAddress;
      }

      // 生成高度图的资源URL
      this._lruCache.put(terrain.key, terrain);
      terrainUrl = this._initUrl(terrainAddress, terrain);
      fetch(terrainUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => {
          const result = Lerc.decode(arrayBuffer);
          const heightmap = result.pixels[0];
          terrain.width = result.width;
          terrain.height = result.height;
          // 根据高度图生成格网
          terrain._generateVertex(heightmap, exaggerationFactor);

          // 根据瓦片生成材质
          tileUrl = this._initUrl(tileAddress, terrain);
          const material = new ImageMaterial(this.engine, Shader.find("tile"), { url: tileUrl, flipY: true });
          terrain.material = material;
        });
    }
  }

  _render(level: number) {
    const engine = this.engine;
    const camera = engine.scene.camera;

    if (!Vector3.equals(this._cameraLastPos, camera.transform.worldPosition)) {
      this._cameraLastPos = camera.transform.worldPosition.clone();
      this._oneFrameRowRecords = Object.create(null);
      this._getVisibleTilesByLevel(level);
      this._refresh();
    }

    const terrains = this.terrains;
    for (let i = 0; i < terrains.length; ++i) {
      const { mesh, material } = terrains[i];
      if (!material || !mesh) continue;
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      mesh._draw(program, mesh.subMesh);
    }
  }
}
