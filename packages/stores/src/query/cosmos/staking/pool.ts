import { ObservableChainQuery } from "../../chain-query";
import { StakingPool } from "./types";
import { KVStore } from "@keplr/common";
import { ChainGetter } from "../../../common/types";

export class ObservableQueryStakingPool extends ObservableChainQuery<StakingPool> {
  constructor(kvStore: KVStore, chainId: string, chainGetter: ChainGetter) {
    super(kvStore, chainId, chainGetter, "/staking/pool");
  }
}
