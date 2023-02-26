import { Geodetic2 } from "../../math";
import { Engine, Logger, isUint8, ImageMaterial, Shader, TextureFormat } from "../../core";
import { Tile, TileCoord } from "./Tile";
import { Layer } from "./Layer";
import TaskProcessor from "../../wasm/TaskProcessor";

/**
 * 热力图层配置接口
 */
export interface HeatMapLayerConfig {
  // 热力点位影响半径
  radius: number;
  // 生成热力瓦片的大小
  tileSize: number;
  // 热力图的色带设置
  gradient: number[][] | string[];
  // 热力点位中最大热力值
  maxHeat: number;
  // 生成热力图的模式
  mode?: "native" | "wasm" | "edge";
}

/**
 * 热力点位属性接口
 */
export interface HeatPoint {
  // 热力点纬度
  lat: number;
  // 热力点经度
  lng: number;
  // 热力点热力值
  heat: number;
}

export class HeatMapLayer extends Layer {
  // 热力点位数组
  points: HeatPoint[] = [];
  // 热力点影响半径
  radius: number;
  // 热力瓦片大小
  tileSize: number = 256;
  // 热力图色带
  gradient: number[][] | string[];
  // 热力图最大热力值
  maxHeat: number;
  // 热力图生成模式
  mode: "native" | "wasm" | "edge";
  // 缓存的热力瓦片
  tiles: Map<string, Tile>;
  // 子线程实例
  processor: TaskProcessor;

  // 用于相机层级判断
  private _lastZoom: number = -1;

