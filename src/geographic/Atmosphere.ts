import { PrimitiveMesh } from "../core/mesh";
import { Ellipsoid } from "./Ellipsoid";
import { Material } from "../core/material";
import { Shader, ShaderData, ShaderProperty } from "../core/shader";
import { Engine } from "../core/Engine";
import { Entity } from "../core/Entity";
import { Vector3 } from "..";

export class Atmosphere extends Entity {
  private static _GlobeOneOverRadiiSquared: ShaderProperty = Shader.getPropertyByName("u_GlobeOneOverRadiiSquared");


  private _AtmosphereOneOverRadiiSquared: ShaderProperty = Shader.getPropertyByName("u_AtmosphereOneOverRadiiSquared");
  private _AtmosphereRayleighScaleHeight: ShaderProperty = Shader.getPropertyByName("u_AtmosphereRayleighScaleHeight");
  private _AtmosphereRayleighCoefficient: ShaderProperty = Shader.getPropertyByName("u_AtmosphereRayleighCoefficient");
  private _AtmosphereLightIntensity: ShaderProperty = Shader.getPropertyByName("u_AtmosphereLightIntensity");
  private _GlobeRadius: ShaderProperty = Shader.getPropertyByName("u_GlobeRadius");
  private _ViewSamples: ShaderProperty = Shader.getPropertyByName("u_ViewSamples");
  private _LightSamples: ShaderProperty = Shader.getPropertyByName("u_LightSamples");

  private _shape: Ellipsoid = Ellipsoid.Wgs84;
  private atmosphereOneOverRadiiSquared: Vector3;
  static thickness: number = 8e4;


  /** The ellipsoid parameters corresponding to the sphere. */
  get shape() {
    return this._shape;
  }

  set shape(ellipsoid: Ellipsoid) {
    this._shape = ellipsoid;
  }

  /**
   * Create a cube grid and build a picture material based on the engine.
   * @param engine Engine instance.
   */
  constructor(engine: Engine) {
    super(
      "Atmosphere",
      PrimitiveMesh.createCuboid(engine, 2 * (6378137.0 + Atmosphere.thickness),
        2 * (6356752.314245 + Atmosphere.thickness), 2 * (6378137.0 + Atmosphere.thickness)),
      new Material(engine, Shader.find("atmosphere"))
    );
    this.atmosphereOneOverRadiiSquared = new Vector3(
      1 / ((6378137.0 + Atmosphere.thickness) * (6378137.0 + Atmosphere.thickness)),
      1 / ((6356752.314245 + Atmosphere.thickness) * (6356752.314245 + Atmosphere.thickness)),
      1 / ((6378137.0 + Atmosphere.thickness) * (6378137.0 + Atmosphere.thickness))
    );
    console.log(Atmosphere.thickness);
  }

  /**
   * Upload the parameters of the ellipsoid to the GPU.
   * @param shaderData Scene shaderdata.
   */
  uploadShaderData(shaderData: ShaderData): void {
    shaderData.setVector3(Atmosphere._GlobeOneOverRadiiSquared, this.shape.oneOverRadiiSquared);
    shaderData.setVector3(this._AtmosphereOneOverRadiiSquared, this.atmosphereOneOverRadiiSquared);
    shaderData.setFloat(this._AtmosphereRayleighScaleHeight, 8000);
    shaderData.setVector3(this._AtmosphereRayleighCoefficient, new Vector3(5.5e-6, 13.0e-6, 28.4e-6));
    shaderData.setFloat(this._AtmosphereLightIntensity, 30);
    shaderData.setFloat(this._GlobeRadius, 6378137.0);
    shaderData.setInt(this._ViewSamples, 15);
    shaderData.setInt(this._LightSamples, 4);
  }
}