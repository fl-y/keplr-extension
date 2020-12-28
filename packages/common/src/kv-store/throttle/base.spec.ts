import assert from "assert";
import "mocha";
import { makeThrottelableKVStore } from "./base";
import { MemoryKVStore } from "../memory";

const ThrottelableKVStore = makeThrottelableKVStore(MemoryKVStore);

describe("Test throttled kv store", () => {
  it("all data can be got", async () => {
    const kvStore = new ThrottelableKVStore("test", {
      interval: 100,
      limit: 7,
      dev: true
    });

    for (let i = 0; i < 99; i++) {
      await kvStore.set(i.toString(), i);
    }

    const getPromises: Promise<number | undefined>[] = [];

    for (let i = 0; i < 99; i++) {
      getPromises.push(kvStore.get(i.toString()));
    }

    const results = await Promise.all(getPromises);

    assert.strictEqual(results.length, 99);
    for (const [index, result] of results.entries()) {
      assert.strictEqual(index, result);
    }
  });

  it("all data can be got even if some get aborted", async () => {
    const kvStore = new ThrottelableKVStore("test", {
      interval: 100,
      limit: 7,
      dev: true
    });

    for (let i = 0; i < 99; i++) {
      await kvStore.set(i.toString(), i);
    }

    const getPromises: Promise<number | undefined>[] = [];

    for (let i = 0; i < 99; i++) {
      getPromises.push(kvStore.get(i.toString()));
    }

    // Will not be aborted because abortion will occur after getting complete.
    const unAborts = [1, 3];
    // Will be aborted.
    const aborts = [69, 74, 77, 85, 96];

    setTimeout(() => {
      for (const abort of unAborts.concat(aborts)) {
        assert.notStrictEqual(kvStore.abortGet, undefined);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        kvStore.abortGet!(abort.toString());
      }
    }, 150);

    const results = await Promise.all(getPromises);

    assert.strictEqual(results.length, 99);
    for (const [index, result] of results.entries()) {
      if (aborts.indexOf(index) >= 0) {
        assert.strictEqual(undefined, result);
      } else {
        assert.strictEqual(index, result);
      }
    }
  });
});
