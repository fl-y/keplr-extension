import { action, observable, runInAction } from "mobx";
import { RegisterConfig } from "@keplr/hooks";
import { useState } from "react";
import { actionAsync, task } from "mobx-utils";

export type NewMnemonicMode = "generate" | "verify";

export enum NumWords {
  WORDS12,
  WORDS24,
}

export class NewMnemonicConfig {
  @observable
  protected _mode!: NewMnemonicMode;

  @observable
  protected _numWords!: NumWords;

  @observable
  protected _mnemonic!: string;

  @observable
  protected _name!: string;

  @observable
  protected _password!: string;

  constructor(protected readonly registerConfig: RegisterConfig) {
    runInAction(() => {
      this._mode = "generate";
      this._numWords = NumWords.WORDS12;
      this._mnemonic = "";
      this._name = "";
      this._password = "";
    });

    this.setNumWords(this.numWords);
  }

  get mode(): NewMnemonicMode {
    return this._mode;
  }

  @action
  setMode(mode: NewMnemonicMode) {
    this._mode = mode;
  }

  get numWords(): NumWords {
    return this._numWords;
  }

  @actionAsync
  async setNumWords(numWords: NumWords) {
    this._numWords = numWords;
    if (numWords === NumWords.WORDS12) {
      this._mnemonic = await task(this.registerConfig.generateMnemonic(128));
    } else if (numWords === NumWords.WORDS24) {
      this._mnemonic = await task(this.registerConfig.generateMnemonic(256));
    }
  }

  get mnemonic(): string {
    return this._mnemonic;
  }

  @action
  setMnemonic(mnemonic: string) {
    this._mnemonic = mnemonic;
  }

  get name(): string {
    return this._name;
  }

  @action
  setName(name: string) {
    this._name = name;
  }

  get password(): string {
    return this._password;
  }

  @action
  setPassword(password: string) {
    this._password = password;
  }
}

export const useNewMnemonicConfig = (registerConfig: RegisterConfig) => {
  const [newMnemonicConfig] = useState(new NewMnemonicConfig(registerConfig));

  return newMnemonicConfig;
};
