import { HasMapStore } from "../common";
import { BACKGROUND_PORT, MessageRequester } from "@keplr/router";
import { actionAsync, task } from "mobx-utils";
import { GetTokensMsg } from "@keplr/background";
import { observable, runInAction } from "mobx";
import { AppCurrency, ChainInfo } from "@keplr/types";
import { DeepReadonly } from "utility-types";
import { ChainStore } from "../chain";

export class TokensStoreInner {
  @observable.ref
  protected _tokens!: AppCurrency[];

  constructor(
    protected readonly requester: MessageRequester,
    protected readonly chainId: string
  ) {
    runInAction(() => {
      this._tokens = [];
    });

    this.refreshTokens();
  }

  get tokens(): DeepReadonly<AppCurrency[]> {
    return this._tokens;
  }

  @actionAsync
  async refreshTokens() {
    const msg = new GetTokensMsg(this.chainId);
    this._tokens = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
  }
}

export class TokensStore<
  C extends ChainInfo = ChainInfo
> extends HasMapStore<TokensStoreInner> {
  constructor(
    protected readonly chainStore: ChainStore<C>,
    protected readonly requester: MessageRequester
  ) {
    super((chainId: string) => {
      return new TokensStoreInner(this.requester, chainId);
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
}
