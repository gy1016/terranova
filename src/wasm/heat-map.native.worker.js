const cmdQueue = [];
let middleware;

const memoRadius = [];
const memoHeater = [];
const memoMaxIntensity = [];
const memoZoom = [];
const memoPoints = [];
const memoGradients = [];

function addPoints(id, points) {
  let myPoints = [];
  let heater = 0;

  if (memoPoints[id]) {
    myPoints = memoPoints[id];
  }

  for (const p of points) {
    lat = p[0];
    lng = p[1];
    weight = p[2];
    heater = Math.max(heater, weight);
    myPoints.push([lat, lng, weight]);
  }
  memoPoints[id] = myPoints;
  memoHeater[id] = heater;

  return heater;
}

function setRadius(id, radius) {
  memoRadius[id] = radius;
  return memoRadius[id];
}

function setZoom(id, zoom) {
  memoZoom[id] = zoom;
  return memoZoom[id];
}

function setMaxIntensity(id, maxHeat) {
  memoMaxIntensity[id] = maxHeat;
  return memoMaxIntensity[id];
}

function setGradient(id, gradient) {
  memoGradients[id] = gradient;
  return memoGradients[id].length;
}

function pointToPix(point, tileX, tileY, size, zoom) {
  const lat = point[0];
  const lng = point[1];
  const weight = point[2];
  const x = ((lng + 180.0) / 360.0) * Math.pow(2, zoom);
  const y =
    ((1.0 - Math.log(Math.tan((lat * Math.PI) / 180.0) + 1.0 / Math.cos((lat * Math.PI) / 180.0)) / Math.PI) / 2.0) *
    Math.pow(2, zoom);
  const relativeX = Math.floor((x - tileX) * size);
  const relativeY = Math.floor((y - tileY) * size);

  return [relativeX, relativeY, weight];
}

function plotHeat(heatMatrix, size, pointX, pointY, radius, weight) {
  for (let x = pointX - radius; x < pointX + radius; ++x) {
    if (x >= 0 && x < size) {
      for (y = pointY - radius; y < pointY + radius; ++y) {
        if (y >= 0 && y < size) {
          const dx = pointX - x;
          const dy = pointY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          force = 1 - dist / radius;
          if (force < 0) force = 0;
          heatMatrix[y][x] += weight * force;
        }
      }
    }
  }
}

function heatToColor(heat, maxIntensity, gradient) {
  let r = 0,
    g = 0,
    b = 0,
    a = 0;
  const gradSteps = gradient.length;
  const stepLen = maxIntensity / gradSteps;
  const gradStepF = Math.floor(heat / stepLen);
  const gradPos = heat / stepLen - gradStepF;
  const gradStep = Math.round(gradStepF);
  if (gradStep >= gradSteps) {
    r = gradient[gradSteps - 1][0];
    g = gradient[gradSteps - 1][1];
    b = gradient[gradSteps - 1][2];
    a = 255;
  } else {
    if (gradStep === 0) {
      r = gradient[0][0];
      g = gradient[0][1];
      b = gradient[0][2];
      a = Math.round(255 * gradPos);
    } else {
      const gradPosInv = 1 - gradPos;
      r = Math.round(gradient[gradStep - 1][0] * gradPosInv + gradient[gradStep - 0][0] * gradPos);
      g = Math.round(gradient[gradStep - 1][1] * gradPosInv + gradient[gradStep - 0][1] * gradPos);
      b = Math.round(gradient[gradStep - 1][2] * gradPosInv + gradient[gradStep - 0][2] * gradPos);
      a = 255;
    }
  }

  return [r, g, b, a];
}

function createTile(id, tileX, tileY, size) {
  const radius = memoRadius[id];
  const zoom = memoZoom[id];
  const gradient = memoGradients[id];
  const points = memoPoints[id];
  const numPoints = points.length;
  const heater = memoHeater[id];
  let maxIntensity = memoMaxIntensity[id];
  if (maxIntensity == -1) {
    maxIntensity = heater;
  }
  const heatMatrix = new Array(size).fill(0).map(() => new Array(size).fill(0));

  for (let i = 0; i < numPoints; ++i) {
    [x, y, weight] = pointToPix(points[i], tileX, tileY, size, zoom);
    plotHeat(heatMatrix, size, x, y, radius, weight);
  }
  const uintc8 = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; ++y) {
    for (let x = 0; x < size; ++x) {
      const [r, g, b, a] = heatToColor(heatMatrix[y][x], maxIntensity, gradient);
      uintc8[(y * size + x) * 4 + 0] = r;
      uintc8[(y * size + x) * 4 + 1] = g;
      uintc8[(y * size + x) * 4 + 2] = b;
      uintc8[(y * size + x) * 4 + 3] = a;
    }
  }
  const tile = new ImageData(uintc8, size, size);
  return tile;
  // const canvas = document.createElement("canvas");
  // const ctx = canvas.getContext("2d");
  // ctx.putImageData(tile);
  // return canvas.toDataURL("image/png");
}

