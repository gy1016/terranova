import { Shader, ShaderData, ShaderProperty } from "../shader";
import { Color } from "../../math";

/**
 * Ambient light.
 */
export class AmbientLight {
  /** Get the address of the point ambient color uniform variable in the shader. */
  private static _colorProperty: ShaderProperty = Shader.getPropertyByName("u_DiffuseSpecularAmbientShininess");
  /** The color of the light. */
  color: Color;

  constructor(color: Color) {
    this.color = color;
  }

  /**
   * Set variable value in shader.
   * @param shaderData Shader data.
   */
  _updateShaderData(shaderData: ShaderData): void {
    const color = this.color;
    shaderData.setColor(AmbientLight._colorProperty, color);
  }
}
