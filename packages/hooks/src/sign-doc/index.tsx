import { action, computed, observable } from "mobx";
import { Coin, Msg, StdSignDoc } from "@cosmjs/launchpad";
import { useState } from "react";
import { ChainGetter } from "@keplr/stores";
import { ChainInfo } from "@keplr/types";
import { Mutable } from "utility-types";

export class SignDocHelper {
  @observable
  protected _signDoc?: Mutable<StdSignDoc>;

  constructor(protected readonly chainGetter: ChainGetter) {}

  get signDoc(): StdSignDoc | undefined {
    return this._signDoc;
  }

  @computed
  get msgs(): readonly Msg[] {
    if (!this._signDoc) {
      return [];
    }

    return this._signDoc.msgs;
  }

  @computed
  get signDocJson(): string {
    if (!this._signDoc) {
      return "";
    }

    return JSON.stringify(this._signDoc, undefined, 2);
  }

  @action
  setFeeAmount(amount: readonly Coin[]) {
    if (!this._signDoc) {
      return;
    }

    this._signDoc.fee = {
      ...this._signDoc.fee,
      amount,
    };
  }

  @action
  setMemo(memo: string) {
    if (this._signDoc) {
      this._signDoc.memo = memo;
    }
  }

  @computed
  get memo(): string {
    if (!this._signDoc) {
      return "";
    }

    return this._signDoc.memo;
  }

  @action
  setSignDoc(signDoc: StdSignDoc | undefined) {
    this._signDoc = signDoc;
  }

  getChainInfo(): ChainInfo | undefined {
    if (!this._signDoc) {
      return;
    }

    return this.chainGetter.getChain(this._signDoc.chain_id);
  }
}

export const useSignDocHelper = (chainGetter: ChainGetter) => {
  const [helper] = useState(new SignDocHelper(chainGetter));

  return helper;
};
