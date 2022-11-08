import { Camera } from "../Camera";
import { Shader } from "../shader";

export class RenderPipeline {
  private _camera: Camera;

  constructor(camera: Camera) {
    this._camera = camera;
  }

  render() {
    const compileMacros = Shader._compileMacros;

    const engine = this._camera.engine;
    const camera = this._camera;
    const scene = engine.scene;
    const background = scene.background;
    const rootEntities = scene.rootEntities;
    const renderer = engine._renderer;
    const canvas = engine.canvas;
    const gl = renderer.gl;

    renderer.viewport(0, 0, canvas.width, canvas.height);

    // 渲染实体
    gl.depthFunc(gl.LESS);
    for (let i = 0; i < rootEntities.length; ++i) {
      const { mesh, material } = rootEntities[i];

      const program = material.shader._getShaderProgram(engine, compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      // TODO: 其他数据还没上传

      mesh._draw(program, mesh.subMesh);
    }

    // 渲染背景
    gl.depthFunc(gl.LEQUAL);
    const { _mesh, _material } = background;
    const skyboxProgram = _material.shader._getShaderProgram(engine, compileMacros);
    skyboxProgram.bind();
    skyboxProgram.uploadAll(skyboxProgram.cameraUniformBlock, camera.shaderData);
    skyboxProgram.uploadAll(skyboxProgram.materialUniformBlock, _material.shaderData);
    _mesh._draw(skyboxProgram, _mesh.subMesh);
  }
}
