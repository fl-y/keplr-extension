import { EnigmaUtils } from "secretjs";
import { KeyRingService } from "../keyring";
import { ChainsService } from "../chains";
import { PermissionService } from "../permission";
import { Crypto } from "../keyring/crypto";
import { KVStore } from "@keplr/common";
import { ChainInfo } from "@keplr/types";
import { Bech32Address } from "@keplr/cosmos";
import { Env } from "@keplr/router";

import { Buffer } from "buffer/";

export class SecretWasmService {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainsService: ChainsService,
    protected readonly keyRingService: KeyRingService,
    public readonly permissionService: PermissionService
  ) {}

  async getPubkey(env: Env, chainId: string): Promise<Uint8Array> {
    const chainInfo = await this.chainsService.getChainInfo(chainId);

    const keyRingType = await this.keyRingService.getKeyRingType();
    if (keyRingType === "none") {
      throw new Error("Key ring is not initialized");
    }

    const seed = await this.getSeed(env, chainInfo);

    // TODO: Handle the rest config.
    const utils = new EnigmaUtils(chainInfo.rest, seed);
    return utils.pubkey;
  }

  async encrypt(
    env: Env,
    chainId: string,
    contractCodeHash: string,
    msg: object
  ): Promise<Uint8Array> {
    const chainInfo = await this.chainsService.getChainInfo(chainId);

    const keyRingType = await this.keyRingService.getKeyRingType();
    if (keyRingType === "none") {
      throw new Error("Key ring is not initialized");
    }

    // XXX: Keplr should generate the seed deterministically according to the account.
    // Otherwise, it will lost the encryption/decryption key if Keplr is uninstalled or local storage is cleared.
    // For now, use the signature of some string to generate the seed.
    // It need to more research.
    const seed = await this.getSeed(env, chainInfo);

    // TODO: Handle the rest config.
    const utils = new EnigmaUtils(chainInfo.rest, seed);

    return await utils.encrypt(contractCodeHash, msg);
  }

  async decrypt(
    env: Env,
    chainId: string,
    ciphertext: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    const chainInfo = await this.chainsService.getChainInfo(chainId);

    const keyRingType = await this.keyRingService.getKeyRingType();
    if (keyRingType === "none") {
      throw new Error("Key ring is not initialized");
    }

    // XXX: Keplr should generate the seed deterministically according to the account.
    // Otherwise, it will lost the encryption/decryption key if Keplr is uninstalled or local storage is cleared.
    // For now, use the signature of some string to generate the seed.
    // It need to more research.
    const seed = await this.getSeed(env, chainInfo);

    // TODO: Handle the rest config.
    const utils = new EnigmaUtils(chainInfo.rest, seed);

    return await utils.decrypt(ciphertext, nonce);
  }

  private async getSeed(env: Env, chainInfo: ChainInfo): Promise<Uint8Array> {
    const key = await this.keyRingService.getKey(chainInfo.chainId);

    const storeKey = `seed-${chainInfo.chainId}-${new Bech32Address(
      key.address
    ).toBech32(chainInfo.bech32Config.bech32PrefixAccAddr)}`;

    const cached = await this.kvStore.get(storeKey);
    if (cached) {
      return Buffer.from(cached, "hex");
    }

    const seed = Crypto.sha256(
      Buffer.from(
        await this.keyRingService.sign(
          env,
          chainInfo.chainId,
          Buffer.from(
            JSON.stringify({
              account_number: 0,
              chain_id: chainInfo.chainId,
              fee: [],
              memo:
                "Create Keplr Secret encryption key. Only approve requests by Keplr.",
              msgs: [],
              sequence: 0,
            })
          )
        )
      )
    );

    await this.kvStore.set(storeKey, Buffer.from(seed).toString("hex"));

    return seed;
  }
}
