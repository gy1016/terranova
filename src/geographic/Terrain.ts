import { GeoExtension } from "../math/GeoExtension";
import { Engine, Material, ModelMesh, TypedArray } from "../core";
import { Ellipsoid } from "./Ellipsoid";
import { Vector3, Vector2 } from "../math";
import { Tile } from "./layers";

// Terrain不同于Tile，Tile可以在没请求到自愿的情况下产生顶点数据，但Terrain必须请求资源再产生顶点数据
export class Terrain {
  engine: Engine;
  mesh: ModelMesh;
  material: Material;
  level: number;
  row: number;
  col: number;
  width: number;
  height: number;
  geoExtension: GeoExtension;
  ellipsoid: Ellipsoid = Ellipsoid.Wgs84;

  constructor(engine: Engine, level: number, row: number, col: number) {
    this.engine = engine;
    this.level = level;
    this.row = row;
    this.col = col;

    const extension = Tile.gridToWebMercator(this.level, this.row, this.col);
    this.geoExtension = new GeoExtension(
      extension.min.toGeodetic2(this.ellipsoid),
      extension.max.toGeodetic2(this.ellipsoid)
    );

    this.mesh = new ModelMesh(engine);
  }

  _generateVertex(heightmap: TypedArray) {
    const ellipsoid = this.ellipsoid;
    const width = this.width;
    const height = this.height;
    const geographicWest = this.geoExtension.min.radLon;
    const geographicSouth = this.geoExtension.min.radLat;
    const geographicEast = this.geoExtension.max.radLon;
    const geographicNorth = this.geoExtension.max.radLat;

    const rectangleWidth = geographicEast - geographicWest;
    const rectangleHeight = geographicNorth - geographicSouth;

    const granularityX = rectangleWidth / (width - 1);
    const granularityY = rectangleHeight / (height - 1);

    const positions: Vector3[] = [];
    const uvs: Vector2[] = [];
    const indices: number[] = [];

    const startRow = 0;
    const endRow = height;
    const startCol = 0;
    const endCol = width;

    for (let rowIndex = startRow; rowIndex < endRow; ++rowIndex) {
      const latitude = geographicNorth - granularityY * rowIndex;
      const v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);

      const cosLatitude = Math.cos(latitude);
      const nZ = Math.sin(latitude);
      const kZ = ellipsoid.radiiSquared.z * nZ;

      for (let colIndex = startCol; colIndex < endCol; ++colIndex) {
        // 用于从高度图中读取像素
        const index = rowIndex * width + colIndex;
        const heightSample = heightmap[index] * 100;
        const longitude = geographicWest + granularityX * colIndex;
        const u = (longitude - geographicWest) / (geographicEast - geographicWest);

        const nX = cosLatitude * Math.cos(longitude);
        const nY = cosLatitude * Math.sin(longitude);

        const kX = ellipsoid.radiiSquared.x * nX;
        const kY = ellipsoid.radiiSquared.y * nY;

        const gamma = Math.sqrt(kX * nX + kY * nY + kZ * nZ);
        const oneOverGamma = 1.0 / gamma;

        const rSurfaceX = kX * oneOverGamma;
        const rSurfaceY = kY * oneOverGamma;
        const rSurfaceZ = kZ * oneOverGamma;

        const position = new Vector3();
        position.x = rSurfaceX + nX * heightSample;
        position.y = rSurfaceY + nY * heightSample;
        position.z = rSurfaceZ + nZ * heightSample;

        positions.push(position);
        uvs.push(new Vector2(u, v));
      }
    }

    const segment = width - 1;
    // TODO: 所有瓦片的顶点索引可以公用，只需要生成一次就可以！
    for (let i = 0; i < segment; ++i) {
      for (let j = 0; j < segment; ++j) {
        const idx0 = (segment + 1) * i + j;
        const idx1 = (segment + 1) * (i + 1) + j;
        const idx2 = idx1 + 1;
        const idx3 = idx0 + 1;
        indices.push(idx0, idx1, idx2, idx2, idx3, idx0);
      }
    }

    this._initialize(this.mesh, positions, uvs, new Uint32Array(indices), true);
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
