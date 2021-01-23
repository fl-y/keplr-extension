import { InteractionStore } from "./interaction";
import {
  getBasicAccessPermissionType,
  GetPermissionOriginsMsg,
  INTERACTION_TYPE_PERMISSION,
  PermissionData,
  RemovePermissionOrigin,
  splitBasicAccessPermissionType,
} from "@keplr/background";
import { computed, observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";
import { HasMapStore } from "../../common";
import { BACKGROUND_PORT, MessageRequester } from "@keplr/router";

export class BasicAccessPermissionInnerStore {
  @observable.ref
  protected _origins!: string[];

  constructor(
    protected readonly chainId: string,
    protected readonly requester: MessageRequester
  ) {
    runInAction(() => {
      this._origins = [];
    });

    this.refreshOrigins();
  }

  get origins(): string[] {
    return this._origins;
  }

  @actionAsync
  async removeOrigin(origin: string) {
    await task(
      this.requester.sendMessage(
        BACKGROUND_PORT,
        new RemovePermissionOrigin(
          getBasicAccessPermissionType(this.chainId),
          origin
        )
      )
    );
    await task(this.refreshOrigins());
  }

  @actionAsync
  protected async refreshOrigins() {
    this._origins = await task(
      this.requester.sendMessage(
        BACKGROUND_PORT,
        new GetPermissionOriginsMsg(getBasicAccessPermissionType(this.chainId))
      )
    );
  }
}

export class PermissionStore extends HasMapStore<any> {
  @observable
  protected _isLoading!: boolean;

  constructor(
    protected readonly interactionStore: InteractionStore,
    protected readonly requester: MessageRequester
  ) {
    super((chainId: string) => {
      return new BasicAccessPermissionInnerStore(chainId, this.requester);
    });

    runInAction(() => {
      this._isLoading = false;
    });
  }

  getBasicAccessInfo(chainId: string): BasicAccessPermissionInnerStore {
    return this.get(chainId);
  }

  @computed
  get waitingBasicAccessPermissions(): {
    id: string;
    data: {
      chainIdentifier: string;
      origins: string[];
    };
  }[] {
    const datas = this.waitingDatas;

    const result = [];
    for (const data of datas) {
      result.push({
        id: data.id,
        data: {
          chainIdentifier: splitBasicAccessPermissionType(data.data.type),
          origins: data.data.origins,
        },
      });
    }

    return result;
  }

  get waitingDatas() {
    return this.interactionStore.getDatas<PermissionData>(
      INTERACTION_TYPE_PERMISSION
    );
  }

  @actionAsync
  async approve(id: string) {
    this._isLoading = true;
    try {
      await task(
        this.interactionStore.approve(INTERACTION_TYPE_PERMISSION, id, {})
      );
    } finally {
      this._isLoading = false;
    }
  }

  @actionAsync
  async reject(id: string) {
    this._isLoading = true;
    try {
      await task(this.interactionStore.reject(INTERACTION_TYPE_PERMISSION, id));
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
