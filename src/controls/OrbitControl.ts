/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ellipsoid } from "../geographic";
import { Camera } from "../core/Camera";
import { Matrix, Vector2, Vector3, MathUtil } from "../math";
import { Spherical } from "./Spherical";
import { RayCastedGlobe } from "@/geographic/RayCastedGlobe";

type MouseWheelEvent = any;

/**
 * Orbital controls for zooming around a center point.
 */
export class OrbitControl {
  /** Camera instance, the essence of orbit control is to change the camera position. */
  camera: Camera;
  /** DOM element, mainly used to listen for mouse up events. */
  domElement: HTMLElement | Document;
  /** Canvas element, mainly used to monitor mouse movement events. */
  mainElement: HTMLCanvasElement;
  /** Camera frustum angle. */
  fov: number;
  /** Where the camera is looking. */
  target: Vector3;
  /** Camera up. */
  up: Vector3;
  /** The minimum distance from the camera to the object. */
  minDistance: number;
  /** The maximum distance from the camera to the object. */
  maxDistance: number;
  /** The smallest zoom scale of the camera. */
  minZoom: number;
  /** The maximum zoom scale of the camera. */
  maxZoom: number;
  /** Scaling factor. */
  zoomFactor: number;
  /** Min polar angle. */
  minPolarAngle: number;
  /** Max polar angle. */
  maxPolarAngle: number;
  /** Min azimuth angle. */
  minAzimuthAngle: number;
  /** Max azimuth angle. */
  maxAzimuthAngle: number;
  // TODO: enable变量的开关控制都没有做
  /** Whether to enable damping. */
  enableDamping: boolean;
  /** Whether to enable rotate. */
  enableRotate: boolean;
  /** Whether to enable zoom. */
  enableZoom: boolean;
  /** Whether to enable pan. */
  enablePan: boolean;
  /** Damping factor */
  dampingFactor: number;
  /** Zoom speed */
  zoomSpeed: number;
  /** Whether to auto rotate. */
  autoRotate: boolean;
  /** Auto rotate speed. */
  autoRotateSpeed: number = Math.PI;
  /** Rotate speed. */
  rotateSpeed: number;
  /** Clicking the corresponding key with the mouse is actually the key corresponding to the left button, the scroll wheel and the right button. */
  mouseButtons: { PAN: number; ROTATE: number; ZOOM: number };
  /** What state is the current controller in. */
  STATE: {
    PAN: number;
    ROTATE: number;
    ZOOM: number;
    NONE: number;
  };
  /** Contains mousemove and mouseup. */
  mouseUpEvents: { listener: any; type: string }[];
  /** Contains mousedown and wheel. */
  constEvents: { listener: any; type: string; element?: Window }[];

  private _position: Vector3;
  private _targetRelative: Vector3;
  private _upRelative: Vector3;
  private _offset: Vector3;
  private _spherical: Spherical;
  private _sphericalDelta: Spherical;
  private _sphericalDump: Spherical;
  private _relativeOffset: Vector3;
  private _relativeSpherical: Spherical;
  private _relativeSphericalDelta: Spherical;
  private _clickedPoint: Vector3;
  private _clickedPointSpherical: Spherical;
  private _zoomFrag: number;
  private _scale: number;
  private _isMouseUp: boolean;
  private _state: any;
  private _panStart: Vector2;
  private _panEnd: Vector2;
  private _panDelta: Vector2;
  private _rotateStart: Vector2;
  private _rotateEnd: Vector2;
  private _rotateDelta: Vector2;
  private _zoomStart: Vector2;
  private _zoomEnd: Vector2;
  private _zoomDelta: Vector2;

