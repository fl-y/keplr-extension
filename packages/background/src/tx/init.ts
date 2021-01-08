import { Router } from "@keplr/router";
import {
  RequestBackgroundTxMsg,
  RequestBackgroundTxWithResultMsg,
  SendTxMsg
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { BackgroundTxKeeper } from "./keeper";

export function init(router: Router, keeper: BackgroundTxKeeper): void {
  router.registerMessage(SendTxMsg);
  router.registerMessage(RequestBackgroundTxMsg);
  router.registerMessage(RequestBackgroundTxWithResultMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
