import { Camera } from "../Camera";
import { ImageMaterial } from "../material";
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
    const layers = scene.layers;
    const renderer = engine._renderer;
    const canvas = engine.canvas;
    const gl = renderer.gl;

    renderer.viewport(0, 0, canvas.width, canvas.height);

    gl.depthFunc(gl.LESS);
    // TODO: 实体所属图层，应当移到图层里面，并且将这段逻辑移到场景的render方法里面
    // 渲染实体
    for (let i = 0; i < rootEntities.length; ++i) {
      const { mesh, material } = rootEntities[i];
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.sceneUniformBlock, scene.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);
      // TODO: 其他数据还没上传

      mesh._draw(program, mesh.subMesh);
    }

    // 渲染图层
    for (let i = 0; i < layers.length; ++i) {
      layers[i]._render(camera.level);
    }

    // TODO: 移到场景的render方法里面
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