  constructor(camera: Camera) {
    this.camera = camera;
    this.domElement = document;
    this.mainElement = camera.engine.canvas._canvas;
    this.fov = 45;
    this.target = new Vector3();
    this.up = new Vector3(0, 1, 0);
    this.minDistance = Ellipsoid.Wgs84.minimumRadius;
    this.maxDistance = Infinity;
    this.minZoom = 0.0;
    this.maxZoom = Infinity;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;
    this.enableDamping = true;
    this.dampingFactor = 0.1;
    this.zoomFactor = 0.2;
    this.enableZoom = true;
    // this.zoomSpeed = 1.0;
    this.enableRotate = true;
    // this.rotateSpeed = 1.0;
    this.enablePan = true;
    this.autoRotate = false;
    this.mouseButtons = {
      PAN: 0,
      ROTATE: 1,
      ZOOM: 2,
    };

    // Reuse objects to prevent excessive stack allocation.
    // update
    this._position = new Vector3();
    this._targetRelative = new Vector3(-0.001, -1, 0);
    this._upRelative = new Vector3(-1, 0, 0);
    this._offset = new Vector3();
    this._spherical = new Spherical();
    this._sphericalDelta = new Spherical();
    this._sphericalDump = new Spherical();
    this._relativeOffset = new Vector3();
    this._relativeSpherical = new Spherical();
    this._relativeSphericalDelta = new Spherical();
    this._clickedPoint = new Vector3();
    this._clickedPointSpherical = new Spherical();
    this._zoomFrag = 0;
    this._scale = 1;
    this._isMouseUp = true;

    // state
    this._rotateStart = new Vector2();
    this._rotateEnd = new Vector2();
    this._rotateDelta = new Vector2();

    this._panStart = new Vector2();
    this._panEnd = new Vector2();
    this._panDelta = new Vector2();

    this._zoomStart = new Vector2();
    this._zoomEnd = new Vector2();
    this._zoomDelta = new Vector2();

    this.STATE = {
      NONE: -1,
      PAN: 0,
      ROTATE: 1,
      ZOOM: 2,
    };
    this._state = this.STATE.NONE;

    this.constEvents = [
      { type: "mousedown", listener: this.onMouseDown.bind(this) },
      { type: "wheel", listener: this.onMouseWheel.bind(this) },
    ];

    this.mouseUpEvents = [
      { type: "mousemove", listener: this.onMouseMove.bind(this) },
      { type: "mouseup", listener: this.onMouseUp.bind(this) },
    ];

    // onMouseDown里面处理了mousemove和mouseup的事件
    this.constEvents.forEach((ele) => {
      if (ele.element) {
        ele.element.addEventListener(ele.type, ele.listener, false);
      } else {
        this.mainElement.addEventListener(ele.type, ele.listener, false);
      }
    });
  }

  get relativeLevelSpeed(): number {
    // TODO: 做的不好
    const base = this.camera.level < 6 ? 0.65 : 0.55;
    return Math.pow(base, this.camera.level);
  }

  /**
   * The life cycle of track control destruction, used to remove listener events.
   */
  onDestory(): void {
    this.constEvents.forEach((ele) => {
      if (ele.element) {
        ele.element.removeEventListener(ele.type, ele.listener, false);
      } else {
        this.mainElement.removeEventListener(ele.type, ele.listener, false);
      }
    });
    const element = this.domElement === document ? this.domElement.body : this.domElement;
    this.mainElement.removeEventListener(this.mouseUpEvents[0].type, this.mouseUpEvents[0].listener, false);
    element.removeEventListener(this.mouseUpEvents[1].type, this.mouseUpEvents[1].listener, false);
  }

