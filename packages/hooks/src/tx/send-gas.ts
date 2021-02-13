import { GasConfig } from "./gas";
import { DenomHelper } from "@keplr/common";
import { ChainGetter } from "@keplr/stores";
import { IAmountConfig } from "./types";
import { useState } from "react";

export class SendGasConfig extends GasConfig {
  constructor(
    chainGetter: ChainGetter,
    initialChainId: string,
    protected readonly amountConfig: IAmountConfig
  ) {
    super(chainGetter, initialChainId);
  }

  get gas(): number {
    // If gas not set manually, assume that the tx is for MsgSend.
    // And, set the default gas according to the currency type.
    if (this._gas <= 0 && this.amountConfig.sendCurrency) {
      const denomHelper = new DenomHelper(
        this.amountConfig.sendCurrency.coinMinimalDenom
      );

      switch (denomHelper.type) {
        case "cw20":
          return 250000;
        case "secret20":
          return 250000;
        default:
          return 80000;
      }
    }

    return this._gas;
  }
}

export const useSendGasConfig = (
  chainGetter: ChainGetter,
  chainId: string,
  amountConfig: IAmountConfig
) => {
  // TODO: Replace this with `useLocalObservable` of `mobx-react` after updating the version for mobx.
  const [txConfig] = useState(
    new SendGasConfig(chainGetter, chainId, amountConfig)
  );
  txConfig.setChain(chainId);

  return txConfig;
};
