import { Engine } from "../Engine";
import { Renderer } from "../render/Renderer";
import { BufferUtil } from "./BufferUtil";
import { BufferBindFlag } from "./enums/BufferBindFlag";
import { BufferUsage } from "./enums/BufferUsage";
import { SetDataOptions } from "./enums/SetDataOptions";

/**
 * Buffer.
 */
export class Buffer {
  _engine: Engine;
  _glBindTarget: number;
  _glBufferUsage: number;
  _nativeBuffer: WebGLBuffer;

  private _renderer: Renderer;
  private _type: BufferBindFlag;
  private _byteLength: number;
  private _bufferUsage: BufferUsage;

  /**
   * Buffer binding flag.
   */
  get type(): BufferBindFlag {
    return this._type;
  }

  /**
   * Byte length.
   */
  get byteLength(): number {
    return this._byteLength;
  }

  /**
   * Buffer usage.
   */
  get bufferUsage(): BufferUsage {
    return this._bufferUsage;
  }

  /**
   * Create Buffer.
   * @param engine - Engine
   * @param type - Buffer binding flag
   * @param byteLength - Byte length
   * @param bufferUsage - Buffer usage
   */
  constructor(engine: Engine, type: BufferBindFlag, byteLength: number, bufferUsage?: BufferUsage);

  /**
   * Create Buffer.
   * @param engine - Engine
   * @param type - Buffer binding flag
   * @param data - Byte
   * @param bufferUsage - Buffer usage
   */
  constructor(engine: Engine, type: BufferBindFlag, data: ArrayBuffer | ArrayBufferView, bufferUsage?: BufferUsage);

  constructor(
    engine: Engine,
    type: BufferBindFlag,
    byteLengthOrData: number | ArrayBuffer | ArrayBufferView,
    bufferUsage: BufferUsage = BufferUsage.Static
  ) {
    this._engine = engine;
    this._type = type;
    this._bufferUsage = bufferUsage;

    const renderer = engine._renderer;
    const gl = renderer.gl;
    const glBufferUsage = BufferUtil._getGLBufferUsage(gl, bufferUsage);
    const glBindTarget = type === BufferBindFlag.VertexBuffer ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;

    this._nativeBuffer = gl.createBuffer();
    this._renderer = renderer;
    this._glBufferUsage = glBufferUsage;
    this._glBindTarget = glBindTarget;

    this.bind();
    if (typeof byteLengthOrData === "number") {
      this._byteLength = byteLengthOrData;
      gl.bufferData(glBindTarget, byteLengthOrData, glBufferUsage);
    } else {
      this._byteLength = byteLengthOrData.byteLength;
      gl.bufferData(glBindTarget, byteLengthOrData, glBufferUsage);
    }
    gl.bindBuffer(glBindTarget, null);
  }

  /**
   * Bind buffer.
   */
  bind(): void {
    const gl = this._renderer.gl;
    gl.bindBuffer(this._glBindTarget, this._nativeBuffer);
  }

  /**
   * Set buffer data.
   * @param data - Input buffer data
   */
  setData(data: ArrayBuffer | ArrayBufferView): void;

  /**
   * Set buffer data.
   * @param data - Input buffer data
   * @param bufferByteOffset - buffer byte offset
   */
  setData(data: ArrayBuffer | ArrayBufferView, bufferByteOffset: number): void;

  /**
   * Set buffer data.
   * @param data - Input buffer data
   * @param bufferByteOffset - Buffer byte offset
   * @param dataOffset - Buffer byte offset
   * @param dataLength - Data length
   */
  setData(data: ArrayBuffer | ArrayBufferView, bufferByteOffset: number, dataOffset: number, dataLength?: number): void;

  /**
   * Set buffer data.
   * @param data - Input buffer data
   * @param bufferByteOffset - Buffer byte offset
   * @param dataOffset - Buffer byte offset
   * @param dataLength - Data length
   * @param options - Update strategy: None/Discard/NoOverwrite
   */
  setData(
    data: ArrayBuffer | ArrayBufferView,
    bufferByteOffset: number,
    dataOffset: number,
    dataLength: number,
    options: SetDataOptions
  ): void;

  setData(
    data: ArrayBuffer | ArrayBufferView,
    bufferByteOffset: number = 0,
    dataOffset: number = 0,
    dataLength?: number,
    options: SetDataOptions = SetDataOptions.None
  ): void {
    const gl = this._renderer.gl;
    const isWebGL2: boolean = this._renderer.isWebGL2;
    const glBindTarget: number = this._glBindTarget;
    this.bind();

    if (options === SetDataOptions.Discard) {
      gl.bufferData(glBindTarget, this._byteLength, this._glBufferUsage);
    }

    // TypeArray is BYTES_PER_ELEMENT, unTypeArray is 1
    const byteSize = (<Uint8Array>data).BYTES_PER_ELEMENT || 1;
    const dataByteLength = dataLength ? byteSize * dataLength : data.byteLength;

    if (dataOffset !== 0 || dataByteLength < data.byteLength) {
      const isArrayBufferView = (<ArrayBufferView>data).byteOffset !== undefined;
      if (isWebGL2 && isArrayBufferView) {
        gl.bufferSubData(glBindTarget, bufferByteOffset, <ArrayBufferView>data, dataOffset, dataByteLength / byteSize);
      } else {
        const subData = new Uint8Array(
          isArrayBufferView ? (<ArrayBufferView>data).buffer : <ArrayBuffer>data,
          dataOffset * byteSize,
          dataByteLength
        );
        gl.bufferSubData(glBindTarget, bufferByteOffset, subData);
      }
    } else {
      gl.bufferSubData(glBindTarget, bufferByteOffset, data);
    }
    gl.bindBuffer(glBindTarget, null);
  }

  /**
   * Get buffer data.
   * @param data - Output buffer data
   */
  getData(data: ArrayBufferView): void;

  /**
   * Get buffer data.
   * @param data - Output buffer data
   * @param bufferByteOffset - Buffer byte offset
   */
  getData(data: ArrayBufferView, bufferByteOffset: number): void;

  /**
   * Get buffer data.
   * @param data - Output buffer data
   * @param bufferByteOffset - Buffer byte offset
   * @param dataOffset - Output data offset
   * @param dataLength - Output data length
   */
  getData(data: ArrayBufferView, bufferByteOffset: number, dataOffset: number, dataLength: number): void;

  getData(data: ArrayBufferView, bufferByteOffset: number = 0, dataOffset: number = 0, dataLength?: number): void {
    const isWebGL2: boolean = this._renderer.isWebGL2;

    if (isWebGL2) {
      const gl = this._renderer.gl;
      this.bind();
      (gl as WebGL2RenderingContext).getBufferSubData(
        this._glBindTarget,
        bufferByteOffset,
        data,
        dataOffset,
        dataLength
      );
    } else {
      throw "Buffer is write-only on WebGL1.0 platforms.";
    }
  }
}
