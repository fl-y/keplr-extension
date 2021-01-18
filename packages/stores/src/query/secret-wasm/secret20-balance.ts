import { computed } from "mobx";
import { DenomHelper, KVStore } from "@keplr/common";
import { ChainGetter } from "../../common/types";
import { ObservableQuerySecretContractCodeHash } from "./contract-hash";
import { actionAsync, task } from "mobx-utils";
import { AccountStore } from "../../account";
import { QueryError } from "../../common";
import { CoinPretty, Int } from "@keplr/unit";
import { BalanceRegistry, ObservableQueryBalanceInner } from "../balances";
import { ObservableSecretContractChainQuery } from "./contract-query";

export class ObservableQuerySecret20Balance extends ObservableSecretContractChainQuery<{
  balance: string;
}> {
  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    protected readonly contractAddress: string,
    protected readonly bech32Address: string,
    protected readonly viewingKey: string,
    protected readonly querySecretContractCodeHash: ObservableQuerySecretContractCodeHash
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      contractAddress,
      { balance: { address: bech32Address, key: viewingKey } },
      querySecretContractCodeHash
    );

    if (!this.bech32Address) {
      this.setError({
        status: 0,
        statusText: "Address is empty",
        message: "Address is empty",
      });
    }

    if (!this.viewingKey) {
      this.setError({
        status: 0,
        statusText: "Viewing key is empty",
        message: "Viewing key is empty",
      });
    }
  }

  protected canFetch(): boolean {
    return (
      super.canFetch && this.bech32Address !== "" && this.viewingKey !== ""
    );
  }

  @actionAsync
  protected async initKeplr() {
    this.keplr = await task(AccountStore.getKeplr());
  }

  @actionAsync
  protected async init() {
    if (this.keplr && this.contractCodeHash && this.viewingKey) {
      const enigmaUtils = this.keplr.getEnigmaUtils(this.chainId);
      const encrypted = await task(
        enigmaUtils.encrypt(this.contractCodeHash, {
          balance: { address: this.bech32Address, key: this.viewingKey },
        })
      );
      this.nonce = encrypted.slice(0, 32);

      const encoded = Buffer.from(
        Buffer.from(encrypted).toString("base64")
      ).toString("hex");

      this.setUrl(
        `/wasm/contract/${this.contractAddress}/query/${encoded}?encoding=hex`
      );
    }
  }
}

export class ObservableQuerySecret20BalanceInner extends ObservableQueryBalanceInner {
  protected readonly querySecret20Balance: ObservableQuerySecret20Balance;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    denomHelper: DenomHelper,
    protected readonly bech32Address: string,
    protected readonly querySecretContractCodeHash: ObservableQuerySecretContractCodeHash
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      // No need to set the url at initial.
      "",
      denomHelper
    );

    const viewingKey =
      "type" in this.currency && this.currency.type === "secret20"
        ? this.currency.viewingKey
        : "";
    this.querySecret20Balance = new ObservableQuerySecret20Balance(
      kvStore,
      chainId,
      chainGetter,
      denomHelper.contractAddress,
      bech32Address,
      viewingKey,
      this.querySecretContractCodeHash
    );
  }

  protected canFetch(): boolean {
    return false;
  }

  get isFetching(): boolean {
    return (
      this.querySecretContractCodeHash.getQueryContract(
        this.denomHelper.contractAddress
      ).isFetching || this.querySecret20Balance.isFetching
    );
  }

  get error(): Readonly<QueryError<unknown>> | undefined {
    return (
      this.querySecretContractCodeHash.getQueryContract(
        this.denomHelper.contractAddress
      ).error || this.querySecret20Balance.error
    );
  }

  @computed
  get balance(): CoinPretty {
    const denom = this.denomHelper.denom;

    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      (cur) => cur.coinMinimalDenom === denom
    );

    // TODO: Infer the currency according to its denom (such if denom is `uatom` -> `Atom` with decimal 6)?
    if (!currency) {
      throw new Error(`Unknown currency: ${denom}`);
    }

    if (
      !this.querySecret20Balance.response ||
      !this.querySecret20Balance.response.data.balance
    ) {
      return new CoinPretty(currency.coinDenom, new Int(0))
        .ready(false)
        .precision(currency.coinDecimals)
        .maxDecimals(currency.coinDecimals);
    }

    return new CoinPretty(
      currency.coinDenom,
      new Int(this.querySecret20Balance.response.data.balance)
    )
      .precision(currency.coinDecimals)
      .maxDecimals(currency.coinDecimals);
  }
}

export class ObservableQuerySecret20BalanceRegistry implements BalanceRegistry {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly querySecretContractCodeHash: ObservableQuerySecretContractCodeHash
  ) {}

  getBalanceInner(
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string,
    minimalDenom: string
  ): ObservableQueryBalanceInner | undefined {
    const denomHelper = new DenomHelper(minimalDenom);
    if (denomHelper.type === "secret20") {
      return new ObservableQuerySecret20BalanceInner(
        this.kvStore,
        chainId,
        chainGetter,
        denomHelper,
        bech32Address,
        this.querySecretContractCodeHash
      );
    }
  }
}
