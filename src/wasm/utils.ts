/**
 * 对new Promise的包装
 * @returns 一个对象，它包含一个承诺对象，并具有解决或拒绝承诺的功能。
 */
export function defer() {
  let resolve: (value: unknown) => void;
  let reject: (value: unknown) => void;

  const promise = new Promise(function (res, rej) {
    resolve = res;
    reject = rej;
  });

  return {
    resolve,
    reject,
    promise,
  };
}
