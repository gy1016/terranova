import { SKYBOX_CONFIG } from "../config";
import { Color, Vector3 } from "../math";
import { Engine } from "./Engine";
import { BackgroundMode } from "./enums/BackgroundMode";
import { Mesh } from "./graphic";
import { Material } from "./material";
import { SkyBoxMaterial } from "./material/SkyBoxMaterial";
import { ModelMesh } from "./mesh";
import { Shader } from "./shader";

/**
 * Background of the scene.
 */
export class Background {
  /**
   * The pattern of the background, which may be a single color, a skybox or a picture texture.
   */
  mode: BackgroundMode = BackgroundMode.SolidColor;

  /** Fixed color before skybox or texture is loaded successfully. */
  solidColor: Color = new Color(0.25, 0.25, 0.25, 1.0);

  /** Grid for background. */
  _mesh: Mesh;
  /** The material used for the background. */
  _material: Material;

  constructor(private _engine: Engine) {
    this._mesh = this._createPlane(this._engine);
    this._material = new SkyBoxMaterial(this._engine, SKYBOX_CONFIG);
  }

  /**
   * Background with flat grid.
   * @param engine Engine instance.
   * @returns Mesh
   */
  private _createPlane(engine: Engine): ModelMesh {
    const mesh = new ModelMesh(engine);

    const positions: Vector3[] = [
      new Vector3(-1, -1, 0),
      new Vector3(1, -1, 0),
      new Vector3(-1, 1, 0),
      new Vector3(-1, 1, 0),
      new Vector3(1, -1, 0),
      new Vector3(1, 1, 0),
    ];

    mesh.setPositions(positions);

    mesh.uploadData(false);
    mesh.addSubMesh(0, 6);
    return mesh;
  }

  _render() {
    const camera = this._engine.scene.camera;

    const gl = this._engine._renderer.gl;
    gl.depthFunc(gl.LEQUAL);
    const { _mesh, _material } = this;
    const skyboxProgram = _material.shader._getShaderProgram(this._engine, Shader._compileMacros);
    skyboxProgram.bind();
    skyboxProgram.uploadAll(skyboxProgram.cameraUniformBlock, camera.shaderData);
    skyboxProgram.uploadAll(skyboxProgram.materialUniformBlock, _material.shaderData);

    _mesh._draw(skyboxProgram, _mesh.subMesh);
  }
}
