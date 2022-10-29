import tileVs from "../shaderlib/geographic/tile.vs.glsl";
import tileFs from "../shaderlib/geographic/tile.fs.glsl";
import { Shader } from "./Shader";

/**
 * Internal shader pool.
 * @internal
 */
export class ShaderPool {
  static init(): void {
    Shader.create("tile", tileVs, tileFs);
  }
}
