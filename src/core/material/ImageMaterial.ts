// import { loadImage } from "../base";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { Texture2D } from "../texture";
import { TextureFormat } from "../texture/enums/TextureFormat";
import { Material } from "./Material";

interface ImageMaterialOptions {
  image: HTMLImageElement;
  flipY: boolean;
  textureFormat?: TextureFormat;
}

export class ImageMaterial extends Material {
  /** The texture used by the image material. */
  texture2d: Texture2D;
  /** The address of the texture sampler in the shader. */
  static _sampleprop = Shader.getPropertyByName("u_Sampler");

  constructor(engine: Engine, shader: Shader, options: ImageMaterialOptions) {
    super(engine, shader);

    const { image, ..._options } = options;

    this._initialTexture(image, _options);
  }

  _initialTexture(image: HTMLImageElement, options: Omit<ImageMaterialOptions, "image">) {
    let { textureFormat } = options;
    textureFormat = textureFormat == undefined ? TextureFormat.R8G8B8A8 : textureFormat;
    this.texture2d = new Texture2D(this.engine, image.width, image.height, textureFormat);
    this.texture2d.setImageSource(image, options.flipY);
  }
}
