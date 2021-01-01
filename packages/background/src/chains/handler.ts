import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { ChainsKeeper } from "./keeper";
import {
  GetAccessOriginMsg,
  GetChainInfosMsg,
  RemoveAccessOriginMsg,
  RemoveSuggestedChainInfoMsg,
  ReqeustAccessMsg,
  SuggestChainInfoMsg,
  TryUpdateChainMsg
} from "./messages";
import { ChainInfo } from "@keplr/types";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export const getHandler: (keeper: ChainsKeeper) => Handler = keeper => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetChainInfosMsg:
        return handleGetChainInfosMsg(keeper)(env, msg as GetChainInfosMsg);
      case SuggestChainInfoMsg:
        return handleSuggestChainInfoMsg(keeper)(
          env,
          msg as SuggestChainInfoMsg
        );
      case RemoveSuggestedChainInfoMsg:
        return handleRemoveSuggestedChainInfoMsg(keeper)(
          env,
          msg as RemoveSuggestedChainInfoMsg
        );
      case ReqeustAccessMsg:
        return handleRequestAccessMsg(keeper)(env, msg as ReqeustAccessMsg);
      case GetAccessOriginMsg:
        return handleGetAccessOriginsMsg(keeper)(
          env,
          msg as GetAccessOriginMsg
        );
      case RemoveAccessOriginMsg:
        return handleRemoveAccessOriginMsg(keeper)(
          env,
          msg as RemoveAccessOriginMsg
        );
      case TryUpdateChainMsg:
        return handleTryUpdateChainMsg(keeper)(env, msg as TryUpdateChainMsg);
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleGetChainInfosMsg: (
  keeper: ChainsKeeper
) => InternalHandler<GetChainInfosMsg> = keeper => {
  return async () => {
    const chainInfos = await keeper.getChainInfos();
    return {
      chainInfos
    };
  };
};

const handleSuggestChainInfoMsg: (
  keeper: ChainsKeeper
) => InternalHandler<SuggestChainInfoMsg> = keeper => {
  return async (env, msg) => {
    if (
      (await keeper.getChainInfos()).find(
        chainInfo => chainInfo.chainId === msg.chainInfo.chainId
      )
    ) {
      // If suggested chain info is already registered, just return.
      return;
    }

    if (
      (await keeper.getChainInfos(false)).find(
        chainInfo => chainInfo.chainId === msg.chainInfo.chainId
      )
    ) {
      // If suggested chain info is already registered without considering the chain update, throw an error because it probably needs to be updated.
      throw new Error(
        "The suggested chain was updated, probably frontend needs to be updated"
      );
    }

    const chainInfo = msg.chainInfo as Writeable<ChainInfo>;
    // And, always handle it as beta.
    chainInfo.beta = true;

    await keeper.suggestChainInfo(env, chainInfo, msg.origin);
  };
};

const handleRemoveSuggestedChainInfoMsg: (
  keeper: ChainsKeeper
) => InternalHandler<RemoveSuggestedChainInfoMsg> = keeper => {
  return async (_, msg) => {
    await keeper.removeChainInfo(msg.chainId);
    return await keeper.getChainInfos();
  };
};

const handleRequestAccessMsg: (
  keeper: ChainsKeeper
) => InternalHandler<ReqeustAccessMsg> = keeper => {
  return async (env, msg) => {
    await keeper.requestAccess(env, msg.chainId, [msg.appOrigin]);
  };
};

const handleGetAccessOriginsMsg: (
  keeper: ChainsKeeper
) => InternalHandler<GetAccessOriginMsg> = keeper => {
  return async (_, msg) => {
    return await keeper.getAccessOriginWithoutEmbed(msg.chainId);
  };
};

const handleRemoveAccessOriginMsg: (
  keeper: ChainsKeeper
) => InternalHandler<RemoveAccessOriginMsg> = keeper => {
  return async (_, msg) => {
    await keeper.removeAccessOrigin(msg.chainId, msg.appOrigin);
  };
};

const handleTryUpdateChainMsg: (
  keeper: ChainsKeeper
) => InternalHandler<TryUpdateChainMsg> = keeper => {
  return async (_, msg) => {
    const chainId = await keeper.tryUpdateChain(msg.chainId);
    return {
      chainId: chainId,
      chainInfos: await keeper.getChainInfos()
    };
  };
};
