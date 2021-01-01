import { Router } from "@keplr/router";
import { GetPersistentMemoryMsg, SetPersistentMemoryMsg } from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { PersistentMemoryKeeper } from "./keeper";

export function init(router: Router, keeper: PersistentMemoryKeeper) {
  router.registerMessage(SetPersistentMemoryMsg);
  router.registerMessage(GetPersistentMemoryMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
