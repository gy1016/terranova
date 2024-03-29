import { defer } from "./utils";

export default class TaskProcessor {
  // 子线程实例
  private _worker: Worker;
  // 子线程文件路径
  private _workerPth: string;
  // 最大活跃的任务数
  private _maximumActiveTasks: number;
  // 当前活跃的任务数
  private _activeTasks: number = 0;
  // 当前任务的Id，与子线程通过该字段联系
  private _taskId: number = 0;
  // 任务返回的deferred集合
  private _deferreds: Record<number, ReturnType<typeof defer>> = Object.create(null);

  /**
   * 创建Worker实例，并自动处理子线程发过来的事件
   * @param processor TaskProcessor实例
   * @returns Worker实例
   */
  private static createWorker(processor: TaskProcessor) {
    // TODO: 打包怎么处理还没有解决
    let workerPath = "";
    // 判断是源码开发还是当作第三方包使用
    const include = /node_modules/gi.test(import.meta.url);
    // 如果包含则裁剪到node_modules下面
    if (include) {
      workerPath =
        import.meta.url.substring(0, import.meta.url.lastIndexOf("node_modules") + 12) +
        "/" +
        "terranova/dist/" +
        processor._workerPth;
    } else {
      workerPath = processor._workerPth;
    }

    const worker = new Worker(workerPath);

    worker.onmessage = function (event) {
      processor.completeTask(event.data);
    };

    return worker;
  }

  /**
   * Web Worker的包装器，在安排任务之前不会构建Worker
   * @param workerPth worker文件的路径
   * @param maximumActiveTasks 活动任务的最大数量，一旦超过将不再排队任何任务
   */
  constructor(workerPath: string, maximumActiveTasks: number = Number.POSITIVE_INFINITY) {
    this._workerPth = workerPath;
    this._maximumActiveTasks = maximumActiveTasks;
    this._worker = TaskProcessor.createWorker(this);
  }

  /**
   * 安排一个任务由 web worker 异步处理，
   * 如果当前有更多任务活跃度超过构造函数设置的最大值，将立即返回undefined，
   * 否则，返回一个Promise
   * @param cmd 执行任务的命令
   * @param transferableObjects 需要向子线程传递的数据或参数
   * @returns undefined或Promise
   */
  scheduleTask(cmd: string, transferableObjects: unknown) {
    if (!this._worker) {
      this._worker = TaskProcessor.createWorker(this);
    }

    if (this._activeTasks >= this._maximumActiveTasks) {
      return undefined;
    }

    ++this._activeTasks;

    const id = this._taskId++;
    const deferred = defer();
    this._deferreds[id] = deferred;

    this._worker.postMessage({
      id,
      cmd,
      transferableObjects,
    });

    return deferred.promise;
  }

  /**
   * 用于在主线程中处理子线程传过来的信息
   * @param data 子线程传递给主线程的数据
   */
  completeTask(data: { id: number; cmd: string; transferableObjects: unknown }) {
    --this._activeTasks;

    const id = data.id;
    const deferred = this._deferreds[id];

    if (data.cmd == "error") {
      deferred.reject(data);
    } else {
      deferred.resolve(data);
    }

    delete this._deferreds[id];
  }
}
