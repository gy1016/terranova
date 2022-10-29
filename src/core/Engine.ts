import { Canvas } from "./Canvas";
import { Renderer, WebGLRendererOptions } from "./render/Renderer";
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
}
