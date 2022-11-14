import { Extend, MathUtil, Vector2, Vector3 } from "../../math";
import { Material } from "../../core/material";
import { ModelMesh } from "../../core/mesh";
import { Engine } from "../../core/Engine";

export class Tile {
  mesh: ModelMesh;
  material: Material;

  level: number;
  row: number;
  col: number;
  extend: Extend;

  private _segment: number;

  constructor(engine: Engine, level: number, row: number, col: number) {
    this.level = level;
    this.row = row;
    this.col = col;
    this._segment = this.level < 6 ? 1 << (6 - this.level) : 1;
    this.extend = MathUtil.gridToWebMercator(this.level, this.row, this.col);

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
        const geodetic = MathUtil.webMercatorToGeodetic(_tempVector2);
        const cartesian = MathUtil.geodeticToCartesian(geodetic);

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
}
