import { loadImage } from "../base";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { Texture2D } from "../texture";
import { TextureFormat } from "../texture/enums/TextureFormat";
import { Material } from "./Material";

// TODO: 导出到全局
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

interface Options {
  url?: string;
  flipY: boolean;
  base64?: string;
  textureFormat?: TextureFormat;
}

type ImageMaterialOptions = RequireOnlyOne<Options, "base64" | "url">;

export class ImageMaterial extends Material {
  /** The texture used by the image material. */
  texture2d: Texture2D;
  /** The address of the texture sampler in the shader. */
  static _sampleprop = Shader.getPropertyByName("u_Sampler");

  constructor(engine: Engine, shader: Shader, options: ImageMaterialOptions) {
    super(engine, shader);

    if (options.base64 != undefined) {
      const image = new Image();
      image.src = options.base64;
      // Base64也需要触发onload事件，记得改变this的指向
      const initialTexture = this._initialTexture.bind(this, image, options);
      image.onload = () => {
        initialTexture();
      };
    } else {
      loadImage(options.url)
        .then((image) => {
          this._initialTexture(image, options);
        })
        .catch((error) => {
          throw error;
        });
    }
  }

  _initialTexture(image: HTMLImageElement, options: ImageMaterialOptions) {
    let { textureFormat } = options;
    textureFormat = textureFormat == undefined ? TextureFormat.R8G8B8 : textureFormat;
    this.texture2d = new Texture2D(this.engine, image.width, image.height, textureFormat);
    this.texture2d.setImageSource(image, options.flipY);
  }
}
