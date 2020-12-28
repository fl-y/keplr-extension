import { ObservableChainQuery, ObservableChainQueryMap } from "./chain-query";
import { KVStore } from "@keplr/common";
import { Balances } from "./types";
import { ChainGetter } from "../common/types";
import { computed, observable, runInAction } from "mobx";
import { CoinPretty, Int } from "@keplr/unit";
import { StoreUtils } from "../common";

/**
 * ObservableQueryBalanceInner is used to fetch each balance.
 * This is needed to fetch the contract token that only abled to fetch the contract's balance itself.
 */
export class ObservableQueryBalanceInner {
  constructor(
    protected readonly chainGetter: ChainGetter,
    protected readonly chainId: string,
    protected readonly denom: string,
    protected readonly nativeBalances: ObservableQueryBalancesInner
  ) {}

  @computed
  get isFetching(): boolean {
    // TODO: Handle the contract token.

    return this.nativeBalances.isFetching;
  }

  @computed
  get balance(): CoinPretty {
    // TODO: Handle the contract token.

    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      cur => cur.coinMinimalDenom === this.denom
    );

    // TODO: Infer the currency according to its denom (such if denom is `uatom` -> `Atom` with decimal 6)?
    if (!currency) {
      throw new Error(`Unknown currency: ${this.denom}`);
    }

    if (!this.nativeBalances.response) {
      return new CoinPretty(currency.coinDenom, new Int(0))
        .ready(false)
        .precision(currency.coinDecimals)
        .maxDecimals(currency.coinDecimals);
    }

    return StoreUtils.getBalanceFromCurrency(
      currency,
      this.nativeBalances.response.data.result
    );
  }
}

export class ObservableQueryBalancesInner extends ObservableChainQuery<
  Balances
> {
  protected bech32Address: string;

  @observable.shallow
  protected balanceMap!: Map<string, ObservableQueryBalanceInner>;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string
  ) {
    super(kvStore, chainId, chainGetter, `/bank/balances/${bech32Address}`);

    runInAction(() => {
      this.balanceMap = new Map();
    });

    this.bech32Address = bech32Address;

    if (!this.bech32Address) {
      this.setError({
        status: 0,
        statusText: "Address is empty",
        message: "Address is empty"
      });
    }
  }

  protected canFetch(): boolean {
    // If bech32 address is empty, it will always fail, so don't need to fetch it.
    return this.bech32Address.length > 0;
  }

  protected getBalanceInner(denom: string): ObservableQueryBalanceInner {
    if (!this.balanceMap.has(denom)) {
      runInAction(() => {
        this.balanceMap.set(
          denom,
          new ObservableQueryBalanceInner(
            this.chainGetter,
            this.chainId,
            denom,
            this
          )
        );
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.balanceMap.get(denom)!;
  }

  @computed
  get stakable(): ObservableQueryBalanceInner {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    return this.getBalanceInner(chainInfo.stakeCurrency.coinMinimalDenom);
  }

  @computed
  get balances(): ObservableQueryBalanceInner[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const result = [];

    for (let i = 0; i < chainInfo.currencies.length; i++) {
      const currency = chainInfo.currencies[i];
      result.push(this.getBalanceInner(currency.coinDenom));
    }

    return result;
  }

  @computed
  get unstakables(): ObservableQueryBalanceInner[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currencies = chainInfo.currencies.filter(
      cur => cur.coinMinimalDenom !== chainInfo.stakeCurrency.coinMinimalDenom
    );

    const result = [];

    for (let i = 0; i < currencies.length; i++) {
      const currency = currencies[i];
      result.push(this.getBalanceInner(currency.coinDenom));
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
