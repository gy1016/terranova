const cmdQueue = [];
let initialTag = false;
let middleware;

async function request(url, body) {
  const res = await fetch(`http://121.199.160.202:9999/${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return await res.json();
}

function initHeatMapMiddleware(id, newGradient, maxIntensity, radius, zoom) {
  return request("initHeatMapMiddleware", { id, newGradient, maxIntensity, radius, zoom });
}

function addPoints(id, points) {
  return request("addPoints", { id, points });
}

function setGradient(id, gradient) {
  return request("setGradient", { id, gradient });
}

function setMaxIntensity(id, maxHeat) {
  return request("setMaxIntensity", { id, maxIntensity: maxHeat });
}

function setRadius(id, radius) {
  return request("setRadius", { id, radius });
}

function setZoom(id, zoom) {
  return request("setZoom", { id, zoom });
}

function createTile(id, tileX, tileY, size) {
  return request("createTile", { id, tileX, tileY, size });
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
  async addPoints(taskId, points) {
    const maxHeater = await addPoints(this.id, points);
    this.send(taskId, "pointsAdded", { pointsLength: points.length, heater: maxHeater });
  }

  /**
   * 利用Wasm内部的函数，设置热力图色带
   * @param {number} taskId 当前任务编号
   * @param {string[]} gradient 主线程传过来的热力图色带
   */
  async setGradient(taskId, gradient) {
    await setGradient(this.id, gradient);
    this.gradient = gradient;
    this.send(taskId, "gradientSeted", gradient.length);
  }

  /**
   * 利用Wasm内部的函数，设置热力图的最大密度
   * @param {number} taskId 当前任务编号
   * @param {number} maxIntensity 最大热力密度
   */
  async setMaxHeat(taskId, maxHeat) {
    await setMaxIntensity(this.id, maxHeat);
    this.maxHeat = maxHeat;
    this.send(taskId, "maxHeatSeted", maxHeat);
  }

  /**
   * 利用Wasm内部的函数，设置热力点的影响半径
   * @param {number} taskId 当前任务编号
   * @param {number} radius 热力点影响半径
   */
  async setRadius(taskId, radius) {
    await setRadius(this.id, radius);
    this.radius = radius;
    this.send(taskId, "radiusSeted", radius);
  }

  /**
   * 利用Wasm内部的函数，设置热力图的层级
   * @param {number} taskId 当前任务编号
   * @param {number} zoom 热力图层级
   */
  async setZoom(taskId, zoom) {
    await setZoom(this.id, zoom);
    this.zoom = zoom;
    this.send(taskId, "zoomSeted", zoom);
  }

  /**
   * 根据瓦片坐标，调用Wasm内部的函数，生成热力瓦片
   * @param {number} taskId 当前任务编号
   * @param {Object} param1
   */
  async createTile(taskId, { x, y }) {
    const { data: tile } = await createTile(this.id, x, y, this.tileSize);
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
async function walkCmdQueue() {
  while (cmdQueue.length > 0) {
    const { id, cmd, transferableObjects } = cmdQueue.shift();
    if (cmd === "initHeatMapMiddleware") {
      middleware = new HeatmapMiddleware(transferableObjects);
      // 初次使用需要设定一下色带、半径和层级参数
      await initHeatMapMiddleware(
        middleware.id,
        middleware.gradient,
        middleware.maxHeat,
        middleware.radius,
        middleware.zoom
      );
      initialTag = true;
    } else {
      if (initialTag) middleware.runTask(id, cmd, transferableObjects);
      else {
        cmdQueue.unshift({ id, cmd, transferableObjects });
      }
    }
  }
}

// 监听信息，用于接收主线程中传过来的命令
onmessage = (ev) => {
  const { id, cmd, transferableObjects } = ev.data;
  console.log(ev.data);
  cmdQueue.push({ id, cmd, transferableObjects });
  walkCmdQueue();
};
