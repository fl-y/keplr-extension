import { ChainInfo } from "../chain-info";
import { TxBuilderConfigPrimitive } from "../tx";
import { BroadcastMode, BroadcastTxResult, StdTx } from "@cosmjs/launchpad";
import { SecretUtils } from "secretjs/types/enigmautils";

// TODO: Return the `Uint8Array` instead of hex string.
export interface KeyHex {
  // Name of the selected key store.
  name: string;
  algo: string;
  pubKeyHex: string;
  addressHex: string;
  bech32Address: string;
}

export interface Keplr {
  experimentalSuggestChain(chainInfo: ChainInfo): Promise<void>;
  enable(chainId: string): Promise<void>;
  getKey(chainId: string): Promise<KeyHex>;
  // TODO: Return the cosmjs's config?
  getTxConfig(
    chainId: string,
    config: TxBuilderConfigPrimitive
  ): Promise<TxBuilderConfigPrimitive>;
  // TODO: Return the `Uint8Array` instead of hex string.
  sign(
    chainId: string,
    signer: string,
    message: Uint8Array
  ): Promise<{
    signatureHex: string;
  }>;
  sendTx(
    chainId: string,
    stdTx: StdTx,
    mode: BroadcastMode
  ): Promise<BroadcastTxResult>;
  suggestToken(chainId: string, contractAddress: string): Promise<void>;

  getEnigmaUtils(chainId: string): SecretUtils;
}
