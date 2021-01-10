import { ObservableChainQuery, ObservableChainQueryMap } from "./chain-query";
import { DenomHelper, KVStore } from "@keplr/common";
import { Balances } from "./types";
import { ChainGetter } from "../common/types";
import { autorun, computed, observable, runInAction } from "mobx";
import { CoinPretty, Int } from "@keplr/unit";
import { QueryResponse, StoreUtils } from "../common";
import { ObservableQuerySecretContractCodeHash } from "./secret20-contract";
import { AppCurrency, Keplr } from "@keplr/types";
import { AccountStore } from "../account";
import { CancelToken } from "axios";

import { Buffer } from "buffer/";
import { actionAsync, task } from "mobx-utils";

export abstract class ObservableQueryBalanceInner<
  T = unknown,
  E = unknown
> extends ObservableChainQuery<T, E> {
  protected constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    url: string,
    protected readonly denomHelper: DenomHelper
  ) {
    super(kvStore, chainId, chainGetter, url);
  }

  abstract get balance(): CoinPretty;
  get currency(): AppCurrency {
    const denom = this.denomHelper.denom;

    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      cur => cur.coinMinimalDenom === denom
    );

    // TODO: Infer the currency according to its denom (such if denom is `uatom` -> `Atom` with decimal 6)?
    if (!currency) {
      throw new Error(`Unknown currency: ${denom}`);
    }

    return currency;
  }
}

