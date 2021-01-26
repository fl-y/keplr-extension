import React, { FunctionComponent, useState } from "react";
import { KeyRingStore } from "@keplr/stores";
import { action, computed, observable, runInAction } from "mobx";
import { Mnemonic, RNG } from "@keplr/crypto";
import { actionAsync, task } from "mobx-utils";
import { BIP44HDPath } from "@keplr/background";

export type RegisterMode = "create" | "add";

export type RegisterOption = {
  type: string;
  intro: FunctionComponent<{
    registerConfig: RegisterConfig;
  }>;
  component: FunctionComponent<{
    registerConfig: RegisterConfig;
  }>;
};

export class RegisterConfig {
  protected keyRingStore: KeyRingStore;

  // Indicate wether the account is creating or not.
  @observable
  protected _isLoading!: boolean;

  @observable.shallow
  protected options!: RegisterOption[];

  @observable
  protected _type!: string;

  @observable
  protected _isFinalized!: boolean;

  constructor(
    keyRingStore: KeyRingStore,
    options: RegisterOption[],
    protected readonly rng: RNG = (array) => {
      return Promise.resolve(crypto.getRandomValues(array));
    }
  ) {
    this.keyRingStore = keyRingStore;
    runInAction(() => {
      this._isLoading = false;
      this.options = [];
      this._type = "";
      this._isFinalized = false;
    });

    for (const option of options) {
      this.addRegisterOption(option.type, option.intro, option.component);
    }
  }

  @computed
  get mode(): RegisterMode {
    return this.keyRingStore.multiKeyStoreInfo.length === 0 ? "create" : "add";
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get isFinalized(): boolean {
    return this._isFinalized;
  }

  @action
  addRegisterOption(
    type: string,
    intro: RegisterOption["intro"],
    component: RegisterOption["component"]
  ) {
    this.options.push({
      type,
      intro,
      component,
    });
  }

  @action
  setType(type: string) {
    this._type = type;
  }

  get type(): string {
    return this._type;
  }

  get isIntro(): boolean {
    return this._type === "";
  }

  @action
  clear() {
    this.setType("");
  }

  // Create or add the mnemonic account.
  // If the mode is "add", password will be ignored.
  @actionAsync
  async createMnemonic(
    name: string,
    mnemonic: string,
    password: string,
    bip44HDPath: BIP44HDPath
  ) {
    this._isLoading = true;
    try {
      if (this.mode === "create") {
        await task(
          this.keyRingStore.createMnemonicKey(
            mnemonic,
            password,
            {
              name,
            },
            bip44HDPath
          )
        );
      } else {
        await task(
          this.keyRingStore.addMnemonicKey(
            mnemonic,
            {
              name,
            },
            bip44HDPath
          )
        );
      }
      this._isFinalized = true;
    } finally {
      this._isLoading = false;
    }
  }

  // Create or add the ledger account.
  // If the mode is "add", password will be ignored.
  @actionAsync
  async createLedger(name: string, password: string, bip44HDPath: BIP44HDPath) {
    this._isLoading = true;
    try {
      if (this.mode === "create") {
        await task(
          this.keyRingStore.createLedgerKey(
            password,
            {
              name,
            },
            bip44HDPath
          )
        );
      } else {
        await task(
          this.keyRingStore.addLedgerKey(
            {
              name,
            },
            bip44HDPath
          )
        );
      }
      this._isFinalized = true;
    } finally {
      this._isLoading = false;
    }
  }

  // Create or add the account based on the private key.
  // If the mode is "add", password will be ignored.
  @actionAsync
  async createPrivateKey(
    name: string,
    privateKey: Uint8Array,
    password: string
  ) {
    this._isLoading = true;
    try {
      if (this.mode === "create") {
        await task(
          this.keyRingStore.createPrivateKey(privateKey, password, {
            name,
          })
        );
      } else {
        await task(
          this.keyRingStore.addPrivateKey(privateKey, {
            name,
          })
        );
      }
      this._isFinalized = true;
    } finally {
      this._isLoading = false;
    }
  }

  async generateMnemonic(strenth: number = 128): Promise<string> {
    return await Mnemonic.generateSeed(this.rng, strenth);
  }

  render() {
    return (
      <div>
        {this.isIntro
          ? this.options.map((option) => {
              return (
                <React.Fragment key={option.type}>
                  <option.intro registerConfig={this} />
                </React.Fragment>
              );
            })
          : !this.isFinalized
          ? this.options.map((option) => {
              if (option.type === this.type) {
                return (
                  <React.Fragment key={option.type}>
                    <option.component registerConfig={this} />
                  </React.Fragment>
                );
              }
            })
          : null}
      </div>
    );
  }
}

// CONTRACT: Use with `observer`.
export const useRegisterConfig = (
  keyRingStore: KeyRingStore,
  initialOptions: RegisterOption[]
) => {
  // TODO: Replace this with `useLocalObservable` of `mobx-react` after updating the version for mobx.
  const [txConfig] = useState(new RegisterConfig(keyRingStore, initialOptions));

  return txConfig;
};
