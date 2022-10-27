/**
 * Encapsulate canvas tag.
 */
export class Canvas {
  _canvas: HTMLCanvasElement;

  private _width: number;
  private _height: number;

  /**
   * @inheritdoc
   */
  get width(): number {
    return this._width;
  }

  set width(value: number) {
    if (this._width !== value) {
      this._canvas.width = value;
      this._width = value;
    }
  }

  /**
   * @inheritdoc
   */
  get height(): number {
    return this._height;
  }

  set height(value: number) {
    if (this._height !== value) {
      this._canvas.height = value;
      this._height = value;
    }
  }

  /**
   * Resize the rendering size according to the clientWidth and clientHeight of the canvas.
   * @param pixelRatio - Pixel ratio
   */
  resizeByClientSize(pixelRatio: number = window.devicePixelRatio): void {
    const canvas = this._canvas;
    if (canvas instanceof HTMLCanvasElement) {
      this.width = canvas.clientWidth * pixelRatio;
      this.height = canvas.clientHeight * pixelRatio;
    }
  }

  /**
   * Create a web canvas.
   * @param canvas - Web native canvas
   */
  constructor(canvas: HTMLCanvasElement) {
    const width = canvas.width;
    const height = canvas.height;
    this._canvas = canvas;
    this._width = width;
    this._height = height;
  }
}
