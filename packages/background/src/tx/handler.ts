import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import {
  RequestBackgroundTxMsg,
  RequestBackgroundTxWithResultMsg,
  SendTxMsg
} from "./messages";
import { BackgroundTxKeeper } from "./keeper";

export const getHandler: (keeper: BackgroundTxKeeper) => Handler = (
  keeper: BackgroundTxKeeper
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case SendTxMsg:
        return handleSendTxMsg(keeper)(env, msg as SendTxMsg);
      case RequestBackgroundTxMsg:
        return handleRequestBackgroundTxMsg(keeper)(
          env,
          msg as RequestBackgroundTxMsg
        );
      case RequestBackgroundTxWithResultMsg:
        return handleRequestBackgroundTxWithResultMsg(keeper)(
          env,
          msg as RequestBackgroundTxWithResultMsg
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleSendTxMsg: (
  keeper: BackgroundTxKeeper
) => InternalHandler<SendTxMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    return await keeper.sendTx(msg.chainId, msg.tx, msg.mode);
  };
};

const handleRequestBackgroundTxMsg: (
  keeper: BackgroundTxKeeper
) => InternalHandler<RequestBackgroundTxMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await keeper.requestTx(msg.chainId, msg.txBytes, msg.mode!, msg.isRestAPI);
    return {};
  };
};

const handleRequestBackgroundTxWithResultMsg: (
  keeper: BackgroundTxKeeper
) => InternalHandler<RequestBackgroundTxWithResultMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);
    return await keeper.requestTxWithResult(
      msg.chainId,
      msg.txBytes,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      msg.mode!,
      msg.isRestAPI
    );
  };
};
