import { ObservableQuery, ObservableQueryMap } from "../common/query";
import { SupplyTotal } from "./types";
import { KVStore } from "../../../common/kvstore";
import { AxiosInstance } from "axios";

export class ObservableQuerySupplyTotal extends ObservableQueryMap<
  SupplyTotal
> {
  constructor(
    private readonly kvStore: KVStore,
    private readonly instance: AxiosInstance
  ) {
    super((denom: string) => {
      return new ObservableQuery<SupplyTotal>(
        this.kvStore,
        this.instance,
        `/supply/total/${denom}`
      );
    });
  }

  getQueryDenom(denom: string): ObservableQuery<SupplyTotal> {
    return this.get(denom);
  }
}
