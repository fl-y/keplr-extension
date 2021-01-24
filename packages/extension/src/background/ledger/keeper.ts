import { Ledger } from "./ledger";

import delay from "delay";

import { sendMessage } from "../../common/message/send";
import { APP_PORT } from "../../common/message/constant";
import {
  LedgerGetPublicKeyCompletedMsg,
  LedgerInitAbortedMsg,
  LedgerInitFailedMsg,
  LedgerInitResumedMsg,
  LedgerSignCompletedMsg,
} from "./foreground";
import { AsyncWaitGroup } from "../../common/async-wait-group";
import { BIP44HDPath } from "../keyring/types";
import { KVStore } from "../../common/kvstore";
import { Env } from "../../common/message";

import { Buffer } from "buffer/";

export class LedgerKeeper {
  private previousInitAborter: ((e: Error) => void) | undefined;

  private readonly initWG: AsyncWaitGroup = new AsyncWaitGroup();

  constructor(private readonly kvStore: KVStore) {}

  async getPublicKey(env: Env, bip44HDPath: BIP44HDPath): Promise<Uint8Array> {
    return await this.useLedger(env, async (ledger) => {
      try {
        // Cosmos App on Ledger doesn't support the coin type other than 118.
        return await ledger.getPublicKey([
          44,
          118,
          bip44HDPath.account,
          bip44HDPath.change,
          bip44HDPath.addressIndex,
        ]);
      } finally {
        sendMessage(APP_PORT, new LedgerGetPublicKeyCompletedMsg());
      }
    });
  }

  async sign(
    env: Env,
    bip44HDPath: BIP44HDPath,
    expectedPubKey: Uint8Array,
    message: Uint8Array
  ): Promise<Uint8Array> {
    return await this.useLedger(env, async (ledger) => {
      try {
        const pubKey = await ledger.getPublicKey([
          44,
          118,
          bip44HDPath.account,
          bip44HDPath.change,
          bip44HDPath.addressIndex,
        ]);
        if (
          Buffer.from(expectedPubKey).toString("hex") !==
          Buffer.from(pubKey).toString("hex")
        ) {
          throw new Error("Unmatched public key");
        }
        // Cosmos App on Ledger doesn't support the coin type other than 118.
        const signature = await ledger.sign(
          [
            44,
            118,
            bip44HDPath.account,
            bip44HDPath.change,
            bip44HDPath.addressIndex,
          ],
          message
        );
        sendMessage(APP_PORT, new LedgerSignCompletedMsg(false));
        return signature;
      } catch (e) {
        sendMessage(APP_PORT, new LedgerSignCompletedMsg(true));
        throw e;
      }
    });
  }

  async useLedger<T>(env: Env, fn: (ledger: Ledger) => Promise<T>): Promise<T> {
    const ledger = await this.initLedger(env);
    try {
      return await fn(ledger);
    } finally {
      await ledger.close();
    }
  }

  async initLedger(env: Env): Promise<Ledger> {
    if (this.previousInitAborter) {
      this.previousInitAborter(
        new Error(
          "New ledger request occurred before the ledger was initialized"
        )
      );
    }

    // Wait until the promise rejected or 3 minutes.
    // This ensures that the ledger connection is not executed concurrently.
    // Without this, the prior signing request can be delivered to the ledger and possibly make a user take a mistake.
    const aborter = (() => {
      let _reject: (reason?: any) => void | undefined;

      return {
        wait: () => {
          return new Promise((_, reject) => {
            _reject = reject;
            // 3.5 min.
            setTimeout(() => {
              reject("Timeout");
            }, 3.5 * 60 * 1000);
          });
        },
        abort: (e: Error) => {
          if (_reject) {
            _reject(e);
          }
        },
      };
    })();

    this.previousInitAborter = aborter.abort;

    while (true) {
      try {
        this.initWG.add();
        const ledger = await Ledger.init(await this.getWebHIDFlag());
        this.previousInitAborter = undefined;
        return ledger;
      } catch (e) {
        console.log(e);
        await this.notifyNeedInitializeLedger(env);

        await Promise.race([
          this.initWG.wait(),
          (async () => {
            // If ledger is not initied in 3 minutes, abort it.
            await delay(3 * 60 * 1000);
            await sendMessage(APP_PORT, new LedgerInitAbortedMsg());
            throw new Error("Ledger init timeout");
          })(),
          aborter.wait(),
          this.testLedgerGrantUIOpened(),
        ]);
      } finally {
        if (this.initWG.isLocked) {
          this.initWG.done();
        }
      }
    }
  }

  async notifyNeedInitializeLedger(env: Env) {
    await sendMessage(APP_PORT, new LedgerInitFailedMsg());
    await env.requestInteraction("popup.html#/ledger-grant", undefined, {
      forceOpenWindow: true,
      channel: "ledger",
    });
  }

  async resumeInitLedger() {
    await sendMessage(APP_PORT, new LedgerInitResumedMsg());

    if (this.initWG.isLocked) {
      this.initWG.done();
    }
  }

  // Test that the exntesion's granting ledger page is opened.
  async testLedgerGrantUIOpened() {
    await delay(1000);

    while (true) {
      const views = browser.extension.getViews();
      let find = false;
      for (const view of views) {
        if (
          view.location.href.includes(
            browser.runtime.getURL("popup.html#/ledger-grant")
          )
        ) {
          find = true;
          break;
        }
      }

      if (!find) {
        await sendMessage(APP_PORT, new LedgerInitAbortedMsg());
        throw new Error("Ledger init aborted");
      }

      await delay(1000);
    }
  }

  async getWebHIDFlag(): Promise<boolean> {
    const webHIDFlag = await this.kvStore.get<boolean>("webhid");
    return !!webHIDFlag;
  }

  async setWebHIDFlag(flag: boolean): Promise<void> {
    await this.kvStore.set<boolean>("webhid", flag);
  }
}
