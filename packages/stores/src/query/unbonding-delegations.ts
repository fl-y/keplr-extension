import { ObservableChainQuery, ObservableChainQueryMap } from "./chain-query";
import { UnbondingDelegation, UnbondingDelegations } from "./types";
import { KVStore } from "@keplr/common";
import { ChainGetter } from "../common/types";
import { CoinPretty, Int } from "@keplr/unit";
import { computed } from "mobx";

export class ObservableQueryUnbondingDelegationsInner extends ObservableChainQuery<
  UnbondingDelegations
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
      `/staking/delegators/${bech32Address}/unbonding_delegations`
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
      return new CoinPretty(stakeCurrency.coinDenom, new Int(0))
        .ready(false)
        .precision(stakeCurrency.coinDecimals)
        .maxDecimals(stakeCurrency.coinDecimals);
    }

    let totalBalance = new Int(0);
    for (const unbondingDelegation of this.response.data.result) {
      for (const entry of unbondingDelegation.entries) {
        totalBalance = totalBalance.add(new Int(entry.balance));
      }
    }

    return new CoinPretty(stakeCurrency.coinDenom, totalBalance)
      .precision(stakeCurrency.coinDecimals)
      .maxDecimals(stakeCurrency.coinDecimals);
  }

  @computed
  get unbondingBalances(): {
    validatorAddress: string;
    entries: {
      creationHeight: Int;
      completionTime: string;
      balance: CoinPretty;
    }[];
  }[] {
    const unbondings = this.unbondings;

    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    const result = [];
    for (const unbonding of unbondings) {
      const entries = [];
      for (const entry of unbonding.entries) {
        entries.push({
          creationHeight: new Int(entry.creation_height),
          completionTime: entry.completion_time,
          balance: new CoinPretty(
            stakeCurrency.coinDenom,
            new Int(entry.balance)
          )
            .precision(stakeCurrency.coinDecimals)
            .maxDecimals(stakeCurrency.coinDecimals)
        });
      }

      result.push({
        validatorAddress: unbonding.validator_address,
        entries
      });
    }

    return result;
  }

  @computed
  get unbondings(): UnbondingDelegation[] {
    if (!this.response) {
      return [];
    }

    return this.response.data.result;
  }
}

export class ObservableQueryUnbondingDelegations extends ObservableChainQueryMap<
  UnbondingDelegations
> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryUnbondingDelegationsInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address
      );
    });
  }

  getQueryBech32Address(
    bech32Address: string
  ): ObservableQueryUnbondingDelegationsInner {
    return this.get(bech32Address) as ObservableQueryUnbondingDelegationsInner;
  }
}