import { loadImage } from "../base";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { Texture2D } from "../texture";
import { TextureFormat } from "../texture/enums/TextureFormat";
import { Material } from "./Material";

interface ImageMaterialOptions {
  url: string;
  flipY: boolean;
}

export class ImageMaterial extends Material {
  /** The texture used by the image material. */
  texture2d: Texture2D;
  /** The address of the texture sampler in the shader. */
  static _sampleprop = Shader.getPropertyByName("u_Sampler");

  constructor(engine: Engine, shader: Shader, options: ImageMaterialOptions) {
    super(engine, shader);

    loadImage(options.url)
      .then((image) => {
        this.texture2d = new Texture2D(engine, image.width, image.height, TextureFormat.R8G8B8);
        this.texture2d.setImageSource(image, options.flipY);
      })
      .catch((error) => {
        throw error;
      });
  }
}
