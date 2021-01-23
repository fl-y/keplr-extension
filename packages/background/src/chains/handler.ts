import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { ChainsService } from "./service";
import {
  GetChainInfosMsg,
  RemoveSuggestedChainInfoMsg,
  SuggestChainInfoMsg,
  TryUpdateChainMsg,
} from "./messages";
import { ChainInfo } from "@keplr/types";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export const getHandler: (service: ChainsService) => Handler = (service) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetChainInfosMsg:
        return handleGetChainInfosMsg(service)(env, msg as GetChainInfosMsg);
      case SuggestChainInfoMsg:
        return handleSuggestChainInfoMsg(service)(
          env,
          msg as SuggestChainInfoMsg
        );
      case RemoveSuggestedChainInfoMsg:
        return handleRemoveSuggestedChainInfoMsg(service)(
          env,
          msg as RemoveSuggestedChainInfoMsg
        );
      case TryUpdateChainMsg:
        return handleTryUpdateChainMsg(service)(env, msg as TryUpdateChainMsg);
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleGetChainInfosMsg: (
  service: ChainsService
) => InternalHandler<GetChainInfosMsg> = (service) => {
  return async () => {
    const chainInfos = await service.getChainInfos();
    return {
      chainInfos,
    };
  };
};

const handleSuggestChainInfoMsg: (
  service: ChainsService
) => InternalHandler<SuggestChainInfoMsg> = (service) => {
  return async (env, msg) => {
    if (
      (await service.getChainInfos()).find(
        (chainInfo) => chainInfo.chainId === msg.chainInfo.chainId
      )
    ) {
      // If suggested chain info is already registered, just return.
      return;
    }

    if (
      (await service.getChainInfos(false)).find(
        (chainInfo) => chainInfo.chainId === msg.chainInfo.chainId
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

    await service.suggestChainInfo(env, chainInfo, msg.origin);
  };
};

const handleRemoveSuggestedChainInfoMsg: (
  service: ChainsService
) => InternalHandler<RemoveSuggestedChainInfoMsg> = (service) => {
  return async (_, msg) => {
    await service.removeChainInfo(msg.chainId);
    return await service.getChainInfos();
  };
};

const handleTryUpdateChainMsg: (
  service: ChainsService
) => InternalHandler<TryUpdateChainMsg> = (service) => {
  return async (_, msg) => {
    const chainId = await service.tryUpdateChain(msg.chainId);
    return {
      chainId: chainId,
      chainInfos: await service.getChainInfos(),
    };
  };
};
