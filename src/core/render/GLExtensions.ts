import { GLCapabilityType } from "../base/Constant";
import { Renderer } from "./Renderer";

/**
 * GLContext extension.
 */
export class GLExtensions {
  private rhi: Renderer;
  private _requireResult;

  constructor(rhi: Renderer) {
    this.rhi = rhi;
    this._requireResult = {};
  }

  /**
   * Require an extension.
   */
  requireExtension(ext: GLCapabilityType) {
    if (this._requireResult[ext] !== undefined) {
      return this._requireResult[ext];
    }

    this._requireResult[ext] = this.rhi.gl.getExtension(ext);
    return this._requireResult[ext];
  }
}
