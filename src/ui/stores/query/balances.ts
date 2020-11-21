import { ObservableChainQuery, ObservableChainQueryMap } from "./chain-query";
import { KVStore } from "../../../common/kvstore";
import { Balances } from "./types";
import { ChainGetter } from "../common/types";

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

  getQueryBech32Address(bech32Address: string): ObservableChainQuery<Balances> {
    return this.get(bech32Address);
  }
}
