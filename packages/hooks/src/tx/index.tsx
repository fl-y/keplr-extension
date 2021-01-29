import { ChainGetter, CoinPrimitive } from "@keplr/stores";
import { useState } from "react";
import { action, computed, observable, runInAction } from "mobx";
import { AppCurrency, ChainInfo, Currency } from "@keplr/types";
import { computedFn } from "mobx-utils";
import { CoinPretty, Dec, Int } from "@keplr/unit";
import { StdFee } from "@cosmjs/launchpad";
import { Bech32Address } from "@keplr/cosmos";
import { DenomHelper } from "@keplr/common";

type FeeType = "high" | "average" | "low";
type ErrorOfType = "recipient" | "amount" | "fee" | "gas" | "memo";

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
  protected chainGetter: ChainGetter;

  @observable
  protected _chainId!: string;

  @observable
  protected _recipient!: string;

  @observable
  protected _amount!: string;

  @observable.ref
  protected _sendCurrency?: AppCurrency;

  @observable.ref
  protected _feeCurrencies!: Currency[];

  @observable
  protected _feeType: FeeType | undefined;

  @observable
  protected _memo!: string;

  @observable
  protected _gas!: number;

  constructor(chainGetter: ChainGetter) {
    this.chainGetter = chainGetter;
    runInAction(() => {
      this._chainId = "";
      this._recipient = "";
      this._amount = "";
      this._feeCurrencies = [];
      this._memo = "";
      this._gas = 0;
    });
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
  setSendCurrency(currency: AppCurrency | undefined) {
    this._sendCurrency = currency;
  }

  @action
  setAmount(amount: string) {
    if (amount.startsWith(".")) {
      amount = "0" + amount;
    }

    this._amount = amount;
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

  get amount(): string {
    return this._amount;
  }

  get feeCurrencies(): Currency[] {
    return this._feeCurrencies;
  }

  @computed
  get sendCurrency(): AppCurrency | undefined {
    const chainInfo = this.chainInfo;
    if (!chainInfo) {
      return undefined;
    }

    if (this._sendCurrency) {
      const find = chainInfo.currencies.find(
        (cur) => cur.coinMinimalDenom === this._sendCurrency!.coinMinimalDenom
      );
      if (find) {
        return this._sendCurrency;
      }
    }

    return chainInfo.currencies.length > 0
      ? chainInfo.currencies[0]
      : undefined;
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
    // If gas not set manually, assume that the tx is for MsgSend.
    // And, set the default gas according to the currency type.
    if (this._gas <= 0 && this.sendCurrency) {
      const denomHelper = new DenomHelper(this.sendCurrency.coinMinimalDenom);

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
      case "amount":
        const sendCurrency = this.sendCurrency;
        if (!sendCurrency) {
          return new Error("Currency to send not set");
        }
        if (Number.isNaN(parseFloat(this.amount))) {
          return new Error("Invalid form of number");
        }
        if (new Dec(this.amount).lte(new Dec(0))) {
          return new Error("Amount should be positive");
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
      return new CoinPretty(
        {
          coinMinimalDenom: "Unknown",
          coinDenom: "Unknown",
          coinDecimals: 0,
        },
        new Int(feeTypePrimitive.amount)
      ).ready(false);
    }

    const feeCurrency = feeTypePrimitive.feeCurrency;

    return new CoinPretty(feeCurrency, new Int(feeTypePrimitive.amount))
      .precision(feeCurrency.coinDecimals)
      .maxDecimals(feeCurrency.coinDecimals);
  });
}

// CONTRACT: Use with `observer`.
export const useTxConfig = (chainGetter: ChainGetter) => {
  // TODO: Replace this with `useLocalObservable` of `mobx-react` after updating the version for mobx.
  const [txConfig] = useState(new TxConfig(chainGetter));

  return txConfig;
};
