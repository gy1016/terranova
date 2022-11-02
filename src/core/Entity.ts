import { Transform } from "./Transform";

export class Entity {
  /** Transform component. */
  readonly transform: Transform;

  private _parent: Entity = null;

  _children: Entity[] = [];

  /**
   * The parent entity.
   */
  get parent(): Entity {
    return this._parent;
  }
}
