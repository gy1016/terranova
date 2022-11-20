import atmosphereVs from "../shaderlib/geographic/atmosphere.vs.glsl";
import atmosphereFs from "../shaderlib/geographic/atmosphere.fs.glsl";
import skyboxVs from "../shaderlib/geographic/skybox.vs.glsl";
import skyboxFs from "../shaderlib/geographic/skybox.fs.glsl";
import rayCastedGlobeVs from "../shaderlib/geographic/rayCastedGlobe.vs.glsl";
import rayCastedGlobeFs from "../shaderlib/geographic/rayCastedGlobe.fs.glsl";
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
    Shader.create("atmosphere", atmosphereVs, atmosphereFs);
    Shader.create("skybox", skyboxVs, skyboxFs);
    Shader.create("rayCastedGlobe", rayCastedGlobeVs, rayCastedGlobeFs);
    Shader.create("tile", tileVs, tileFs);
    Shader.create("test", testVs, testFs);
  }
}
