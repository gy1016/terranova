import { HEATMAP_WASM } from "../config/wasm";

// go为我们提供的胶水代码
(() => {
  const enosys = () => {
    const err = new Error("not implemented");
    err.code = "ENOSYS";
    return err;
  };

  if (!globalThis.fs) {
    let outputBuf = "";
    globalThis.fs = {
      constants: {
        O_WRONLY: -1,
        O_RDWR: -1,
        O_CREAT: -1,
        O_TRUNC: -1,
        O_APPEND: -1,
        O_EXCL: -1,
      }, // unused
      writeSync(fd, buf) {
        outputBuf += decoder.decode(buf);
        const nl = outputBuf.lastIndexOf("\n");
        if (nl != -1) {
          console.log(outputBuf.substr(0, nl));
          outputBuf = outputBuf.substr(nl + 1);
        }
        return buf.length;
      },
      write(fd, buf, offset, length, position, callback) {
        if (offset !== 0 || length !== buf.length || position !== null) {
          callback(enosys());
          return;
        }
        const n = this.writeSync(fd, buf);
        callback(null, n);
      },
      chmod(path, mode, callback) {
        callback(enosys());
      },
      chown(path, uid, gid, callback) {
        callback(enosys());
      },
      close(fd, callback) {
        callback(enosys());
      },
      fchmod(fd, mode, callback) {
        callback(enosys());
      },
      fchown(fd, uid, gid, callback) {
        callback(enosys());
      },
      fstat(fd, callback) {
        callback(enosys());
      },
      fsync(fd, callback) {
        callback(null);
      },
      ftruncate(fd, length, callback) {
        callback(enosys());
      },
      lchown(path, uid, gid, callback) {
        callback(enosys());
      },
      link(path, link, callback) {
        callback(enosys());
      },
      lstat(path, callback) {
        callback(enosys());
      },
      mkdir(path, perm, callback) {
        callback(enosys());
      },
      open(path, flags, mode, callback) {
        callback(enosys());
      },
      read(fd, buffer, offset, length, position, callback) {
        callback(enosys());
      },
      readdir(path, callback) {
        callback(enosys());
      },
      readlink(path, callback) {
        callback(enosys());
      },
      rename(from, to, callback) {
        callback(enosys());
      },
      rmdir(path, callback) {
        callback(enosys());
      },
      stat(path, callback) {
        callback(enosys());
      },
      symlink(path, link, callback) {
        callback(enosys());
      },
      truncate(path, length, callback) {
        callback(enosys());
      },
      unlink(path, callback) {
        callback(enosys());
      },
      utimes(path, atime, mtime, callback) {
        callback(enosys());
      },
    };
  }

  if (!globalThis.process) {
    globalThis.process = {
      getuid() {
        return -1;
      },
      getgid() {
        return -1;
      },
      geteuid() {
        return -1;
      },
      getegid() {
        return -1;
      },
      getgroups() {
        throw enosys();
      },
      pid: -1,
      ppid: -1,
      umask() {
        throw enosys();
      },
      cwd() {
        throw enosys();
      },
      chdir() {
        throw enosys();
      },
    };
  }

  if (!globalThis.crypto) {
    throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");
  }

  if (!globalThis.performance) {
    throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");
  }

  if (!globalThis.TextEncoder) {
    throw new Error("globalThis.TextEncoder is not available, polyfill required");
  }

  if (!globalThis.TextDecoder) {
    throw new Error("globalThis.TextDecoder is not available, polyfill required");
  }

  const encoder = new TextEncoder("utf-8");
  const decoder = new TextDecoder("utf-8");

  globalThis.Go = class {
    constructor() {
      this.argv = ["js"];
      this.env = {};
      this.exit = (code) => {
        if (code !== 0) {
          console.warn("exit code:", code);
        }
      };
      this._exitPromise = new Promise((resolve) => {
        this._resolveExitPromise = resolve;
      });
      this._pendingEvent = null;
      this._scheduledTimeouts = new Map();
      this._nextCallbackTimeoutID = 1;

      const setInt64 = (addr, v) => {
        this.mem.setUint32(addr + 0, v, true);
        this.mem.setUint32(addr + 4, Math.floor(v / 4294967296), true);
      };

      const getInt64 = (addr) => {
        const low = this.mem.getUint32(addr + 0, true);
        const high = this.mem.getInt32(addr + 4, true);
        return low + high * 4294967296;
      };

      const loadValue = (addr) => {
        const f = this.mem.getFloat64(addr, true);
        if (f === 0) {
          return undefined;
        }
        if (!isNaN(f)) {
          return f;
        }

        const id = this.mem.getUint32(addr, true);
        return this._values[id];
      };

      const storeValue = (addr, v) => {
        const nanHead = 0x7ff80000;

        if (typeof v === "number" && v !== 0) {
          if (isNaN(v)) {
            this.mem.setUint32(addr + 4, nanHead, true);
            this.mem.setUint32(addr, 0, true);
            return;
          }
          this.mem.setFloat64(addr, v, true);
          return;
        }

        if (v === undefined) {
          this.mem.setFloat64(addr, 0, true);
          return;
        }

        let id = this._ids.get(v);
        if (id === undefined) {
          id = this._idPool.pop();
          if (id === undefined) {
            id = this._values.length;
          }
          this._values[id] = v;
          this._goRefCounts[id] = 0;
          this._ids.set(v, id);
        }
        this._goRefCounts[id]++;
        let typeFlag = 0;
        switch (typeof v) {
          case "object":
            if (v !== null) {
              typeFlag = 1;
            }
            break;
          case "string":
            typeFlag = 2;
            break;
          case "symbol":
            typeFlag = 3;
            break;
          case "function":
            typeFlag = 4;
            break;
        }
        this.mem.setUint32(addr + 4, nanHead | typeFlag, true);
        this.mem.setUint32(addr, id, true);
      };

      const loadSlice = (addr) => {
        const array = getInt64(addr + 0);
        const len = getInt64(addr + 8);
        return new Uint8Array(this._inst.exports.mem.buffer, array, len);
      };

      const loadSliceOfValues = (addr) => {
        const array = getInt64(addr + 0);
        const len = getInt64(addr + 8);
        const a = new Array(len);
        for (let i = 0; i < len; i++) {
          a[i] = loadValue(array + i * 8);
        }
        return a;
      };

      const loadString = (addr) => {
        const saddr = getInt64(addr + 0);
        const len = getInt64(addr + 8);
        return decoder.decode(new DataView(this._inst.exports.mem.buffer, saddr, len));
      };

      const timeOrigin = Date.now() - performance.now();
      this.importObject = {
        go: {
          // Go's SP does not change as long as no Go code is running. Some operations (e.g. calls, getters and setters)
          // may synchronously trigger a Go event handler. This makes Go code get executed in the middle of the imported
          // function. A goroutine can switch to a new stack if the current stack is too small (see morestack function).
          // This changes the SP, thus we have to update the SP used by the imported function.

          // func wasmExit(code int32)
          "runtime.wasmExit": (sp) => {
            sp >>>= 0;
            const code = this.mem.getInt32(sp + 8, true);
            this.exited = true;
            delete this._inst;
            delete this._values;
            delete this._goRefCounts;
            delete this._ids;
            delete this._idPool;
            this.exit(code);
          },

          // func wasmWrite(fd uintptr, p unsafe.Pointer, n int32)
          "runtime.wasmWrite": (sp) => {
            sp >>>= 0;
            const fd = getInt64(sp + 8);
            const p = getInt64(sp + 16);
            const n = this.mem.getInt32(sp + 24, true);
            fs.writeSync(fd, new Uint8Array(this._inst.exports.mem.buffer, p, n));
          },

          // func resetMemoryDataView()
          "runtime.resetMemoryDataView": (sp) => {
            sp >>>= 0;
            this.mem = new DataView(this._inst.exports.mem.buffer);
          },

          // func nanotime1() int64
          "runtime.nanotime1": (sp) => {
            sp >>>= 0;
            setInt64(sp + 8, (timeOrigin + performance.now()) * 1000000);
          },

          // func walltime() (sec int64, nsec int32)
          "runtime.walltime": (sp) => {
            sp >>>= 0;
            const msec = new Date().getTime();
            setInt64(sp + 8, msec / 1000);
            this.mem.setInt32(sp + 16, (msec % 1000) * 1000000, true);
          },

          // func scheduleTimeoutEvent(delay int64) int32
          "runtime.scheduleTimeoutEvent": (sp) => {
            sp >>>= 0;
            const id = this._nextCallbackTimeoutID;
            this._nextCallbackTimeoutID++;
            this._scheduledTimeouts.set(
              id,
              setTimeout(
                () => {
                  this._resume();
                  while (this._scheduledTimeouts.has(id)) {
                    // for some reason Go failed to register the timeout event, log and try again
                    // (temporary workaround for https://github.com/golang/go/issues/28975)
                    console.warn("scheduleTimeoutEvent: missed timeout event");
                    this._resume();
                  }
                },
                getInt64(sp + 8) + 1 // setTimeout has been seen to fire up to 1 millisecond early
              )
            );
            this.mem.setInt32(sp + 16, id, true);
          },

          // func clearTimeoutEvent(id int32)
          "runtime.clearTimeoutEvent": (sp) => {
            sp >>>= 0;
            const id = this.mem.getInt32(sp + 8, true);
            clearTimeout(this._scheduledTimeouts.get(id));
            this._scheduledTimeouts.delete(id);
          },

          // func getRandomData(r []byte)
          "runtime.getRandomData": (sp) => {
            sp >>>= 0;
            crypto.getRandomValues(loadSlice(sp + 8));
          },

          // func finalizeRef(v ref)
          "syscall/js.finalizeRef": (sp) => {
            sp >>>= 0;
            const id = this.mem.getUint32(sp + 8, true);
            this._goRefCounts[id]--;
            if (this._goRefCounts[id] === 0) {
              const v = this._values[id];
              this._values[id] = null;
              this._ids.delete(v);
              this._idPool.push(id);
            }
          },

          // func stringVal(value string) ref
          "syscall/js.stringVal": (sp) => {
            sp >>>= 0;
            storeValue(sp + 24, loadString(sp + 8));
          },

          // func valueGet(v ref, p string) ref
          "syscall/js.valueGet": (sp) => {
            sp >>>= 0;
            const result = Reflect.get(loadValue(sp + 8), loadString(sp + 16));
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 32, result);
          },

          // func valueSet(v ref, p string, x ref)
          "syscall/js.valueSet": (sp) => {
            sp >>>= 0;
            Reflect.set(loadValue(sp + 8), loadString(sp + 16), loadValue(sp + 32));
          },

          // func valueDelete(v ref, p string)
          "syscall/js.valueDelete": (sp) => {
            sp >>>= 0;
            Reflect.deleteProperty(loadValue(sp + 8), loadString(sp + 16));
          },

          // func valueIndex(v ref, i int) ref
          "syscall/js.valueIndex": (sp) => {
            sp >>>= 0;
            storeValue(sp + 24, Reflect.get(loadValue(sp + 8), getInt64(sp + 16)));
          },

          // valueSetIndex(v ref, i int, x ref)
          "syscall/js.valueSetIndex": (sp) => {
            sp >>>= 0;
            Reflect.set(loadValue(sp + 8), getInt64(sp + 16), loadValue(sp + 24));
          },

          // func valueCall(v ref, m string, args []ref) (ref, bool)
          "syscall/js.valueCall": (sp) => {
            sp >>>= 0;
            try {
              const v = loadValue(sp + 8);
              const m = Reflect.get(v, loadString(sp + 16));
              const args = loadSliceOfValues(sp + 32);
              const result = Reflect.apply(m, v, args);
              sp = this._inst.exports.getsp() >>> 0; // see comment above
              storeValue(sp + 56, result);
              this.mem.setUint8(sp + 64, 1);
            } catch (err) {
              sp = this._inst.exports.getsp() >>> 0; // see comment above
              storeValue(sp + 56, err);
              this.mem.setUint8(sp + 64, 0);
            }
          },

          // func valueInvoke(v ref, args []ref) (ref, bool)
          "syscall/js.valueInvoke": (sp) => {
            sp >>>= 0;
            try {
              const v = loadValue(sp + 8);
              const args = loadSliceOfValues(sp + 16);
              const result = Reflect.apply(v, undefined, args);
              sp = this._inst.exports.getsp() >>> 0; // see comment above
              storeValue(sp + 40, result);
              this.mem.setUint8(sp + 48, 1);
            } catch (err) {
              sp = this._inst.exports.getsp() >>> 0; // see comment above
              storeValue(sp + 40, err);
              this.mem.setUint8(sp + 48, 0);
            }
          },

          // func valueNew(v ref, args []ref) (ref, bool)
          "syscall/js.valueNew": (sp) => {
            sp >>>= 0;
            try {
              const v = loadValue(sp + 8);
              const args = loadSliceOfValues(sp + 16);
              const result = Reflect.construct(v, args);
              sp = this._inst.exports.getsp() >>> 0; // see comment above
              storeValue(sp + 40, result);
              this.mem.setUint8(sp + 48, 1);
            } catch (err) {
              sp = this._inst.exports.getsp() >>> 0; // see comment above
              storeValue(sp + 40, err);
              this.mem.setUint8(sp + 48, 0);
            }
          },

          // func valueLength(v ref) int
          "syscall/js.valueLength": (sp) => {
            sp >>>= 0;
            setInt64(sp + 16, parseInt(loadValue(sp + 8).length));
          },

          // valuePrepareString(v ref) (ref, int)
          "syscall/js.valuePrepareString": (sp) => {
            sp >>>= 0;
            const str = encoder.encode(String(loadValue(sp + 8)));
            storeValue(sp + 16, str);
            setInt64(sp + 24, str.length);
          },

          // valueLoadString(v ref, b []byte)
          "syscall/js.valueLoadString": (sp) => {
            sp >>>= 0;
            const str = loadValue(sp + 8);
            loadSlice(sp + 16).set(str);
          },

          // func valueInstanceOf(v ref, t ref) bool
          "syscall/js.valueInstanceOf": (sp) => {
            sp >>>= 0;
            this.mem.setUint8(sp + 24, loadValue(sp + 8) instanceof loadValue(sp + 16) ? 1 : 0);
          },

          // func copyBytesToGo(dst []byte, src ref) (int, bool)
          "syscall/js.copyBytesToGo": (sp) => {
            sp >>>= 0;
            const dst = loadSlice(sp + 8);
            const src = loadValue(sp + 32);
            if (!(src instanceof Uint8Array || src instanceof Uint8ClampedArray || src instanceof Uint8ClampedArray)) {
              this.mem.setUint8(sp + 48, 0);
              return;
            }
            const toCopy = src.subarray(0, dst.length);
            dst.set(toCopy);
            setInt64(sp + 40, toCopy.length);
            this.mem.setUint8(sp + 48, 1);
          },

          // func copyBytesToJS(dst ref, src []byte) (int, bool)
          "syscall/js.copyBytesToJS": (sp) => {
            sp >>>= 0;
            const dst = loadValue(sp + 8);
            const src = loadSlice(sp + 16);
            if (!(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray || dst instanceof Uint8ClampedArray)) {
              this.mem.setUint8(sp + 48, 0);
              return;
            }
            const toCopy = src.subarray(0, dst.length);
            dst.set(toCopy);
            setInt64(sp + 40, toCopy.length);
            this.mem.setUint8(sp + 48, 1);
          },

          debug: (value) => {
            console.log(value);
          },
        },
      };
    }

    async run(instance) {
      if (!(instance instanceof WebAssembly.Instance)) {
        throw new Error("Go.run: WebAssembly.Instance expected");
      }
      this._inst = instance;
      this.mem = new DataView(this._inst.exports.mem.buffer);
      this._values = [
        // JS values that Go currently has references to, indexed by reference id
        NaN,
        0,
        null,
        true,
        false,
        globalThis,
        this,
      ];
      this._goRefCounts = new Array(this._values.length).fill(Infinity); // number of references that Go has to a JS value, indexed by reference id
      this._ids = new Map([
        // mapping from JS values to reference ids
        [0, 1],
        [null, 2],
        [true, 3],
        [false, 4],
        [globalThis, 5],
        [this, 6],
      ]);
      this._idPool = []; // unused ids that have been garbage collected
      this.exited = false; // whether the Go program has exited

      // Pass command line arguments and environment variables to WebAssembly by writing them to the linear memory.
      let offset = 4096;

      const strPtr = (str) => {
        const ptr = offset;
        const bytes = encoder.encode(str + "\0");
        new Uint8Array(this.mem.buffer, offset, bytes.length).set(bytes);
        offset += bytes.length;
        if (offset % 8 !== 0) {
          offset += 8 - (offset % 8);
        }
        return ptr;
      };

      const argc = this.argv.length;

      const argvPtrs = [];
      this.argv.forEach((arg) => {
        argvPtrs.push(strPtr(arg));
      });
      argvPtrs.push(0);

      const keys = Object.keys(this.env).sort();
      keys.forEach((key) => {
        argvPtrs.push(strPtr(`${key}=${this.env[key]}`));
      });
      argvPtrs.push(0);

      const argv = offset;
      argvPtrs.forEach((ptr) => {
        this.mem.setUint32(offset, ptr, true);
        this.mem.setUint32(offset + 4, 0, true);
        offset += 8;
      });

      // The linker guarantees global data starts from at least wasmMinDataAddr.
      // Keep in sync with cmd/link/internal/ld/data.go:wasmMinDataAddr.
      const wasmMinDataAddr = 4096 + 8192;
      if (offset >= wasmMinDataAddr) {
        throw new Error("total length of command line and environment variables exceeds limit");
      }

      this._inst.exports.run(argc, argv);
      if (this.exited) {
        this._resolveExitPromise();
      }
      await this._exitPromise;
    }

    _resume() {
      if (this.exited) {
        throw new Error("Go program has already exited");
      }
      this._inst.exports.resume();
      if (this.exited) {
        this._resolveExitPromise();
      }
    }

    _makeFuncWrapper(id) {
      const go = this;
      return function () {
        const event = { id: id, this: this, args: arguments };
        go._pendingEvent = event;
        go._resume();
        return event.result;
      };
    }
  };
})();

// 初始化一些变量
const go = new Go();
const cmdQueue = [];
let wasmLoaded = false;
let middleware;
let startDate,
  endDate,
  totalDate = 0,
  count = 0;
let chart = [[], []];

// 请求wasm文件并流失编译
WebAssembly.instantiateStreaming(fetch(HEATMAP_WASM), go.importObject).then((result) => {
  go.run(result.instance)
    .then((result) => console.log("WA exited.", result))
    .catch((err) => console.log("WA Main Fail:", err));
  wasmLoaded = true;
});

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
    chart[0].push(count);
    chart[1].push(totalDate);
    count += 1;
    startDate = new Date().valueOf();
    const tile = createTile(this.id, x, y, this.tileSize);
    endDate = new Date().valueOf();
    totalDate += endDate - startDate;
    console.log(`statisc: ${totalDate} / ${count} = `, totalDate / count);
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
  console.log(chart);
}

// 监听信息，用于接收主线程中传过来的命令
onmessage = (ev) => {
  const { id, cmd, transferableObjects } = ev.data;
  console.log(ev.data);
  cmdQueue.push({ id, cmd, transferableObjects });
  if (wasmLoaded) walkCmdQueue();
};
