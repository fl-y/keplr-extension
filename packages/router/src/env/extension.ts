import { Env, FnRequestInteraction, MessageSender } from "../types";
import { openPopupWindow } from "@keplr/popup";
import { APP_PORT } from "../constant";
import { InExtensionMessageRequester } from "../sender/extension";

export class ExtensionEnv {
  static readonly produceEnv = (sender: MessageSender): Env => {
    const isInternalMsg = ExtensionEnv.checkIsInternalMessage(sender);

    // Add additional query string for letting the extension know it is for interaction.
    const queryString = `interaction=true&interactionInternal=${isInternalMsg}`;

    const openAndSendMsg: FnRequestInteraction = async (url, msg, options) => {
      url = browser.runtime.getURL(url);

      if (url.includes("?")) {
        url += "&" + queryString;
      } else {
        url += "?" + queryString;
      }

      const windowId = await openPopupWindow(url, options?.channel);
      const window = await browser.windows.get(windowId, {
        populate: true
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tabId = window.tabs![0].id!;

      // Wait until that tab is loaded
      await (async () => {
        const tab = await browser.tabs.get(tabId);
        if (tab.status === "complete") {
          return;
        }

        return new Promise(resolve => {
          browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
            if (tabId === _tabId && changeInfo.status === "complete") {
              resolve();
            }
          });
        });
      })();

      return await InExtensionMessageRequester.sendMessageToTab(
        tabId,
        APP_PORT,
        msg
      );
    };

    if (!isInternalMsg) {
      // If msg is from external (probably from webpage), it opens the popup for extension and send the msg back to the tab opened.
      return {
        isInternalMsg,
        requestInteraction: openAndSendMsg
      };
    } else {
      // If msg is from the extension itself, it can send the msg back to the extension itself.
      // In this case, this expects that there is only one extension popup have been opened.
      const requestInteraction: FnRequestInteraction = async (
        url,
        msg,
        options
      ) => {
        if (options?.forceOpenWindow) {
          return await openAndSendMsg(url, msg, options);
        }

        url = browser.runtime.getURL(url);

        if (url.includes("?")) {
          url += "&" + queryString;
        } else {
          url += "?" + queryString;
        }

        const windows = browser.extension.getViews({ type: "popup" });
        windows[0].location.href = url;

        return await new InExtensionMessageRequester().sendMessage(
          APP_PORT,
          msg
        );
      };

      return {
        isInternalMsg,
        requestInteraction
      };
    }
  };

  protected static readonly checkIsInternalMessage = (
    sender: MessageSender
  ): boolean => {
    if (!sender.url) {
      return false;
    }
    const url = new URL(sender.url);
    if (!url.origin || url.origin === "null") {
      throw new Error("Invalid sender url");
    }

    const browserURL = new URL(browser.runtime.getURL("/"));
    if (!browserURL.origin || browserURL.origin === "null") {
      throw new Error("Invalid browser url");
    }

    if (url.origin !== browserURL.origin) {
      return false;
    }

    return sender.id === browser.runtime.id;
  };
}