import { Extension, Vector2, Vector3, GeoExtension } from "../../math";
import { Material } from "../../core/material";
import { ModelMesh } from "../../core/mesh";
import { Engine } from "../../core/Engine";
import { ELLIPSOID_LONG_RADIUS, TILE_SIZE } from "../../config";
import { Ellipsoid } from "../Ellipsoid";

export interface TileCoord {
  row: number;
  col: number;
  level?: number;
}

export class Tile {
  engine: Engine;
  mesh: ModelMesh;
  material: Material;

  level: number;
  row: number;
  col: number;
  // 墨卡托范围
  extend: Extension;
  // TODO: uniqueKey字符串效率比较低，待优化
  key: string;

  private _segment: number;

  constructor(engine: Engine, level: number, row: number, col: number) {
    this.engine = engine;
    this.level = level;
    this.row = row;
    this.col = col;
    this.key = Tile.generateKey(level, row, col);
    this._segment = this.level < 6 ? 1 << (6 - this.level) : 1;
    this.extend = Tile.gridToWebMercator(this.level, this.row, this.col);

    this.mesh = new ModelMesh(engine);
    this._generateVertex();
  }

  private _generateVertex() {
    const _tempVector2 = new Vector2();

    // const count = (this._segment + 1) ** 2;
    const positions: Vector3[] = [];
    const uvs: Vector2[] = [];
    const indices: number[] = [];

    const deltaX = (this.extend.max.x - this.extend.min.x) / this._segment;
    const deltaY = (this.extend.max.y - this.extend.min.y) / this._segment;
    const deltaT = 1.0 / this._segment;

    // 存储墨卡托最小x到最大x的间隙值
    const mercatorXs: number[] = [];
    const mercatorYs: number[] = [];
    const textureSs: number[] = [];
    const textureTs: number[] = [];

    // 从左上到右下进行存储
    for (let i = 0; i <= this._segment; i++) {
      mercatorXs.push(this.extend.min.x + i * deltaX);
      mercatorYs.push(this.extend.max.y - i * deltaY);
      const b = i * deltaT;
      textureSs.push(b);
      textureTs.push(1 - b);
    }

    for (let i = 0; i <= this._segment; ++i) {
      const merY = mercatorYs[i];
      for (let j = 0; j <= this._segment; ++j) {
        const merX = mercatorXs[j];
        _tempVector2.x = merX;
        _tempVector2.y = merY;

        // TODO: 这里还拿不到场景球体的shape，待修改
        const geodetic = _tempVector2.toGeodetic2(Ellipsoid.Wgs84);
        const cartesian = geodetic.toCartesian(Ellipsoid.Wgs84);

        positions.push(cartesian);
        uvs.push(new Vector2(textureSs[j], textureTs[i]));
      }
    }

    /**
     * 0,1,2; 2,3,0;
     * 0    3
     *
     * 1    2
     */
    // (segment ** 2 * 2 * 3)
    // TODO: 所有瓦片的顶点索引可以公用，只需要生成一次就可以！
    for (let i = 0; i < this._segment; ++i) {
      for (let j = 0; j < this._segment; ++j) {
        const idx0 = (this._segment + 1) * i + j;
        const idx1 = (this._segment + 1) * (i + 1) + j;
        const idx2 = idx1 + 1;
        const idx3 = idx0 + 1;
        indices.push(idx0, idx1, idx2, idx2, idx3, idx0);
      }
    }

    this._initialize(this.mesh, positions, uvs, new Uint16Array(indices), true);
  }

  private _initialize(
    mesh: ModelMesh,
    positions: Vector3[],
    uvs: Vector2[],
    indices: Uint16Array | Uint32Array,
    noLongerAccessible: boolean
  ) {
    mesh.setPositions(positions);
    mesh.setUVs(uvs);
    mesh.setIndices(indices);

    mesh.uploadData(noLongerAccessible);
    mesh.addSubMesh(0, indices.length);
  }

  static generateKey(level: number, row: number, col: number) {
    return `_${level}_${row}_${col}_`;
  }

  /**
   * Get the resolution of the Mercator projection according to the current level.
   * @param level Tile level
   * @returns The resolution
   */
  static getResolution(level: number) {
    const tileNums = 1 << level;
    const tileTotalPixel = tileNums * TILE_SIZE;
    return (2 * Math.PI * ELLIPSOID_LONG_RADIUS) / tileTotalPixel;
  }

  /**
   * Get the row and column numbers of tiles according to Mercator coordinates and levels.
   * @param x Mercator x
   * @param y Mercator y
   * @param level Tile level
   * @returns The tile of col and row.
   */
  static getTileRowAndCol(x: number, y: number, level: number): TileCoord {
    const newX = x + (2 * Math.PI * ELLIPSOID_LONG_RADIUS) / 2;
    const newY = (2 * Math.PI * ELLIPSOID_LONG_RADIUS) / 2 - y;
    const resolution = Tile.getResolution(level);
    const col = Math.floor(newX / resolution / TILE_SIZE);
    const row = Math.floor(newY / resolution / TILE_SIZE);
    return {
      row,
      col,
    };
  }

  /**
   * According the tile row and column get the web mercator extend.
   * @param level LOD tile level
   * @param row Tile row
   * @param col Tile column
   * @returns The tile webmercator extend
   */
  static gridToWebMercator(level: number, row: number, col: number) {
    const k = Math.PI * ELLIPSOID_LONG_RADIUS;
    const size = (2 * k) / Math.pow(2, level);
    const minX = -k + col * size;
    const maxX = minX + size;
    const maxY = k - row * size;
    const minY = maxY - size;
    const min = new Vector2(minX, minY);
    const max = new Vector2(maxX, maxY);
    return new Extension(min, max);
  }

  /**
   * According the tile row and column get the geodetic extend.
   * @param level LOD tile level
   * @param row Tile row
   * @param col Tile column
   * @returns The tile geodetic extend
   */
  static getTileGeodeticByGrid(level: number, row: number, col: number) {
    // TODO: 可以优化，每个瓦片已经含有这个属性了
    const extend = Tile.gridToWebMercator(level, row, col);
    const minGeo = extend.min.toGeodetic2(Ellipsoid.Wgs84);
    const maxGeo = extend.max.toGeodetic2(Ellipsoid.Wgs84);
    return new GeoExtension(minGeo, maxGeo);
  }

  /**
   * According to the input tile and position information, get the row and column numbers of its adjacent tiles.
   * @param level LOD tile level
   * @param row Tile row
   * @param col Tile column
   * @param position
   * @returns Sibling tiles of the input tile
   */
  static getTileGridByBrother(
    level: number,
    row: number,
    col: number,
    position: "left" | "right" | "top" | "bottom"
  ): TileCoord {
    const maxSize = 1 << level;
    let newRow = row;
    let newCol = col;
    // TODO: 用取余数可以优化
    if (position == "left") {
      newCol = col === 0 ? maxSize - 1 : col - 1;
    } else if (position == "right") {
      newCol = col === maxSize - 1 ? 0 : col + 1;
    } else if (position == "top") {
      newRow = row === 0 ? maxSize - 1 : row - 1;
    } else if (position == "bottom") {
      newRow = row === maxSize - 1 ? 0 : row + 1;
    } else {
      throw "invalid position";
    }
    return {
      row: newRow,
      col: newCol,
    };
  }
}
