import { action, observable } from "mobx";
import { ObservableQuery } from "../common/query";
import { KVStore } from "../../../common/kvstore";
import Axios, { AxiosInstance } from "axios";
import { StoreEvent } from "../common/event";
import { MintingInflation, StakingPool, SupplyTotal } from "./types";
import { DeepReadonly } from "utility-types";
import { ChainInfo } from "../../../background/chains";
import { ObservableQuerySupplyTotal } from "./supply";
import { ObservableQueryInflation } from "./inflation";

export class Queries implements StoreEvent {
  protected readonly _queryMint: ObservableQuery<MintingInflation>;
  protected readonly _queryPool: ObservableQuery<StakingPool>;
  protected readonly _querySupplyTotal: ObservableQuerySupplyTotal;
  protected readonly _queryInflation: ObservableQueryInflation;

  @observable.ref
  protected _chainInfo!: ChainInfo;

  @observable.ref
  protected _chainInfos: ChainInfo[] = [];

  constructor(kvStore: KVStore, chainInfo: ChainInfo) {
    const instance = Axios.create({
      ...{
        baseURL: chainInfo.rest
      },
      ...chainInfo.restConfig
    });

    this._queryMint = new ObservableQuery(
      kvStore,
      instance,
      "/minting/inflation"
    );
    this._queryPool = new ObservableQuery(kvStore, instance, "/staking/pool");
    this._querySupplyTotal = new ObservableQuerySupplyTotal(kvStore, instance);
    this._queryInflation = new ObservableQueryInflation(
      chainInfo.stakeCurrency.coinMinimalDenom,
      this._queryMint,
      this._queryPool,
      this._querySupplyTotal
    );
  }

  @action
  onSetChainInfo(info: ChainInfo) {
    this._chainInfo = info;
  }

  @action
  onSetChainInfos(infos: ChainInfo[]) {
    this._chainInfos = infos;
  }

  get chainInfo(): DeepReadonly<ChainInfo> {
    return this._chainInfo;
  }

  get chainInfos(): DeepReadonly<ChainInfo[]> {
    return this._chainInfos;
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
}

export class QueriesStore implements StoreEvent {
  protected queriesMap = observable.map<string, Queries>(
    {},
    {
      deep: false
    }
  );

  // Assume that this field will be set by `onSetChainInfo` right after the contructor.
  protected chainInfo!: ChainInfo;

  protected chainInfos: ChainInfo[] = [];

  constructor(protected readonly kvStore: KVStore) {}

  onSetChainInfo(info: ChainInfo) {
    this.chainInfo = info;

    this.queriesMap.forEach(queries => {
      if (queries.onSetChainInfo) {
        queries.onSetChainInfo(info);
      }
    });
  }

  onSetChainInfos(infos: ChainInfo[]) {
    this.chainInfos = infos;

    this.queriesMap.forEach(queries => {
      if (queries.onSetChainInfos) {
        queries.onSetChainInfos(infos);
      }
    });
  }

  protected getChainInfo(chainId: string): ChainInfo {
    const chainInfo = this.chainInfos.find(
      chainInfo => chainInfo.chainId === chainId
    );
    if (!chainInfo) {
      throw new Error(`Unknown chain id: ${chainId}`);
    }
    return chainInfo;
  }

  protected getRestInstance(chainId: string): AxiosInstance {
    const chainInfo = this.getChainInfo(chainId);
    return Axios.create({
      ...{
        baseURL: chainInfo.rest
      },
      ...chainInfo.restConfig
    });
  }

  get current(): DeepReadonly<Queries> {
    return this.get(this.chainInfo.chainId);
  }

  get(chainId: string): DeepReadonly<Queries> {
    if (!this.queriesMap.has(chainId)) {
      const queries = new Queries(this.kvStore, this.getChainInfo(chainId));
      queries.onSetChainInfos(this.chainInfos);
      this.queriesMap.set(chainId, queries);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.queriesMap.get(chainId)!;
  }
}
