import { MathUtil, Matrix, Vector2, Vector3, Vector4 } from "../math";
import { BoolUpdateFlag } from "./BoolUpdateFlag";
import { deepClone, ignoreClone } from "./clone";
import { Engine } from "./Engine";
import { RenderPipeline } from "./render";
import { Shader, ShaderData, ShaderDataGroup } from "./shader";
import { Transform } from "./Transform";
import { OrbitControl } from "../controls";

export class Camera {
  /** Shader data. */
  readonly shaderData: ShaderData = new ShaderData(ShaderDataGroup.Camera);

  _orbitControl: OrbitControl;

  private _engine: Engine;
  private _level: number = 2;
  private _isProjMatSetting = false;
  private _nearClipPlane: number = 0.1;
  private _farClipPlane: number = 100;
  private _fieldOfView: number = 45;
  private _isProjectionDirty = true;
  private _customAspectRatio: number | undefined = undefined;
  private _lastCameraPos: Vector3 = new Vector3();

  @ignoreClone
  private _transform: Transform;
  @ignoreClone
  private _isViewMatrixDirty: BoolUpdateFlag;
  @ignoreClone
  _renderPipeline: RenderPipeline;
  @deepClone
  private _projectionMatrix: Matrix = new Matrix();
  @deepClone
  private _viewMatrix: Matrix = new Matrix();
  @deepClone
  private _viewport: Vector4 = new Vector4(0, 0, 1, 1);
  @deepClone
  private _lastAspectSize: Vector2 = new Vector2(0, 0);

  private static _vpMatrixProperty = Shader.getPropertyByName("u_MvpMat");
  // 我这个逆矩阵是忽略了平移参数的，只考虑方向
  private static _invVPMatrixProperty = Shader.getPropertyByName("u_InvVPMat");
  // 用于光线追踪求解射线与椭球的一元二次方程
  private static _cameraPositionProperty = Shader.getPropertyByName("u_CameraPos");
  private static _cameraPosSquaredProperty = Shader.getPropertyByName("u_CameraPosSquared");
  private static _cameraFarPlaneProperty = Shader.getPropertyByName("u_Far");

  get engine() {
    return this._engine;
  }

  // ! TODO: 不能超过指定层级还没做
  get level() {
    const position = this.transform.position.clone();
    const lastCameraPos = this._lastCameraPos;

    if (Vector3.equals(position, lastCameraPos)) return this._level;
    this._lastCameraPos = position.clone();

    const sufracePos = MathUtil.scaleToGeodeticSufrace(this.engine.scene.globe.shape, position);
    const h = position.subtract(sufracePos).length();

    // TODO: 这个该用视锥体进行数学计算
    // ! It's ugly but useful.
    if (h <= 100) {
      this._level = 19;
    } else if (h <= 300) {
      this._level = 18;
    } else if (h <= 660) {
      this._level = 17;
    } else if (h <= 1300) {
      this._level = 16;
    } else if (h <= 2600) {
      this._level = 15;
    } else if (h <= 6400) {
      this._level = 14;
    } else if (h <= 13200) {
      this._level = 13;
    } else if (h <= 26000) {
      this._level = 12;
    } else if (h <= 67985) {
      this._level = 11;
    } else if (h <= 139780) {
      this._level = 10;
    } else if (h <= 250600) {
      this._level = 9;
    } else if (h <= 380000) {
      this._level = 8;
    } else if (h <= 640000) {
      this._level = 7;
    } else if (h <= 1280000) {
      this._level = 6;
    } else if (h <= 2600000) {
      this._level = 5;
    } else if (h <= 6100000) {
      this._level = 4;
    } else if (h <= 11900000) {
      this._level = 3;
    } else {
      this._level = 2;
    }

    return this._level;
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
    this._transform = new Transform(this);
    this._isViewMatrixDirty = this._transform.registerWorldChangeFlag();
    this._orbitControl = new OrbitControl(this);
    this._renderPipeline = new RenderPipeline(this);
  }

  /**
   * Upload camera-related shader data.
   */
  private _updateShaderData(): void {
    const shaderData = this.shaderData;

    const vpMat = new Matrix();
    // 注意顺序：perspect * view * model
    Matrix.multiply(this.projectionMatrix, this.viewMatrix, vpMat);

    const invVPMat = this.viewMatrix.clone();
    (invVPMat.elements[12] = 0), (invVPMat.elements[13] = 0), (invVPMat.elements[14] = 0);
    Matrix.multiply(this.projectionMatrix, invVPMat, invVPMat);
    invVPMat.invert();

    const cameraPos = this.transform.worldPosition;
    const cameraPosSquared = new Vector3();
    Vector3.multiply(cameraPos, cameraPos, cameraPosSquared);

    shaderData.setFloat(Camera._cameraFarPlaneProperty, this.farClipPlane);
    shaderData.setMatrix(Camera._vpMatrixProperty, vpMat);
    shaderData.setMatrix(Camera._invVPMatrixProperty, invVPMat);
    shaderData.setVector3(Camera._cameraPositionProperty, cameraPos);
    shaderData.setVector3(Camera._cameraPosSquaredProperty, cameraPosSquared);
  }

  /**
   * The upload method is triggered by render.
   */
  render(): void {
    this._updateShaderData();
    this._renderPipeline.render();
  }
}
