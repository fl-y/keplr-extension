import { InteractionStore } from "./interaction";
import { ReqeustAccessMsg } from "@keplr/background";
import { observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";

export class PermissionStore {
  @observable
  protected _isLoading!: boolean;

  constructor(protected readonly interactionStore: InteractionStore) {
    runInAction(() => {
      this._isLoading = false;
    });
  }

  get waitingDatas() {
    return this.interactionStore.getDatas<{
      chainId: string;
      origins: string[];
    }>(ReqeustAccessMsg.type());
  }

  @actionAsync
  async approve(id: string) {
    this._isLoading = true;
    try {
      await task(
        this.interactionStore.approve(ReqeustAccessMsg.type(), id, {})
      );
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async reject(id: string) {
    this._isLoading = true;
    try {
      await task(this.interactionStore.reject(ReqeustAccessMsg.type(), id));
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async rejectAll() {
    this._isLoading = true;
    try {
      for (const data of this.waitingDatas) {
        await this.reject(data.id);
      }
    } finally {
      this._isLoading = false;
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }
}
