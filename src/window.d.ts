import { WalletProvider } from "@chainapsis/cosmosjs/core/walletProvider";
import { Keplr } from "./content-scripts/inject/common";
import { OfflineSigner } from "@cosmjs/launchpad";
import { SecretUtils } from "secretjs/types/enigmautils";

declare global {
  interface Window {
    cosmosJSWalletProvider?: WalletProvider;
    getOfflineSigner?: (chainId: string) => OfflineSigner;
    keplr?: Keplr;
    getEnigmaUtils?: (chainId: string) => SecretUtils | undefined;
  }
}
