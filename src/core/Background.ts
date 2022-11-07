import { skyboxConfig } from "../config";
import { Color, Vector3 } from "../math";
import { Engine } from "./Engine";
import { BackgroundMode } from "./enums/BackgroundMode";
import { Mesh } from "./graphic";
import { Material } from "./material";
import { SkyBoxMaterial } from "./material/SkyBoxMaterial";
import { ModelMesh } from "./mesh";

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
    this._material = new SkyBoxMaterial(this._engine, skyboxConfig);
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
}