import { CosmosJSWalletProvider } from "./cosmosjs-wallet-provider";
import { Keplr } from "./common";
import { CosmJSOfflineSigner } from "./cosmjs-offline-signer";
import { KeplrEnigmaUtils } from "./enigma-utils";
import { init } from "./init";
import { InjectedMessageRequester } from "../../common/message/send/inject";

const keplr = new Keplr(new InjectedMessageRequester());

init(
  keplr,
  new CosmosJSWalletProvider(keplr),
  (chainId: string) => new CosmJSOfflineSigner(chainId, keplr),
  (chainId: string) => new KeplrEnigmaUtils(chainId)
);
