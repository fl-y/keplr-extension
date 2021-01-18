import {
  ChainInfo,
  Keplr as IKeplr,
  KeyHex,
  TxBuilderConfigPrimitive,
} from "@keplr/types";
import { BACKGROUND_PORT, MessageRequester } from "@keplr/router";
import { BroadcastMode, BroadcastTxResult, StdTx } from "@cosmjs/launchpad";
import {
  EnableKeyRingMsg,
  SuggestChainInfoMsg,
  GetKeyMsg,
  RequestTxBuilderConfigMsg,
  RequestSignMsg,
  SuggestTokenMsg,
  SendTxMsg,
} from "@keplr/background";
import { SecretUtils } from "secretjs/types/enigmautils";

import { Buffer } from "buffer/";
import { KeplrEnigmaUtils } from "./enigma";

export class Keplr implements IKeplr {
  protected enigmaUtils: Map<string, SecretUtils> = new Map();

  constructor(protected readonly requester: MessageRequester) {}

  async enable(chainId: string): Promise<void> {
    const msg = new EnableKeyRingMsg(chainId);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async experimentalSuggestChain(chainInfo: ChainInfo): Promise<void> {
    const msg = new SuggestChainInfoMsg(chainInfo);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getKey(chainId: string): Promise<KeyHex> {
    const msg = new GetKeyMsg(chainId);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getTxConfig(
    chainId: string,
    config: TxBuilderConfigPrimitive
  ): Promise<TxBuilderConfigPrimitive> {
    const msg = new RequestTxBuilderConfigMsg(
      {
        chainId,
        ...config,
      },
      false
    );
    return (await this.requester.sendMessage(BACKGROUND_PORT, msg)).config;
  }

  async sendTx(
    chainId: string,
    stdTx: StdTx,
    mode: BroadcastMode
  ): Promise<BroadcastTxResult> {
    const msg = new SendTxMsg(chainId, stdTx, mode);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async sign(
    chainId: string,
    signer: string,
    message: Uint8Array
  ): Promise<{ signatureHex: string }> {
    const msg = new RequestSignMsg(
      chainId,
      signer,
      Buffer.from(message).toString("hex"),
      false
    );
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async suggestToken(chainId: string, contractAddress: string): Promise<void> {
    const msg = new SuggestTokenMsg(chainId, contractAddress);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  getEnigmaUtils(chainId: string): SecretUtils {
    if (this.enigmaUtils.has(chainId)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.enigmaUtils.get(chainId)!;
    }

    const enigmaUtils = new KeplrEnigmaUtils(chainId, this.requester);
    this.enigmaUtils.set(chainId, enigmaUtils);
    return enigmaUtils;
  }
}