export class ObservableQuerySecret20Balance extends ObservableQueryBalanceInner<{
  balance?: string;
}> {
  @observable.ref
  protected keplr?: Keplr;

  protected encoded: string = "";
  protected nonce: string = "";

  constructor(
    kvStore: KVStore,
    chainGetter: ChainGetter,
    chainId: string,
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

    this.initKeplr();

    autorun(() => {
      if (this.keplr && this.contractCodeHash) {
        this.init();
      }
    });
  }

  protected canFetch(): boolean {
    if (
      !this.querySecretContractCodeHash.getQueryContract(
        this.denomHelper.contractAddress
      ).response
    ) {
      return false;
    }

    return (
      this.bech32Address !== "" && this.encoded !== "" && this.nonce !== ""
    );
  }

  @actionAsync
  protected async initKeplr() {
    this.keplr = await task(AccountStore.getKeplr());
  }

  @actionAsync
  protected async init() {
    const currency = this.currency;

    if (this.keplr && this.contractCodeHash && "viewingKey" in currency) {
      const enigmaUtils = this.keplr.getEnigmaUtils(this.chainId);
      const encrypted = await task(
        enigmaUtils.encrypt(this.contractCodeHash, {
          balance: { address: this.bech32Address, key: currency.viewingKey }
        })
      );
      const nonce = encrypted.slice(0, 32);

      const encoded = Buffer.from(
        Buffer.from(encrypted).toString("base64")
      ).toString("hex");

      this.nonce = Buffer.from(nonce).toString("hex");
      this.encoded = encoded;

      this.setUrl(
        `/wasm/contract/${currency.contractAddress}/query/${encoded}?encoding=hex`
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

    if (this.keplr && encResult) {
      const decrypted = await this.keplr
        .getEnigmaUtils(this.chainId)
        .decrypt(
          Buffer.from(encResult.result.smart, "base64"),
          Buffer.from(this.nonce, "hex")
        );

      const message = Buffer.from(
        Buffer.from(decrypted).toString(),
        "base64"
      ).toString();

      const obj = JSON.parse(message);
      if (obj.balance?.amount) {
        return {
          data: {
            balance: obj.balance.amount
          },
          status: response.status,
          staled: false,
          timestamp: Date.now()
        };
      }
      // TODO: Handle the viewing key error. ({"viewing_key_error":{"msg":"Wrong viewing key for this address or viewing key not set"}})
    }

    return {
      data: {},
      status: response.status,
      staled: false,
      timestamp: Date.now()
    };
  }

  // Actually, the url of fetching the secret20 balance will be changed every time.
  // So, we should save it with deterministic key.
  protected getCacheKey(): string {
    return `${this.instance.name}-${
      this.instance.defaults.baseURL
    }${this.instance.getUri({
      url: `/wasm/contract/${this.denomHelper.contractAddress}/query/encrypted?encoding=hex`
    })}`;
  }

  @computed
  get contractCodeHash(): string | undefined {
    const queryCodeHash = this.querySecretContractCodeHash.getQueryContract(
      this.denomHelper.contractAddress
    );

    // Code hash is persistent, so it is safe that not to consider the response is from cache or network.
    if (!queryCodeHash.response) {
      return undefined;
    }

    // TODO: Handle the error case.
    return queryCodeHash.response.data.result;
  }

  get isFetching(): boolean {
    return this.querySecretContractCodeHash.getQueryContract(
      this.denomHelper.contractAddress
    ).isFetching;
  }

  @computed
  get balance(): CoinPretty {
    const denom = this.denomHelper.denom;

    const chainInfo = this.chainGetter.getChain(this.chainId);
    const currency = chainInfo.currencies.find(
      cur => cur.coinMinimalDenom === denom
    );

    // TODO: Infer the currency according to its denom (such if denom is `uatom` -> `Atom` with decimal 6)?
    if (!currency) {
      throw new Error(`Unknown currency: ${denom}`);
    }

    if (!this.response || !this.response.data.balance) {
      return new CoinPretty(currency.coinDenom, new Int(0))
        .ready(false)
        .precision(currency.coinDecimals)
        .maxDecimals(currency.coinDecimals);
    }

    return new CoinPretty(
      currency.coinDenom,
      new Int(this.response.data.balance)
    )
      .precision(currency.coinDecimals)
      .maxDecimals(currency.coinDecimals);
  }
}

/**
 * ObservableQueryBalanceInner is used to fetch each balance.
 * This seperation is needed to fetch the contract token that only abled to fetch the contract's balance itself.
 */
export class ObservableQueryBalanceNative extends ObservableQueryBalanceInner {
  constructor(
    kvStore: KVStore,
    chainGetter: ChainGetter,
    chainId: string,
    denomHelper: DenomHelper,
    protected readonly nativeBalances: ObservableQueryBalancesInner
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      // No need to set the url
      "",
      denomHelper
    );
  }

  protected canFetch(): boolean {
    return false;
  }

  get isFetching(): boolean {
    return this.nativeBalances.isFetching;
  }

  @computed
  get balance(): CoinPretty {
    const currency = this.currency;

    if (!this.nativeBalances.response) {
      return new CoinPretty(currency.coinDenom, new Int(0))
        .ready(false)
        .precision(currency.coinDecimals)
        .maxDecimals(currency.coinDecimals);
    }

    return StoreUtils.getBalanceFromCurrency(
      currency,
      this.nativeBalances.response.data.result
    );
  }
}

export class ObservableQueryBalancesInner extends ObservableChainQuery<
  Balances
> {
  protected bech32Address: string;

  @observable.shallow
  protected balanceMap!: Map<string, ObservableQueryBalanceInner>;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    bech32Address: string,
    protected readonly querySecretContractCodeHash: ObservableQuerySecretContractCodeHash
  ) {
    super(kvStore, chainId, chainGetter, `/bank/balances/${bech32Address}`);

    runInAction(() => {
      this.balanceMap = new Map();
    });

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

  protected getBalanceInner(denom: string): ObservableQueryBalanceInner {
    if (!this.balanceMap.has(denom)) {
      runInAction(() => {
        // TODO: Handle errors.
        const denomHelper = new DenomHelper(denom);

        switch (denomHelper.type) {
          case "native":
            this.balanceMap.set(
              denom,
              new ObservableQueryBalanceNative(
                this.kvStore,
                this.chainGetter,
                this.chainId,
                denomHelper,
                this
              )
            );
            break;
          case "secret20":
            this.balanceMap.set(
              denom,
              new ObservableQuerySecret20Balance(
                this.kvStore,
                this.chainGetter,
                this.chainId,
                denomHelper,
                this.bech32Address,
                this.querySecretContractCodeHash
              )
            );
            break;
          default:
          // TODO: Handle the unknown type of denom.
        }
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.balanceMap.get(denom)!;
  }

  @computed
  get stakable(): ObservableQueryBalanceInner {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    return this.getBalanceInner(chainInfo.stakeCurrency.coinMinimalDenom);
  }

  @computed
  get balances(): ObservableQueryBalanceInner[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const result = [];

    for (let i = 0; i < chainInfo.currencies.length; i++) {
      const currency = chainInfo.currencies[i];
      result.push(this.getBalanceInner(currency.coinMinimalDenom));
    }

    return result;
  }

  @computed
  get unstakables(): ObservableQueryBalanceInner[] {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const currencies = chainInfo.currencies.filter(
      cur => cur.coinMinimalDenom !== chainInfo.stakeCurrency.coinMinimalDenom
    );

    const result = [];

    for (let i = 0; i < currencies.length; i++) {
      const currency = currencies[i];
      result.push(this.getBalanceInner(currency.coinMinimalDenom));
    }

    return result;
  }
}

export class ObservableQueryBalances extends ObservableChainQueryMap<Balances> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter,
    protected readonly querySecretContractCodeHash: ObservableQuerySecretContractCodeHash
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address: string) => {
      return new ObservableQueryBalancesInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address,
        querySecretContractCodeHash
      );
    });
  }

  getQueryBech32Address(bech32Address: string): ObservableQueryBalancesInner {
    return this.get(bech32Address) as ObservableQueryBalancesInner;
  }
}
