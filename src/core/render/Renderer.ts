import { Canvas } from "../Canvas";
import { RenderStates } from "./RenderStates";

/**
 * WebGL mode.
 */
export enum WebGLMode {
  /** Auto, use WebGL2.0 if support, or will fallback to WebGL1.0. */
  Auto = 0,
  /** WebGL2.0. */
  WebGL2 = 1,
  /** WebGL1.0, */
  WebGL1 = 2,
}

/**
 * WebGL renderer options.
 */
export interface WebGLRendererOptions extends WebGLContextAttributes {
  /** WebGL mode.*/
  webGLMode?: WebGLMode;
}

export class Renderer {
  private _options: WebGLRendererOptions;
  private _gl: WebGLRenderingContext | WebGL2RenderingContext;
  private _renderStates: RenderStates;
  private _canvas: Canvas;
  private _isWebGL2: boolean;

  private _activeTextureID: number;

  get isWebGL2() {
    return this._isWebGL2;
  }

  /**
   * GL Context
   * @member {WebGLRenderingContext}
   */
  get gl() {
    return this._gl;
  }

  get renderStates(): RenderStates {
    return this._renderStates;
  }

  constructor(options: WebGLRendererOptions = {}) {
    this._options = options;
  }

  init(canvas: Canvas) {
    const option = this._options;
    option.alpha === undefined && (option.alpha = false);
    option.stencil === undefined && (option.stencil = true);
    const webCanvas = (this._canvas = canvas)._canvas;
    const webGLMode = option.webGLMode || WebGLMode.Auto;
    let gl: WebGLRenderingContext | WebGL2RenderingContext;

    if (webGLMode == WebGLMode.Auto || webGLMode == WebGLMode.WebGL2) {
      gl = webCanvas.getContext("webgl2", option);
      // Compatibility is not considered here.
      this._isWebGL2 = true;
    }

    if (!gl) {
      if (webGLMode == WebGLMode.Auto || webGLMode == WebGLMode.WebGL1) {
        gl = webCanvas.getContext("webgl", option);
        this._isWebGL2 = false;
      }
    }

    if (!gl) {
      throw new Error("Get GL Context FAILED.");
    }

    this._gl = gl;
    this._activeTextureID = gl.TEXTURE0;
    this._renderStates = new RenderStates(gl);

    // Make sure the active texture in gl context is on default, because gl context may be used in other webgl renderer.
    gl.activeTexture(gl.TEXTURE0);

    this._options = null;
  }
}
