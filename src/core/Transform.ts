import { MathUtil, Matrix, Matrix3x3, Quaternion, Vector3 } from "../math";
import { BoolUpdateFlag } from "./BoolUpdateFlag";
import { Camera } from "./Camera";
import { deepClone, ignoreClone } from "./clone/CloneManager";
import { Entity } from "./Entity";
import { Light } from "./lighting";
import { UpdateFlagManager } from "./UpdateFlagManager";

/**
 * Used to implement transformation related functions.
 */
export class Transform {
  private static _tempQuat0: Quaternion = new Quaternion();
  private static _tempVec30: Vector3 = new Vector3();
  private static _tempVec31: Vector3 = new Vector3();
  private static _tempVec32: Vector3 = new Vector3();
  private static _tempMat30: Matrix3x3 = new Matrix3x3();
  private static _tempMat31: Matrix3x3 = new Matrix3x3();
  private static _tempMat32: Matrix3x3 = new Matrix3x3();
  private static _tempMat41: Matrix = new Matrix();
  private static _tempMat42: Matrix = new Matrix();

  @deepClone
  private _position: Vector3 = new Vector3();
  @deepClone
  private _rotation: Vector3 = new Vector3();
  @deepClone
  private _rotationQuaternion: Quaternion = new Quaternion();
  @deepClone
  private _scale: Vector3 = new Vector3(1, 1, 1);
  @deepClone
  private _worldPosition: Vector3 = new Vector3();
  @deepClone
  private _worldRotation: Vector3 = new Vector3();
  @deepClone
  private _worldRotationQuaternion: Quaternion = new Quaternion();
  @deepClone
  private _lossyWorldScale: Vector3 = new Vector3(1, 1, 1);
  @deepClone
  private _localMatrix: Matrix = new Matrix();
  @deepClone
  private _worldMatrix: Matrix = new Matrix();
  @ignoreClone
  private _isParentDirty: boolean = true;
  @ignoreClone
  private _parentTransformCache: Transform = null;

  private _dirtyFlag: number = TransformModifyFlags.WmWpWeWqWs;

  /** @internal */
  _updateFlagManager: UpdateFlagManager = new UpdateFlagManager();
  // TODO: Transform模块可以挂载到实体、相机和光源等模块下，待优化
  _entityOrCamera: Entity | Camera | Light;

  /**
   * Local position.
   */
  get position(): Vector3 {
    return this._position;
  }

  set position(value: Vector3) {
    if (this._position !== value) {
      this._position.copyFrom(value);
    }
  }

  /**
   * World position.
   */
  get worldPosition(): Vector3 {
    const worldPosition = this._worldPosition;
    if (this._isContainDirtyFlag(TransformModifyFlags.WorldPosition)) {
      worldPosition._onValueChanged = null;
      if (this._getParentTransform()) {
        this.worldMatrix.getTranslation(worldPosition);
      } else {
        worldPosition.copyFrom(this._position);
      }

      worldPosition._onValueChanged = this._onWorldPositionChanged;
      this._setDirtyFlagFalse(TransformModifyFlags.WorldPosition);
    }

    return worldPosition;
  }

  set worldPosition(value: Vector3) {
    if (this._worldPosition !== value) {
      this._worldPosition.copyFrom(value);
    }
  }

  /**
   * Local rotation, defining the rotation value in degrees.
   * Rotations are performed around the Y axis, the X axis, and the Z axis, in that order.
   */
  get rotation(): Vector3 {
    const rotation = this._rotation;
    if (this._isContainDirtyFlag(TransformModifyFlags.LocalEuler)) {
      rotation._onValueChanged = null;
      this._rotationQuaternion.toEuler(rotation);

      rotation._onValueChanged = this._onRotationChanged;
      rotation.scale(MathUtil.radToDegreeFactor); // radians to degrees
      this._setDirtyFlagFalse(TransformModifyFlags.LocalEuler);
    }

    return rotation;
  }

