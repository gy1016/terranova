import { ImageMaterial, Shader } from "../../core";
import { Engine } from "../../core/Engine";
import { TILE_SERVICE_MAP, TileServiceMap } from "../../config";
import { Tile } from "./Tile";

export class TileLayer {
  protected _address: string | string[];

  level: number;
  tiles: Tile[] = [];
  engine: Engine;

  constructor(engine: Engine, level: number, service: keyof TileServiceMap) {
    this.engine = engine;
    this.level = level;
    this._address = TILE_SERVICE_MAP[service];
  }

  _initialLayer() {
    let url: string;
    let str: string;

    for (let row = 0; row < 1 << this.level; ++row) {
      for (let col = 0; col < 1 << this.level; ++col) {
        const tile = new Tile(this.engine, this.level, row, col);

        if (this._address instanceof Array) {
          str = this._address[Math.floor(this._address.length * Math.random())];
        } else {
          str = this._address;
        }
        url = this._initTileUrl(str, tile);

        const material = new ImageMaterial(this.engine, Shader.find("tile"), url);
        tile.material = material;
        this.tiles.push(tile);
      }
    }
  }

  /**
   * Select the base Url according to the service provider, and then obtain its url according to the tile instance.
   * @param str Tile address url
   * @param tile Tile instance
   * @returns The tile instance url.
   */
  private _initTileUrl(str: string, tile: Tile) {
    const res = [...str.matchAll(/(level|row|col)/gi)];
    for (let i = 0; i < res.length; ++i) {
      const key: string = res[i][0];
      str = str.replace(key, tile[key]);
    }
    return str;
  }

  _render() {
    const tiles = this.tiles;
    const engine = this.engine;
    const camera = engine.scene.camera;

    for (let i = 0; i < tiles.length; ++i) {
      const { mesh, material } = tiles[i];
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      mesh._draw(program, mesh.subMesh);
    }
  }
}
