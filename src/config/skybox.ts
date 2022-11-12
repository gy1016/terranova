export enum CubeMap {
  TEXTURE_CUBE_MAP_POSITIVE_X = 34069,
  TEXTURE_CUBE_MAP_NEGATIVE_X,
  TEXTURE_CUBE_MAP_POSITIVE_Y,
  TEXTURE_CUBE_MAP_NEGATIVE_Y,
  TEXTURE_CUBE_MAP_POSITIVE_Z,
  TEXTURE_CUBE_MAP_NEGATIVE_Z,
}

export const SKYBOX_CONFIG = [
  {
    target: CubeMap.TEXTURE_CUBE_MAP_POSITIVE_X,
    url: "http://121.199.160.202/images/skybox/tycho2t3_80_mx.jpg",
  },
  {
    target: CubeMap.TEXTURE_CUBE_MAP_NEGATIVE_X,
    url: "http://121.199.160.202/images/skybox/tycho2t3_80_px.jpg",
  },
  {
    target: CubeMap.TEXTURE_CUBE_MAP_POSITIVE_Y,
    url: "http://121.199.160.202/images/skybox/tycho2t3_80_py.jpg",
  },
  {
    target: CubeMap.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    url: "http://121.199.160.202/images/skybox/tycho2t3_80_my.jpg",
  },
  {
    target: CubeMap.TEXTURE_CUBE_MAP_POSITIVE_Z,
    url: "http://121.199.160.202/images/skybox/tycho2t3_80_mz.jpg",
  },
  {
    target: CubeMap.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    url: "http://121.199.160.202/images/skybox/tycho2t3_80_pz.jpg",
  },
];
