import { InteractionStore } from "./interaction";
import { RequestTxBuilderConfigMsg } from "@keplr/background";
import { observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";
import {
  TxBuilderConfigPrimitive,
  TxBuilderConfigPrimitiveWithChainId
} from "@keplr/types";

export class TxConfigStore {
  @observable
  protected _isLoading!: boolean;

  constructor(protected readonly interactionStore: InteractionStore) {
    runInAction(() => {
      this._isLoading = false;
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

  get isLoading(): boolean {
    return this._isLoading;
  }
}