  /**
   * The orbit controls the life cycle, updating the view based on the current mouse changes.
   * @param dtime Used to calculate how many degrees to rotate.
   */
  onUpdate(dtime: number) {
    const position: Vector3 = this.camera.transform.position;
    this._offset = position.clone();
    this._spherical.setFromVec3(this._offset);

    if (this.autoRotate && this._state === this.STATE.NONE) {
      this.panLeft(this.getAutoRotationAngle(dtime));
    }

    this._spherical.theta += this._sphericalDelta.theta;
    this._spherical.phi += this._sphericalDelta.phi;

    // TODO: 不超出球面这里还有问题
    this._spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this._spherical.theta));
    this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi));
    this._spherical.makeSafe();

    if (this._scale !== 1) {
      this._zoomFrag = this._spherical.radius * (this._scale - 1);
    }

    this._spherical.radius += this._zoomFrag;
    this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius));

    this._spherical.setToVec3(this._offset);
    this._position = this._offset.clone();

    const transformMatrix = this._spherical.getTransformMatrix();
    const invTransformMatrix = new Matrix();
    Matrix.transpose(transformMatrix, invTransformMatrix);

    if (this._state === this.STATE.ROTATE) {
      // define relative spherical
      this._relativeOffset = this._position.clone();
      this._relativeOffset.subtract(this._clickedPoint);

      const relativeTransformMatrix = this._clickedPointSpherical.getTransformMatrix();
      const localRelativeOffset = new Vector3();

      // 计算相对偏差向量在相对球中的局部坐标
      Vector3.transformToVec3(this._relativeOffset, relativeTransformMatrix.transpose(), localRelativeOffset);
      this._relativeSpherical.setFromVec3(localRelativeOffset);

      this._relativeSpherical.theta += this._relativeSphericalDelta.theta;
      this._relativeSpherical.phi += this._relativeSphericalDelta.phi;

      this._relativeSpherical.theta = Math.max(
        this.minAzimuthAngle,
        Math.min(this.maxAzimuthAngle, this._relativeSpherical.theta)
      );
      // 限制phi不能大于0.45PI，防止相机中心看向太空
      this._relativeSpherical.phi = Math.max(
        this.minPolarAngle,
        Math.min(this.maxPolarAngle * 0.45, this._relativeSpherical.phi)
      );
      this._relativeSpherical.makeSafe();

      this._relativeSpherical.setToVec3(localRelativeOffset);
      Vector3.transformToVec3(localRelativeOffset, relativeTransformMatrix.transpose(), this._relativeOffset);

      // 计算旋转后的相机位置
      this._position = this._clickedPoint.clone().add(this._relativeOffset);

      // 计算相机的局部观察方向，用来使其对准中心选择点
      Vector3.transformToVec3(this._relativeOffset, invTransformMatrix, this._targetRelative);
      this._targetRelative.negate();

      // 计算相机的局部正上方向，使其与旋转的theta匹配
      const deltaTheta = this._relativeSphericalDelta.theta;
      const rotateYaxis = new Matrix();
      Matrix.rotationAxisAngle(new Vector3(0, 1, 0), deltaTheta, rotateYaxis);
      Vector3.transformToVec3(this._upRelative, rotateYaxis, this._upRelative);
    }

    // 计算相机在世界坐标系下的观察方向和正上方向
    const targetWorld = new Vector3();
    const upWorld = new Vector3();
    Vector3.transformToVec3(this._targetRelative, transformMatrix, targetWorld);
    targetWorld.add(this._position);
    Vector3.transformToVec3(this._upRelative, transformMatrix, upWorld);

    this.camera.transform.position = this._position;
    this.camera.transform.lookAt(targetWorld, upWorld);

    if (this.enableDamping === true) {
      this._sphericalDump.theta *= 1 - this.dampingFactor;
      this._sphericalDump.phi *= 1 - this.dampingFactor;
      this._zoomFrag *= 1 - this.zoomFactor;

      if (this._isMouseUp) {
        this._sphericalDelta.theta = this._sphericalDump.theta;
        this._sphericalDelta.phi = this._sphericalDump.phi;
      } else {
        this._sphericalDelta.set(0, 0, 0);
      }
    } else {
      this._sphericalDelta.set(0, 0, 0);
      this._zoomFrag = 0;
    }

    this._relativeSphericalDelta.set(0, 0, 0);
    this._scale = 1;
  }

  /**
   * Pan left and right.
   * @param radian Rotation angle, radian system.
   */
  panLeft(radian: number) {
    this._sphericalDelta.theta -= radian;
    if (this.enableDamping) {
      this._sphericalDump.theta = -radian;
    }
  }

  /**
   * Pan up and down.
   * @param radian Rotation angle, radian system.
   */
  panUp(radian: number) {
    this._sphericalDelta.phi -= radian;
    if (this.enableDamping) {
      this._sphericalDump.phi = -radian;
    }
  }

  /**
   * Rotate left and right the camera around a point.
   * @param radian Rotation angle, radian system.
   */
  rotateLeft(radian: number) {
    this._relativeSphericalDelta.theta = radian;
  }

  /**
   * Rotate up and down the camera around a point.
   * @param radian Rotation angle, radian system.
   */
  rotateUp(radian: number) {
    this._relativeSphericalDelta.phi = radian;
  }

  /**
   * Zoom in view.
   * @param zoomScale Zoom scale.
   */
  zoomIn(zoomScale: number): void {
    // perspective only
    this._scale *= zoomScale;
  }

  /**
   * Zoom out view.
   * @param zoomScale Zoom scale.
   */
  zoomOut(zoomScale: number): void {
    // perspective only
    this._scale /= zoomScale;
  }

  /**
   * Get zoom level.
   * @returns Zoom scale.
   */
  getZoomScale() {
    return Math.pow(0.9, this.relativeLevelSpeed);
  }

  /**
   * 根据鼠标事件的坐标拾取椭球的点的世界坐标
   * @param event Mouse event.
   * @param rayCastedGlobe Globe entity.
   * TODO: 应该放在Math or Camera模块里面，需要canvas的高度和宽度
   */
  getMouseCickedPoint(event: MouseEvent, rayCastedGlobe: RayCastedGlobe): Vector3 | undefined {
    // 获取canvas的坐标->clip坐标->near plane上的世界坐标
    // ->得到光线->判断是否相交以及交点
    const clipPos: Vector3 = new Vector3();
    const canvasWidth = this.mainElement.clientWidth;
    const canvasHeight = this.mainElement.clientHeight;
    clipPos.x = (event.clientX - canvasWidth / 2) / canvasWidth;
    clipPos.y = -(event.clientY - canvasHeight / 2) / canvasHeight;
    clipPos.z = 1.0;

    clipPos.set(0.0, 0.0, 1.0);

    const viewMatrix = this.camera.viewMatrix;
    const projectionMatrix = this.camera.projectionMatrix;
    const invVPMatrix = new Matrix();
    Matrix.multiply(projectionMatrix, viewMatrix, invVPMatrix);
    invVPMatrix.invert();

    const worldPos: Vector3 = new Vector3();
    Vector3.transformCoordinate(clipPos, invVPMatrix, worldPos);

    const cameraPos = this.camera.transform.position;
    const cameraPosSquared = cameraPos.clone().multiply(cameraPos);

    const rayDir = worldPos.clone().subtract(cameraPos).normalize();

    const i = MathUtil.rayIntersectEllipsoid(
      cameraPos,
      cameraPosSquared,
      rayDir,
      rayCastedGlobe.shape.oneOverRadiiSquared
    );
    if (i.intersects) {
      const clickedPoint = cameraPos.clone().add(rayDir.scale(i.near));
      return clickedPoint;
    } else {
      return undefined;
    }
  }

  /**
   * Get auto rotation angle.
   * @param dtime Rendering the time difference between the current frame and the previous frame.
   * @returns Auto rotate speed.
   */
  getAutoRotationAngle(dtime: number) {
    return (this.autoRotateSpeed / 1000) * dtime;
  }

  /**
   * Set pan start when state is pan.
   * @param event Mouse event.
   */
  handleMouseDownPan(event: MouseEvent) {
    this._panStart.set(event.clientX, event.clientY);
  }

  /**
   * Set rotate start when state is rotate.
   * @param event Mouse event.
   */
  handleMouseDownRotate(event: MouseEvent) {
    this._rotateStart.set(event.clientX, event.clientY);
    this._clickedPoint = this.getMouseCickedPoint(event, this.camera.engine.scene.globe);
    this._clickedPointSpherical.setFromVec3(this._clickedPoint);
  }

  /**
   * Set zoom start when state is zoom.
   * @param event Mouse event.
   */
  handleMouseDownZoom(event: MouseEvent) {
    this._zoomStart.set(event.clientX, event.clientY);
  }

  /**
   * Calculate the pan difference when the mouse is moved.
   * @param event Mouse event.
   */
  handleMouseMovePan(event: MouseEvent): void {
    this._panEnd.set(event.clientX, event.clientY);
    Vector2.subtract(this._panEnd, this._panStart, this._panDelta);

    // x方向平移的百分比
    const xDelta = 2 * Math.PI * (this._panDelta.x / this.mainElement.clientWidth) * this.relativeLevelSpeed;
    // y方向平移的百分比
    const yDelta = 2 * Math.PI * (this._panDelta.y / this.mainElement.clientHeight) * this.relativeLevelSpeed;

    const quadrantup = new Vector3();
    // 该矩阵使up方向绕y轴逆时针旋转45度
    const m = new Matrix(0.5, 0, 0.5, 0, 0, 1, 0, 0, -0.5, 0, 0.5, 0, 0, 0, 0, 1);
    Vector3.transformToVec3(this._upRelative, m, quadrantup);
    const x = quadrantup.x;
    const z = quadrantup.z;

    // TODO：还可以再优化
    if (x >= 0 && z >= 0) {
      // 从上往下看
      this.panLeft(-xDelta);
      this.panUp(-yDelta);
    } else if (x <= 0 && z >= 0) {
      // 从右往左看
      this.panLeft(yDelta);
      this.panUp(-xDelta);
    } else if (x <= 0 && z <= 0) {
      // 从下往上看
      this.panLeft(xDelta);
      this.panUp(yDelta);
    } else if (x >= 0 && z <= 0) {
      // 从左往右看
      this.panLeft(-yDelta);
      this.panUp(xDelta);
    }

    // 将end设置为新的start
    this._panStart = this._panEnd.clone();
  }

  /**
   * Calculate the rotation difference when the mouse is moved.
   * @param event Mouse event.
   */
  handleMouseMoveRotate(event: MouseEvent) {
    this._rotateEnd.set(event.clientX, event.clientY);
    Vector2.subtract(this._rotateEnd, this._rotateStart, this._rotateDelta);

    // TODO: 对于旋转相机来说相对层级的速度是否需要再调整
    this.rotateLeft(2 * Math.PI * (this._rotateDelta.x / this.mainElement.clientWidth) * 2.0);
    this.rotateUp(2 * Math.PI * (this._rotateDelta.y / this.mainElement.clientHeight) * 1.0);
    this._rotateStart = this._rotateEnd.clone();
  }

  /**
   * Calculate the zoom difference when the mouse is moved.
   * @param event Mouse event.
   */
  handleMouseMoveZoom(event: MouseEvent) {
    this._zoomEnd.set(event.clientX, event.clientY);
    Vector2.subtract(this._zoomEnd, this._zoomStart, this._zoomDelta);

    if (this._zoomDelta.y > 0) {
      this.zoomOut(this.getZoomScale());
    } else if (this._zoomDelta.y < 0) {
      this.zoomIn(this.getZoomScale());
    }
    // 将end复制到新的start
    this._zoomStart = this._zoomEnd.clone();
  }

  /**
   * Calculate the wheel difference when the mouse is moved.
   * @param event Mouse event.
   */
  handleMouseWheel(event: MouseWheelEvent): void {
    if (event.deltaY < 0) {
      this.zoomIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.zoomOut(this.getZoomScale());
    }
  }

  /**
   * Listen to the mouse click event,
   * and set the context state to the mouse click type according to the click type,
   * and then select the corresponding processing method
   * @param event Mouse event.
   */
  onMouseDown(event: MouseEvent) {
    event.preventDefault();

    this._isMouseUp = false;

    switch (event.button) {
      case this.mouseButtons.PAN:
        this.handleMouseDownPan(event);
        this._state = this.STATE.PAN;
        break;
      case this.mouseButtons.ROTATE:
        this.handleMouseDownRotate(event);
        this._state = this.STATE.ROTATE;
        break;
      case this.mouseButtons.ZOOM:
        this.handleMouseDownZoom(event);
        this._state = this.STATE.ZOOM;
        break;
    }

    if (this._state !== this.STATE.NONE) {
      const element = this.domElement === document ? this.domElement.body : this.domElement;
      // canvas元素监听move事件
      // onMouseMove
      this.mainElement.addEventListener(this.mouseUpEvents[0].type, this.mouseUpEvents[0].listener, false);
      // 父级元素监听鼠标up事件
      // onMouseUp
      element.addEventListener(this.mouseUpEvents[1].type, this.mouseUpEvents[1].listener, false);
    }
  }

  /**
   * Monitor mouse movement events,
   * select the corresponding movement processing method for the current context state.
   * @param event Mouse event.
   */
  onMouseMove(event: MouseEvent) {
    event.preventDefault();

    switch (this._state) {
      case this.STATE.PAN:
        this.handleMouseMovePan(event);
        break;
      case this.STATE.ROTATE:
        this.handleMouseMoveRotate(event);
        break;
      case this.STATE.ZOOM:
        this.handleMouseMoveZoom(event);
        break;
    }
  }

  /**
   * Listen for the mouse up event,
   * remove the corresponding listener event and set the context state to none.
   */
  onMouseUp() {
    this._isMouseUp = true;
    this.mouseUpEvents.forEach((ele) => {
      const element = this.domElement === document ? this.domElement.body : this.domElement;
      element.removeEventListener(ele.type, ele.listener, false);
      this.mainElement.removeEventListener(ele.type, ele.listener, false);
    });

    this._state = this.STATE.NONE;
  }

  /**
   * Listen to the mouse wheel event,
   * prevent the default behavior,
   * and scale according to the current event event information.
   * @param event Mouse wheel event.
   */
  onMouseWheel(event: MouseWheelEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.handleMouseWheel(event);
  }
}
