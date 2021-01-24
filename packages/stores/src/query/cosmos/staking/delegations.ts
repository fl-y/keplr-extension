import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { Delegation, Delegations, DelegationsStargate } from "./types";
import { KVStore } from "@keplr/common";
import { ChainGetter } from "../../../common";
import { CoinPretty, Int } from "@keplr/unit";
import { computed } from "mobx";
import { computedFn } from "mobx-utils";

export class ObservableQueryDelegationsInner extends ObservableChainQuery<
  Delegations | DelegationsStargate
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
        message: "Address is empty",
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
    for (const delegation of this.response.data.result) {
      if (typeof delegation.balance === "string") {
        totalBalance = totalBalance.add(new Int(delegation.balance));
      } else {
        totalBalance = totalBalance.add(new Int(delegation.balance.amount));
      }
    }

    return new CoinPretty(stakeCurrency.coinDenom, totalBalance)
      .precision(stakeCurrency.coinDecimals)
      .maxDecimals(stakeCurrency.coinDecimals);
  }

  @computed
  get delegationBalances(): {
    validatorAddress: string;
    balance: CoinPretty;
  }[] {
    if (!this.response) {
      return [];
    }

    const stakeCurrency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    const result = [];

    for (const delegation of this.response.data.result) {
      const balance =
        typeof delegation.balance === "string"
          ? delegation.balance
          : delegation.balance.amount;

      result.push({
        validatorAddress:
          "validator_address" in delegation
            ? delegation.validator_address
            : delegation.delegation.validator_address,
        balance: new CoinPretty(stakeCurrency.coinDenom, new Int(balance))
          .precision(stakeCurrency.coinDecimals)
          .maxDecimals(stakeCurrency.coinDecimals),
      });
    }

    return result;
  }

  @computed
  get delegations(): Delegation[] {
    if (!this.response) {
      return [];
    }

    const result = this.response.data.result;
    if (result.length > 0 && "delegation" in result[0]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return result.map((r) => {
        return {
          balance: r.balance,
          delegator_address: r.delegation.delegator_address,
          validator_address: r.delegation.validator_address,
          shares: r.delegation.shares,
        };
      });
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return result;
  }

  readonly getDelegationTo = computedFn(
    (validatorAddress: string): CoinPretty => {
      const delegations = this.delegations;

      const stakeCurrency = this.chainGetter.getChain(this.chainId)
        .stakeCurrency;

      if (!this.response) {
        return new CoinPretty(stakeCurrency.coinDenom, new Int(0))
          .ready(false)
          .precision(stakeCurrency.coinDecimals)
          .maxDecimals(stakeCurrency.coinDecimals);
      }

      for (const delegation of delegations) {
        if (delegation.validator_address === validatorAddress) {
          return new CoinPretty(
            stakeCurrency.coinDenom,
            new Int(
              typeof delegation.balance === "string"
                ? delegation.balance
                : delegation.balance.amount
            )
          )
            .precision(stakeCurrency.coinDecimals)
            .maxDecimals(stakeCurrency.coinDecimals);
        }
      }

      return new CoinPretty(stakeCurrency.coinDenom, new Int(0))
        .precision(stakeCurrency.coinDecimals)
        .maxDecimals(stakeCurrency.coinDecimals);
    }
  );
}

export class ObservableQueryDelegations extends ObservableChainQueryMap<
  Delegations | DelegationsStargate
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
