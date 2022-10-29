import { Vector2, Vector3, Vector4 } from "../../math";
import { Logger } from "../base/Logger";
import { Engine } from "../Engine";
import { Renderer } from "../render/Renderer";
import { Texture } from "../texture";
import { ShaderDataGroup } from "./enums/ShaderDataGroup";
import { Shader } from "./Shader";
import { ShaderData } from "./ShaderData";
import { ShaderUniform } from "./ShaderUniform";
import { ShaderUniformBlock } from "./ShaderUniformBlock";

/**
 * Shader program, corresponding to the GPU shader program.
 * @internal
 */
export class ShaderProgram {
  private static _counter: number = 0;

  private static _addLineNum(str: string) {
    const lines = str.split("\n");
    const limitLength = (lines.length + 1).toString().length + 6;
    let prefix;
    return lines
      .map((line, index) => {
        prefix = `0:${index + 1}`;
        if (prefix.length >= limitLength) return prefix.substring(0, limitLength) + line;

        for (let i = 0; i < limitLength - prefix.length; i++) prefix += " ";

        return prefix + line;
      })
      .join("\n");
  }

  id: number;

  readonly sceneUniformBlock: ShaderUniformBlock = new ShaderUniformBlock();
  readonly cameraUniformBlock: ShaderUniformBlock = new ShaderUniformBlock();
  readonly rendererUniformBlock: ShaderUniformBlock = new ShaderUniformBlock();
  readonly materialUniformBlock: ShaderUniformBlock = new ShaderUniformBlock();
  readonly geographicUniformBlock: ShaderUniformBlock = new ShaderUniformBlock();
  readonly otherUniformBlock: ShaderUniformBlock = new ShaderUniformBlock();

  attributeLocation: Record<string, GLint> = Object.create(null);

  // TODO: 移动到Renderer中
  private _isValid: boolean;
  private _engine: Engine;
  private _gl: WebGLRenderingContext;
  private _vertexShader: WebGLShader;
  private _fragmentShader: WebGLShader;
  private _glProgram: WebGLProgram;
  private _activeTextureUint: number = 0;

  /**
   * Whether this shader program is valid.
   */
  get isValid(): boolean {
    return this._isValid;
  }

  constructor(engine: Engine, vertexSource: string, fragmentSource: string) {
    this._engine = engine;
    this._gl = engine._renderer.gl;
    this._glProgram = this._createProgram(vertexSource, fragmentSource);

    if (this._glProgram) {
      this._isValid = true;
      this._recordLocation();
    } else {
      this._isValid = false;
    }

    this.id = ShaderProgram._counter++;
  }

  /**
   * Upload all shader data in shader uniform block.
   * @param uniformBlock - shader Uniform block
   * @param shaderData - shader data
   */
  uploadAll(uniformBlock: ShaderUniformBlock, shaderData: ShaderData): void {
    this.uploadUniforms(uniformBlock, shaderData);
    this.uploadTextures(uniformBlock, shaderData);
  }

  /**
   * Upload constant shader data in shader uniform block.
   * @param uniformBlock - shader Uniform block
   * @param shaderData - shader data
   */
  uploadUniforms(uniformBlock: ShaderUniformBlock, shaderData: ShaderData): void {
    const propertyValueMap = shaderData._propertyValueMap;
    const constUniforms = uniformBlock.constUniforms;

    for (let i = 0, n = constUniforms.length; i < n; i++) {
      const uniform = constUniforms[i];
      const data = propertyValueMap[uniform.propertyId];
      data != null && uniform.applyFunc(uniform, data);
    }
  }

  /**
   * Upload texture shader data in shader uniform block.
   * @param uniformBlock - shader Uniform block
   * @param shaderData - shader data
   */
  uploadTextures(uniformBlock: ShaderUniformBlock, shaderData: ShaderData): void {
    const propertyValueMap = shaderData._propertyValueMap;
    const textureUniforms = uniformBlock.textureUniforms;
    // textureUniforms property maybe null if ShaderUniformBlock not contain any texture.
    if (textureUniforms) {
      for (let i = 0, n = textureUniforms.length; i < n; i++) {
        const uniform = textureUniforms[i];
        const texture = <Texture>propertyValueMap[uniform.propertyId];
        if (texture) {
          uniform.applyFunc(uniform, texture);
        } else {
          uniform.applyFunc(uniform, uniform.textureDefault);
        }
      }
    }
  }

  /**
   * Upload ungroup texture shader data in shader uniform block.
   */
  uploadUnGroupTextures(): void {
    const textureUniforms = this.otherUniformBlock.textureUniforms;
    // textureUniforms property maybe null if ShaderUniformBlock not contain any texture.
    if (textureUniforms) {
      for (let i = 0, n = textureUniforms.length; i < n; i++) {
        const uniform = textureUniforms[i];
        uniform.applyFunc(uniform, uniform.textureDefault);
      }
    }
  }

