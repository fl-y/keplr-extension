import { ObservableChainQuery, ObservableChainQueryMap } from "./chain-query";
import { KVStore } from "../../../common/kvstore";
import { Balances } from "./types";
import { ChainGetter } from "../common/types";
import { computed } from "mobx";
import { CoinPretty } from "../../../common/units";
import { Currency } from "../../../common/currency";
import { Int } from "@chainapsis/cosmosjs/common/int";

export class ObservableQueryBalancesInner extends ObservableChainQuery<
  Balances
> {
  protected bech32Address: string;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string
  ) {
    super(kvStore, chainId, chainGetter, `/bank/balances/${bech32Address}`);

    this.bech32Address = bech32Address;

    if (!this.bech32Address) {
      this.setError({
        status: 0,
        statusText: "Address is empty",
        message: "Address is empty"
      });
    }
  }

  protected canStart(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address.length > 0;
  }

  @computed
  get stakable(): CoinPretty {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currencyMap = {
      [chainInfo.stakeCurrency.coinMinimalDenom]: chainInfo.stakeCurrency
    };

    const result = this.getBalancesFromCurrencies(currencyMap);
    if (result.length === 0) {
      return new CoinPretty(chainInfo.stakeCurrency.coinDenom, new Int(0));
    }

    return result[0];
  }

  @computed
  get balances(): CoinPretty[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currenciesMap = chainInfo.currencies.reduce<{
      [denom: string]: Currency;
    }>((obj, currency) => {
      // TODO: Handle the contract tokens.
      if (!("type" in currency)) {
        obj[currency.coinMinimalDenom] = currency;
      }
      return obj;
    }, {});

    return this.getBalancesFromCurrencies(currenciesMap);
  }

  @computed
  get unstakables(): CoinPretty[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currenciesMap = chainInfo.currencies.reduce<{
      [denom: string]: Currency;
    }>((obj, currency) => {
      // TODO: Handle the contract tokens.
      if (
        !("type" in currency) &&
        currency.coinMinimalDenom !== chainInfo.stakeCurrency.coinMinimalDenom
      ) {
        obj[currency.coinMinimalDenom] = currency;
      }
      return obj;
    }, {});

    return this.getBalancesFromCurrencies(currenciesMap);
  }

  protected getBalancesFromCurrencies(currenciesMap: {
    [denom: string]: Currency;
  }) {
    if (!this.response) {
      return [];
    }

    // TODO: Handle the contract token.
    const result: CoinPretty[] = [];
    for (const bal of this.response.data.result) {
      const currency = currenciesMap[bal.denom];
      if (currency) {
        result.push(
          new CoinPretty(currency.coinDenom, new Int(bal.amount))
            .precision(currency.coinDecimals)
            .maxDecimals(currency.coinDecimals)
        );
      }
    }

    return result;
  }
}

export class ObservableQueryBalances extends ObservableChainQueryMap<Balances> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryBalancesInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address
      );
    });
  }

  getQueryBech32Address(bech32Address: string): ObservableQueryBalancesInner {
    return this.get(bech32Address) as ObservableQueryBalancesInner;
  }
}
