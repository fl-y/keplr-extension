import { action, observable, runInAction } from "mobx";
import { ChainInfo } from "@keplr/types";
import { ChainGetter } from "../common";
import { ChainIdHelper } from "@keplr/cosmos";

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
    const chainIdentifier = ChainIdHelper.parse(chainId);

    const find = this.chainInfos.find((info) => {
      return (
        ChainIdHelper.parse(info.chainId).identifier ===
        chainIdentifier.identifier
      );
    });

    if (!find) {
      throw new Error(`Unknown chain info: ${chainId}`);
    }

    return find;
  }

  hasChain(chainId: string): boolean {
    const chainIdentifier = ChainIdHelper.parse(chainId);

    const find = this.chainInfos.find((info) => {
      return (
        ChainIdHelper.parse(info.chainId).identifier ===
        chainIdentifier.identifier
      );
    });

    return find != null;
  }

  @action
  protected setChainInfos(chainInfos: C[]) {
    this._chainInfos = chainInfos;
  }
}
