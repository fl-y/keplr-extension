import { observable, ObservableMap, runInAction } from "mobx";
import { ObservableQuery } from "../common/query";
import { KVStore } from "../../../common/kvstore";
import { MintingInflation, StakingPool, SupplyTotal } from "./types";
import { DeepReadonly } from "utility-types";
import { ObservableQuerySupplyTotal } from "./supply";
import { ObservableQueryInflation } from "./inflation";
import { ObservableQueryRewards } from "./rewards";
import { ChainGetter, ObservableChainQuery } from "./chain-query";

export class Queries {
  protected readonly _queryMint: ObservableChainQuery<MintingInflation>;
  protected readonly _queryPool: ObservableChainQuery<StakingPool>;
  protected readonly _querySupplyTotal: ObservableQuerySupplyTotal;
  protected readonly _queryInflation: ObservableQueryInflation;
  protected readonly _queryRewards: ObservableQueryRewards;

  constructor(kvStore: KVStore, chainId: string, chainGetter: ChainGetter) {
    this._queryMint = new ObservableChainQuery(
      kvStore,
      chainId,
      chainGetter,
      "/minting/inflation"
    );
    this._queryPool = new ObservableChainQuery(
      kvStore,
      chainId,
      chainGetter,
      "/staking/pool"
    );
    this._querySupplyTotal = new ObservableQuerySupplyTotal(
      kvStore,
      chainId,
      chainGetter
    );
    this._queryInflation = new ObservableQueryInflation(
      this._queryMint,
      this._queryPool,
      this._querySupplyTotal
    );
    this._queryRewards = new ObservableQueryRewards(
      kvStore,
      chainId,
      chainGetter
    );
  }

  getQueryMint(): DeepReadonly<ObservableQuery<MintingInflation>> {
    return this._queryMint;
  }

  getQueryPool(): DeepReadonly<ObservableQuery<StakingPool>> {
    return this._queryPool;
  }

  getQuerySupplyTotal(
    denom: string
  ): DeepReadonly<ObservableQuery<SupplyTotal>> {
    return this._querySupplyTotal.getQueryDenom(denom);
  }

  getQueryInflation(): DeepReadonly<ObservableQueryInflation> {
    return this._queryInflation;
  }

  getQueryRewards(): DeepReadonly<ObservableQueryRewards> {
    return this._queryRewards;
  }
}

export class QueriesStore {
  protected queriesMap: ObservableMap<string, Queries> = runInAction(() => {
    return observable.map<string, Queries>(
      {},
      {
        deep: false
      }
    );
  });

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainGetter: ChainGetter
  ) {}

  get(chainId: string): DeepReadonly<Queries> {
    if (!this.queriesMap.has(chainId)) {
      const queries = new Queries(this.kvStore, chainId, this.chainGetter);
      runInAction(() => {
        this.queriesMap.set(chainId, queries);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.queriesMap.get(chainId)!;
  }
}
