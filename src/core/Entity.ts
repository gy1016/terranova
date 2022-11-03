import { Mesh } from "./graphic";
import { Material } from "./material";
import { Transform } from "./Transform";

export class Entity {
  /** Entity count. */
  static _count: number = 1;

  private _parent: Entity = null;
  private _children: Entity[] = [];

  /** Entity count. */
  id: number;
  /** Entity name. */
  name: string;
  /** Entity mesh. */
  mesh: Mesh;
  /** Entity material. */
  material: Material;
  /** Transform component. */
  readonly transform: Transform;

  /**
   * The parent entity.
   */
  get parent(): Entity {
    return this._parent;
  }
  /**
   * The children entity array.
   */
  get children(): Entity[] {
    return this._children;
  }

  /**
   * An entity consists of meshes and materials.
   * @param name Entity name.
   * @param mesh Entity mesh.
   * @param material Entity material.
   */
  constructor(name: string, mesh: Mesh, material: Material) {
    this.name = name;
    this.id = Entity._count++;
    this.mesh = mesh;
    this.material = material;
    this.transform = new Transform(this);
  }

  /**
   * Add child entities.
   * @param entity Child entities to be loaded.
   * @returns The number of child entities.
   */
  addEntity(entity: Entity): number {
    if (entity instanceof Entity) {
      if (this._children == null) {
        this._children = [];
      }
      this._children.push(entity);
    }
    return this._children.length;
  }
}
