import { BoundingBox } from "../../math";
import { Engine } from "../Engine";
import { GLPrimitive } from "../render/GLPrimitive";
import { ShaderProgram } from "../shader";
import { BufferUtil } from "./BufferUtil";
import { MeshTopology } from "./enums/MeshTopology";
import { IndexBufferBinding } from "./IndexBufferBinding";
import { SubMesh } from "./SubMesh";
import { VertexBufferBinding } from "./VertexBufferBinding";
import { VertexElement } from "./VertexElement";

export abstract class Mesh {
  /** Name. */
  name: string;
  /** The bounding volume of the mesh. */
  readonly bounds: BoundingBox = new BoundingBox();

  _engine: Engine;
  _vertexElementMap: Record<string, VertexElement> = {};
  _glIndexType: number;
  _glIndexByteCount: number;
  _glPrimitive: GLPrimitive;

  /** @internal */
  _instanceCount: number = 0;
  /** @internal */
  _vertexBufferBindings: VertexBufferBinding[] = [];
  /** @internal */
  _indexBufferBinding: IndexBufferBinding = null;
  /** @internal */
  _vertexElements: VertexElement[] = [];
  /** @internal */
  _enableVAO: boolean = true;

  private _subMeshes: SubMesh[] = [];

  /**
   * First sub-mesh. Rendered using the first material.
   */
  get subMesh(): SubMesh | null {
    return this._subMeshes[0] || null;
  }

  /**
   * A collection of sub-mesh, each sub-mesh can be rendered with an independent material.
   */
  get subMeshes(): Readonly<SubMesh[]> {
    return this._subMeshes;
  }

  /**
   * Create mesh.
   * @param engine - Engine
   * @param name - Mesh name
   */
  constructor(engine: Engine, name?: string) {
    this._engine = engine;
    this.name = name;
    this._glPrimitive = engine._renderer.createPrimitive(this);
  }

  /**
   * Add sub-mesh, each sub-mesh can correspond to an independent material.
   * @param subMesh - Start drawing offset, if the index buffer is set, it means the offset in the index buffer, if not set, it means the offset in the vertex buffer
   * @returns Sub-mesh
   */
  addSubMesh(subMesh: SubMesh): SubMesh;

  /**
   * Add sub-mesh, each sub-mesh can correspond to an independent material.
   * @param start - Start drawing offset, if the index buffer is set, it means the offset in the index buffer, if not set, it means the offset in the vertex buffer
   * @param count - Drawing count, if the index buffer is set, it means the count in the index buffer, if not set, it means the count in the vertex buffer
   * @param topology - Drawing topology, default is MeshTopology.Triangles
   * @returns Sub-mesh
   */
  addSubMesh(start: number, count: number, topology?: MeshTopology): SubMesh;

  addSubMesh(
    startOrSubMesh: number | SubMesh,
    count?: number,
    topology: MeshTopology = MeshTopology.Triangles
  ): SubMesh {
    if (typeof startOrSubMesh === "number") {
      startOrSubMesh = new SubMesh(startOrSubMesh, count, topology);
    }
    this._subMeshes.push(startOrSubMesh);
    return startOrSubMesh;
  }

  /**
   * Remove sub-mesh.
   * @param subMesh - Sub-mesh needs to be removed
   */
  removeSubMesh(subMesh: SubMesh): void {
    const subMeshes = this._subMeshes;
    const index = subMeshes.indexOf(subMesh);
    if (index !== -1) {
      subMeshes.splice(index, 1);
    }
  }

  /**
   * Clear all sub-mesh.
   */
  clearSubMesh(): void {
    this._subMeshes.length = 0;
  }

  /**
   * @internal
   */
  _clearVertexElements(): void {
    this._vertexElements.length = 0;
    const vertexElementMap = this._vertexElementMap;
    for (const k in vertexElementMap) {
      delete vertexElementMap[k];
    }
  }

  /**
   * @internal
   */
  _addVertexElement(element: VertexElement): void {
    const { semantic } = element;
    this._vertexElementMap[semantic] = element;
    this._vertexElements.push(element);
  }

  /**
   * @internal
   */
  _setVertexBufferBinding(index: number, binding: VertexBufferBinding): void {
    this._vertexBufferBindings[index] = binding;
  }

  /**
   * @internal
   */
  _draw(shaderProgram: ShaderProgram, subMesh: SubMesh): void {
    this._glPrimitive.draw(shaderProgram, subMesh);
  }

  /**
   * Destroy.
   */
  _onDestroy(): void {
    this._vertexBufferBindings = null;
    this._indexBufferBinding = null;
    this._vertexElements = null;
    this._vertexElementMap = null;
    this._glPrimitive.destroy();
  }

  protected _setVertexElements(elements: VertexElement[]): void {
    this._clearVertexElements();
    for (let i = 0, n = elements.length; i < n; i++) {
      this._addVertexElement(elements[i]);
    }
  }

  protected _setIndexBufferBinding(binding: IndexBufferBinding | null): void {
    if (binding) {
      this._indexBufferBinding = binding;
      this._glIndexType = BufferUtil._getGLIndexType(binding.format);
      this._glIndexByteCount = BufferUtil._getGLIndexByteCount(binding.format);
    } else {
      this._indexBufferBinding = null;
      this._glIndexType = undefined;
    }
  }
}
