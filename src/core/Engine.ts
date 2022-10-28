import { Canvas } from "./Canvas";
import { Renderer, WebGLRendererOptions } from "./render/Renderer";

export class Engine {
  protected _canvas: Canvas;
  protected _renderer: Renderer;

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
