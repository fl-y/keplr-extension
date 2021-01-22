import { Router } from "@keplr/router";
import { LedgerGetWebHIDFlagMsg, LedgerSetWebHIDFlagMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { LedgerKeeper } from "./keeper";

export function init(router: Router, keeper: LedgerKeeper): void {
  router.registerMessage(LedgerGetWebHIDFlagMsg);
  router.registerMessage(LedgerSetWebHIDFlagMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
