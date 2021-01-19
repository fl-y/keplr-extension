import { ChainGetter, CoinPrimitive } from "@keplr/stores";
import { useState } from "react";
import { action, computed, observable, runInAction } from "mobx";
import { AppCurrency, ChainInfo, Currency } from "@keplr/types";
import { computedFn } from "mobx-utils";
import { CoinPretty, Dec, Int } from "@keplr/unit";
import { StdFee } from "@cosmjs/launchpad";
import { Bech32Address } from "@keplr/cosmos";

type FeeType = "high" | "average" | "low";
type ErrorOfType = "recipient" | "fee" | "gas" | "memo";

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

  @observable
  protected _recipient!: string;

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
      this._recipient = "";
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
  setRecipient(recipient: string) {
    this._recipient = recipient;
  }

  @action
  setFeeType(feeType: FeeType | undefined) {
    this._feeType = feeType;
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

  get recipient(): string {
    return this._recipient;
  }

  get feeCurrencies(): Currency[] {
    return this._feeCurrencies;
  }

  @computed
  get sendableCurrencies(): AppCurrency[] {
    const chainInfo = this.chainInfo;
    if (!chainInfo) {
      return [];
    }

    return chainInfo.currencies;
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

  readonly isValid = computedFn(
    (type: ErrorOfType, ...rest: ErrorOfType[]): boolean => {
      const types = [type, ...rest];
      for (const type of types) {
        const e = this.getErrorOf(type);
        if (e) {
          return false;
        }
      }
      return true;
    }
  );

  readonly getErrorOf = computedFn((type: ErrorOfType): Error | undefined => {
    const chainInfo = this.chainInfo;
    if (!chainInfo) {
      return new Error("Unknown chain info");
    }

    switch (type) {
      case "recipient":
        const bech32Prefix = chainInfo.bech32Config.bech32PrefixAccAddr;
        try {
          Bech32Address.validate(this.recipient, bech32Prefix);
        } catch (e) {
          return e;
        }
        return;
      case "fee":
        if (chainInfo.feeCurrencies.length === 0) {
          return new Error("Fee currency not set");
        }
        return;
      case "gas":
        if (this.gas <= 0) {
          return new Error("Gas should be greater than 0");
        }
        return;
    }
  });

  getFeePrimitive(): CoinPrimitive {
    if (!this.feeType) {
      throw new Error("TODO: Implement advanced fee setting");
    }

    return this.getFeeTypePrimitive(this.feeType);
  }

  toStdFee(): StdFee {
    return {
      gas: this.gas.toString(),
      amount: [this.getFeePrimitive()],
    };
  }

  protected getFeeTypePrimitive(
    feeType: FeeType
  ): CoinPrimitive & {
    feeCurrency?: Currency;
  } {
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

        return {
          feeCurrency,
          denom: feeCurrency.coinMinimalDenom,
          amount: feeAmount.truncate().toString(),
        };
      }
    }

    return {
      amount: "0",
      denom: "unknown",
    };
  }

  readonly getFeeTypePretty = computedFn((feeType: FeeType) => {
    const feeTypePrimitive = this.getFeeTypePrimitive(feeType);

    if (!feeTypePrimitive.feeCurrency) {
      return new CoinPretty("Unknown", new Int(feeTypePrimitive.amount)).ready(
        false
      );
    }

    const feeCurrency = feeTypePrimitive.feeCurrency;

    return new CoinPretty(
      feeCurrency.coinDenom,
      new Int(feeTypePrimitive.amount)
    )
      .precision(feeCurrency.coinDecimals)
      .maxDecimals(feeCurrency.coinDecimals);
  });
}

// CONTRACT: Use with `observer`.
export const useTxConfig = (chainGetter: ChainGetter) => {
  // TODO: Replace this with `useLocalObservable` of `mobx-react` after updating the version for mobx.
  const [txConfig] = useState(new TxConfig(chainGetter));
  txConfig.setChainGetter(chainGetter);

  return txConfig;
};
