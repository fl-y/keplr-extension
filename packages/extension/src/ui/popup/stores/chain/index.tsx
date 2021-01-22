import { observable, action, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";

import { RootStore } from "../root";

import { ChainInfo } from "@keplr/types";
import { ChainInfoWithEmbed } from "@keplr/background";
import {
  SetPersistentMemoryMsg,
  GetPersistentMemoryMsg,
} from "../../../../background/persistent-memory";
import {
  GetChainInfosMsg,
  RemoveSuggestedChainInfoMsg,
  TryUpdateChainMsg,
} from "../../../../background/chains/messages";
import { sendMessage } from "../../../../common/message";
import { BACKGROUND_PORT } from "../../../../common/message/constant";

import { AppCurrency, Currency } from "../../../../common/currency";
import { AddTokenMsg } from "../../../../background/tokens/messages";

export class ChainStore {
  @observable public chainList!: ChainInfoWithEmbed[];

  @observable
  public chainInfo!: ChainInfo;

  @observable
  public allCurrencies!: Currency[];

  // Indicate whether the chain store is initializing.
  @observable
  public isIntializing!: boolean;

  // Defer setting chain right after init is complete.
  private deferChainSet: string = "";

  constructor(
    private rootStore: RootStore,
    private readonly embedChainInfos: ChainInfo[]
  ) {
    this.setAllCurrencies([]);

    runInAction(() => {
      this.isIntializing = false;
    });

    this.setChainList(
      this.embedChainInfos.map((chainInfo) => {
        return {
          ...chainInfo,
          embeded: true,
        };
      })
    );

    this.setChain(this.chainList[0].chainId);
  }

  public getChain(chainId: string): ChainInfo {
    const chainInfo = this.chainList.find((chainInfo) => {
      return chainInfo.chainId === chainId;
    });

    if (!chainInfo) {
      throw new Error(`Unknown chain id ${chainId}`);
    }

    return chainInfo;
  }

  @action
  public setChain(chainId: string) {
    if (
      this.chainInfo &&
      this.chainInfo.chainId === chainId &&
      !this.isIntializing
    ) {
      // No need to change chain info.
      return;
    }

    if (this.isIntializing) {
      this.deferChainSet = chainId;
    }

    let chainInfo: ChainInfo | null = null;
    for (const ci of this.chainList) {
      if (ci.chainId === chainId) {
        chainInfo = ci;
      }
    }
    // If no match chain id, throw error.
    if (chainInfo === null) {
      if (this.isIntializing) {
        // If store is still initializing, don't throw and defer it.
        return;
      }

      throw new Error("Invalid chain id");
    }

    this.chainInfo = chainInfo;

    this.rootStore.setChainInfo(chainInfo);
  }

  @actionAsync
  public async saveLastViewChainId() {
    // Save last view chain id to persistent background
    const msg = new SetPersistentMemoryMsg({
      lastViewChainId: this.chainInfo.chainId,
    });
    await task(sendMessage(BACKGROUND_PORT, msg));
  }

  @actionAsync
  public async init() {
    this.isIntializing = true;
    await task(this.getChainInfosFromBackground());

    // Get last view chain id to persistent background
    const msg = new GetPersistentMemoryMsg();
    const result = await task(sendMessage(BACKGROUND_PORT, msg));
    if (result && result.lastViewChainId) {
      // If setting chain info is defered, skip setting the last used chain info.
      if (!this.deferChainSet) {
        this.setChain(result.lastViewChainId);
      }
    }
    this.isIntializing = false;

    if (this.deferChainSet) {
      this.setChain(this.deferChainSet);
      this.deferChainSet = "";
    }
  }

  @actionAsync
  private async getChainInfosFromBackground() {
    const msg = new GetChainInfosMsg();
    const result = await task(sendMessage(BACKGROUND_PORT, msg));
    this.setChainList(result.chainInfos);
  }

  @action
  public setChainList(chainList: ChainInfoWithEmbed[]) {
    this.chainList = chainList;

    const allCurrencies = chainList
      .map((chainInfo) => {
        return chainInfo.currencies;
      })
      // Flaten
      .reduce((acc, val) => {
        return acc.concat(val);
      }, []);

    this.setAllCurrencies(allCurrencies);
  }

  @actionAsync
  public async removeChainInfo(chainId: string) {
    const msg = new RemoveSuggestedChainInfoMsg(chainId);
    const chainInfos = await task(sendMessage(BACKGROUND_PORT, msg));

    this.setChainList(chainInfos);
    // If currently selected chain is removed, just set the chain as first one.
    if (chainId === this.chainInfo.chainId) {
      this.setChain(chainInfos[0].chainId);
    }
  }

  @actionAsync
  public async tryUpdateChain(chainId: string) {
    const selected = chainId === this.chainInfo.chainId;

    const msg = new TryUpdateChainMsg(chainId);
    const result = await task(sendMessage(BACKGROUND_PORT, msg));
    this.setChainList(result.chainInfos);
    if (selected) {
      this.setChain(result.chainId);
      await this.saveLastViewChainId();
    }
  }

  @action
  public setAllCurrencies(currencies: Currency[]) {
    this.allCurrencies = currencies;
  }

  @actionAsync
  public async addToken(currency: AppCurrency) {
    const msg = new AddTokenMsg(this.chainInfo.chainId, currency);

    await task(sendMessage(BACKGROUND_PORT, msg));

    await this.refreshChainList();
  }

  @actionAsync
  public async refreshChainList() {
    // Remember the chain id before fetching the chain list.
    const chainId = this.chainInfo.chainId;

    await this.getChainInfosFromBackground();

    const chainInfo = this.chainList.find((chainInfo) => {
      return chainInfo.chainId === chainId;
    });

    if (chainInfo) {
      this.chainInfo = chainInfo;

      this.rootStore.setChainInfo(chainInfo);
    }
  }

  @actionAsync
  public async changeKeyRingSync() {
    // Refresh the chain list because the currencies can be different according to the account in the case of secret20...
    if (!this.isIntializing) {
      await this.refreshChainList();
    }
  }
}
