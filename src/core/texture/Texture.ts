import { Renderer } from "../render/Renderer";

export class Texture {
  /** @internal */
  _texture: Texture;
  /** @internal */
  _glTexture: WebGLTexture;
  /** @internal */
  _rhi: Renderer;
  /** @internal */
  _gl: WebGLRenderingContext & WebGL2RenderingContext;
  /** @internal */
  _isWebGL2: boolean;
  /** @internal */
  _target: GLenum; // gl.TEXTURE_2D | gl.TEXTURE_CUBE_MAP

  constructor(rhi: Renderer, texture: Texture, target: GLenum) {
    this._texture = texture;
    this._rhi = rhi;
    this._gl = rhi.gl as WebGLRenderingContext & WebGL2RenderingContext;
    this._isWebGL2 = rhi.isWebGL2;
    this._target = target;
    this._glTexture = this._gl.createTexture();
  }
}
