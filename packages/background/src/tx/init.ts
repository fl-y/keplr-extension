import { Router } from "@keplr/router";
import {
  RequestBackgroundTxMsg,
  RequestBackgroundTxWithResultMsg
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { BackgroundTxKeeper } from "./keeper";

export function init(router: Router, keeper: BackgroundTxKeeper): void {
  router.registerMessage(RequestBackgroundTxMsg);
  router.registerMessage(RequestBackgroundTxWithResultMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
