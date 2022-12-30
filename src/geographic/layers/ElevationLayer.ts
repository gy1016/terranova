import { Engine, ImageMaterial, Shader } from "../../core";
import { Terrain } from "../Terrain";
import { Layer } from "./Layer";
import { LRU } from "../LRU";
import * as Lerc from "lerc";

interface ElevationLayerConfig {
  terrainAddress: string;
  tileAddress: string;
}

export class ElevationLayer extends Layer {
  terrains: Terrain[] = [];
  private _terrainAddress: string;
  private _tileAddress: string;
  private _isLercLoad: boolean = false;
  private _lruCache: LRU<string, Terrain> = new LRU(10);

  constructor(engine: Engine, config: ElevationLayerConfig) {
    super(engine);
    this._terrainAddress = config.terrainAddress;
    this._tileAddress = config.tileAddress;
    Lerc.load({
      locateFile: () => {
        return "https://unpkg.com/lerc@4.0.1/lerc-wasm.wasm";
      },
    }).then(() => {
      this._isLercLoad = true;
    });
  }

  async _refresh() {
    if (this._isLercLoad === false) return;
    const terrainAddress = this._terrainAddress;
    const tileAddress = this._tileAddress;
    let terrainUrl: string;
    let tileUrl: string;

    for (let i = 0; i < 2; ++i) {
      for (let j = 0; j < 2; ++j) {
        const terrain = new Terrain(this.engine, 1, i, j);
        if (this._lruCache.get(terrain.key)) continue;
        // 生成高度图的资源URL
        terrainUrl = this._initUrl(terrainAddress, terrain);
        const arrayBuffer = await fetch(terrainUrl).then((response) => response.arrayBuffer());
        const result = Lerc.decode(arrayBuffer);
        const heightmap = result.pixels[0];
        terrain.width = result.width;
        terrain.height = result.height;
        // 根据高度图生成格网
        terrain._generateVertex(heightmap);

        // 根据瓦片生成材质
        tileUrl = this._initUrl(tileAddress, terrain);
        const material = new ImageMaterial(this.engine, Shader.find("tile"), { url: tileUrl, flipY: true });
        terrain.material = material;
        this._lruCache.put(terrain.key, terrain);
        this.terrains.push(terrain);
      }
    }
  }

  _render(level: number) {
    this._refresh();
    const engine = this.engine;
    const camera = engine.scene.camera;
    const terrains = this.terrains;

    for (let i = 0; i < terrains.length; ++i) {
      const { mesh, material } = terrains[i];
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
