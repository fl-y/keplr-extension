import { InteractionStore } from "./interaction";
import { RequestTxBuilderConfigMsg } from "@keplr/background";
import { autorun, observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";
import {
  TxBuilderConfigPrimitive,
  TxBuilderConfigPrimitiveWithChainId,
} from "@keplr/types";

export class TxConfigStore {
  @observable
  protected _isLoading!: boolean;

  constructor(protected readonly interactionStore: InteractionStore) {
    runInAction(() => {
      this._isLoading = false;
    });

    autorun(() => {
      // Reject all interactions that is not first one.
      // This interaction can have only one interaction at once.
      const datas = this.waitingDatas.slice();
      if (datas.length > 1) {
        for (let i = 1; i < datas.length; i++) {
          this.rejectWithId(datas[i].id);
        }
      }
    });
  }

  protected get waitingDatas() {
    return this.interactionStore.getDatas<TxBuilderConfigPrimitiveWithChainId>(
      RequestTxBuilderConfigMsg.type()
    );
  }

  get waitingData() {
    const datas = this.waitingDatas;

    if (datas.length === 0) {
      return undefined;
    }

    return datas[0].data;
  }

  @actionAsync
  async approve(result: TxBuilderConfigPrimitive) {
    if (this.waitingDatas.length === 0) {
      return;
    }

    this._isLoading = true;
    try {
      await task(
        this.interactionStore.approve(
          RequestTxBuilderConfigMsg.type(),
          this.waitingDatas[0].id,
          result
        )
      );
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async reject() {
    if (this.waitingDatas.length === 0) {
      return;
    }

    this._isLoading = true;
    try {
      await task(
        this.interactionStore.reject(
          RequestTxBuilderConfigMsg.type(),
          this.waitingDatas[0].id
        )
      );
    } finally {
      this._isLoading = false;
    }
  }

  protected async rejectWithId(id: string) {
    await task(
      this.interactionStore.reject(RequestTxBuilderConfigMsg.type(), id)
    );
  }

  get isLoading(): boolean {
    return this._isLoading;
  }
}
