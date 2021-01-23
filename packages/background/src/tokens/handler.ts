import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { TokensService } from "./service";
import {
  AddTokenMsg,
  GetSecret20ViewingKey,
  SuggestTokenMsg,
} from "./messages";

export const getHandler: (service: TokensService) => Handler = (service) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case SuggestTokenMsg:
        return handleSuggestTokenMsg(service)(env, msg as SuggestTokenMsg);
      case AddTokenMsg:
        return handleAddTokenMsg(service)(env, msg as AddTokenMsg);
      case GetSecret20ViewingKey:
        return handleGetSecret20ViewingKey(service)(
          env,
          msg as GetSecret20ViewingKey
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleSuggestTokenMsg: (
  service: TokensService
) => InternalHandler<SuggestTokenMsg> = (service) => {
  return async (env, msg) => {
    await service.permissionService.checkOrGrantBasicAccessPermission(
      env,
      msg.chainId,
      msg.origin
    );

    await service.suggestToken(env, msg.chainId, msg.contractAddress);
  };
};

const handleAddTokenMsg: (
  service: TokensService
) => InternalHandler<AddTokenMsg> = (service) => {
  return async (_, msg) => {
    await service.addToken(msg.chainId, msg.currency);
  };
};

const handleGetSecret20ViewingKey: (
  service: TokensService
) => InternalHandler<GetSecret20ViewingKey> = (service) => {
  return async (env, msg) => {
    await service.permissionService.checkOrGrantBasicAccessPermission(
      env,
      msg.chainId,
      msg.origin
    );

    return await service.getSecret20ViewingKey(
      msg.chainId,
      msg.contractAddress
    );
  };
};
