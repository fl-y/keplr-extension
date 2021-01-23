import { InteractionService } from "../interaction";
import { Env } from "@keplr/router";
import {
  getBasicAccessPermissionType,
  INTERACTION_TYPE_PERMISSION,
  PermissionData,
} from "./types";
import { KVStore } from "@keplr/common";

export class PermissionService {
  protected permissionMap: {
    [type: string]:
      | {
          [origin: string]: true | undefined;
        }
      | undefined;
  } = {};

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly interactionService: InteractionService
  ) {
    this.restore();
  }

  async checkOrGrantBasicAccessPermission(
    env: Env,
    chainId: string,
    origin: string
  ) {
    if (!this.hasPermisson(getBasicAccessPermissionType(chainId), origin)) {
      await this.grantBasicAccessPermission(env, chainId, [origin]);
    }

    this.checkBasicAccessPermission(env, chainId, origin);
  }

  async grantPermission(
    env: Env,
    url: string,
    type: string,
    origins: string[]
  ) {
    if (env.isInternalMsg) {
      return;
    }

    const permissionData: PermissionData = {
      type,
      origins,
    };

    await this.interactionService.waitApprove(
      env,
      url,
      INTERACTION_TYPE_PERMISSION,
      permissionData
    );

    await this.addPermission(type, origins);
  }

  async grantBasicAccessPermission(
    env: Env,
    chainId: string,
    origins: string[]
  ) {
    await this.grantPermission(
      env,
      "/access",
      getBasicAccessPermissionType(chainId),
      origins
    );
  }

  checkPermission(env: Env, type: string, origin: string) {
    if (env.isInternalMsg) {
      return;
    }

    if (!this.hasPermisson(type, origin)) {
      throw new Error(`${origin} is not permitted`);
    }
  }

  checkBasicAccessPermission(env: Env, chainId: string, origin: string) {
    this.checkPermission(env, getBasicAccessPermissionType(chainId), origin);
  }

  hasPermisson(type: string, origin: string): boolean {
    const innerMap = this.permissionMap[type];
    return !(!innerMap || !innerMap[origin]);
  }

  protected async addPermission(type: string, origins: string[]) {
    let innerMap = this.permissionMap[type];
    if (!innerMap) {
      innerMap = {};
    }

    for (const origin of origins) {
      innerMap[origin] = undefined;
    }

    await this.save();
  }

  async removePermission(type: string, origins: string[]) {
    const innerMap = this.permissionMap[type];
    if (!innerMap) {
      return;
    }

    for (const origin of origins) {
      innerMap[origin] = true;
    }

    await this.save();
  }

  protected async restore() {
    const map = await this.kvStore.get<any>("permissionMap");
    if (map) {
      this.permissionMap = map;
    }
  }

  protected async save() {
    await this.kvStore.set("permissionMap", this.permissionMap);
  }
}
