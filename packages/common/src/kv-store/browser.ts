import { BaseKVStore } from "./base";
import { KVStoreProvider } from "./interface";

const BrowserKVStoreProvider: KVStoreProvider = {
  get:
    typeof browser !== "undefined"
      ? browser.storage.local.get
      : (undefined as any),
  set:
    typeof browser !== "undefined"
      ? browser.storage.local.set
      : (undefined as any)
};

export class BrowserKVStore extends BaseKVStore {
  constructor(prefix: string) {
    super(BrowserKVStoreProvider, prefix);
  }
}
