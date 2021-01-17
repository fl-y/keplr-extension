import { observable, runInAction } from "mobx";
import { ChainInfo } from "@keplr/types";
import { ChainGetter } from "../common/types";

export class ChainStore<C extends ChainInfo = ChainInfo>
  implements ChainGetter {
  @observable.ref
  protected _chainInfos!: C[];

  constructor(embedChainInfos: C[]) {
    runInAction(() => {
      this._chainInfos = embedChainInfos;
    });
  }

  get chainInfos(): C[] {
    return this._chainInfos;
  }

  getChain(chainId: string): C {
    const find = this.chainInfos.find((info) => info.chainId === chainId);

    if (!find) {
      throw new Error(`Unknown chain info: ${chainId}`);
    }

    return find;
  }
}
