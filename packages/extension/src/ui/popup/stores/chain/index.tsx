import { observable, action, runInAction, computed } from "mobx";
import { actionAsync, task } from "mobx-utils";

import { ChainStore as BaseChainStore } from "@keplr/stores";

import { ChainInfo, AppCurrency } from "@keplr/types";
import {
  ChainInfoWithEmbed,
  SetPersistentMemoryMsg,
  GetPersistentMemoryMsg,
  GetChainInfosMsg,
  RemoveSuggestedChainInfoMsg,
} from "@keplr/background";
import { BACKGROUND_PORT } from "@keplr/router";

import { MessageRequester } from "@keplr/router";

export class ChainStore extends BaseChainStore<ChainInfoWithEmbed> {
  @observable
  protected selectedChainId!: string;

  constructor(
    embedChainInfos: ChainInfo[],
    protected readonly requester: MessageRequester
  ) {
    super(
      embedChainInfos.map((chainInfo) => {
        return {
          ...chainInfo,
          ...{
            embeded: true,
          },
        };
      })
    );

    runInAction(() => {
      this.selectedChainId = embedChainInfos[0].chainId;
    });

    this.init();
  }

  @action
  selectChain(chainId: string) {
    this.selectedChainId = chainId;
  }

  @computed
  get current(): ChainInfoWithEmbed {
    if (this.hasChain(this.selectedChainId)) {
      return this.getChain(this.selectedChainId);
    }

    return this.chainInfos[0];
  }

  @actionAsync
  async saveLastViewChainId() {
    // Save last view chain id to persistent background
    const msg = new SetPersistentMemoryMsg({
      lastViewChainId: this.selectedChainId,
    });
    await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
  }

  @actionAsync
  protected async init() {
    await task(this.getChainInfosFromBackground());

    // Get last view chain id to persistent background
    const msg = new GetPersistentMemoryMsg();
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    if (result && result.lastViewChainId) {
      this.selectChain(result.lastViewChainId);
    }
  }

  @actionAsync
  protected async getChainInfosFromBackground() {
    const msg = new GetChainInfosMsg();
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setChainInfos(result.chainInfos);
  }

  @actionAsync
  public async removeChainInfo(chainId: string) {
    const msg = new RemoveSuggestedChainInfoMsg(chainId);
    const chainInfos = await task(
      this.requester.sendMessage(BACKGROUND_PORT, msg)
    );

    this.setChainInfos(chainInfos);
  }

  @actionAsync
  public async tryUpdateChain(_chainId: string) {
    // TODO
    /*
    const selected = chainId === this.chainInfo.chainId;

    const msg = new TryUpdateChainMsg(chainId);
    const result = await task(sendMessage(BACKGROUND_PORT, msg));
    this.setChainList(result.chainInfos);
    if (selected) {
      this.setChain(result.chainId);
      await this.saveLastViewChainId();
    }
     */
  }

  @actionAsync
  public async addToken(_currency: AppCurrency) {
    // TODO
    /*
    const msg = new AddTokenMsg(this.chainInfo.chainId, currency);

    await task(sendMessage(BACKGROUND_PORT, msg));

    await this.refreshChainList();
     */
  }
}