  set rotation(value: Vector3) {
    if (this._rotation !== value) {
      this._rotation.copyFrom(value);
    }
  }

  /**
   * World rotation, defining the rotation value in degrees.
   * Rotations are performed around the Y axis, the X axis, and the Z axis, in that order.
   */
  get worldRotation(): Vector3 {
    const worldRotation = this._worldRotation;
    if (this._isContainDirtyFlag(TransformModifyFlags.WorldEuler)) {
      worldRotation._onValueChanged = null;
      this.worldRotationQuaternion.toEuler(worldRotation);
      worldRotation.scale(MathUtil.radToDegreeFactor); // Radian to angle

      worldRotation._onValueChanged = this._onWorldRotationChanged;
      this._setDirtyFlagFalse(TransformModifyFlags.WorldEuler);
    }
    return worldRotation;
  }

  set worldRotation(value: Vector3) {
    if (this._worldRotation !== value) {
      this._worldRotation.copyFrom(value);
    }
  }

  /**
   * Local rotation, defining the rotation by using a unit quaternion.
   */
  get rotationQuaternion(): Quaternion {
    const rotationQuaternion = this._rotationQuaternion;
    if (this._isContainDirtyFlag(TransformModifyFlags.LocalQuat)) {
      rotationQuaternion._onValueChanged = null;
      Quaternion.rotationEuler(
        MathUtil.degreeToRadian(this._rotation.x),
        MathUtil.degreeToRadian(this._rotation.y),
        MathUtil.degreeToRadian(this._rotation.z),
        rotationQuaternion
      );

      rotationQuaternion._onValueChanged = this._onRotationQuaternionChanged;
      this._setDirtyFlagFalse(TransformModifyFlags.LocalQuat);
    }
    return rotationQuaternion;
  }

  set rotationQuaternion(value: Quaternion) {
    if (this._rotationQuaternion !== value) {
      if (value.normalized) {
        this._rotationQuaternion.copyFrom(value);
      } else {
        Quaternion.normalize(value, this._rotationQuaternion);
      }
    } else {
      value.normalized || value.normalize();
    }
  }

  /**
   * World rotation, defining the rotation by using a unit quaternion.
   */
  get worldRotationQuaternion(): Quaternion {
    const worldRotationQuaternion = this._worldRotationQuaternion;
    if (this._isContainDirtyFlag(TransformModifyFlags.WorldQuat)) {
      worldRotationQuaternion._onValueChanged = null;
      const parent = this._getParentTransform();
      if (parent != null) {
        Quaternion.multiply(parent.worldRotationQuaternion, this.rotationQuaternion, worldRotationQuaternion);
      } else {
        worldRotationQuaternion.copyFrom(this.rotationQuaternion);
      }

      worldRotationQuaternion._onValueChanged = this._onWorldRotationQuaternionChanged;
      this._setDirtyFlagFalse(TransformModifyFlags.WorldQuat);
    }
    return worldRotationQuaternion;
  }

  set worldRotationQuaternion(value: Quaternion) {
    if (this._worldRotationQuaternion !== value) {
      if (value.normalized) {
        this._worldRotationQuaternion.copyFrom(value);
      } else {
        Quaternion.normalize(value, this._worldRotationQuaternion);
      }
    }
    value.normalized || value.normalize();
  }

  /**
   * Local scaling.
   */
  get scale(): Vector3 {
    return this._scale;
  }

  set scale(value: Vector3) {
    if (this._scale !== value) {
      this._scale.copyFrom(value);
    }
  }

  /**
   * Local lossy scaling.
   * @remarks The value obtained may not be correct under certain conditions(for example, the parent node has scaling,
   * and the child node has a rotation), the scaling will be tilted. Vector3 cannot be used to correctly represent the scaling. Must use Matrix3x3.
   */
  get lossyWorldScale(): Vector3 {
    if (this._isContainDirtyFlag(TransformModifyFlags.WorldScale)) {
      if (this._getParentTransform()) {
        const scaleMat = this._getScaleMatrix();
        const e = scaleMat.elements;
        this._lossyWorldScale.set(e[0], e[4], e[8]);
      } else {
        this._lossyWorldScale.copyFrom(this._scale);
      }
      this._setDirtyFlagFalse(TransformModifyFlags.WorldScale);
    }
    return this._lossyWorldScale;
  }

