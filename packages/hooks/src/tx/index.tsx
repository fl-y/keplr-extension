import { ChainGetter } from "@keplr/stores";
import { useState } from "react";
import { action, computed, observable, runInAction } from "mobx";
import { ChainInfo, Currency } from "@keplr/types";
import { computedFn } from "mobx-utils";
import { CoinPretty, Dec, Int } from "@keplr/unit";

type FeeType = "high" | "average" | "low";

export const DefaultGasPriceStep: {
  low: number;
  average: number;
  high: number;
} = {
  low: 0.01,
  average: 0.025,
  high: 0.04,
};

export class TxConfig {
  @observable
  protected chainGetter!: ChainGetter;

  @observable
  protected _chainId!: string;

  @observable.ref
  protected _feeCurrencies!: Currency[];

  @observable
  protected _feeType: FeeType | undefined;

  @observable
  protected _memo!: string;

  @observable
  protected _gas!: number;

  constructor(chainGetter: ChainGetter) {
    runInAction(() => {
      this.chainGetter = chainGetter;
      this._chainId = "";
      this._feeCurrencies = [];
      this._memo = "";
      this._gas = 0;
    });
  }

  @action
  setChainGetter(chainGetter: ChainGetter) {
    this.chainGetter = chainGetter;
  }

  @action
  setChain(chainId: string) {
    this._chainId = chainId;
  }

  @action
  setMemo(memo: string) {
    this._memo = memo;
  }

  @action
  setGas(gas: number) {
    this._gas = Math.floor(gas);
  }

  get chainId(): string {
    return this._chainId;
  }

  @computed
  get chainInfo(): ChainInfo | undefined {
    if (this.chainId === "") {
      return undefined;
    }
    return this.chainGetter.getChain(this.chainId);
  }

  get feeCurrencies(): Currency[] {
    return this._feeCurrencies;
  }

  get feeType(): FeeType | undefined {
    return this._feeType;
  }

  get memo(): string {
    return this._memo;
  }

  get gas(): number {
    return this._gas;
  }

  readonly getFeeTypePretty = computedFn((feeType: FeeType) => {
    const chainInfo = this.chainInfo;

    if (chainInfo) {
      const feeCurrencies = chainInfo.feeCurrencies;
      if (feeCurrencies.length > 0) {
        const feeCurrency = feeCurrencies[0];

        const gasPriceStep = chainInfo.gasPriceStep
          ? chainInfo.gasPriceStep
          : DefaultGasPriceStep;

        const gasPrice = new Dec(gasPriceStep[feeType].toString());
        const feeAmount = gasPrice.mul(new Dec(this.gas));

        return new CoinPretty(feeCurrency.coinDenom, feeAmount)
          .precision(feeCurrency.coinDecimals)
          .maxDecimals(feeCurrency.coinDecimals);
      }
    }

    return new CoinPretty("Unknown", new Int(0)).ready(false);
  });
}

// CONTRACT: Use with `observer`.
export const useTxConfig = (chainGetter: ChainGetter) => {
  const [txConfig] = useState(new TxConfig(chainGetter));
  txConfig.setChainGetter(chainGetter);

  return txConfig;
};
