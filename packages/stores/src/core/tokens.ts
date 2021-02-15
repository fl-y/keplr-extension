import { HasMapStore } from "../common";
import { BACKGROUND_PORT, MessageRequester } from "@keplr/router";
import { actionAsync, task } from "mobx-utils";
import {
  AddTokenMsg,
  GetTokensMsg,
  RemoveTokenMsg,
  SuggestTokenMsg,
} from "@keplr/background";
import { observable, runInAction } from "mobx";
import { AppCurrency, ChainInfo } from "@keplr/types";
import { DeepReadonly } from "utility-types";
import { ChainStore } from "../chain";
import { InteractionStore } from "./interaction";

export class TokensStoreInner {
  @observable.ref
  protected _tokens!: AppCurrency[];

  constructor(
    protected readonly chainId: string,
    protected readonly requester: MessageRequester
  ) {
    runInAction(() => {
      this._tokens = [];
    });

    this.refreshTokens();

    // If key store in the keplr extension is unlocked, this event will be dispatched.
    // This is needed becuase the token such as secret20 exists according to the account.
    window.addEventListener("keplr_keystoreunlock", () => {
      this.refreshTokens();
    });

    // If key store in the keplr extension is changed, this event will be dispatched.
    // This is needed becuase the token such as secret20 exists according to the account.
    window.addEventListener("keplr_keystorechange", () => {
      this.refreshTokens();
    });
  }

  get tokens(): DeepReadonly<AppCurrency[]> {
    return this._tokens;
  }

  @actionAsync
  async refreshTokens() {
    const msg = new GetTokensMsg(this.chainId);
    this._tokens = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
  }

  @actionAsync
  async addToken(currency: AppCurrency) {
    const msg = new AddTokenMsg(this.chainId, currency);
    await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    await task(this.refreshTokens());
  }

  @actionAsync
  async removeToken(currency: AppCurrency) {
    const msg = new RemoveTokenMsg(this.chainId, currency);
    await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    await task(this.refreshTokens());
  }
}

export class TokensStore<
  C extends ChainInfo = ChainInfo
> extends HasMapStore<TokensStoreInner> {
  constructor(
    protected readonly chainStore: ChainStore<C>,
    protected readonly requester: MessageRequester,
    protected readonly interactionStore: InteractionStore
  ) {
    super((chainId: string) => {
      return new TokensStoreInner(chainId, this.requester);
    });

    this.chainStore.registerChainInfoOverrider(this.overrideChainInfo);
  }

  protected readonly overrideChainInfo = (chainInfo: DeepReadonly<C>): C => {
    const inner = this.getTokensOf(chainInfo.chainId);

    const currencies = chainInfo.currencies.slice();
    for (const token of inner.tokens) {
      const find = currencies.find(
        (cur) => cur.coinMinimalDenom === token.coinMinimalDenom
      );

      if (!find) {
        currencies.push(token);
      }
    }

    return {
      ...(chainInfo as C),
      currencies,
    };
  };

  getTokensOf(chainId: string) {
    return this.get(chainId);
  }

  get waitingSuggestedToken() {
    const datas = this.interactionStore.getDatas<{
      chainId: string;
      contractAddress: string;
    }>(SuggestTokenMsg.type());

    if (datas.length > 0) {
      return datas[0];
    }
  }

  @actionAsync
  async approveSuggestedToken(appCurrency: AppCurrency) {
    const data = this.waitingSuggestedToken;
    if (data) {
      await this.interactionStore.approve(
        SuggestTokenMsg.type(),
        data.id,
        appCurrency
      );

      await this.getTokensOf(data.data.chainId).refreshTokens();
    }
  }

  @actionAsync
  async rejectSuggestedToken() {
    const data = this.waitingSuggestedToken;
    if (data) {
      await this.interactionStore.reject(SuggestTokenMsg.type(), data.id);
    }
  }

  @actionAsync
  async rejectAllSuggestedTokens() {
    await this.interactionStore.rejectAll(SuggestTokenMsg.type());
  }
}
