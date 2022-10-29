import { Canvas } from "./Canvas";
import { Renderer, WebGLRendererOptions } from "./render/Renderer";
import { Shader, ShaderProgramPool } from "./shader";
import { Texture2D, Texture2DArray, TextureCube } from "./texture";

export class Engine {
  protected _canvas: Canvas;

  _renderer: Renderer;
  /* @internal */
  _magentaTexture2D: Texture2D;
  /* @internal */
  _magentaTextureCube: TextureCube;
  /* @internal */
  _magentaTexture2DArray: Texture2DArray;
  /* @internal */
  _shaderProgramPools: ShaderProgramPool[] = [];

  /**
   * The canvas to use for rendering.
   */
  get canvas(): Canvas {
    return this._canvas;
  }

  constructor(canvas: string | HTMLCanvasElement, webGLRendererOptions?: WebGLRendererOptions) {
    const webCanvas = new Canvas(
      <HTMLCanvasElement>(typeof canvas === "string" ? document.getElementById(canvas) : canvas)
    );
    const hardwareRenderer = new Renderer(webGLRendererOptions);
    hardwareRenderer.init(webCanvas);

    this._canvas = webCanvas;
    this._renderer = hardwareRenderer;
  }

  /**
   * @internal
   */
  _getShaderProgramPool(shader: Shader): ShaderProgramPool {
    const index = shader._shaderId;
    const shaderProgramPools = this._shaderProgramPools;
    let pool = shaderProgramPools[index];
    if (!pool) {
      const length = index + 1;
      if (length < shaderProgramPools.length) {
        shaderProgramPools.length = length;
      }
      shaderProgramPools[index] = pool = new ShaderProgramPool();
    }
    return pool;
  }
}
