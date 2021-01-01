import { Router } from "@keplr/router";
import { ApproveInteractionMsg, RejectInteractionMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { InteractionKeeper } from "./keeper";

export function init(router: Router, keeper: InteractionKeeper): void {
  router.registerMessage(ApproveInteractionMsg);
  router.registerMessage(RejectInteractionMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
