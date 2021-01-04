import { Router } from "@keplr/router";
import { PushInteractionDataMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { InteractionForegroundKeeper } from "./keeper";

export function interactionForegroundInit(
  router: Router,
  keeper: InteractionForegroundKeeper
): void {
  router.registerMessage(PushInteractionDataMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
