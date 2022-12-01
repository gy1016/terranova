import { Engine, Logger, isUint8 } from "../../core";
import { Tile, TileCoord } from "./Tile";

interface HeatMapLayerConfig {
  radius: number;
  tileSize: number;
  gradient: number[][] | string[];
  maxIntensity: number;
}

interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
}

const heatmapWorker = new Worker("../../wasm/heat-map.worker.js");

heatmapWorker.onmessage = (ev) => {
  if (!ev || !ev.data) return console.error("Bad event from worker", ev);
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

export class HeatMapLayer {
  static heatMapLayers: Record<number, HeatMapLayer> = Object.create(null);
  static workerLoaded: boolean = false;
  static retryLimit: number = 10;
  static _count: number = 1;

  engine: Engine;
  id: number;
  level: number;
  points: number[] = [];
  radius: number;
  tileSize: number;
  gradient: number[][] | string[];
  maxIntensity: number;
  tiles: Tile[];

  constructor(engine: Engine, config: HeatMapLayerConfig) {
    this.id = HeatMapLayer._count++;
    this.engine = engine;
    const { radius, gradient, maxIntensity, tileSize } = config;
    this.radius = radius;
    this.gradient = gradient;
    this.maxIntensity = maxIntensity;
    this.tileSize = tileSize;

    this.send("initHeatMapMiddleware", config);
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
    gradient = gradient.map((color) => {
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
    this.send("setGradient", gradient);
  }

  addPoints(points: HeatPoint[]) {
    this.send("addPoints", points);
  }

  createTile(x: number, y: number) {
    this.send("createTile", { x, y });
  }

  pointsAdded({ pointsLength, heater }: { pointsLength: number; heater: number }) {
    Logger.info(`${pointsLength} points added. The heater pixel is ${heater}.`);
  }

  gradientSeted(length: number) {
    Logger.info(`Gradient updated with ${length} color steps.`);
  }

  maxIntensitySeted(maxIntensity: number) {
    Logger.info(`The maximum density is set to ${maxIntensity}.`);
  }

  radiusSeted(radius: number) {
    Logger.info(`The influence radius of the hot spot is set to ${radius}`);
  }

  tileCreated(tileInfo: TileCoord & { base64: string }) {
    console.log(tileInfo);
  }

  updateTiles() {
    console.log("马上来写你啦！");
  }

  // 去执行对应的命令
  onMessage(command: string, data: unknown) {
    if (this[command]) this[command](data);
    else Logger.error(`The HeatmapLayer command "${command}" does not exists.`);
  }

  send<T>(command: string, data: T, retryCount = 0) {
    if (retryCount > HeatMapLayer.retryLimit) {
      return Logger.error(`Command ${command} timeout.`);
    }
    if (HeatMapLayer.workerLoaded) {
      heatmapWorker.postMessage([this.id, command, data]);
    } else {
      setTimeout(this.send.bind(this, command, data, ++retryCount), 300);
    }
  }
}