  /**
   * Local matrix.
   * @remarks Need to re-assign after modification to ensure that the modification takes effect.
   */
  get localMatrix(): Matrix {
    if (this._isContainDirtyFlag(TransformModifyFlags.LocalMatrix)) {
      Matrix.affineTransformation(this._scale, this.rotationQuaternion, this._position, this._localMatrix);
      this._setDirtyFlagFalse(TransformModifyFlags.LocalMatrix);
    }
    return this._localMatrix;
  }

  set localMatrix(value: Matrix) {
    if (this._localMatrix !== value) {
      this._localMatrix.copyFrom(value);
    }

    this._localMatrix.decompose(this._position, this._rotationQuaternion, this._scale);

    this._setDirtyFlagTrue(TransformModifyFlags.LocalEuler);
    this._setDirtyFlagFalse(TransformModifyFlags.LocalMatrix);
    this._updateAllWorldFlag();
  }

  /**
   * World matrix.
   * @remarks Need to re-assign after modification to ensure that the modification takes effect.
   */
  get worldMatrix(): Matrix {
    if (this._isContainDirtyFlag(TransformModifyFlags.WorldMatrix)) {
      const parent = this._getParentTransform();
      if (parent) {
        Matrix.multiply(parent.worldMatrix, this.localMatrix, this._worldMatrix);
      } else {
        this._worldMatrix.copyFrom(this.localMatrix);
      }
      this._setDirtyFlagFalse(TransformModifyFlags.WorldMatrix);
    }
    return this._worldMatrix;
  }

  set worldMatrix(value: Matrix) {
    if (this._worldMatrix !== value) {
      this._worldMatrix.copyFrom(value);
    }
    const parent = this._getParentTransform();
    if (parent) {
      Matrix.invert(parent.worldMatrix, Transform._tempMat42);
      Matrix.multiply(Transform._tempMat42, value, this._localMatrix);
    } else {
      this._localMatrix.copyFrom(value);
    }
    this.localMatrix = this._localMatrix;
    this._setDirtyFlagFalse(TransformModifyFlags.WorldMatrix);
  }

  /**
   * @internal
   */
  constructor(entityOrCamera: Entity | Camera | Light) {
    // ! 相机不需要实体
    this._entityOrCamera = entityOrCamera;

    this._onPositionChanged = this._onPositionChanged.bind(this);
    this._onWorldPositionChanged = this._onWorldPositionChanged.bind(this);
    this._onRotationChanged = this._onRotationChanged.bind(this);
    this._onWorldRotationChanged = this._onWorldRotationChanged.bind(this);
    this._onRotationQuaternionChanged = this._onRotationQuaternionChanged.bind(this);
    this._onWorldRotationQuaternionChanged = this._onWorldRotationQuaternionChanged.bind(this);
    this._onScaleChanged = this._onScaleChanged.bind(this);

    this._position._onValueChanged = this._onPositionChanged;

    this._worldPosition._onValueChanged = this._onWorldPositionChanged;

    this._rotation._onValueChanged = this._onRotationChanged;

    this._worldRotation._onValueChanged = this._onWorldRotationChanged;

    this._rotationQuaternion._onValueChanged = this._onRotationQuaternionChanged;

    this._worldRotationQuaternion._onValueChanged = this._onWorldRotationQuaternionChanged;

    this._scale._onValueChanged = this._onScaleChanged;
  }

  /**
   * Set local position by X, Y, Z value.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  setPosition(x: number, y: number, z: number): void {
    this._position.set(x, y, z);
  }

  /**
   * Set local rotation by the X, Y, Z components of the euler angle, unit in degrees.
   * Rotations are performed around the Y axis, the X axis, and the Z axis, in that order.
   * @param x - The angle of rotation around the X axis
   * @param y - The angle of rotation around the Y axis
   * @param z - The angle of rotation around the Z axis
   */
  setRotation(x: number, y: number, z: number): void {
    this._rotation.set(x, y, z);
  }

