import { ObservableChainQuery } from "./chain-query";
import { DenomHelper, KVStore } from "@keplr/common";
import { ChainGetter } from "../common";
import { computed, observable, runInAction } from "mobx";
import { CoinPretty } from "@keplr/unit";
import { AppCurrency } from "@keplr/types";
import { HasMapStore } from "../common";

export abstract class ObservableQueryBalanceInner<
  T = unknown,
  E = unknown
> extends ObservableChainQuery<T, E> {
  protected constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    url: string,
    protected readonly denomHelper: DenomHelper
  ) {
    super(kvStore, chainId, chainGetter, url);
  }

  abstract get balance(): CoinPretty;

  @computed
  get currency(): AppCurrency {
    const denom = this.denomHelper.denom;

    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      (cur) => cur.coinMinimalDenom === denom
    );

    // TODO: Infer the currency according to its denom (such if denom is `uatom` -> `Atom` with decimal 6)?
    if (!currency) {
      throw new Error(`Unknown currency: ${denom}`);
    }

    return currency;
  }
}

export interface BalanceRegistry {
  getBalanceInner(
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string,
    minimalDenom: string
  ): ObservableQueryBalanceInner | undefined;
}

export class ObservableQueryBalancesInner {
  protected bech32Address: string;

  @observable.shallow
  protected balanceMap!: Map<string, ObservableQueryBalanceInner>;

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter,
    protected readonly balanceRegistries: BalanceRegistry[],
    bech32Address: string
  ) {
    runInAction(() => {
      this.balanceMap = new Map();
    });

    this.bech32Address = bech32Address;
  }

  fetch() {
    this.balanceMap.forEach((bal) => bal.fetch());
  }

  protected getBalanceInner(mininalDenom: string): ObservableQueryBalanceInner {
    if (!this.balanceMap.has(mininalDenom)) {
      runInAction(() => {
        let balanceInner: ObservableQueryBalanceInner | undefined;

        for (const registry of this.balanceRegistries) {
          balanceInner = registry.getBalanceInner(
            this.chainId,
            this.chainGetter,
            this.bech32Address,
            mininalDenom
          );
          if (balanceInner) {
            break;
          }
        }

        if (balanceInner) {
          this.balanceMap.set(mininalDenom, balanceInner);
        } else {
          throw new Error(
            `Failed to get and parse the balance for ${mininalDenom}`
          );
        }
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.balanceMap.get(mininalDenom)!;
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
      result.push(this.getBalanceInner(currency.coinMinimalDenom));
    }

    return result;
  }

  @computed
  get unstakables(): ObservableQueryBalanceInner[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currencies = chainInfo.currencies.filter(
      (cur) => cur.coinMinimalDenom !== chainInfo.stakeCurrency.coinMinimalDenom
    );

    const result = [];

    for (let i = 0; i < currencies.length; i++) {
      const currency = currencies[i];
      result.push(this.getBalanceInner(currency.coinMinimalDenom));
    }

    return result;
  }
}

export class ObservableQueryBalances extends HasMapStore<ObservableQueryBalancesInner> {
  protected balanceRegistries: BalanceRegistry[] = [];

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super((bech32Address: string) => {
      return new ObservableQueryBalancesInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        this.balanceRegistries,
        bech32Address
      );
    });
  }

  addBalanceRegistry(registry: BalanceRegistry) {
    this.balanceRegistries.push(registry);
  }

  getQueryBech32Address(bech32Address: string): ObservableQueryBalancesInner {
    return this.get(bech32Address) as ObservableQueryBalancesInner;
  }
}
