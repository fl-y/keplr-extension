import { observable, runInAction } from "mobx";
import { ObservableQuery } from "../common";
import { KVStore } from "@keplr/common";
import {
  MintingInflation,
  StakingParams,
  StakingPool,
  SupplyTotal
} from "./types";
import { DeepReadonly } from "utility-types";
import { ObservableQuerySupplyTotal } from "./supply";
import { ObservableQueryInflation } from "./inflation";
import { ObservableQueryRewards } from "./rewards";
import { ObservableChainQuery } from "./chain-query";
import { ObservableQueryBalances } from "./balances";
import { ChainGetter } from "../common/types";
import { ObservableQueryDelegations } from "./delegations";
import { ObservableQueryUnbondingDelegations } from "./unbonding-delegations";
import { ObservableQueryValidators } from "./validators";
import { ObservableQueryGovernance } from "./governance";

export class Queries {
  protected readonly _queryMint: ObservableChainQuery<MintingInflation>;
  protected readonly _queryPool: ObservableChainQuery<StakingPool>;
  protected readonly _queryStakingParams: ObservableChainQuery<StakingParams>;
  protected readonly _querySupplyTotal: ObservableQuerySupplyTotal;
  protected readonly _queryInflation: ObservableQueryInflation;
  protected readonly _queryRewards: ObservableQueryRewards;
  protected readonly _queryBalances: ObservableQueryBalances;
  protected readonly _queryDelegations: ObservableQueryDelegations;
  protected readonly _queryUnbondingDelegations: ObservableQueryUnbondingDelegations;
  protected readonly _queryValidators: ObservableQueryValidators;
  protected readonly _queryGovernance: ObservableQueryGovernance;

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
    this._queryStakingParams = new ObservableChainQuery(
      kvStore,
      chainId,
      chainGetter,
      "/staking/parameters"
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
    this._queryBalances = new ObservableQueryBalances(
      kvStore,
      chainId,
      chainGetter
    );
    this._queryDelegations = new ObservableQueryDelegations(
      kvStore,
      chainId,
      chainGetter
    );
    this._queryUnbondingDelegations = new ObservableQueryUnbondingDelegations(
      kvStore,
      chainId,
      chainGetter
    );
    this._queryValidators = new ObservableQueryValidators(
      kvStore,
      chainId,
      chainGetter
    );
    this._queryGovernance = new ObservableQueryGovernance(
      kvStore,
      chainId,
      chainGetter,
      this._queryPool
    );
  }

  getQueryMint(): DeepReadonly<ObservableQuery<MintingInflation>> {
    return this._queryMint;
  }

  getQueryPool(): DeepReadonly<ObservableQuery<StakingPool>> {
    return this._queryPool;
  }

  getQueryStakingParams(): DeepReadonly<ObservableQuery<StakingParams>> {
    return this._queryStakingParams;
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

  getQueryBalances(): DeepReadonly<ObservableQueryBalances> {
    return this._queryBalances;
  }

  getQueryDelegations(): DeepReadonly<ObservableQueryDelegations> {
    return this._queryDelegations;
  }

  getQueryUnbondingDelegations(): DeepReadonly<
    ObservableQueryUnbondingDelegations
  > {
    return this._queryUnbondingDelegations;
  }

  getQueryValidators(): DeepReadonly<ObservableQueryValidators> {
    return this._queryValidators;
  }

  getQueryGovernance(): DeepReadonly<ObservableQueryGovernance> {
    return this._queryGovernance;
  }
}

export class QueriesStore {
  @observable.shallow
  protected queriesMap!: Map<string, Queries>;

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainGetter: ChainGetter
  ) {
    runInAction(() => {
      this.queriesMap = new Map();
    });
  }

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
