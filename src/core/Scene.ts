import { TileLayer, Atmosphere, Ellipsoid, GoogleLayer } from "../geographic";
import { RayCastedGlobe } from "../geographic/RayCastedGlobe";
import { Color, Vector3 } from "../math";
import { Background } from "./Background";
import { Logger } from "./base/Logger";
import { Camera } from "./Camera";
import { Engine } from "./Engine";
import { Entity } from "./Entity";
import { AmbientLight, PointLight } from "./lighting";
import { ImageMaterial } from "./material";
import { Shader, ShaderData, ShaderDataGroup } from "./shader";

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

  _atmosphere: Atmosphere;

  constructor(engine: Engine) {
    this._engine = engine;
  }

  private _initialAtmosphere() {
    this._atmosphere = new Atmosphere(this.engine);
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
    const cameraPos = engine.setting?.cameraPos || new Vector3(0, 0, 6378137 * 3);

    camera.nearClipPlane = 0.000001 * Ellipsoid.Wgs84.maximumRadius;
    camera.farClipPlane = 10.0 * Ellipsoid.Wgs84.maximumRadius;

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
    this.pointLight = new PointLight(engine.setting?.pointLightPos || new Vector3(0, 0, 6378137 * 3));
    this.pointLight._updateShaderData(this.shaderData);

    // 初始化场景环境光
    this.ambientLight = new AmbientLight(new Color(0.3, 0.3, 0.3, 1));
    this.ambientLight._updateShaderData(this.shaderData);
  }

  private _initialLayer() {
    // 初始化图层
    // this.layers.push(new ArcGISLayer(this.engine, 2));
    this.layers.push(new GoogleLayer(this.engine, 2));
  }

  _initial() {
    this._initialCamera();
    this._initialGlobe();
    this._initialAtmosphere();
    this._initialBackground();
    this._initialLight();
    this._initialLayer();
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

  _render() {
    const engine = this.engine;
    const gl = engine._renderer.gl;
    const camera = this.camera;
    const rootEntities = this.rootEntities;
    const layers = this._layers;
    const atmosphere = this._atmosphere;
    const background = this.background;

    // 渲染实体
    gl.depthFunc(gl.LESS);
    for (let i = 0; i < rootEntities.length; ++i) {
      const { mesh, material } = rootEntities[i];
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.sceneUniformBlock, this.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);
      // TODO: 其他数据还没上传

      mesh._draw(program, mesh.subMesh);
    }

    // 渲染图层
    for (let i = 0; i < layers.length; ++i) {
      layers[i]._render(camera.level);
    }

    atmosphere._render();
    background._render();
  }
}
