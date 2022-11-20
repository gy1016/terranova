import { Vector3, Vector2 } from "../math";
import { Engine, ModelMesh, Material, ImageMaterial, Shader } from "../core";
import { Ellipsoid } from "../geographic";
import { EARTH_ATMOSPHERE } from "../config";

// TODO: 和瓦片模块基本一样，可以抽象
export class Atmosphere {
  engine: Engine;
  _mesh: ModelMesh;
  _material: Material;

  private _segment: number = 360;
  private _smallRadius = Ellipsoid.Wgs84.maximumRadius * 0.99;
  private _bigRadius = Ellipsoid.Wgs84.maximumRadius * 1.05;

  constructor(engine: Engine) {
    this.engine = engine;
    this._mesh = new ModelMesh(engine);
    this._generateVertex();
    this._material = new ImageMaterial(this.engine, Shader.find("atmosphere"), { url: EARTH_ATMOSPHERE, flipY: false });
  }

  private _generateVertex() {
    const sr = this._smallRadius;
    const br = this._bigRadius;

    const smallCirclePos: Vector3[] = [];
    const bigCirclePos: Vector3[] = [];
    const smallCircleUV: Vector2[] = [];
    const bigCircleUV: Vector2[] = [];

    const positions: Vector3[] = [];
    const uvs: Vector2[] = [];
    const indices: number[] = [];

    const deltaRadian: number = (Math.PI * 2) / this._segment;
    const deltaS: number = 1.0 / this._segment;

    for (let i = 0; i <= this._segment; ++i) {
      const u = deltaS * i > 1 ? 1 : deltaS * i;
      const sx = sr * Math.cos(i * deltaRadian);
      const sy = sr * Math.sin(i * deltaRadian);
      const bx = br * Math.cos(i * deltaRadian);
      const by = br * Math.sin(i * deltaRadian);

      // 填充顶点
      const sVertex = new Vector3(sx, sy, 0);
      const bVertex = new Vector3(bx, by, 0);

      smallCirclePos.push(sVertex);
      bigCirclePos.push(bVertex);

      // 填充纹理
      // 小圈的纵坐标总是1（不反转Y轴）
      const sTexture = new Vector2(u, 1);
      // 大圈的纵坐标总是0
      const bTexture = new Vector2(u, 0);

      smallCircleUV.push(sTexture);
      bigCircleUV.push(bTexture);
    }

    positions.push(...smallCirclePos, ...bigCirclePos);
    uvs.push(...smallCircleUV, ...bigCircleUV);

    for (let i = 0; i < this._segment; ++i) {
      for (let j = 0; j < this._segment; ++j) {
        const idx0 = (this._segment + 1) * i + j;
        const idx1 = (this._segment + 1) * (i + 1) + j;
        const idx2 = idx1 + 1;
        const idx3 = idx0 + 1;
        indices.push(idx0, idx1, idx2, idx2, idx3, idx0);
      }
    }

    this._initialize(this._mesh, positions, uvs, new Uint32Array(indices), true);
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

  // TODO: alpha透明通道应该要开一下
  _render() {
    const engine = this.engine;
    // const gl = engine._renderer.gl;
    const camera = engine.scene.camera;
    const mesh = this._mesh;
    const material = this._material;

    material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
    const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
    program.bind();
    program.uploadAll(program.cameraUniformBlock, camera.shaderData);
    program.uploadAll(program.materialUniformBlock, material.shaderData);

    mesh._draw(program, mesh.subMesh);
  }
}
