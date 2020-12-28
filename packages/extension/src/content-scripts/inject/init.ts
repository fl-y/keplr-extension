import { Keplr } from "./common";
import { OfflineSigner } from "@cosmjs/launchpad";
import { WalletProvider } from "@chainapsis/cosmosjs/core/walletProvider";
import { SecretUtils } from "secretjs/types/enigmautils";

export function init(
  keplr: Keplr,
  cosmosJSWalletProvider: WalletProvider,
  getOfflineSigner: (chainId: string) => OfflineSigner,
  getEnigmaUtils: (chainId: string) => SecretUtils
) {
  // Give a priority to production build.
  if (process.env.NODE_ENV !== "production") {
    if (!window.keplr) {
      window.keplr = keplr;
    }

    if (!window.cosmosJSWalletProvider) {
      window.cosmosJSWalletProvider = cosmosJSWalletProvider;
    }

    if (!window.getOfflineSigner) {
      window.getOfflineSigner = getOfflineSigner;
    }
    if (!window.getEnigmaUtils) {
      window.getEnigmaUtils = getEnigmaUtils;
    }
  } else {
    window.keplr = keplr;
    window.cosmosJSWalletProvider = cosmosJSWalletProvider;
    window.getOfflineSigner = getOfflineSigner;
    window.getEnigmaUtils = getEnigmaUtils;
  }
}
