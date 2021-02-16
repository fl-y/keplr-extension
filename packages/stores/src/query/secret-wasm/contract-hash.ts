import { SecretContractCodeHash } from "./types";
import { KVStore } from "@keplr/common";
import { ObservableChainQuery, ObservableChainQueryMap } from "../chain-query";
import { ChainGetter } from "../../common";

export class ObservableQuerySecretContractCodeHash extends ObservableChainQueryMap<SecretContractCodeHash> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (contractAddress: string) => {
      return new ObservableChainQuery<SecretContractCodeHash>(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        `/wasm/contract/${contractAddress}/code-hash`
      );
    });
  }

  getQueryContract(
    contractAddress: string
  ): ObservableChainQuery<SecretContractCodeHash> {
    return this.get(contractAddress);
  }
}
