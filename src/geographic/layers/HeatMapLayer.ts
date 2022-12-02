import { Geodetic2 } from "../../math";
import { Engine, Logger, isUint8, ImageMaterial, Shader } from "../../core";
import { Tile, TileCoord } from "./Tile";
import { Layer } from "./Layer";

interface HeatMapLayerConfig {
  radius: number;
  tileSize: number;
  gradient: number[][] | string[];
  maxIntensity: number;
}

// lat, lng, weight
interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
}

export class HeatMapLayer extends Layer {
  static heatMapLayers: Record<number, HeatMapLayer> = Object.create(null);
  static workerLoaded: boolean = false;
  static retryLimit: number = 10;
  static heatmapWorker: Worker = new Worker("./wasm/heat-map.worker.js");
  static _count: number = 1;

  id: number;
  points: HeatPoint[] = [];
  radius: number;
  tileSize: number;
  gradient: number[][] | string[];
  maxIntensity: number;
  tiles: Map<string, Tile>;

  /**
   * Convert the incoming color band to an array of floating point types.
   * @param gradient Color ramp represented by array of strings or array of floats
   * @returns Color ramp represented by array of floats
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

  constructor(engine: Engine, config: HeatMapLayerConfig) {
    super(engine);
    this.id = HeatMapLayer._count++;
    const { radius, gradient, maxIntensity, tileSize } = config;
    this.radius = radius;
    this.gradient = gradient;
    this.maxIntensity = maxIntensity;
    this.tileSize = tileSize;

    HeatMapLayer.heatMapLayers[this.id] = this;

    this.initialWorker();
    this.send("initHeatMapMiddleware", {
      ...config,
      zoom: engine.scene.camera.level,
      gradient: HeatMapLayer.parseGradient(gradient),
    });
  }

  initialWorker() {
    HeatMapLayer.heatmapWorker.onmessage = (ev) => {
      if (!ev || !ev.data) return Logger.error("Bad event from worker", ev);
      const [id, cmd, data] = ev.data;
      // 如果对应id的热力图层存在则执行worker中传入的指令
      if (HeatMapLayer.heatMapLayers[id]) HeatMapLayer.heatMapLayers[id].onMessage(cmd, data);
      // 其余指令传入的id都为0
      else if (id === 0) {
        // 通知worker加载成功
        if (cmd === "workerLoaded") {
          HeatMapLayer.workerLoaded = true;
          Logger.info("heatmapWorker was loaded!");
        } else if (cmd === "debug") {
          Logger.debug("heatmapWorker:", data);
        } else if (cmd === "error") {
          Logger.error("WORKER ERROR!", data);
        } else {
          // 如果id为0则认为所有heatmapLayer都要执行指令
          Object.values(HeatMapLayer.heatMapLayers).forEach((layer) => layer.onMessage(cmd, data));
        }
      } else {
        Logger.error(`There is no HeatmapLayer with id "${id}". {cmd: ${cmd}, data:${JSON.stringify(data)} }`);
      }
    };
  }

  setRadius(radius: number) {
    this.radius = radius;
    this.send("setRadius", radius);
  }

  setMaxIntensity(maxIntensity: number) {
    // 如果传入的maxIntensity小于0，则将其设置为-1，然后会使用点位中的最大热力值为上限
    if (maxIntensity <= 0) maxIntensity = -1;
    this.maxIntensity = maxIntensity;
    this.send("setMaxIntensity", maxIntensity);
  }

  setZoom(zoom: number) {
    this.send("setZoom", zoom);
  }

  setGradient(gradient: string[] | number[][]) {
    this.gradient = gradient;
    const postGradient = HeatMapLayer.parseGradient(gradient);
    this.send("setGradient", postGradient);
  }

  addPoints(points: HeatPoint[]) {
    const postPoints: number[][] = [[points[0].lat, points[0].lng, points[0].weight]];
    this.points = this.points.concat(points);
    // 求出所有点位的包围盒
    const minGeodetic2 = new Geodetic2(points[0].lng, points[0].lat);
    const maxGeodetic2 = new Geodetic2(points[0].lng, points[0].lat);

    for (let i = 1; i < this.points.length; ++i) {
      const point = this.points[i];
      minGeodetic2.latitude = Math.min(minGeodetic2.latitude, point.lat);
      minGeodetic2.longitude = Math.min(minGeodetic2.longitude, point.lng);
      maxGeodetic2.latitude = Math.max(maxGeodetic2.latitude, point.lat);
      maxGeodetic2.longitude = Math.max(maxGeodetic2.longitude, point.lng);
      postPoints.push([point.lat, point.lng, point.weight]);
    }

    const minMercator = minGeodetic2.toMercator();
    const maxMercator = maxGeodetic2.toMercator();

    const minTileCoord = Tile.getTileRowAndCol(minMercator.x, minMercator.y, this.engine.scene.camera.level);
    const maxTileCoord = Tile.getTileRowAndCol(maxMercator.x, maxMercator.y, this.engine.scene.camera.level);

    this.tiles = new Map();
    for (let row = minTileCoord.row; row <= maxTileCoord.row; ++row) {
      for (let col = minTileCoord.col; col <= maxTileCoord.col; ++col) {
        const tile = new Tile(this.engine, this.engine.scene.camera.level, row, col);
        this.tiles.set(tile.key, tile);
      }
    }

    this.send("addPoints", postPoints);
  }

  createTile(x: number, y: number) {
    this.send("createTile", { x, y });
  }

  pointsAdded({ pointsLength, heater }: { pointsLength: number; heater: number }) {
    Logger.info(`${pointsLength} points added. The heater pixel is ${heater}.`);
    this.updateTiles();
  }

  gradientSeted(length: number) {
    Logger.info(`Gradient updated with ${length} color steps.`);
  }

  zoomSeted(zoom: number) {
    Logger.info(`The zoom in WASM is successfully set to ${zoom}.`);
  }

  maxIntensitySeted(maxIntensity: number) {
    Logger.info(`The maximum density is set to ${maxIntensity}.`);
  }

  radiusSeted(radius: number) {
    Logger.info(`The influence radius of the hot spot is set to ${radius}`);
  }

  tileCreated(tileInfo: TileCoord & { base64: string }) {
    Logger.info(`I will create the tile row ${tileInfo.row}, col: ${tileInfo.col} and level: ${tileInfo.level}`);
    const tile = this.tiles.get(Tile.generateKey(tileInfo.level, tileInfo.row, tileInfo.col));
    tile.material = new ImageMaterial(this.engine, Shader.find("tile"), { flipY: true, base64: tileInfo.base64 });
  }

  updateTiles() {
    for (const tile of this.tiles.values()) {
      this.send("createTile", { x: tile.col, y: tile.row });
    }
  }

  // 去执行对应的命令
  onMessage(command: string, data: unknown) {
    if (this[command]) this[command](data);
    else if (command === "debug") Logger.debug(data);
    else if (command === "info") Logger.info(data);
    else Logger.error(`The HeatmapLayer command "${command}" does not exists.`);
  }

  send<T>(command: string, data: T, retryCount = 0) {
    if (retryCount > HeatMapLayer.retryLimit) {
      return Logger.error(`Command ${command} timeout.`);
    }
    if (HeatMapLayer.workerLoaded) {
      HeatMapLayer.heatmapWorker.postMessage([this.id, command, data]);
    } else {
      setTimeout(this.send.bind(this, command, data, ++retryCount), 300);
    }
  }

  // TODO: 抽象一个图层类，提取公共方法
  _render(level: number) {
    const engine = this.engine;
    const camera = engine.scene.camera;

    for (const tile of this.tiles.values()) {
      const { mesh, material } = tile;
      // ! 按道理说这里material肯定是有的，但是会报错，先加个判断
      if (!material) continue;
      material.shaderData.setTexture(ImageMaterial._sampleprop, (material as ImageMaterial).texture2d);
      const program = material.shader._getShaderProgram(engine, Shader._compileMacros);
      program.bind();
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      mesh._draw(program, mesh.subMesh);
    }
  }
}
