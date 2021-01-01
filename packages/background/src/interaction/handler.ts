import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { ApproveInteractionMsg, RejectInteractionMsg } from "./messages";
import { InteractionKeeper } from "./keeper";

export const getHandler: (keeper: InteractionKeeper) => Handler = (
  keeper: InteractionKeeper
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case ApproveInteractionMsg:
        return handleApproveInteractionMsg(keeper)(
          env,
          msg as ApproveInteractionMsg
        );
      case RejectInteractionMsg:
        return handleRejectInteractionMsg(keeper)(
          env,
          msg as RejectInteractionMsg
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleApproveInteractionMsg: (
  keeper: InteractionKeeper
) => InternalHandler<ApproveInteractionMsg> = keeper => {
  return (_, msg) => {
    return keeper.approve(msg.id, msg.result);
  };
};

const handleRejectInteractionMsg: (
  keeper: InteractionKeeper
) => InternalHandler<RejectInteractionMsg> = keeper => {
  return (_, msg) => {
    return keeper.reject(msg.id);
  };
};
