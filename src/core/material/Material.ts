import { Engine } from "../Engine";
import { Shader, ShaderData, ShaderDataGroup } from "../shader";

export class Material {
  /** Name. */
  name: string;
  /** Shader data. */
  readonly shaderData: ShaderData = new ShaderData(ShaderDataGroup.Material);

  private _engine: Engine;
  private _shader: Shader;

  get engine(): Engine {
    return this._engine;
  }

  /**
   * Shader used by the material.
   */
  get shader(): Shader {
    return this._shader;
  }

  /**
   * Create a material instance.
   * @param engine - Engine to which the material belongs
   * @param shader - Shader used by the material
   */
  constructor(engine: Engine, shader: Shader) {
    this._engine = engine;
    this._shader = shader;
  }
}
