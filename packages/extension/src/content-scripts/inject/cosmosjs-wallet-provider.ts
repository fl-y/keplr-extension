import { Key, WalletProvider } from "@chainapsis/cosmosjs/core/walletProvider";
import { Context } from "@chainapsis/cosmosjs/core/context";
import { TxBuilderConfig } from "@chainapsis/cosmosjs/core/txBuilder";
import {
  txBuilderConfigFromPrimitive,
  txBuilderConfigToPrimitive
} from "../../background/keyring/utils";
import { Keplr } from "./common";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Manifest = require("../../manifest.json");

const Buffer = require("buffer/").Buffer;

export class CosmosJSWalletProvider implements WalletProvider {
  public readonly identifier: string = "keplr-extension";
  public readonly version: string = Manifest.version;

  constructor(protected readonly keplr: Keplr) {}

  /**
   * Request access to the user's accounts. Wallet can ask the user to approve or deny access. If user deny access, it will throw error.
   */
  async enable(context: Context): Promise<void> {
    return this.keplr.enable(context.get("chainId"));
  }

  /**
   * Get array of keys that includes bech32 address string, address bytes and public key from wallet if user have approved the access.
   */
  async getKeys(context: Context): Promise<Key[]> {
    const key = await this.keplr.getKey(context.get("chainId"));
    return Promise.resolve([
      {
        algo: key.algo,
        bech32Address: key.bech32Address,
        pubKey: new Uint8Array(Buffer.from(key.pubKeyHex, "hex")),
        address: new Uint8Array(Buffer.from(key.addressHex, "hex"))
      }
    ]);
  }

  /**
   * Request tx builder config from provider.
   * This is optional method.
   * If provider supports this method, tx builder will request tx config with prefered tx config that is defined by developer who uses cosmosjs.
   * Received tx builder config can be changed in the client. The wallet provider must verify that it is the same as the tx builder config sent earlier or warn the user before signing.
   */
  async getTxBuilderConfig(
    context: Context,
    config: TxBuilderConfig
  ): Promise<TxBuilderConfig> {
    const result = await this.keplr.getTxConfig(
      context.get("chainId"),
      txBuilderConfigToPrimitive(config)
    );

    return txBuilderConfigFromPrimitive(result.config);
  }

  /**
   * Request signature from matched address if user have approved the access.
   */
  async sign(
    context: Context,
    bech32Address: string,
    message: Uint8Array
  ): Promise<Uint8Array> {
    const result = await this.keplr.sign(
      context.get("chainId"),
      bech32Address,
      message
    );

    return new Uint8Array(Buffer.from(result.signatureHex, "hex"));
  }
}
