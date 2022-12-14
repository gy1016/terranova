import { Engine, ImageMaterial, Shader } from "../../core";
import { Layer } from "./Layer";
import { Tile } from "./Tile";

interface ElevationLayerConfig {
  url: string;
}

export class ElevationLayer extends Layer {
  tiles: Tile[] = [];

  constructor(engine: Engine, config: ElevationLayerConfig) {
    super(engine);
  }

  _render(level: number) {
    const engine = this.engine;
    const camera = engine.scene.camera;
    const tiles = this.tiles;

    for (let i = 0; i < tiles.length; ++i) {
      const { mesh, material } = tiles[i];
      // ! 按道理说这里material肯定是有的，但是会报错，先加个判断
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