  /**
   * 将传入的色带转换为浮点型数组。
   * @param gradient 由字符串数组或浮点数组表示的颜色渐变
   * @returns 由浮点数组表示的颜色渐变
   */
  static parseGradient(gradient: string[] | number[][]): number[][] {
    return gradient.map((color) => {
      if (color.toString().match(/^#?[0-9a-f]{3}$/i)) {
        color = color.toString().replace(/^#?(.)(.)(.)$/, "$1$1$2$2$3$3");
      }
      if (typeof color === "string") {
        if (color.match(/^#?[0-9a-f]{6}$/i)) {
          color = color
            .match(/^#?(..)(..)(..)$/)
            .slice(1)
            .map((n) => parseInt(n, 16));
        } else {
          throw Error(`Invalid color format (${color}).`);
        }
      } else if (color instanceof Array) {
        if (!(color.length && isUint8(color[0]) && isUint8(color[1]) && isUint8(color[2]))) {
          throw Error(`Invalid color format (${JSON.stringify(color)}).`);
        }
      } else {
        throw Error(`Invalid color object (${JSON.stringify(color)}).`);
      }
      return color;
    });
  }

  /**
   * 继承Layer类创建的热力图层
   * @param engine 引擎实例
   * @param config 热力图层配置
   */
  constructor(engine: Engine, config: HeatMapLayerConfig) {
    super(engine);
    const { radius, gradient, maxHeat, tileSize, mode } = config;
    this.radius = radius;
    this.gradient = gradient;
    this.maxHeat = maxHeat;
    this.tileSize = tileSize;
    this.mode = mode ?? "wasm";
    this.processor = new TaskProcessor(`./wasm/heat-map.${this.mode}.worker.js`);
    this.processor.scheduleTask("initHeatMapMiddleware", {
      ...config,
      zoom: engine.scene.camera.level,
      gradient: HeatMapLayer.parseGradient(gradient),
    });
  }

  /**
   * 通知子线程设置热力点影响半径
   * @param radius 热力点影响半径
   */
  setRadius(radius: number) {
    this.radius = radius;
    const promise = this.processor.scheduleTask("setRadius", radius);
    promise.then((data) => {
      Logger.info(data);
      this.updateTiles();
    });
  }

  /**
   * 通知子线程设置最大热力值
   * @param maxHeat 最大热力值
   */
  setMaxHeat(maxHeat: number) {
    this.maxHeat = maxHeat;
    const promise = this.processor.scheduleTask("setMaxHeat", maxHeat);
    promise.then((data) => {
      Logger.info(data);
      this.updateTiles();
    });
  }

  /**
   * 通知子线程设置热力图层级
   * @param zoom 热力图层级
   */
  setZoom(zoom: number) {
    const promise = this.processor.scheduleTask("setZoom", zoom);
    promise.then((data) => {
      Logger.info(data);
      // zoom变了需要重新计算一下需要生成的瓦片
      this._accordPointsGenerateTiles(this.points, zoom);
      // 然后通知更新瓦片
      this.updateTiles();
    });
  }

  /**
   * 通知子线程设置色带
   * @param gradient 热力图色带
   */
  setGradient(gradient: string[] | number[][]) {
    this.gradient = gradient;
    const postGradient = HeatMapLayer.parseGradient(gradient);
    const promise = this.processor.scheduleTask("setGradient", postGradient);
    promise.then((data) => {
      Logger.info(data);
      this.updateTiles();
    });
  }

  /**
   * 通知子线程添加热力点位信息
   * @param points 热力点位信息
   */
  addPoints(points: HeatPoint[]) {
    this.points = this.points.concat(points);
    const promise = this.processor.scheduleTask(
      "addPoints",
      this._accordPointsGenerateTiles(this.points, this.engine.scene.camera.level)
    );
    promise.then((data) => {
      Logger.info(data);
      this.updateTiles();
    });
  }

  /**
   * 根据行列号，通知子线程创建瓦片
   * @param x 瓦片列号
   * @param y 瓦片行号
   */
  createTile(x: number, y: number) {
    const promise = this.processor.scheduleTask("createTile", { x, y });
    promise.then((data: { transferableObjects: TileCoord & { base64: string | ImageData } }) => {
      Logger.info(data);
      const tileInfo = data.transferableObjects;
      // 有可能此时tiles已经更换了层级，所以当tile不存在时直接return
      const tile = this.tiles.get(Tile.generateKey(tileInfo.level, tileInfo.row, tileInfo.col));
      if (!tile) return;
      if (this.mode === "native") {
        // TODO: 频繁的创建有问题
        const canvas = document.createElement("canvas");
        canvas.height = this.tileSize;
        canvas.width = this.tileSize;
        const ctx = canvas.getContext("2d");
        ctx.putImageData(tileInfo.base64 as ImageData, 0, 0);
        tileInfo.base64 = canvas.toDataURL("image/png");
      } else {
        tileInfo.base64 = "data:image/png;base64," + tileInfo.base64;
      }
      tile.material = new ImageMaterial(this.engine, Shader.find("tile"), {
        flipY: true,
        base64: tileInfo.base64,
        textureFormat: TextureFormat.R8G8B8A8,
      });
    });
  }

  /**
   * 根据瓦片字典创建热力图瓦片
   */
  updateTiles() {
    for (const tile of this.tiles.values()) {
      this.createTile(tile.col, tile.row);
    }
  }

  // TODO: 这个循环太费时间了，这个考虑怎么处理
  /**
   * 根据所有热力点位生成对应层级的瓦片，会清空当前tiles的map容器
   * @param points 热力点位信息数组
   * @param zoom 需要生成的层级
   * @returns 经过组织后的热力点位数组
   */
  _accordPointsGenerateTiles(points: HeatPoint[], zoom: number): number[][] {
    const postPoints: number[][] = [];

    // ! 这里应该会被GC吧，这里欠缺考虑
    this.tiles = new Map();

    for (const point of points) {
      // 先把所有点都推进结果数组
      postPoints.push([point.lat, point.lng, point.heat]);

      // ! 这里要求传入的热力点位都是经纬度格式
      const geodetic2 = new Geodetic2(point.lng, point.lat);
      const mercator = geodetic2.toMercator();
      const curTileRowAndCol = Tile.getTileRowAndCol(mercator.x, mercator.y, zoom);
      const key = Tile.generateKey(zoom, curTileRowAndCol.row, curTileRowAndCol.col);

      // 如果该点所在的瓦片已经存在了则直接下一个点位
      if (this.tiles.has(key)) continue;

      const tile = new Tile(this.engine, this.engine.scene.camera.level, curTileRowAndCol.row, curTileRowAndCol.col);
      this.tiles.set(key, tile);
    }

    return postPoints;
  }

  // 热力图瓦片我们全部渲染，可能也没有几张
  _render(level: number) {
    if (this._lastZoom != -1 && this._lastZoom != level) {
      this.setZoom(level);
    }

    this._lastZoom = level;

    const engine = this.engine;
    const gl = engine._renderer.gl;
    const camera = engine.scene.camera;

    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (const tile of this.tiles.values()) {
      const { mesh, material } = tile;
      // ! 可能子线程还没有发过来base64
      if (!material) continue;
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      mesh._draw(program, mesh.subMesh);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
}
