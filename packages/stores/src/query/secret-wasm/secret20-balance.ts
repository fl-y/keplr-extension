import { autorun, computed, observable } from "mobx";
import { Keplr } from "@keplr/types";
import { DenomHelper, KVStore } from "@keplr/common";
import { ChainGetter } from "../../common/types";
import { ObservableQuerySecretContractCodeHash } from "./contract-hash";
import { actionAsync, task } from "mobx-utils";
import { AccountStore } from "../../account";
import { CancelToken } from "axios";
import { QueryError, QueryResponse } from "../../common";
import { CoinPretty, Int } from "@keplr/unit";
import { BalanceRegistry, ObservableQueryBalanceInner } from "../balances";
import { ObservableChainQuery } from "../chain-query";

import { Buffer } from "buffer/";

export class ObservableQuerySecret20Balance extends ObservableChainQuery<{
  balance?: string;
}> {
  @observable.ref
  protected keplr?: Keplr;

  protected nonce?: Uint8Array;

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
      // No need to set the url at initial.
      ""
    );

    if (!this.contractAddress) {
      this.setError({
        status: 0,
        statusText: "Contract address is empty",
        message: "Contract address is empty",
      });
    }

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

    // Try to get the keplr API.
    this.initKeplr();

    const disposer = autorun(() => {
      // If the keplr API is ready and the contract code hash is fetched, try to init.
      if (this.keplr && this.contractCodeHash) {
        this.init();
        disposer();
      }
    });
  }

  protected canFetch(): boolean {
    if (
      !this.querySecretContractCodeHash.getQueryContract(this.contractAddress)
        .response
    ) {
      return false;
    }

    return (
      this.bech32Address !== "" && this.viewingKey !== "" && this.nonce != null
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

  protected async fetchResponse(
    cancelToken: CancelToken
  ): Promise<QueryResponse<{ balance?: string }>> {
    const response = await super.fetchResponse(cancelToken);

    const encResult = response.data as
      | {
          height: string;
          result: {
            smart: string;
          };
        }
      | undefined;

    if (!this.keplr) {
      throw new Error("Keplr API not initialized");
    }

    if (!this.nonce) {
      throw new Error("Nonce is unknown");
    }

    if (!encResult) {
      throw new Error("Failed to get the response from the contract");
    }

    const decrypted = await this.keplr
      .getEnigmaUtils(this.chainId)
      .decrypt(Buffer.from(encResult.result.smart, "base64"), this.nonce);

    const message = Buffer.from(
      Buffer.from(decrypted).toString(),
      "base64"
    ).toString();

    const obj = JSON.parse(message);
    if (obj.balance?.amount) {
      return {
        data: {
          balance: obj.balance.amount,
        },
        status: response.status,
        staled: false,
        timestamp: Date.now(),
      };
    } else if (obj["viewing_key_error"]) {
      throw new Error(obj["viewing_key_error"]["msg"]);
    }

    throw new Error("Balance is unknown");
  }

  // Actually, the url of fetching the secret20 balance will be changed every time.
  // So, we should save it with deterministic key.
  protected getCacheKey(): string {
    return `${this.instance.name}-${
      this.instance.defaults.baseURL
    }${this.instance.getUri({
      url: `/wasm/contract/${this.contractAddress}/query/balance/${this.bech32Address}`,
    })}`;
  }

  @computed
  get contractCodeHash(): string | undefined {
    const queryCodeHash = this.querySecretContractCodeHash.getQueryContract(
      this.contractAddress
    );

    if (!queryCodeHash.response) {
      return undefined;
    }

    // Code hash is persistent, so it is safe not to consider that the response is from cache or network.
    // TODO: Handle the error case.
    return queryCodeHash.response.data.result;
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