  /**
   * Set local rotation by the X, Y, Z, and W components of the quaternion.
   * @param x - X component of quaternion
   * @param y - Y component of quaternion
   * @param z - Z component of quaternion
   * @param w - W component of quaternion
   */
  setRotationQuaternion(x: number, y: number, z: number, w: number): void {
    this._rotationQuaternion.set(x, y, z, w);
  }

  /**
   * Set local scaling by scaling values along X, Y, Z axis.
   * @param x - Scaling along X axis
   * @param y - Scaling along Y axis
   * @param z - Scaling along Z axis
   */
  setScale(x: number, y: number, z: number): void {
    this._scale.set(x, y, z);
  }

  /**
   * Set world position by X, Y, Z value.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  setWorldPosition(x: number, y: number, z: number): void {
    this._worldPosition.set(x, y, z);
  }

  /**
   * Set world rotation by the X, Y, Z components of the euler angle, unit in degrees, Yaw/Pitch/Roll sequence.
   * @param x - The angle of rotation around the X axis
   * @param y - The angle of rotation around the Y axis
   * @param z - The angle of rotation around the Z axis
   */
  setWorldRotation(x: number, y: number, z: number): void {
    this._worldRotation.set(x, y, z);
  }

  /**
   * Set local rotation by the X, Y, Z, and W components of the quaternion.
   * @param x - X component of quaternion
   * @param y - Y component of quaternion
   * @param z - Z component of quaternion
   * @param w - W component of quaternion
   */
  setWorldRotationQuaternion(x: number, y: number, z: number, w: number): void {
    this._worldRotationQuaternion.set(x, y, z, w);
  }

  /**
   * Get the forward direction in world space.
   * @param forward - Forward vector
   * @returns Forward vector
   */
  getWorldForward(forward: Vector3): Vector3 {
    const e = this.worldMatrix.elements;
    forward.set(-e[8], -e[9], -e[10]);
    return forward.normalize();
  }

  /**
   * Get the right direction in world space.
   * @param right - Right vector
   * @returns Right vector
   */
  getWorldRight(right: Vector3): Vector3 {
    const e = this.worldMatrix.elements;
    right.set(e[0], e[1], e[2]);
    return right.normalize();
  }

  /**
   * Get the up direction in world space.
   * @param up - Up vector
   * @returns Up vector
   */
  getWorldUp(up: Vector3): Vector3 {
    const e = this.worldMatrix.elements;
    up.set(e[4], e[5], e[6]);
    return up.normalize();
  }

  /**
   * Translate in the direction and distance of the translation.
   * @param translation - Direction and distance of translation
   * @param relativeToLocal = `true` - Is relative to the local coordinate system
   */
  translate(translation: Vector3, relativeToLocal?: boolean): void;

  /**
   * Translate some distance by x along the x axis, y along the y axis, and z along the z axis.
   * @param x - Distance along the x axis
   * @param y - Distance along the y axis
   * @param z - Distance along the z axis
   * @param relativeToLocal = `true` - Is relative to the local coordinate system
   */
  translate(x: number, y: number, z: number, relativeToLocal?: boolean): void;

  translate(
    translationOrX: Vector3 | number,
    relativeToLocalOrY?: boolean | number,
    z?: number,
    relativeToLocal?: boolean
  ): void {
    if (typeof translationOrX === "number") {
      const translate = Transform._tempVec30;
      translate.set(translationOrX, <number>relativeToLocalOrY, z);
      this._translate(translate, relativeToLocal);
    } else {
      this._translate(translationOrX, <boolean>relativeToLocalOrY);
    }
  }

  /**
   * Rotate around the passed Vector3.
   * @param rotation - Euler angle in degrees
   * @param relativeToLocal = `true` - Is relative to the local coordinate system
   */
  rotate(rotation: Vector3, relativeToLocal?: boolean): void;

