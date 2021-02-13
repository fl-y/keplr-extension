import { IGasConfig } from "./types";
import { TxChainSetter } from "./chain";
import { ChainGetter } from "@keplr/stores";
import { action, observable } from "mobx";
import { useState } from "react";

export class GasConfig extends TxChainSetter implements IGasConfig {
  @observable
  protected _gas!: number;

  constructor(chainGetter: ChainGetter, initialChainId: string) {
    super(chainGetter, initialChainId);

    this.setGas(0);
  }

  get gas(): number {
    return this._gas;
  }

  @action
  setGas(gas: number) {
    this._gas = Math.floor(gas);
  }

  getError(): Error | undefined {
    if (this.gas <= 0) {
      return new Error("Gas should be greater than 0");
    }
    return;
  }
}

export const useGasConfig = (chainGetter: ChainGetter, chainId: string) => {
  // TODO: Replace this with `useLocalObservable` of `mobx-react` after updating the version for mobx.
  const [txConfig] = useState(new GasConfig(chainGetter, chainId));
  txConfig.setChain(chainId);

  return txConfig;
};
