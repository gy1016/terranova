export class LRU<K, T> {
  capacity: number;
  dict: Map<K, T> = new Map();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K) {
    const tmp = this.dict.get(key);
    if (tmp == undefined) return undefined;
    this.dict.delete(key);
    this.dict.set(key, tmp);
    return tmp;
  }

  put(key: K, val: T) {
    const tmp = this.dict.get(key);
    if (tmp == undefined) {
      this.dict.set(key, val);
      if (this.dict.size > this.capacity) {
        const dKey = this.dict.keys().next().value;
        this.dict.delete(dKey);
      }
    } else {
      this.dict.delete(key);
      this.dict.set(key, val);
    }
  }
}
