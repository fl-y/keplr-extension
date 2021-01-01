import { Router } from "@keplr/router";
import { TxCommittedMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { BackgroundTxNotifyKeeper } from "./keeper";

export function init(router: Router, keeper: BackgroundTxNotifyKeeper): void {
  router.registerMessage(TxCommittedMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
