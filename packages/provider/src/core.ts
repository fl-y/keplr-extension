import {
  ChainInfo,
  Keplr as IKeplr,
  KeyHex,
  TxBuilderConfigPrimitive
} from "@keplr/types";
import { BACKGROUND_PORT, MessageRequester } from "@keplr/router";
import { BroadcastMode, BroadcastTxResult, StdTx } from "@cosmjs/launchpad";
import {
  EnableKeyRingMsg,
  SuggestChainInfoMsg,
  GetKeyMsg,
  RequestTxBuilderConfigMsg,
  RequestSignMsg,
  SuggestTokenMsg
} from "@keplr/background";

import { Buffer } from "buffer/";

export class Keplr implements IKeplr {
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
        ...config
      },
      false
    );
    return (await this.requester.sendMessage(BACKGROUND_PORT, msg)).config;
  }

  sendTx(
    _chainId: string,
    _stdTx: StdTx,
    _mode: BroadcastMode
  ): Promise<BroadcastTxResult> {
    throw new Error("implement me");
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
}
