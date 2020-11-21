import { CosmosJSWalletProvider } from "./cosmosjs-wallet-provider";
import { Keplr } from "./common";
import { CosmJSOfflineSigner } from "./cosmjs-offline-signer";
import { KeplrEnigmaUtils } from "./enigma-utils";
import { init } from "./init";

init(
  new Keplr(),
  new CosmosJSWalletProvider(),
  (chainId: string) => new CosmJSOfflineSigner(chainId),
  (chainId: string) => new KeplrEnigmaUtils(chainId)
);
