import { Router } from "@keplr/router";
import { GetPubkeyMsg, ReqeustEncryptMsg, RequestDecryptMsg } from "./messages";
import { SecretWasmKeeper } from "./keeper";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";

export function init(router: Router, keeper: SecretWasmKeeper): void {
  router.registerMessage(GetPubkeyMsg);
  router.registerMessage(ReqeustEncryptMsg);
  router.registerMessage(RequestDecryptMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
