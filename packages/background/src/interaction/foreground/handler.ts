import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { PushInteractionDataMsg } from "./messages";
import { InteractionForegroundKeeper } from "./keeper";

export const getHandler: (keeper: InteractionForegroundKeeper) => Handler = (
  keeper: InteractionForegroundKeeper
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case PushInteractionDataMsg:
        return handlePushInteractionDataMsg(keeper)(
          env,
          msg as PushInteractionDataMsg
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handlePushInteractionDataMsg: (
  keeper: InteractionForegroundKeeper
) => InternalHandler<PushInteractionDataMsg> = keeper => {
  return (_, msg) => {
    return keeper.pushData(msg.data);
  };
};
