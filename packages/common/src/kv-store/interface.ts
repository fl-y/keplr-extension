import { ThrottledKVStore } from "./throttle";

export interface KVStore extends Partial<ThrottledKVStore> {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, data: T | null): Promise<void>;
  prefix(): string;
}

export interface KVStoreProvider {
  get(): Promise<{ [key: string]: any }>;
  set(items: { [key: string]: any }): Promise<void>;
}
