import skyboxFs from "../shaderlib/extra/skybox.fs.glsl";
import skyboxVs from "../shaderlib/extra/skybox.vs.glsl";
import tileVs from "../shaderlib/geographic/tile.vs.glsl";
import tileFs from "../shaderlib/geographic/tile.fs.glsl";
import testVs from "../shaderlib/geographic/test.vs.glsl";
import testFs from "../shaderlib/geographic/test.fs.glsl";
import { Shader } from "./Shader";

/**
 * Internal shader pool.
 * @internal
 */
export class ShaderPool {
  static init(): void {
    Shader.create("skybox", skyboxVs, skyboxFs);
    Shader.create("tile", tileVs, tileFs);
    Shader.create("test", testVs, testFs);
  }
}
