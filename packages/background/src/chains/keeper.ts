import { AccessOrigin, ChainInfoSchema, ChainInfoWithEmbed } from "./types";
import { ChainInfo } from "@keplr/types";
import { KVStore } from "@keplr/common";
import { ChainUpdaterKeeper } from "../updater/keeper";
import { TokensKeeper } from "../tokens/keeper";
import { InteractionKeeper } from "../interaction/keeper";
import { Env } from "@keplr/router";
import { ReqeustAccessMsg } from "./messages";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export class ChainsKeeper {
  constructor(
    private readonly kvStore: KVStore,
    private readonly chainUpdaterKeeper: ChainUpdaterKeeper,
    private readonly tokensKeeper: TokensKeeper,
    private readonly interactionKeeper: InteractionKeeper,
    private readonly embedChainInfos: ChainInfo[],
    private readonly embedAccessOrigins: AccessOrigin[]
  ) {
    // TODO: Handle the case that the embeded chains and dynamically added chain has overlaps.
  }

  async getChainInfos(
    applyUpdatedProperty: boolean = true
  ): Promise<ChainInfoWithEmbed[]> {
    const chainInfos = this.embedChainInfos.map((chainInfo) => {
      return {
        ...chainInfo,
        embeded: true,
      };
    });
    const savedChainInfos: ChainInfoWithEmbed[] = (
      (await this.kvStore.get<ChainInfo[]>("chain-infos")) ?? []
    ).map((chainInfo: ChainInfo) => {
      return {
        ...chainInfo,
        embeded: false,
      };
    });

    let result: ChainInfoWithEmbed[] = chainInfos.concat(savedChainInfos);

    if (applyUpdatedProperty) {
      // Set the updated property of the chain.
      result = await Promise.all(
        result.map(async (chainInfo) => {
          const updated: Writeable<ChainInfo> = await this.chainUpdaterKeeper.putUpdatedPropertyToChainInfo(
            chainInfo
          );

          updated.currencies = await this.tokensKeeper.getTokens(
            updated.chainId,
            updated.currencies
          );

          return {
            ...updated,
            embeded: chainInfo.embeded,
          };
        })
      );
    }

    return result;
  }

  async getChainInfo(chainId: string): Promise<ChainInfoWithEmbed> {
    const chainInfo = (await this.getChainInfos()).find((chainInfo) => {
      return chainInfo.chainId === chainId;
    });

    if (!chainInfo) {
      throw new Error(`There is no chain info for ${chainId}`);
    }
    return chainInfo;
  }

  async getChainCoinType(chainId: string): Promise<number> {
    const chainInfo = (await this.getChainInfos(false)).find((chainInfo) => {
      return chainInfo.chainId === chainId;
    });

    if (!chainInfo) {
      throw new Error(`There is no chain info for ${chainId}`);
    }

    const updated = await this.chainUpdaterKeeper.putUpdatedPropertyToChainInfo(
      chainInfo
    );

    return updated.bip44.coinType;
  }

  async hasChainInfo(chainId: string): Promise<boolean> {
    return (
      (await this.getChainInfos()).find((chainInfo) => {
        return chainInfo.chainId === chainId;
      }) != null
    );
  }

  async suggestChainInfo(
    env: Env,
    chainInfo: ChainInfo,
    origin: string
  ): Promise<void> {
    chainInfo = await ChainInfoSchema.validateAsync(chainInfo);

    await this.interactionKeeper.waitApprove(
      env,
      "/suggest-chain/${chainInfo.chainId}",
      "suggest-chain",
      {
        ...chainInfo,
        origin,
      }
    );

    await this.addChainInfo(chainInfo);
  }

  async addChainInfo(chainInfo: ChainInfo): Promise<void> {
    if (await this.hasChainInfo(chainInfo.chainId)) {
      throw new Error("Same chain is already registered");
    }

    const ambiguousChainInfo = (await this.getChainInfos()).find(
      (savedChainInfo) => {
        return (
          ChainUpdaterKeeper.getChainVersion(savedChainInfo.chainId)
            .identifier ===
          ChainUpdaterKeeper.getChainVersion(chainInfo.chainId).identifier
        );
      }
    );

    // Prevent the ambiguous chain that has the same identifier.
    if (ambiguousChainInfo) {
      throw new Error(
        `The chain ${ambiguousChainInfo.chainId} is already registered, and ${chainInfo.chainId} is ambiguous with it. So, this request is rejected`
      );
    }

    const savedChainInfos =
      (await this.kvStore.get<ChainInfo[]>("chain-infos")) ?? [];

    savedChainInfos.push(chainInfo);

    await this.kvStore.set<ChainInfo[]>("chain-infos", savedChainInfos);
  }

  async removeChainInfo(chainId: string): Promise<void> {
    if (!(await this.hasChainInfo(chainId))) {
      throw new Error("Chain is not registered");
    }

    if ((await this.getChainInfo(chainId)).embeded) {
      throw new Error("Can't remove the embedded chain");
    }

    const savedChainInfos =
      (await this.kvStore.get<ChainInfo[]>("chain-infos")) ?? [];

    const resultChainInfo = savedChainInfos.filter((chainInfo) => {
      return (
        ChainUpdaterKeeper.getChainVersion(chainInfo.chainId).identifier !==
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      );
    });

    await this.kvStore.set<ChainInfo[]>("chain-infos", resultChainInfo);

    // Clear the updated chain info.
    await this.chainUpdaterKeeper.clearUpdatedProperty(chainId);
    await this.tokensKeeper.clearTokens(chainId);

    // Clear the access origin.
    await this.clearAccessOrigins(chainId);
  }

  async requestAccess(
    env: Env,
    chainId: string,
    origins: string[]
  ): Promise<void> {
    // If origin is from extension, just ignore it.
    if (env.isInternalMsg) {
      return;
    }

    if (origins.length === 0) {
      throw new Error("Empty origin");
    }

    // Will throw an error if chain is unknown.
    await this.getChainInfo(chainId);

    const accessOrigin = await this.getAccessOrigin(chainId);
    if (
      origins.every((origin) => {
        return accessOrigin.origins.includes(origin);
      })
    ) {
      return;
    }

    await this.interactionKeeper.waitApprove(
      env,
      "/access",
      ReqeustAccessMsg.type(),
      {
        chainId,
        origins,
      }
    );

    for (const origin of origins) {
      await this.addAccessOrigin(chainId, origin);
    }
  }

  async checkAccessOrigin(env: Env, chainId: string, origin: string) {
    // If origin is from extension, just approve it.
    if (env.isInternalMsg) {
      return;
    }

    const accessOrigin = await this.getAccessOrigin(chainId);
    if (accessOrigin.origins.indexOf(origin) <= -1) {
      throw new Error("This origin is not approved");
    }
  }

  async addAccessOrigin(chainId: string, origin: string): Promise<void> {
    let accessOrigin = await this.kvStore.get<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      )
    );
    if (!accessOrigin) {
      accessOrigin = {
        chainId,
        origins: [],
      };
    }

    accessOrigin.origins.push(origin);

    await this.kvStore.set<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      ),
      accessOrigin
    );
  }

  async removeAccessOrigin(chainId: string, origin: string): Promise<void> {
    const accessOrigin = await this.kvStore.get<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      )
    );
    if (!accessOrigin) {
      throw new Error("There is no matched origin");
    }

    const i = accessOrigin.origins.indexOf(origin);
    if (i < 0) {
      throw new Error("There is no matched origin");
    }

    accessOrigin.origins = accessOrigin.origins
      .slice(0, i)
      .concat(accessOrigin.origins.slice(i + 1));

    await this.kvStore.set<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      ),
      accessOrigin
    );
  }

  async clearAccessOrigins(chainId: string): Promise<void> {
    await this.kvStore.set<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      ),
      null
    );
  }

  async getAccessOrigin(chainId: string): Promise<AccessOrigin> {
    let nativeAccessOrigins: string[] = [];
    for (const access of this.embedAccessOrigins) {
      if (
        ChainUpdaterKeeper.getChainVersion(access.chainId).identifier ===
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      ) {
        nativeAccessOrigins = access.origins.slice();
        break;
      }
    }

    const accessOrigin = await this.kvStore.get<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(
        ChainUpdaterKeeper.getChainVersion(chainId).identifier
      )
    );
    return {
      chainId,
      origins: nativeAccessOrigins.concat(accessOrigin?.origins ?? []),
    };
  }

  async getAccessOriginWithoutEmbed(chainId: string): Promise<AccessOrigin> {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    const accessOrigin = await this.kvStore.get<AccessOrigin>(
      ChainsKeeper.getAccessOriginKey(version.identifier)
    );
    if (accessOrigin) {
      return {
        chainId: accessOrigin.chainId,
        origins: accessOrigin.origins,
      };
    } else {
      return {
        chainId,
        origins: [],
      };
    }
  }

  async tryUpdateChain(chainId: string): Promise<string> {
    const chainInfo = await this.getChainInfo(chainId);

    return await this.chainUpdaterKeeper.tryUpdateChainId(chainInfo);
  }

  private static getAccessOriginKey(identifier: string): string {
    return `access-origin-${identifier}`;
  }
}
