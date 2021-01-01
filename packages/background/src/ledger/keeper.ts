import { Ledger } from "./ledger";

import delay from "delay";

import { Env } from "@keplr/router";
import { BIP44HDPath } from "../keyring/types";
import { KVStore } from "@keplr/common";
import { InteractionKeeper } from "../interaction/keeper";

const Buffer = require("buffer/").Buffer;

export class LedgerKeeper {
  private previousInitAborter: ((e: Error) => void) | undefined;

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly interactionKeeper: InteractionKeeper
  ) {}

  async getPublicKey(env: Env, bip44HDPath: BIP44HDPath): Promise<Uint8Array> {
    return await this.useLedger(env, async ledger => {
      try {
        // Cosmos App on Ledger doesn't support the coin type other than 118.
        return await ledger.getPublicKey([
          44,
          118,
          bip44HDPath.account,
          bip44HDPath.change,
          bip44HDPath.addressIndex
        ]);
      } finally {
        await this.interactionKeeper.waitApprove(
          env,
          "/ledger-grant",
          "ledger",
          {
            event: "getPubKey"
          },
          {
            forceOpenWindow: true,
            channel: "ledger"
          }
        );
      }
    });
  }

  async sign(
    env: Env,
    bip44HDPath: BIP44HDPath,
    expectedPubKey: Uint8Array,
    message: Uint8Array
  ): Promise<Uint8Array> {
    return await this.useLedger(env, async ledger => {
      try {
        const pubKey = await ledger.getPublicKey([
          44,
          118,
          bip44HDPath.account,
          bip44HDPath.change,
          bip44HDPath.addressIndex
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
            bip44HDPath.addressIndex
          ],
          message
        );
        await this.interactionKeeper.waitApprove(
          env,
          "/ledger-grant",
          "ledger",
          {
            event: "sign"
          },
          {
            forceOpenWindow: true,
            channel: "ledger"
          }
        );
        return signature;
      } catch (e) {
        await this.interactionKeeper.waitApprove(
          env,
          "/ledger-grant",
          "ledger",
          {
            event: "signRejected"
          },
          {
            forceOpenWindow: true,
            channel: "ledger"
          }
        );
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
        }
      };
    })();

    this.previousInitAborter = aborter.abort;

    while (true) {
      try {
        const ledger = await Ledger.init(await this.getWebHIDFlag());
        this.previousInitAborter = undefined;
        return ledger;
      } catch (e) {
        console.log(e);
        await this.notifyNeedInitializeLedger(env);

        await Promise.race([
          (async () => {
            // If ledger is not initied in 3 minutes, abort it.
            await delay(3 * 60 * 1000);
            await this.interactionKeeper.waitApprove(
              env,
              "/ledger-grant",
              "ledger",
              {
                event: "initAborted"
              },
              {
                forceOpenWindow: true,
                channel: "ledger"
              }
            );
            throw new Error("Ledger init timeout");
          })(),
          aborter.wait(),
          this.testLedgerGrantUIOpened(env)
        ]);
      }
    }
  }

  async notifyNeedInitializeLedger(env: Env) {
    await this.interactionKeeper.waitApprove(
      env,
      "/ledger-grant",
      "ledger",
      {
        event: "initFailed"
      },
      {
        forceOpenWindow: true,
        channel: "ledger"
      }
    );
  }

  async resumeInitLedger(env: Env) {
    await this.interactionKeeper.waitApprove(
      env,
      "/ledger-grant",
      "ledger",
      {
        event: "initResumed"
      },
      {
        forceOpenWindow: true,
        channel: "ledger"
      }
    );
  }

  // Test that the exntesion's granting ledger page is opened.
  async testLedgerGrantUIOpened(env: Env) {
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
        await this.interactionKeeper.waitApprove(
          env,
          "/ledger-grant",
          "ledger",
          {
            event: "initAborted"
          },
          {
            forceOpenWindow: true,
            channel: "ledger"
          }
        );
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
