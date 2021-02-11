import { InteractionStore } from "./interaction";
import { RequestSignMsg } from "@keplr/background";
import { autorun, observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";
import { StdSignDoc } from "@cosmjs/launchpad";

export class SignInteractionStore {
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
    return this.interactionStore.getDatas<{
      chainId: string;
      signDoc: StdSignDoc;
    }>(RequestSignMsg.type());
  }

  get waitingData() {
    const datas = this.waitingDatas;

    if (datas.length === 0) {
      return undefined;
    }

    return datas[0].data;
  }

  @actionAsync
  async approve(newSignDoc: StdSignDoc) {
    if (this.waitingDatas.length === 0) {
      return;
    }

    this._isLoading = true;
    try {
      await task(
        this.interactionStore.approve(
          RequestSignMsg.type(),
          this.waitingDatas[0].id,
          newSignDoc
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
          RequestSignMsg.type(),
          this.waitingDatas[0].id
        )
      );
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async rejectAll() {
    this._isLoading = true;
    try {
      await task(this.interactionStore.rejectAll(RequestSignMsg.type()));
    } finally {
      this._isLoading = false;
    }
  }

  protected async rejectWithId(id: string) {
    await task(this.interactionStore.reject(RequestSignMsg.type(), id));
  }

  get isLoading(): boolean {
    return this._isLoading;
  }
}
