import { inject, singleton } from "tsyringe";
import { TYPES } from "../types";

import { ChainInfo } from "@keplr/types";
import Axios from "axios";
import { KVStore } from "@keplr/common";
import { AppCurrency } from "@keplr/types";
import { ChainIdHelper } from "@keplr/cosmos";

@singleton()
export class ChainUpdaterService {
  constructor(
    @inject(TYPES.UpdaterStore) protected readonly kvStore: KVStore
  ) {}

  async putUpdatedPropertyToChainInfo(
    chainInfo: ChainInfo
  ): Promise<ChainInfo> {
    const updatedProperty = await this.getUpdatedChainProperty(
      chainInfo.chainId
    );

    return {
      ...chainInfo,
      ...updatedProperty,
    };
  }

  async updateChainCurrencies(chainId: string, currencies: AppCurrency[]) {
    const version = ChainIdHelper.parse(chainId);

    const chainInfo: Partial<ChainInfo> = {
      currencies,
    };

    await this.saveChainProperty(version.identifier, chainInfo);
  }

  async clearUpdatedProperty(chainId: string) {
    await this.kvStore.set(ChainIdHelper.parse(chainId).identifier, null);
  }

  async tryUpdateChainId(chainInfo: ChainInfo): Promise<string> {
    // If chain id is not fomatted as {chainID}-{version},
    // there is no way to deal with the updated chain id.
    if (!ChainUpdaterService.hasChainVersion(chainInfo.chainId)) {
      return chainInfo.chainId;
    }

    const instance = Axios.create({
      baseURL: chainInfo.rpc,
    });

    // Get the latest block.
    const result = await instance.get<{
      result: {
        block: {
          header: {
            chain_id: string;
          };
        };
      };
    }>("/block");

    let resultChainId = chainInfo.chainId;
    const version = ChainIdHelper.parse(chainInfo.chainId);
    const fetchedChainId = result.data.result.block.header.chain_id;

    if (chainInfo.chainId !== fetchedChainId) {
      const fetchedVersion = ChainIdHelper.parse(fetchedChainId);

      // TODO: Should throw an error?
      if (version.identifier !== fetchedVersion.identifier) {
        return chainInfo.chainId;
      }

      if (fetchedVersion.version > version.version) {
        resultChainId = fetchedChainId;
      }
    }

    if (resultChainId !== chainInfo.chainId) {
      await this.saveChainProperty(version.identifier, {
        chainId: resultChainId,
      });
    }

    return resultChainId;
  }

  private async getUpdatedChainProperty(
    chainId: string
  ): Promise<Partial<ChainInfo>> {
    const version = ChainIdHelper.parse(chainId);

    return await this.loadChainProperty(version.identifier);
  }

  private async saveChainProperty(
    identifier: string,
    chainInfo: Partial<ChainInfo>
  ) {
    const saved = await this.loadChainProperty(identifier);

    await this.kvStore.set(identifier, {
      ...saved,
      ...chainInfo,
    });
  }

  private async loadChainProperty(
    identifier: string
  ): Promise<Partial<ChainInfo>> {
    const chainInfo = await this.kvStore.get<Partial<ChainInfo>>(identifier);
    if (!chainInfo) return {};
    return chainInfo;
  }

  /**
   * Returns wether the chain has been changed.
   * Currently, only check the chain id has been changed.
   * @param chainInfo Chain information.
   */
  public static async checkChainUpdate(
    chainInfo: Readonly<ChainInfo>
  ): Promise<boolean> {
    const chainId = chainInfo.chainId;

    // If chain id is not fomatted as {chainID}-{version},
    // there is no way to deal with the updated chain id.
    if (!ChainUpdaterService.hasChainVersion(chainId)) {
      return false;
    }

    const instance = Axios.create({
      baseURL: chainInfo.rpc,
    });

    // Get the latest block.
    const result = await instance.get<{
      result: {
        block: {
          header: {
            chain_id: string;
          };
        };
      };
    }>("/block");

    const resultChainId = result.data.result.block.header.chain_id;

    const version = ChainIdHelper.parse(chainId);
    const fetchedVersion = ChainIdHelper.parse(resultChainId);

    // TODO: Should throw an error?
    if (version.identifier !== fetchedVersion.identifier) {
      return false;
    }

    return version.version < fetchedVersion.version;
  }

  static hasChainVersion(chainId: string) {
    const version = ChainIdHelper.parse(chainId);
    return version.identifier !== chainId;
  }
}
