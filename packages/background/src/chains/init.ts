import { Router } from "@keplr/router";
import {
  GetChainInfosMsg,
  ReqeustAccessMsg,
  GetAccessOriginMsg,
  RemoveAccessOriginMsg,
  SuggestChainInfoMsg,
  RemoveSuggestedChainInfoMsg,
  TryUpdateChainMsg,
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { ChainsService } from "./service";

export function init(router: Router, keeper: ChainsService): void {
  router.registerMessage(GetChainInfosMsg);
  router.registerMessage(SuggestChainInfoMsg);
  router.registerMessage(RemoveSuggestedChainInfoMsg);
  router.registerMessage(ReqeustAccessMsg);
  router.registerMessage(GetAccessOriginMsg);
  router.registerMessage(RemoveAccessOriginMsg);
  router.registerMessage(TryUpdateChainMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
