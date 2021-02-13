import { action, computed, observable } from "mobx";
import { Msg, StdSignDoc } from "@cosmjs/launchpad";
import { useState } from "react";
import { IFeeConfig, IGasConfig, IMemoConfig } from "../tx";

export class SignDocHelper {
  @observable.ref
  protected _signDoc?: StdSignDoc;

  constructor(
    protected readonly gasConfig: IGasConfig,
    protected readonly feeConfig: IFeeConfig,
    protected readonly memoConfig: IMemoConfig
  ) {}

  get signDoc(): StdSignDoc | undefined {
    if (!this._signDoc) {
      return undefined;
    }

    return {
      ...this._signDoc,
      fee: {
        gas: this.gasConfig.gas.toString(),
        amount: [this.feeConfig.getFeePrimitive()],
      },
      memo: this.memoConfig.memo,
    };
  }

  @computed
  get msgs(): readonly Msg[] {
    if (!this.signDoc) {
      return [];
    }

    return this.signDoc.msgs;
  }

  @computed
  get signDocJson(): string {
    if (!this.signDoc) {
      return "";
    }

    return JSON.stringify(this.signDoc, undefined, 2);
  }

  @action
  setSignDoc(signDoc: StdSignDoc | undefined) {
    this._signDoc = signDoc;
  }
}

export const useSignDocHelper = (
  gasConfig: IGasConfig,
  feeConfig: IFeeConfig,
  memoConfig: IMemoConfig
) => {
  const [helper] = useState(
    new SignDocHelper(gasConfig, feeConfig, memoConfig)
  );

  return helper;
};
