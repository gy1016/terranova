import { ArcGISLayer, TileLayer } from "../geographic";
import { RayCastedGlobe } from "../geographic/RayCastedGlobe";
import { Color, Vector3 } from "../math";
import { Background } from "./Background";
import { Logger } from "./base/Logger";
import { Camera } from "./Camera";
import { Engine } from "./Engine";
import { Entity } from "./Entity";
import { AmbientLight, PointLight } from "./lighting";
import { ShaderData, ShaderDataGroup } from "./shader";

export class Scene {
  /** Scene-related shader data. */
  readonly shaderData: ShaderData = new ShaderData(ShaderDataGroup.Scene);

  protected _engine: Engine;
  protected _camera: Camera;
  /** Earth is the root entity in the scene. */
  private _globe: RayCastedGlobe;

  /** Point lights in the scene. */
  pointLight: PointLight;
  /** Ambient light in the scene. */
  ambientLight: AmbientLight;

  private _rootEntities: Entity[] = [];
  private _layers: TileLayer[] = [];

  get engine() {
    return this._engine;
  }

  get camera() {
    return this._camera;
  }

  get globe() {
    return this._globe;
  }

  get rootEntities() {
    return this._rootEntities;
  }

  get layers() {
    return this._layers;
  }

  /** The background of the scene, the default is the skybox. */
  background: Background;

  constructor(engine: Engine) {
    this._engine = engine;
  }

  private _initialGlobe() {
    // 将光追椭球推入根式体
    this._globe = new RayCastedGlobe(this.engine);
    this.globe.uploadShaderData(this.shaderData);

    this.rootEntities.push(this._globe);
  }

  private _initialCamera() {
    const engine = this.engine;
    const camera = new Camera(engine);
    const cameraPos = engine.setting?.cameraPos || new Vector3(6378137 * 3, 0, 0);

    camera.nearClipPlane = 0.000001 * this.globe.shape.maximumRadius;
    camera.farClipPlane = 10.0 * this.globe.shape.maximumRadius;

    this._camera = camera;
    camera.transform.position = cameraPos;
    camera.transform.lookAt(new Vector3(6378137, 0, 0));
  }

  private _initialBackground() {
    // 初始化背景，即天空盒
    this.background = new Background(this.engine);
  }

  private _initialLight() {
    const engine = this.engine;
    // 初始化场景点光源
    this.pointLight = new PointLight(engine.setting?.pointLightPos || new Vector3(6378137 * 3, 0, 0));
    this.pointLight._updateShaderData(this.shaderData);

    // 初始化场景环境光
    this.ambientLight = new AmbientLight(new Color(0.3, 0.3, 0.3, 1));
    this.ambientLight._updateShaderData(this.shaderData);
  }

  private _initialLayer() {
    // 初始化图层
    this.layers.push(new ArcGISLayer(this.engine, 1));
  }

  addRootEntity(entity: Entity): void {
    // 如果当前场景没有实体，就将当前实体设置为根实体
    if (entity instanceof Entity) {
      this._rootEntities.push(entity);
      Logger.info("rootEntity add successful!");
    } else {
      Logger.error("input type not equal entity!");
    }
  }

  _initial() {
    this._initialGlobe();
    this._initialCamera();
    this._initialBackground();
    this._initialLight();
    this._initialLayer();
  }
}
