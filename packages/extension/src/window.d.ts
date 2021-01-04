import { WalletProvider } from "@chainapsis/cosmosjs/core/walletProvider";
import { OfflineSigner } from "@cosmjs/launchpad";
import { SecretUtils } from "secretjs/types/enigmautils";

import { Keplr } from "@keplr/types";

declare global {
  interface Window {
    cosmosJSWalletProvider?: WalletProvider;
    getOfflineSigner?: (chainId: string) => OfflineSigner;
    keplr?: Keplr;
    getEnigmaUtils?: (chainId: string) => SecretUtils | undefined;
  }
}
