import { Camera } from "../Camera";
import { Engine } from "../Engine";
import { Scene } from "../Scene";
import { Shader } from "../shader";

export class RenderPipeline {
  private _scene: Scene;
  private _engine: Engine;
  private _camera: Camera;

  constructor(engine: Engine) {
    this._engine = engine;
    this._scene = engine.scene;
    this._camera = engine.scene.camera;
  }

  render() {
    const compileMacros = Shader._compileMacros;

    const engine = this._engine;
    const camera = this._camera;

    const rootEntities = this._scene.rootEntities;
    for (let i = 0; i < rootEntities.length; ++i) {
      const { mesh, material } = rootEntities[i];

      const program = material.shader._getShaderProgram(engine, compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      // TODO: 其他数据还没上传

      mesh._draw(program, mesh.subMesh);
    }
  }
}
