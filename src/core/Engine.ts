import { Canvas } from "./Canvas";
import { PrimitiveMesh } from "./mesh";
import { Renderer, WebGLRendererOptions } from "./render/Renderer";
import { Shader, ShaderPool, ShaderProgramPool } from "./shader";
import { ShaderMacroCollection } from "./shader/ShaderMacroCollection";
import { Texture2D, Texture2DArray, TextureCube } from "./texture";

ShaderPool.init();

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
    // 每一个Shader都有一个ShaderProgramPools
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

  /**
   * Execution engine loop.
   */
  run(): void {
    this._canvas.resizeByClientSize();
    this._renderer.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const cube = PrimitiveMesh.createCuboid(this);
    const testProgram = Shader.find("test")._getShaderProgram(this, new ShaderMacroCollection());
    testProgram.bind();
    cube._draw(testProgram, cube.subMesh);
    console.log("run");
  }
}
