import { SupplyTotal } from "./types";
import { KVStore } from "../../../common/kvstore";
import {
  ChainGetter,
  ObservableChainQuery,
  ObservableChainQueryMap
} from "./chain-query";

export class ObservableQuerySupplyTotal extends ObservableChainQueryMap<
  SupplyTotal
> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (denom: string) => {
      return new ObservableChainQuery<SupplyTotal>(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        `/supply/total/${denom}`
      );
    });
  }

  getQueryDenom(denom: string): ObservableChainQuery<SupplyTotal> {
    return this.get(denom);
  }

  getQueryStakeDenom(): ObservableChainQuery<SupplyTotal> {
    const chainInfo = this.chainGetter.getChain(this.chainId);
    return this.get(chainInfo.stakeCurrency.coinMinimalDenom);
  }
}