  /**
   * Rotate around the passed Vector3.
   * @param x - Rotation along x axis, in degrees
   * @param y - Rotation along y axis, in degrees
   * @param z - Rotation along z axis, in degrees
   * @param relativeToLocal = `true` - Is relative to the local coordinate system
   */
  rotate(x: number, y: number, z: number, relativeToLocal?: boolean): void;

  rotate(
    rotationOrX: Vector3 | number,
    relativeToLocalOrY?: boolean | number,
    z?: number,
    relativeToLocal?: boolean
  ): void {
    if (typeof rotationOrX === "number") {
      this._rotateXYZ(rotationOrX, <number>relativeToLocalOrY, z, relativeToLocal);
    } else {
      this._rotateXYZ(rotationOrX.x, rotationOrX.y, rotationOrX.z, <boolean>relativeToLocalOrY);
    }
  }

  /**
   * Rotate around the specified axis according to the specified angle.
   * @param axis - Rotate axis
   * @param angle - Rotate angle in degrees
   * @param relativeToLocal = `true` - Relative to local space
   */
  rotateByAxis(axis: Vector3, angle: number, relativeToLocal: boolean = true): void {
    const rad = angle * MathUtil.degreeToRadFactor;
    Quaternion.rotationAxisAngle(axis, rad, Transform._tempQuat0);
    this._rotateByQuat(Transform._tempQuat0, relativeToLocal);
  }

  /**
   * Rotate and ensure that the world front vector points to the target world position.
   * @param targetPosition - Target world position
   * @param worldUp - Up direction in world space, default is Vector3(0, 1, 0)
   */
  lookAt(targetPosition: Vector3, worldUp?: Vector3): void {
    const zAxis = Transform._tempVec30;
    Vector3.subtract(this.worldPosition, targetPosition, zAxis);
    let axisLen = zAxis.length();
    if (axisLen <= MathUtil.zeroTolerance) {
      // The current position and the target position are almost the same.
      return;
    }
    zAxis.scale(1 / axisLen);
    const xAxis = Transform._tempVec31;
    if (worldUp) {
      Vector3.cross(worldUp, zAxis, xAxis);
    } else {
      xAxis.set(zAxis.z, 0, -zAxis.x);
    }
    axisLen = xAxis.length();
    if (axisLen <= MathUtil.zeroTolerance) {
      // @todo:
      // 1.worldUp is（0,0,0）
      // 2.worldUp is parallel to zAxis
      return;
    }
    xAxis.scale(1 / axisLen);
    const yAxis = Transform._tempVec32;
    Vector3.cross(zAxis, xAxis, yAxis);

    const rotMat = Transform._tempMat41;
    const { elements: e } = rotMat;
    (e[0] = xAxis.x), (e[1] = xAxis.y), (e[2] = xAxis.z);
    (e[4] = yAxis.x), (e[5] = yAxis.y), (e[6] = yAxis.z);
    (e[8] = zAxis.x), (e[9] = zAxis.y), (e[10] = zAxis.z);
    rotMat.getRotation(this._worldRotationQuaternion);
  }

  /**
   * Register world transform change flag.
   * @returns Change flag
   */
  registerWorldChangeFlag(): BoolUpdateFlag {
    return this._updateFlagManager.createFlag(BoolUpdateFlag);
  }

  /**
   * @internal
   */
  _parentChange(): void {
    this._isParentDirty = true;
    this._updateAllWorldFlag();
  }

  /**
   * @internal
   */
  _isFrontFaceInvert(): boolean {
    const scale = this.lossyWorldScale;
    let isInvert = scale.x < 0;
    scale.y < 0 && (isInvert = !isInvert);
    scale.z < 0 && (isInvert = !isInvert);
    return isInvert;
  }

