import { ObservableChainQuery, ObservableChainQueryMap } from "./chain-query";
import { Delegations } from "./types";
import { KVStore } from "../../../common/kvstore";
import { ChainGetter } from "../common/types";
import { CoinPretty } from "../../../common/units";
import { computed } from "mobx";
import { Int } from "@chainapsis/cosmosjs/common/int";

export class ObservableQueryDelegationsInner extends ObservableChainQuery<
  Delegations
> {
  protected bech32Address: string;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      `/staking/delegators/${bech32Address}/delegations`
    );

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

  @computed
  get total(): CoinPretty {
    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    if (!this.response) {
      return new CoinPretty(stakeCurrency.coinDenom, new Int(0));
    }

    let totalBalance = new Int(0);
    for (const delegation of this.response.data.result) {
      totalBalance = totalBalance.add(new Int(delegation.balance));
    }

    return new CoinPretty(stakeCurrency.coinDenom, totalBalance)
      .precision(stakeCurrency.coinDecimals)
      .maxDecimals(stakeCurrency.coinDecimals);
  }
}

export class ObservableQueryDelegations extends ObservableChainQueryMap<
  Delegations
> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryDelegationsInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address
      );
    });
  }

  getQueryBech32Address(
    bech32Address: string
  ): ObservableQueryDelegationsInner {
    return this.get(bech32Address) as ObservableQueryDelegationsInner;
  }
}
