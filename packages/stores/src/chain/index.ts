import { action, computed, makeObservable, observable } from "mobx";
import { ChainInfo } from "@keplr-wallet/types";
import { ChainGetter } from "../common";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import { DeepReadonly } from "utility-types";

export type ChainInfoOverrider<C extends ChainInfo = ChainInfo> = (
  chainInfo: DeepReadonly<C>
) => C;

export class ChainStore<C extends ChainInfo = ChainInfo>
  implements ChainGetter {
  @observable.ref
  protected _chainInfos: C[];

  @observable.shallow
  protected _chainInfoOverriders: ChainInfoOverrider<C>[] = [];

  constructor(embedChainInfos: C[]) {
    this._chainInfos = embedChainInfos;

    makeObservable(this);
  }

  @computed
  get chainInfos(): C[] {
    return this._chainInfos.map((chainInfo) => {
      for (const chainInfoOverrider of this._chainInfoOverriders) {
        chainInfo = chainInfoOverrider(chainInfo as DeepReadonly<C>);
      }

      return chainInfo;
    });
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
  registerChainInfoOverrider(chainInfoOverrider: ChainInfoOverrider<C>) {
    this._chainInfoOverriders.push(chainInfoOverrider);
  }

  @action
  protected setChainInfos(chainInfos: C[]) {
    this._chainInfos = chainInfos;
  }
}
