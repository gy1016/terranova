export class WorkerMiddleware {
  private static _count = 0;
  static _cmdQueue: { id: number; cmd: string; transferableObjects: unknown }[] = [];

  public readonly id: number;

  constructor() {
    this.id = WorkerMiddleware._count++;
  }

  send(taskId: number, cmd: string, transferableObjects: unknown) {
    postMessage({ taskId, cmd, transferableObjects });
  }

  runTask(taskId: number, cmd: string, transferableObjects: unknown) {
    if (this[cmd]) this[cmd](taskId, transferableObjects);
    else console.error(`The worker middleware command "${cmd}" does not exists.`);
  }

  walkCmdqueue() {
    while (WorkerMiddleware._cmdQueue.length > 0) {
      const { id, cmd, transferableObjects } = WorkerMiddleware._cmdQueue.shift();
      this.runTask(id, cmd, transferableObjects);
    }
  }
}

// 监听信息，用于接收主线程中传过来的命令
// onmessage = (ev) => {
//   const { id, cmd, transferableObjects } = ev.data;
//   console.log(ev.data);
//   WorkerMiddleware._cmdQueue.push({ id, cmd, transferableObjects });
// if (wasmLoaded) walkCmdQueue();
// };
