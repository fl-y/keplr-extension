import { InteractionStore } from "./interaction";
import { ChainInfo } from "@keplr/types";
import { actionAsync, task } from "mobx-utils";
import { SuggestChainInfoMsg } from "@keplr/background";
import { observable, runInAction } from "mobx";

export class ChainSuggestStore {
  @observable
  protected _isLoading!: boolean;

  constructor(protected readonly interactionStore: InteractionStore) {
    runInAction(() => {
      this._isLoading = false;
    });
  }

  get waitingSuggestedChainInfo() {
    const datas = this.interactionStore.getDatas<
      ChainInfo & { origin: string }
    >(SuggestChainInfoMsg.type());

    if (datas.length > 0) {
      return datas[0];
    }
  }

  @actionAsync
  async approve() {
    this._isLoading = true;

    try {
      const data = this.waitingSuggestedChainInfo;
      if (data) {
        await task(this.interactionStore.approve(data.type, data.id, {}));
      }
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async reject() {
    this._isLoading = true;

    try {
      const data = this.waitingSuggestedChainInfo;
      if (data) {
        await task(this.interactionStore.reject(data.type, data.id));
      }
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async rejectAll() {
    this._isLoading = true;
    try {
      await task(this.interactionStore.rejectAll(SuggestChainInfoMsg.type()));
    } finally {
      this._isLoading = false;
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }
}
