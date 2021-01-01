import { Router } from "@keplr/router";
import {
  GetChainInfosMsg,
  ReqeustAccessMsg,
  GetAccessOriginMsg,
  RemoveAccessOriginMsg,
  SuggestChainInfoMsg,
  RemoveSuggestedChainInfoMsg,
  TryUpdateChainMsg
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { ChainsKeeper } from "./keeper";

export function init(router: Router, keeper: ChainsKeeper): void {
  router.registerMessage(GetChainInfosMsg);
  router.registerMessage(SuggestChainInfoMsg);
  router.registerMessage(RemoveSuggestedChainInfoMsg);
  router.registerMessage(ReqeustAccessMsg);
  router.registerMessage(GetAccessOriginMsg);
  router.registerMessage(RemoveAccessOriginMsg);
  router.registerMessage(TryUpdateChainMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
