import { Engine } from "../Engine";
import { TextureFilterMode } from "./enums/TextureFilterMode";
import { TextureFormat } from "./enums/TextureFormat";
import { TextureWrapMode } from "./enums/TextureWrapMode";
import { Texture } from "./Texture";

/**
 * Cube texture.
 */
export class TextureCube extends Texture {
  /**
   * Create TextureCube.
   * @param engine Define the engine to use to render this texture.
   * @param size Texture size. texture width must be equal to height in cube texture.
   * @param format Texture format,default TextureFormat.R8G8B8A8.
   */
  constructor(engine: Engine, size: number, format: TextureFormat = TextureFormat.R8G8B8A8) {
    super();

    this._width = size;
    this._height = size;
    this._format = format;

    this.filterMode = TextureFilterMode.Bilinear;
    this.wrapModeU = this.wrapModeV = TextureWrapMode.Clamp;

    this._rhi = engine._renderer;
    this._gl = engine._renderer.gl;
    this._glTexture = this._gl.createTexture();
    this._glTarget = this._gl.TEXTURE_CUBE_MAP;
    this._formatDetail = Texture._getFormatDetail(format, this._gl);
  }

  /**
   * Set texture based on pixel buffer.
   * @param face Which side of the cube.
   * @param colorBuffer Color buffer.
   */
  setPixelBuffer(face: number, colorBuffer: ArrayBufferView): void {
    const gl = this._gl;
    const { internalFormat, baseFormat, dataType } = this._formatDetail;

    gl.bindTexture(this._glTarget, this._glTexture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
      0,
      internalFormat,
      this._width,
      this._height,
      0,
      baseFormat,
      dataType,
      colorBuffer
    );
  }

  /**
   * Set the texture according to the picture.
   * @param face Which side of the cube.
   * @param imageSource Image source.
   * @param mipLevel Mip level.
   */
  setImageSource(face: number, imageSource: TexImageSource | null): void {
    const gl = this._gl;
    const { baseFormat, dataType, internalFormat } = this._formatDetail;
    gl.bindTexture(this._glTarget, this._glTexture);
    gl.texImage2D(face, 0, internalFormat, baseFormat, dataType, imageSource);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  }
}
