import { Router } from "@keplr/router";
import { PushInteractionDataMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { InteractionForegroundService } from "./service";

export function interactionForegroundInit(
  router: Router,
  keeper: InteractionForegroundService
): void {
  router.registerMessage(PushInteractionDataMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
