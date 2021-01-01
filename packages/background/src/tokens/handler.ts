import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { TokensKeeper } from "./keeper";
import {
  AddTokenMsg,
  GetSecret20ViewingKey,
  SuggestTokenMsg
} from "./messages";

export const getHandler: (keeper: TokensKeeper) => Handler = keeper => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case SuggestTokenMsg:
        return handleSuggestTokenMsg(keeper)(env, msg as SuggestTokenMsg);
      case AddTokenMsg:
        return handleAddTokenMsg(keeper)(env, msg as AddTokenMsg);
      case GetSecret20ViewingKey:
        return handleGetSecret20ViewingKey(keeper)(
          env,
          msg as GetSecret20ViewingKey
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleSuggestTokenMsg: (
  keeper: TokensKeeper
) => InternalHandler<SuggestTokenMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    await keeper.suggestToken(env, msg.chainId, msg.contractAddress);
  };
};

const handleAddTokenMsg: (
  keeper: TokensKeeper
) => InternalHandler<AddTokenMsg> = keeper => {
  return async (_, msg) => {
    await keeper.addToken(msg.chainId, msg.currency);
  };
};

const handleGetSecret20ViewingKey: (
  keeper: TokensKeeper
) => InternalHandler<GetSecret20ViewingKey> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    return await keeper.getSecret20ViewingKey(msg.chainId, msg.contractAddress);
  };
};
