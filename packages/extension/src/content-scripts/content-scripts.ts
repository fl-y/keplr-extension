import {
  ExtensionEnv,
  InjectedMessageRequester,
  Router,
  WEBPAGE_PORT,
} from "@keplr/router";
import { initEvents } from "./events";

InjectedMessageRequester.startProxy();

const router = new Router(ExtensionEnv.produceEnv);
initEvents(router);
router.listen(WEBPAGE_PORT);

const container = document.head || document.documentElement;
const scriptElement = document.createElement("script");

scriptElement.src = browser.runtime.getURL("injectedScript.bundle.js");
scriptElement.type = "text/javascript";
container.insertBefore(scriptElement, container.children[0]);
scriptElement.remove();
