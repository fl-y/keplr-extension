import { observable, ObservableMap, runInAction } from "mobx";

export class HasMapStore<T> {
  protected map: ObservableMap<string, T> = runInAction(() => {
    return observable.map<string, T>(
      {},
      {
        deep: false
      }
    );
  });

  constructor(protected readonly creater: (key: string) => T) {}

  protected get(key: string): T {
    if (!this.map.has(key)) {
      const query = this.creater(key);

      runInAction(() => {
        this.map.set(key, query);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.map.get(key)!;
  }
}
