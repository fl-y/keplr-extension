import { ObservableChainQuery } from "../../chain-query";
import { StakingParams } from "./types";
import { KVStore } from "@keplr/common";
import { ChainGetter } from "../../../common/types";

export class ObservableQueryStakingParams extends ObservableChainQuery<StakingParams> {
  constructor(kvStore: KVStore, chainId: string, chainGetter: ChainGetter) {
    super(kvStore, chainId, chainGetter, "/staking/parameters");
  }
}
