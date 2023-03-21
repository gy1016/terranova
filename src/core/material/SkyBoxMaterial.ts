import { loadImage } from "../base";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { TextureCube } from "../texture";
import { Material } from "./Material";

type IFaceInfo = {
  target: number;
  url: string;
};

export class SkyBoxMaterial extends Material {
  /** Cube texture. */
  textureCube: TextureCube;
  /** Six sided information array. */
  faceInfos: IFaceInfo[];
  /** Get the sampler for the cube texture in the shader. */
  static _skyboxprop = Shader.getPropertyByName("u_Skybox");

  constructor(engine: Engine, faceInfos: IFaceInfo[]) {
    super(engine, Shader.find("skybox"));

    this.faceInfos = faceInfos;

    this.initCubeMap();
  }

  /**
   * Set cube image source when image success load.
   */
  private initCubeMap() {
    const faceInfos = this.faceInfos;
    const n = faceInfos.length;
    const promises: Promise<HTMLImageElement>[] = [];

    for (let i = 0; i < n; ++i) {
      const { url } = this.faceInfos[i];
      promises.push(loadImage(url));
    }

    Promise.all(promises).then((images) => {
      this.textureCube = new TextureCube(this.engine, images[0].width);
      this.shaderData.setTexture(SkyBoxMaterial._skyboxprop, this.textureCube);

      for (let i = 0; i < images.length; ++i) {
        this.textureCube.setImageSource(faceInfos[i].target, images[i]);
      }

      const gl = this.engine._renderer.gl;
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    });
  }
}
