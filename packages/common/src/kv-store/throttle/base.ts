import { ThrottledKVStore, ThrottleOption } from "./interface";
import delay from "delay";
import { KVStore } from "../interface";

export function makeThrottelableKVStore(
  kvStoreCls: new (prefix: string) => KVStore
) {
  return class BaseThrottleableKVStore implements KVStore {
    throttler?: BaseThrottler;
    kvStore: KVStore;

    abortGet?: (key: string) => void;

    constructor(prefix: string, option?: ThrottleOption) {
      if (option) {
        this.throttler = new BaseThrottler(option);

        this.abortGet = (key: string) => {
          if (this.throttler) {
            this.throttler.abortGet(key);
          }
        };
      }
      this.kvStore = new kvStoreCls(prefix);
    }

    get<T = unknown>(key: string): Promise<T | undefined> {
      if (this.throttler) {
        return this.throttler.run(key, () => {
          return this.kvStore.get(key);
        });
      }

      return this.kvStore.get(key);
    }

    set<T = unknown>(key: string, data: T | null): Promise<void> {
      return this.kvStore.set(key, data);
    }

    prefix(): string {
      return this.kvStore.prefix();
    }
  };
}

type Fn<ReturnType> = () => PromiseLike<ReturnType>;

type FnPromise = {
  key: string;
  fn: Fn<unknown>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

export class BaseThrottler implements ThrottledKVStore {
  protected map: Map<string, FnPromise> = new Map();
  protected queue: Array<FnPromise> = [];

  protected _currentFnNumber: number = 0;
  protected isStopped: boolean = true;

  constructor(protected readonly option: ThrottleOption) {}

  async run<ReturnType = unknown>(
    key: string,
    fn: Fn<ReturnType>
  ): Promise<ReturnType | undefined> {
    return new Promise<ReturnType>((resolve, reject) => {
      this.enqueue({ key, fn, resolve, reject });

      if (this.length === 1) {
        this.start();
      }
    });
  }

  protected async start(): Promise<void> {
    this.isStopped = false;

    while (!this.isStopped) {
      for (let i = 0; i < this.option.limit - this.currentFnNumber; i++) {
        const fnPromise = this.dequeue();
        if (fnPromise) {
          this.currentFnNumber++;
          (async () => {
            try {
              const value = await fnPromise.fn();
              fnPromise.resolve(value);
            } catch (e) {
              fnPromise.reject(e);
            } finally {
              this.currentFnNumber--;
            }
          })();
        } else {
          break;
        }
      }

      if (this.length === 0) {
        this.stop();
      }

      if (!this.isStopped) {
        await delay(this.option.interval);
      }
    }
  }

  protected stop() {
    this.isStopped = true;
  }

  protected get length(): number {
    return this.queue.length;
  }

  protected enqueue(fnPromise: FnPromise) {
    this.map.set(fnPromise.key, fnPromise);
    this.queue.push(fnPromise);
  }

  protected dequeue(): FnPromise | undefined {
    const fnPromise = this.queue.shift();
    if (fnPromise) {
      this.map.delete(fnPromise.key);
    }
    return fnPromise;
  }

  protected getFnPromise(key: string): FnPromise | undefined {
    return this.map.get(key);
  }

  protected removeFnPromise(key: string) {
    const fnPromise = this.map.get(key);
    if (fnPromise) {
      this.map.delete(key);
      const index = this.queue.indexOf(fnPromise);
      if (index >= 0) {
        this.queue.splice(index, 1);
      }
    }
  }

  abortGet(key: string) {
    const fnPromise = this.getFnPromise(key);
    if (fnPromise) {
      fnPromise.resolve(undefined);
      this.removeFnPromise(key);
    }
  }

  protected get currentFnNumber(): number {
    return this._currentFnNumber;
  }

  protected set currentFnNumber(value: number) {
    if (this.option.dev) {
      if (value < 0) {
        throw new Error("curreny fn number should not be negative");
      }
    }
    this._currentFnNumber = value;
  }
}
