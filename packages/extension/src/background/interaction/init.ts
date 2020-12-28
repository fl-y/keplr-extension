import { MessageManager } from "../../common/message";
import { ApproveInteractionMsg, RejectInteractionMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { InteractionKeeper } from "./keeper";

export function init(
  messageManager: MessageManager,
  keeper: InteractionKeeper
): void {
  messageManager.registerMessage(ApproveInteractionMsg);
  messageManager.registerMessage(RejectInteractionMsg);

  messageManager.addHandler(ROUTE, getHandler(keeper));
}
