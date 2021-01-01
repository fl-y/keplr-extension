import { Router } from "@keplr/router";
import {
  AddTokenMsg,
  GetSecret20ViewingKey,
  SuggestTokenMsg
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { TokensKeeper } from "./keeper";

export function init(router: Router, keeper: TokensKeeper): void {
  router.registerMessage(SuggestTokenMsg);
  router.registerMessage(AddTokenMsg);
  router.registerMessage(GetSecret20ViewingKey);

  router.addHandler(ROUTE, getHandler(keeper));
}
