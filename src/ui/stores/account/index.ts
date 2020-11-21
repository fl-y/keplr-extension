import { HasMapStore } from "../common/map";
import { DeepReadonly } from "utility-types";
import { action, observable } from "mobx";
import { actionAsync, task } from "mobx-utils";

function waitKeplrInit(): Promise<void> {
  return new Promise(resolve => {
    if (window.keplr) {
      resolve();
    } else {
      window.addEventListener("onload", () => {
        if (!window.keplr) {
          throw new Error("Please install the Keplr");
        }

        resolve();
      });
    }
  });
}

export class AccountInfo {
  @observable
  protected _bech32Address!: string;

  @observable
  protected error?: string;

  constructor(protected readonly chainId: string) {
    this.init();

    this.load();
  }

  @action
  protected init() {
    this._bech32Address = "";
  }

  @action
  protected setError(error: string | undefined) {
    this.error = error;
  }

  @actionAsync
  protected async load() {
    try {
      await task(waitKeplrInit());

      /* eslint-disable @typescript-eslint/no-non-null-assertion */

      await task(window.keplr!.enable(this.chainId));
      const accounts = await task(
        window.getOfflineSigner!(this.chainId)?.getAccounts()
      );

      console.log(accounts);
      this._bech32Address = accounts[0].address;

      /* eslint-enable @typescript-eslint/no-non-null-assertion */

      this.setError(undefined);
    } catch (e) {
      this.setError(e.message);
    }
  }

  get bech32Address(): string {
    return this._bech32Address;
  }
}

export class AccountStore extends HasMapStore<AccountInfo> {
  constructor() {
    super((chainId: string) => {
      return new AccountInfo(chainId);
    });
  }

  getAccountInfo(chainId: string): DeepReadonly<AccountInfo> {
    return this.get(chainId);
  }
}