// 热力图中间件
class HeatmapMiddleware {
  constructor(config) {
    // 这个id暂时写死惹
    this.id = 1;
    const { tileSize, radius, zoom, maxHeat, gradient } = config;
    this.tileSize = tileSize;
    this.zoom = zoom;
    this.radius = radius;
    this.maxHeat = maxHeat;
    this.gradient = gradient;
  }

  /**
   * 利用Wasm内部的函数，向内存当中添加热力点数组
   * @param {number} taskId 当前任务的编号，从主线程传过来的
   * @param {float[]} points 热力点位数组
   */
  addPoints(taskId, points) {
    const maxHeater = addPoints(this.id, points);
    this.send(taskId, "pointsAdded", { pointsLength: points.length, heater: maxHeater });
  }

  /**
   * 利用Wasm内部的函数，设置热力图色带
   * @param {number} taskId 当前任务编号
   * @param {string[]} gradient 主线程传过来的热力图色带
   */
  setGradient(taskId, gradient) {
    setGradient(this.id, gradient);
    this.gradient = gradient;
    this.send(taskId, "gradientSeted", gradient.length);
  }

  /**
   * 利用Wasm内部的函数，设置热力图的最大密度
   * @param {number} taskId 当前任务编号
   * @param {number} maxIntensity 最大热力密度
   */
  setMaxHeat(taskId, maxHeat) {
    setMaxIntensity(this.id, maxHeat);
    this.maxHeat = maxHeat;
    this.send(taskId, "maxHeatSeted", maxHeat);
  }

  /**
   * 利用Wasm内部的函数，设置热力点的影响半径
   * @param {number} taskId 当前任务编号
   * @param {number} radius 热力点影响半径
   */
  setRadius(taskId, radius) {
    setRadius(this.id, radius);
    this.radius = radius;
    this.send(taskId, "radiusSeted", radius);
  }

  /**
   * 利用Wasm内部的函数，设置热力图的层级
   * @param {number} taskId 当前任务编号
   * @param {number} zoom 热力图层级
   */
  setZoom(taskId, zoom) {
    setZoom(this.id, zoom);
    this.zoom = zoom;
    this.send(taskId, "zoomSeted", zoom);
  }

  /**
   * 根据瓦片坐标，调用Wasm内部的函数，生成热力瓦片
   * @param {number} taskId 当前任务编号
   * @param {Object} param1
   */
  createTile(taskId, { x, y }) {
    const tile = createTile(this.id, x, y, this.tileSize);
    this.send(taskId, "tileCreated", { row: y, col: x, level: this.zoom, base64: tile });
  }

  /**
   * 子线程向主线程传递任务
   * @param {number} id 任务id
   * @param {string} cmd 任务名称
   * @param {unknown} transferableObjects 任务参数
   */
  send(id, cmd, transferableObjects) {
    postMessage({ id, cmd, transferableObjects });
  }

  /**
   * 执行主线程传递过来的任务
   * @param {number} id 当前任务的id
   * @param {string} cmd 当前任务的名称
   * @param {unknown} transferableObjects 当前任务需要的参数
   */
  runTask(id, cmd, transferableObjects) {
    if (this[cmd]) this[cmd](id, transferableObjects);
    else console.error(`The worker middleware command "${cmd}" does not exists.`);
  }
}

// 处理cmd队列函数
function walkCmdQueue() {
  while (cmdQueue.length > 0) {
    const { id, cmd, transferableObjects } = cmdQueue.shift();
    if (cmd === "initHeatMapMiddleware") {
      middleware = new HeatmapMiddleware(transferableObjects);
      // 初次使用需要设定一下色带、半径和层级参数
      setGradient(middleware.id, middleware.gradient);
      setMaxIntensity(middleware.id, middleware.maxHeat);
      setRadius(middleware.id, middleware.radius);
      setZoom(middleware.id, middleware.zoom);
    } else {
      middleware.runTask(id, cmd, transferableObjects);
    }
  }
}

// 监听信息，用于接收主线程中传过来的命令
onmessage = (ev) => {
  const { id, cmd, transferableObjects } = ev.data;
  cmdQueue.push({ id, cmd, transferableObjects });
  walkCmdQueue();
};
