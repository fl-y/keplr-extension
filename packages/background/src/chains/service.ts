import { delay, inject, singleton } from "tsyringe";
import { TYPES } from "../types";

import { ChainInfoSchema, ChainInfoWithEmbed } from "./types";
import { ChainInfo } from "@keplr/types";
import { KVStore } from "@keplr/common";
import { ChainUpdaterService } from "../updater";
import { TokensService } from "../tokens";
import { InteractionService } from "../interaction";
import { Env } from "@keplr/router";
import { SuggestChainInfoMsg } from "./messages";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

@singleton()
export class ChainsService {
  constructor(
    @inject(TYPES.ChainsStore)
    protected readonly kvStore: KVStore,
    @inject(TYPES.ChainsEmbedChainInfos)
    protected readonly embedChainInfos: ChainInfo[],
    @inject(delay(() => ChainUpdaterService))
    protected readonly chainUpdaterKeeper: ChainUpdaterService,
    @inject(delay(() => TokensService))
    protected readonly tokensKeeper: TokensService,
    @inject(delay(() => InteractionService))
    protected readonly interactionKeeper: InteractionService
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
      `/suggest-chain/${chainInfo.chainId}`,
      SuggestChainInfoMsg.type(),
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
          ChainUpdaterService.getChainVersion(savedChainInfo.chainId)
            .identifier ===
          ChainUpdaterService.getChainVersion(chainInfo.chainId).identifier
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
        ChainUpdaterService.getChainVersion(chainInfo.chainId).identifier !==
        ChainUpdaterService.getChainVersion(chainId).identifier
      );
    });

    await this.kvStore.set<ChainInfo[]>("chain-infos", resultChainInfo);

    // Clear the updated chain info.
    await this.chainUpdaterKeeper.clearUpdatedProperty(chainId);
    await this.tokensKeeper.clearTokens(chainId);

    // Clear the access origin.
    // TODO
    // await this.clearAccessOrigins(chainId);
  }

  async tryUpdateChain(chainId: string): Promise<string> {
    const chainInfo = await this.getChainInfo(chainId);

    return await this.chainUpdaterKeeper.tryUpdateChainId(chainInfo);
  }
}
