import { MathUtil, Matrix, Vector2, Vector4 } from "../math";
import { BoolUpdateFlag } from "./BoolUpdateFlag";
import { deepClone, ignoreClone } from "./clone";
import { Engine } from "./Engine";
import { ShaderData, ShaderDataGroup } from "./shader";
import { Transform } from "./Transform";

export class Camera {
  /** Shader data. */
  readonly shaderData: ShaderData = new ShaderData(ShaderDataGroup.Camera);

  private _engine: Engine;
  private _isProjMatSetting = false;
  private _nearClipPlane: number = 0.1;
  private _farClipPlane: number = 100;
  private _fieldOfView: number = 45;
  private _isProjectionDirty = true;
  private _customAspectRatio: number | undefined = undefined;

  @ignoreClone
  private _transform: Transform;
  @ignoreClone
  private _isViewMatrixDirty: BoolUpdateFlag;
  @deepClone
  private _projectionMatrix: Matrix = new Matrix();
  @deepClone
  private _viewMatrix: Matrix = new Matrix();
  @deepClone
  private _viewport: Vector4 = new Vector4(0, 0, 1, 1);
  @deepClone
  private _lastAspectSize: Vector2 = new Vector2(0, 0);

  get engine() {
    return this._engine;
  }

  get transform() {
    return this._transform;
  }

  /**
   * Near clip plane - the closest point to the camera when rendering occurs.
   */
  get nearClipPlane(): number {
    return this._nearClipPlane;
  }

  set nearClipPlane(value: number) {
    this._nearClipPlane = value;
  }

  /**
   * Far clip plane - the furthest point to the camera when rendering occurs.
   */
  get farClipPlane(): number {
    return this._farClipPlane;
  }

  set farClipPlane(value: number) {
    this._farClipPlane = value;
  }

  /**
   * The camera's view angle. activating when camera use perspective projection.
   */
  get fieldOfView(): number {
    return this._fieldOfView;
  }

  set fieldOfView(value: number) {
    this._fieldOfView = value;
  }

  /**
   * Aspect ratio. The default is automatically calculated by the viewport's aspect ratio. If it is manually set,
   * the manual value will be kept. Call resetAspectRatio() to restore it.
   */
  get aspectRatio(): number {
    const canvas = this.engine.canvas;
    return this._customAspectRatio ?? (canvas.width * this._viewport.z) / (canvas.height * this._viewport.w);
  }

  set aspectRatio(value: number) {
    this._customAspectRatio = value;
  }

  /**
   * Viewport, normalized expression, the upper left corner is (0, 0), and the lower right corner is (1, 1).
   * @remarks Re-assignment is required after modification to ensure that the modification takes effect.
   */
  get viewport(): Vector4 {
    return this._viewport;
  }

  set viewport(value: Vector4) {
    if (value !== this._viewport) {
      this._viewport.copyFrom(value);
    }
  }

  /**
   * View matrix.
   */
  get viewMatrix(): Readonly<Matrix> {
    if (this._isViewMatrixDirty.flag) {
      this._isViewMatrixDirty.flag = false;
      // Ignore scale.
      Matrix.rotationTranslation(
        this._transform.worldRotationQuaternion,
        this._transform.worldPosition,
        this._viewMatrix
      );
      this._viewMatrix.invert();
    }
    return this._viewMatrix;
  }

  /**
   * The projection matrix is calculated by the relevant parameters of the camera by default.
   * If it is manually set, the manual value will be maintained. Call resetProjectionMatrix() to restore it.
   */
  set projectionMatrix(value: Matrix) {
    this._projectionMatrix = value;
    this._isProjMatSetting = true;
  }

  get projectionMatrix(): Matrix {
    const canvas = this.engine.canvas;
    if (
      (!this._isProjectionDirty || this._isProjMatSetting) &&
      this._lastAspectSize.x === canvas.width &&
      this._lastAspectSize.y === canvas.height
    ) {
      return this._projectionMatrix;
    }
    this._isProjectionDirty = false;
    this._lastAspectSize.x = canvas.width;
    this._lastAspectSize.y = canvas.height;
    const aspectRatio = this.aspectRatio;

    Matrix.perspective(
      MathUtil.degreeToRadian(this._fieldOfView),
      aspectRatio,
      this._nearClipPlane,
      this._farClipPlane,
      this._projectionMatrix
    );

    return this._projectionMatrix;
  }

  constructor(engine: Engine) {
    this._engine = engine;
    this._transform = new Transform();
  }
}
