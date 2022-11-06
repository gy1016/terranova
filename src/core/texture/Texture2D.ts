import { Engine } from "../Engine";
import { TextureFilterMode } from "./enums/TextureFilterMode";
import { TextureFormat } from "./enums/TextureFormat";
import { TextureWrapMode } from "./enums/TextureWrapMode";
import { Texture } from "./Texture";

/**
 * Two-dimensional texture.
 */
export class Texture2D extends Texture {
  /**
   * Create Texture2D.
   * @param engine Define the engine to use to render this texture.
   * @param width Texture width.
   * @param height Texture height.
   * @param format Texture format. default  `TextureFormat.R8G8B8A8`.
   */
  constructor(engine: Engine, width: number, height: number, format: TextureFormat = TextureFormat.R8G8B8A8) {
    super();
    this._width = width;
    this._height = height;
    this._format = format;

    // TODO: 写死了，待优化
    this.filterMode = TextureFilterMode.Bilinear;
    this.wrapModeU = this.wrapModeV = TextureWrapMode.Repeat;

    this._rhi = engine._renderer;
    this._gl = engine._renderer.gl;
    this._glTexture = this._gl.createTexture();
    this._glTarget = this._gl.TEXTURE_2D;
    this._formatDetail = Texture._getFormatDetail(format, this._gl);
  }

  /**
   * Set texture based on pixel buffer.
   * @param colorBuffer Color buffer array.
   * @param width Set width.
   * @param height Set height.
   */
  setPixelBuffer(colorBuffer: ArrayBufferView, width: number, height: number): void {
    const gl = this._gl;
    const { internalFormat, baseFormat, dataType } = this._formatDetail;

    // webgl2 才可以考虑纹理压缩API isCompressed
    gl.bindTexture(this._glTarget, this._glTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(this._glTarget, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(this._glTarget, 0, internalFormat, width, height, 0, baseFormat, dataType, colorBuffer);
  }

  /**
   * Set the texture according to the picture.
   * @param imageSource Image source.
   * @param flipY Y axis reversed.
   */
  setImageSource(imageSource: TexImageSource, flipY: boolean): void {
    const gl = this._gl;
    const { baseFormat, dataType, internalFormat } = this._formatDetail;

    gl.bindTexture(this._glTarget, this._glTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, +flipY);
    // 将Alpha通道乘以其他颜色通道
    // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, +premultiplyAlpha);
    // gl.texSubImage2D(this._glTarget, mipLevel, x || 0, y || 0, baseFormat, dataType, imageSource);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(this._glTarget, 0, internalFormat, baseFormat, dataType, imageSource);
  }
}