  /**
   * Get worldMatrix: Will trigger the worldMatrix update of itself and all parent entities.
   * Get worldPosition: Will trigger the worldMatrix, local position update of itself and the worldMatrix update of all parent entities.
   * In summary, any update of related variables will cause the dirty mark of one of the full process (worldMatrix or worldRotationQuaternion) to be false.
   */
  private _updateWorldPositionFlag(): void {
    if (!this._isContainDirtyFlags(TransformModifyFlags.WmWp)) {
      this._worldAssociatedChange(TransformModifyFlags.WmWp);
      if (!(this._entityOrCamera instanceof Entity)) return;
      const nodeChildren = this._entityOrCamera.children || [];
      for (let i: number = 0, n: number = nodeChildren.length; i < n; i++) {
        nodeChildren[i].transform?._updateWorldPositionFlag();
      }
    }
  }

  /**
   * Get worldMatrix: Will trigger the worldMatrix update of itself and all parent entities.
   * Get worldPosition: Will trigger the worldMatrix, local position update of itself and the worldMatrix update of all parent entities.
   * Get worldRotationQuaternion: Will trigger the world rotation (in quaternion) update of itself and all parent entities.
   * Get worldRotation: Will trigger the world rotation(in euler and quaternion) update of itself and world rotation(in quaternion) update of all parent entities.
   * In summary, any update of related variables will cause the dirty mark of one of the full process (worldMatrix or worldRotationQuaternion) to be false.
   */
  private _updateWorldRotationFlag() {
    if (!this._isContainDirtyFlags(TransformModifyFlags.WmWeWq)) {
      this._worldAssociatedChange(TransformModifyFlags.WmWeWq);
      if (!(this._entityOrCamera instanceof Entity)) return;
      const nodeChildren = this._entityOrCamera.children || [];
      for (let i: number = 0, n: number = nodeChildren.length; i < n; i++) {
        nodeChildren[i].transform?._updateWorldPositionAndRotationFlag(); // Rotation update of parent entity will trigger world position and rotation update of all child entity.
      }
    }
  }

  /**
   * Get worldMatrix: Will trigger the worldMatrix update of itself and all parent entities.
   * Get worldPosition: Will trigger the worldMatrix, local position update of itself and the worldMatrix update of all parent entities.
   * Get worldRotationQuaternion: Will trigger the world rotation (in quaternion) update of itself and all parent entities.
   * Get worldRotation: Will trigger the world rotation(in euler and quaternion) update of itself and world rotation(in quaternion) update of all parent entities.
   * In summary, any update of related variables will cause the dirty mark of one of the full process (worldMatrix or worldRotationQuaternion) to be false.
   */
  private _updateWorldPositionAndRotationFlag() {
    if (!this._isContainDirtyFlags(TransformModifyFlags.WmWpWeWq)) {
      this._worldAssociatedChange(TransformModifyFlags.WmWpWeWq);
      if (!(this._entityOrCamera instanceof Entity)) return;
      const nodeChildren = this._entityOrCamera.children || [];
      for (let i: number = 0, n: number = nodeChildren.length; i < n; i++) {
        nodeChildren[i].transform?._updateWorldPositionAndRotationFlag();
      }
    }
  }

  /**
   * Get worldMatrix: Will trigger the worldMatrix update of itself and all parent entities.
   * Get worldPosition: Will trigger the worldMatrix, local position update of itself and the worldMatrix update of all parent entities.
   * Get worldScale: Will trigger the scaling update of itself and all parent entities.
   * In summary, any update of related variables will cause the dirty mark of one of the full process (worldMatrix) to be false.
   */
  private _updateWorldScaleFlag() {
    if (!this._isContainDirtyFlags(TransformModifyFlags.WmWs)) {
      this._worldAssociatedChange(TransformModifyFlags.WmWs);
      if (!(this._entityOrCamera instanceof Entity)) return;
      const nodeChildren = this._entityOrCamera.children || [];
      for (let i: number = 0, n: number = nodeChildren.length; i < n; i++) {
        nodeChildren[i].transform?._updateWorldPositionAndScaleFlag();
      }
    }
  }

