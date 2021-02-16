import { delay, inject, singleton } from "tsyringe";
import { TYPES } from "../types";

import { InteractionService } from "../interaction";
import { Env } from "@keplr/router";
import {
  getBasicAccessPermissionType,
  INTERACTION_TYPE_PERMISSION,
  PermissionData,
} from "./types";
import { KVStore } from "@keplr/common";
import { ChainsService } from "../chains";
import { KeyRingService } from "../keyring";

@singleton()
export class PermissionService {
  protected permissionMap: {
    [type: string]:
      | {
          [origin: string]: true | undefined;
        }
      | undefined;
  } = {};

  constructor(
    @inject(TYPES.PermissionStore)
    protected readonly kvStore: KVStore,
    @inject(delay(() => InteractionService))
    protected readonly interactionService: InteractionService,
    @inject(ChainsService)
    protected readonly chainsService: ChainsService,
    @inject(delay(() => KeyRingService))
    protected readonly keyRingService: KeyRingService
  ) {
    this.restore();

    this.chainsService.addChainRemovedHandler(this.onChainRemoved);
  }

  protected readonly onChainRemoved = (chainId: string) => {
    this.removeAllPermissions(getBasicAccessPermissionType(chainId));
  };

  async checkOrGrantBasicAccessPermission(
    env: Env,
    chainId: string,
    origin: string
  ) {
    // Try to unlock the key ring before checking or granting the basic permission.
    await this.keyRingService.enable(env);

    if (!this.hasPermisson(getBasicAccessPermissionType(chainId), origin)) {
      await this.grantBasicAccessPermission(env, chainId, [origin]);
    }

    await this.checkBasicAccessPermission(env, chainId, origin);
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
    // Make sure that the chain info is registered.
    await this.chainsService.getChainInfo(chainId);

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

  async checkBasicAccessPermission(env: Env, chainId: string, origin: string) {
    // Make sure that the chain info is registered.
    await this.chainsService.getChainInfo(chainId);

    this.checkPermission(env, getBasicAccessPermissionType(chainId), origin);
  }

  hasPermisson(type: string, origin: string): boolean {
    const innerMap = this.permissionMap[type];
    return !(!innerMap || !innerMap[origin]);
  }

  getPermissionOrigins(type: string): string[] {
    const origins = [];

    const innerMap = this.permissionMap[type];
    if (!innerMap) {
      return [];
    }

    for (const origin of Object.keys(innerMap)) {
      if (innerMap[origin]) {
        origins.push(origin);
      }
    }

    return origins;
  }

  protected async addPermission(type: string, origins: string[]) {
    let innerMap = this.permissionMap[type];
    if (!innerMap) {
      innerMap = {};
      this.permissionMap[type] = innerMap;
    }

    for (const origin of origins) {
      innerMap[origin] = true;
    }

    await this.save();
  }

  async removePermission(type: string, origins: string[]) {
    const innerMap = this.permissionMap[type];
    if (!innerMap) {
      return;
    }

    for (const origin of origins) {
      delete innerMap[origin];
    }

    await this.save();
  }

  async removeAllPermissions(type: string) {
    const innerMap = this.permissionMap[type];
    if (!innerMap) {
      return;
    }

    delete this.permissionMap[type];

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
