import { Vector3 } from "..";
import { Logger } from "./base/Logger";
import { Camera } from "./Camera";
import { Engine } from "./Engine";
import { Entity } from "./Entity";
import { ShaderData, ShaderDataGroup } from "./shader";

export class Scene {
  /** Scene-related shader data. */
  readonly shaderData: ShaderData = new ShaderData(ShaderDataGroup.Scene);

  protected _engine: Engine;
  protected _camera: Camera;

  private _rootEntities: Entity[] = [];

  get engine() {
    return this._engine;
  }

  get camera() {
    return this._camera;
  }

  get rootEntities() {
    return this._rootEntities;
  }

  constructor(engine: Engine) {
    this._engine = engine;

    const cameraPos = engine.setting?.cameraPos || new Vector3(10, 10, 10);
    this._initCamera(cameraPos);
  }

  private _initCamera(position: Vector3) {
    const engine = this.engine;
    this._camera = new Camera(engine);

    const camera = this._camera;
    camera.transform.position = position;
    camera.transform.lookAt(new Vector3(0, 0, 0));
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
}