  /**
   * Get worldMatrix: Will trigger the worldMatrix update of itself and all parent entities.
   * Get worldPosition: Will trigger the worldMatrix, local position update of itself and the worldMatrix update of all parent entities.
   * Get worldScale: Will trigger the scaling update of itself and all parent entities.
   * In summary, any update of related variables will cause the dirty mark of one of the full process (worldMatrix) to be false.
   */
  private _updateWorldPositionAndScaleFlag(): void {
    if (!this._isContainDirtyFlags(TransformModifyFlags.WmWpWs)) {
      this._worldAssociatedChange(TransformModifyFlags.WmWpWs);
      if (!(this._entityOrCamera instanceof Entity)) return;
      const nodeChildren = this._entityOrCamera.children || [];
      for (let i: number = 0, n: number = nodeChildren.length; i < n; i++) {
        nodeChildren[i].transform?._updateWorldPositionAndScaleFlag();
      }
    }
  }

  /**
   * Update all world transform property dirty flag, the principle is the same as above.
   */
  private _updateAllWorldFlag(): void {
    if (!this._isContainDirtyFlags(TransformModifyFlags.WmWpWeWqWs)) {
      this._worldAssociatedChange(TransformModifyFlags.WmWpWeWqWs);
      if (!(this._entityOrCamera instanceof Entity)) return;
      const nodeChildren = this._entityOrCamera.children || [];
      for (let i: number = 0, n: number = nodeChildren.length; i < n; i++) {
        nodeChildren[i].transform?._updateAllWorldFlag();
      }
    }
  }

  private _getParentTransform(): Transform | null {
    if (!(this._entityOrCamera instanceof Entity)) return;
    if (!this._isParentDirty) {
      return this._parentTransformCache;
    }
    let parentCache: Transform = null;
    let parent = this._entityOrCamera?.parent;
    while (parent) {
      const transform = parent.transform;
      if (transform) {
        parentCache = transform;
        break;
      } else {
        parent = parent.parent;
      }
    }
    this._parentTransformCache = parentCache;
    this._isParentDirty = false;
    return parentCache;
  }

  private _getScaleMatrix(): Matrix3x3 {
    const invRotation = Transform._tempQuat0;
    const invRotationMat = Transform._tempMat30;
    const worldRotScaMat = Transform._tempMat31;
    const scaMat = Transform._tempMat32;
    worldRotScaMat.copyFromMatrix(this.worldMatrix);
    Quaternion.invert(this.worldRotationQuaternion, invRotation);
    Matrix3x3.rotationQuaternion(invRotation, invRotationMat);
    Matrix3x3.multiply(invRotationMat, worldRotScaMat, scaMat);
    return scaMat;
  }

  private _isContainDirtyFlags(targetDirtyFlags: number): boolean {
    return (this._dirtyFlag & targetDirtyFlags) === targetDirtyFlags;
  }

  private _isContainDirtyFlag(type: number): boolean {
    return (this._dirtyFlag & type) != 0;
  }

  private _setDirtyFlagTrue(type: number) {
    this._dirtyFlag |= type;
  }

  private _setDirtyFlagFalse(type: number) {
    this._dirtyFlag &= ~type;
  }

  private _worldAssociatedChange(type: number): void {
    this._dirtyFlag |= type;
    this._updateFlagManager.dispatch(TransformModifyFlags.WorldMatrix);
  }

  private _rotateByQuat(rotateQuat: Quaternion, relativeToLocal: boolean): void {
    if (relativeToLocal) {
      Quaternion.multiply(this.rotationQuaternion, rotateQuat, this._rotationQuaternion);
    } else {
      Quaternion.multiply(rotateQuat, this.worldRotationQuaternion, this._worldRotationQuaternion);
    }
  }

  private _translate(translation: Vector3, relativeToLocal: boolean = true): void {
    if (relativeToLocal) {
      const { _tempVec30 } = Transform;
      Vector3.transformByQuat(translation, this.worldRotationQuaternion, _tempVec30);
      this._worldPosition.add(_tempVec30);
    } else {
      this._worldPosition.add(translation);
    }
  }