  /**
   * Grouping other data.
   */
  groupingOtherUniformBlock(): void {
    const { constUniforms, textureUniforms } = this.otherUniformBlock;
    constUniforms.length > 0 && this._groupingSubOtherUniforms(constUniforms, false);
    textureUniforms.length > 0 && this._groupingSubOtherUniforms(textureUniforms, true);
  }

  /**
   * Bind this shader program.
   * @returns Whether the shader program is switched.
   */
  bind(): boolean {
    const rhi: Renderer = this._engine._renderer;
    if (rhi._currentBind !== this) {
      this._gl.useProgram(this._glProgram);
      rhi._currentBind = this;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Destroy this shader program.
   */
  destroy(): void {
    const gl = this._gl;
    this._vertexShader && gl.deleteShader(this._vertexShader);
    this._fragmentShader && gl.deleteShader(this._fragmentShader);
    this._glProgram && gl.deleteProgram(this._glProgram);
  }

  private _groupingSubOtherUniforms(uniforms: ShaderUniform[], isTexture: boolean): void {
    for (let i = uniforms.length - 1; i >= 0; i--) {
      const uniform = uniforms[i];
      const group = Shader._getShaderPropertyGroup(uniform.name);
      if (group !== undefined) {
        uniforms.splice(uniforms.indexOf(uniform), 1);
        this._groupingUniform(uniform, group, isTexture);
      }
    }
  }

  private _groupingUniform(uniform: ShaderUniform, group: ShaderDataGroup, isTexture: boolean): void {
    switch (group) {
      case ShaderDataGroup.Scene:
        if (isTexture) {
          this.sceneUniformBlock.textureUniforms.push(uniform);
        } else {
          this.sceneUniformBlock.constUniforms.push(uniform);
        }
        break;
      case ShaderDataGroup.Camera:
        if (isTexture) {
          this.cameraUniformBlock.textureUniforms.push(uniform);
        } else {
          this.cameraUniformBlock.constUniforms.push(uniform);
        }
        break;
      case ShaderDataGroup.Renderer:
        if (isTexture) {
          this.rendererUniformBlock.textureUniforms.push(uniform);
        } else {
          this.rendererUniformBlock.constUniforms.push(uniform);
        }
        break;
      case ShaderDataGroup.Material:
        if (isTexture) {
          this.materialUniformBlock.textureUniforms.push(uniform);
        } else {
          this.materialUniformBlock.constUniforms.push(uniform);
        }
        break;
      case ShaderDataGroup.Geographic:
        if (isTexture) {
          this.geographicUniformBlock.textureUniforms.push(uniform);
        } else {
          this.geographicUniformBlock.constUniforms.push(uniform);
        }
        break;
      default:
        if (isTexture) {
          this.otherUniformBlock.textureUniforms.push(uniform);
        } else {
          this.otherUniformBlock.constUniforms.push(uniform);
        }
    }
  }

  /**
   * init and link program with shader.
   */
  private _createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this._gl;

    // create and compile shader
    const vertexShader = this._createShader(gl.VERTEX_SHADER, vertexSource);
    if (!vertexShader) {
      return null;
    }

    const fragmentShader = this._createShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!fragmentShader) {
      return null;
    }

    // link program and shader
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.validateProgram(program);

    if (gl.isContextLost()) {
      Logger.error("Context lost while linking program.");
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    if (Logger.isEnabled && !gl.getProgramParameter(program, gl.LINK_STATUS)) {
      Logger.error("Could not link WebGL program. \n" + gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    this._vertexShader = vertexShader;
    this._fragmentShader = fragmentShader;
    return program;
  }

  private _createShader(shaderType: number, shaderSource: string): WebGLShader | null {
    const gl = this._gl;
    const shader = gl.createShader(shaderType);

    if (!shader) {
      Logger.error("Context lost while create shader.");
      return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (gl.isContextLost()) {
      Logger.error("Context lost while compiling shader.");
      gl.deleteShader(shader);
      return null;
    }

    if (Logger.isEnabled && !gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      Logger.error(
        `Could not compile WebGL shader.\n${gl.getShaderInfoLog(shader)}`,
        ShaderProgram._addLineNum(shaderSource)
      );
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * record the location of uniform/attribute.
   */
  private _recordLocation(): void {
    const gl = this._gl;
    const program = this._glProgram;
    const uniformInfos = this._getUniformInfos();
    const attributeInfos = this._getAttributeInfos();

    uniformInfos.forEach(({ name, size, type }) => {
      const shaderUniform = new ShaderUniform(this._engine);
      let isArray = false;
      let isTexture = false;

      if (name.indexOf("[0]") > 0) {
        name = name.substr(0, name.length - 3);
        isArray = true;
      }

      const location = gl.getUniformLocation(program, name);
      shaderUniform.name = name;
      shaderUniform.propertyId = Shader.getPropertyByName(name)._uniqueId;
      shaderUniform.location = location;

      switch (type) {
        case gl.FLOAT:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload1fv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload1f;
            shaderUniform.cacheValue = 0;
          }
          break;
        case gl.FLOAT_VEC2:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload2fv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload2f;
            shaderUniform.cacheValue = new Vector2(0, 0);
          }
          break;
        case gl.FLOAT_VEC3:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload3fv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload3f;
            shaderUniform.cacheValue = new Vector3(0, 0, 0);
          }
          break;
        case gl.FLOAT_VEC4:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload4fv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload4f;
            shaderUniform.cacheValue = new Vector4(0, 0, 0, 0);
          }
          break;
        case gl.BOOL:
        case gl.INT:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload1iv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload1i;
            shaderUniform.cacheValue = 0;
          }
          break;
        case gl.BOOL_VEC2:
        case gl.INT_VEC2:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload2iv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload2i;
            shaderUniform.cacheValue = new Vector2(0, 0);
          }
          break;
        case gl.BOOL_VEC3:
        case gl.INT_VEC3:
          shaderUniform.applyFunc = isArray ? shaderUniform.upload3iv : shaderUniform.upload3i;
          shaderUniform.cacheValue = new Vector3(0, 0, 0);
          break;
        case gl.BOOL_VEC4:
        case gl.INT_VEC4:
          if (isArray) {
            shaderUniform.applyFunc = shaderUniform.upload4iv;
          } else {
            shaderUniform.applyFunc = shaderUniform.upload4i;
            shaderUniform.cacheValue = new Vector4(0, 0, 0);
          }
          break;
        case gl.FLOAT_MAT4:
          shaderUniform.applyFunc = isArray ? shaderUniform.uploadMat4v : shaderUniform.uploadMat4;
          break;
        case gl.SAMPLER_2D:
        case gl.SAMPLER_CUBE:
        case (<WebGL2RenderingContext>gl).SAMPLER_2D_ARRAY:
          // eslint-disable-next-line no-case-declarations
          let defaultTexture: Texture;
          switch (type) {
            case gl.SAMPLER_2D:
              defaultTexture = this._engine._magentaTexture2D;
              break;
            case gl.SAMPLER_CUBE:
              defaultTexture = this._engine._magentaTextureCube;
              break;
            case (<WebGL2RenderingContext>gl).SAMPLER_2D_ARRAY:
              defaultTexture = this._engine._magentaTexture2DArray;
              break;
            default:
              throw new Error("Unsupported texture type.");
          }

          isTexture = true;
          if (isArray) {
            const defaultTextures = new Array<Texture>(size);
            const textureIndices = new Int32Array(size);
            const glTextureIndices = new Array<number>(size);

            for (let i = 0; i < size; i++) {
              defaultTextures[i] = defaultTexture;
              textureIndices[i] = this._activeTextureUint;
              glTextureIndices[i] = gl.TEXTURE0 + this._activeTextureUint++;
            }
            shaderUniform.textureDefault = defaultTextures;
            shaderUniform.textureIndex = glTextureIndices;
            shaderUniform.applyFunc = shaderUniform.uploadTextureArray;
            this.bind();
            gl.uniform1iv(location, textureIndices);
            shaderUniform.uploadTextureArray(shaderUniform, defaultTextures);
          } else {
            const textureIndex = gl.TEXTURE0 + this._activeTextureUint;

            shaderUniform.textureDefault = defaultTexture;
            shaderUniform.textureIndex = textureIndex;
            shaderUniform.applyFunc = shaderUniform.uploadTexture;
            this.bind();
            gl.uniform1i(location, this._activeTextureUint++);
            shaderUniform.uploadTexture(shaderUniform, defaultTexture);
          }
          break;
      }

      const group = Shader._getShaderPropertyGroup(name);
      this._groupingUniform(shaderUniform, group, isTexture);
    });

    attributeInfos.forEach(({ name }) => {
      this.attributeLocation[name] = gl.getAttribLocation(program, name);
    });
  }

  private _getUniformInfos(): WebGLActiveInfo[] {
    const gl = this._gl;
    const program = this._glProgram;
    const uniformInfos = new Array<WebGLActiveInfo>();

    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; ++i) {
      const info = gl.getActiveUniform(program, i);
      uniformInfos[i] = info;
    }

    return uniformInfos;
  }

  private _getAttributeInfos(): WebGLActiveInfo[] {
    const gl = this._gl;
    const program = this._glProgram;
    const attributeInfos = new Array<WebGLActiveInfo>();

    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; ++i) {
      const info = gl.getActiveAttrib(program, i);
      attributeInfos[i] = info;
    }

    return attributeInfos;
  }
}
