import { DefaultGasPriceStep, FeeType, IFeeConfig, IGasConfig } from "./types";
import { TxChainSetter } from "./chain";
import { ChainGetter, CoinPrimitive } from "@keplr/stores";
import { action, computed, observable } from "mobx";
import { CoinPretty, Dec, Int } from "@keplr/unit";
import { Currency } from "@keplr/types";
import { computedFn } from "mobx-utils";
import { StdFee } from "@cosmjs/launchpad";
import { useState } from "react";

export class FeeConfig extends TxChainSetter implements IFeeConfig {
  @observable
  protected _feeType: FeeType | undefined;

  constructor(
    chainGetter: ChainGetter,
    initialChainId: string,
    protected readonly gasConfig: IGasConfig
  ) {
    super(chainGetter, initialChainId);

    this.setFeeType("average");
  }

  @action
  setFeeType(feeType: FeeType | undefined) {
    this._feeType = feeType;
  }

  get feeType(): FeeType | undefined {
    return this._feeType;
  }

  get feeCurrencies(): Currency[] {
    return this.chainInfo.feeCurrencies;
  }

  get feeCurrency(): Currency {
    return this.chainInfo.feeCurrencies[0];
  }

  toStdFee(): StdFee {
    if (!this.feeType) {
      throw new Error("TODO: Implement advanced fee setting");
    }

    return {
      gas: this.gasConfig.gas.toString(),
      amount: [this.getFeeTypePrimitive(this.feeType)],
    };
  }

  @computed
  get fee(): CoinPretty {
    if (this.feeCurrencies.length === 0) {
      throw new Error("Fee currencies are empty");
    }

    if (!this.feeType) {
      throw new Error("TODO: Implement advanced fee setting");
    }

    const feePrimitive = this.getFeeTypePrimitive(this.feeType);

    return new CoinPretty(this.feeCurrency, new Int(feePrimitive.amount));
  }

  protected getFeeTypePrimitive(feeType: FeeType): CoinPrimitive {
    const gasPriceStep = this.chainInfo.gasPriceStep
      ? this.chainInfo.gasPriceStep
      : DefaultGasPriceStep;

    const gasPrice = new Dec(gasPriceStep[feeType].toString());
    const feeAmount = gasPrice.mul(new Dec(this.gasConfig.gas));

    return {
      denom: this.feeCurrency.coinMinimalDenom,
      amount: feeAmount.truncate().toString(),
    };
  }

  readonly getFeeTypePretty = computedFn((feeType: FeeType) => {
    const feeTypePrimitive = this.getFeeTypePrimitive(feeType);
    const feeCurrency = this.feeCurrency;

    return new CoinPretty(feeCurrency, new Int(feeTypePrimitive.amount))
      .precision(feeCurrency.coinDecimals)
      .maxDecimals(feeCurrency.coinDecimals);
  });

  getError(): Error | undefined {
    if (this.gasConfig.getError()) {
      return this.gasConfig.getError();
    }

    if (this.chainInfo.feeCurrencies.length === 0) {
      return new Error("Fee currency not set");
    }
  }
}

export const useFeeConfig = (
  chainGetter: ChainGetter,
  chainId: string,
  gasConfig: IGasConfig
) => {
  const [config] = useState(new FeeConfig(chainGetter, chainId, gasConfig));
  config.setChain(chainId);

  return config;
};