  private _rotateXYZ(x: number, y: number, z: number, relativeToLocal: boolean = true): void {
    const radFactor = MathUtil.degreeToRadFactor;
    const rotQuat = Transform._tempQuat0;
    Quaternion.rotationEuler(x * radFactor, y * radFactor, z * radFactor, rotQuat);
    this._rotateByQuat(rotQuat, relativeToLocal);
  }

  private _onPositionChanged(): void {
    this._setDirtyFlagTrue(TransformModifyFlags.LocalMatrix);
    this._updateWorldPositionFlag();
  }

  private _onWorldPositionChanged(): void {
    const worldPosition = this._worldPosition;
    const parent = this._getParentTransform();
    if (parent) {
      Matrix.invert(parent.worldMatrix, Transform._tempMat41);
      Vector3.transformCoordinate(worldPosition, Transform._tempMat41, this._position);
    } else {
      this._position.copyFrom(worldPosition);
    }
    this._setDirtyFlagFalse(TransformModifyFlags.WorldPosition);
  }

  private _onRotationChanged(): void {
    this._setDirtyFlagTrue(TransformModifyFlags.LocalMatrix | TransformModifyFlags.LocalQuat);
    this._setDirtyFlagFalse(TransformModifyFlags.LocalEuler);
    this._updateWorldRotationFlag();
  }

  private _onWorldRotationChanged(): void {
    const worldRotation = this._worldRotation;
    Quaternion.rotationEuler(
      MathUtil.degreeToRadian(worldRotation.x),
      MathUtil.degreeToRadian(worldRotation.y),
      MathUtil.degreeToRadian(worldRotation.z),
      this._worldRotationQuaternion
    );
    this._setDirtyFlagFalse(TransformModifyFlags.WorldEuler);
  }

  private _onRotationQuaternionChanged(): void {
    this._setDirtyFlagTrue(TransformModifyFlags.LocalMatrix | TransformModifyFlags.LocalEuler);
    this._setDirtyFlagFalse(TransformModifyFlags.LocalQuat);
    this._updateWorldRotationFlag();
  }

  private _onWorldRotationQuaternionChanged(): void {
    const worldRotationQuaternion = this._worldRotationQuaternion;
    const parent = this._getParentTransform();
    if (parent) {
      const invParentQuaternion = Transform._tempQuat0;
      Quaternion.invert(parent.worldRotationQuaternion, invParentQuaternion);
      Quaternion.multiply(invParentQuaternion, worldRotationQuaternion, this._rotationQuaternion);
    } else {
      this._rotationQuaternion.copyFrom(worldRotationQuaternion);
    }
    this._setDirtyFlagFalse(TransformModifyFlags.WorldQuat);
  }

  private _onScaleChanged(): void {
    this._setDirtyFlagTrue(TransformModifyFlags.LocalMatrix);
    this._updateWorldScaleFlag();
  }
}

/**
 * @internal
 */
export enum TransformModifyFlags {
  LocalEuler = 0x1,
  LocalQuat = 0x2,
  WorldPosition = 0x4,
  WorldEuler = 0x8,
  WorldQuat = 0x10,
  WorldScale = 0x20,
  LocalMatrix = 0x40,
  WorldMatrix = 0x80,

  /** WorldMatrix | WorldPosition */
  WmWp = 0x84,
  /** WorldMatrix | WorldEuler | WorldQuat */
  WmWeWq = 0x98,
  /** WorldMatrix | WorldPosition | WorldEuler | WorldQuat */
  WmWpWeWq = 0x9c,
  /** WorldMatrix | WorldScale */
  WmWs = 0xa0,
  /** WorldMatrix | WorldPosition | WorldScale */
  WmWpWs = 0xa4,
  /** WorldMatrix | WorldPosition | WorldEuler | WorldQuat | WorldScale */
  WmWpWeWqWs = 0xbc,
}
