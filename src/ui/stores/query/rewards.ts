import { Rewards } from "./types";
import { KVStore } from "../../../common/kvstore";
import {
  ChainGetter,
  ObservableChainQuery,
  ObservableChainQueryMap
} from "./chain-query";

export class ObservableQueryRewards extends ObservableChainQueryMap<Rewards> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableChainQuery<Rewards>(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        `/distribution/delegators/${bech32Address}/rewards`
      );
    });
  }

  getQueryBech32Address(bech32Address: string): ObservableChainQuery<Rewards> {
    return this.get(bech32Address);
  }
}
