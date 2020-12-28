import { MessageManager } from "../../../common/message";
import { PushInteractionDataMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { InteractionForegroundKeeper } from "./keeper";

export function init(
  messageManager: MessageManager,
  keeper: InteractionForegroundKeeper
): void {
  messageManager.registerMessage(PushInteractionDataMsg);

  messageManager.addHandler(ROUTE, getHandler(keeper));
}
