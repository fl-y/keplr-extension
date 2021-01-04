import { Mnemonic } from "@keplr/crypto";
import { MessageRequester, BACKGROUND_PORT } from "@keplr/router";
import {
  KeyRingStatus,
  RestoreKeyRingMsg,
  CreateMnemonicKeyMsg,
  UnlockKeyRingMsg,
  LockKeyRingMsg,
  CreatePrivateKeyMsg,
  GetMultiKeyStoreInfoMsg,
  ChangeKeyRingMsg,
  AddMnemonicKeyMsg,
  AddPrivateKeyMsg,
  DeleteKeyRingMsg,
  CreateLedgerKeyMsg,
  AddLedgerKeyMsg,
  GetKeyRingTypeMsg,
  SetKeyStoreCoinTypeMsg,
  MultiKeyStoreInfoWithSelected,
  BIP44HDPath,
  EnableKeyRingMsg
} from "@keplr/background";

import { action, observable } from "mobx";
import { actionAsync, task } from "mobx-utils";

import { Buffer } from "buffer/";
import { InteractionStore } from "./interaction";

/*
 Actual key ring logic is managed in persistent background. Refer "src/common/message" and "src/background/keyring"
 This store only interact with key ring in persistent background.
 */

export class KeyRingStore {
  public static async GenereateMnemonic(
    strenth: number = 128
  ): Promise<string> {
    return await Mnemonic.generateSeed(array => {
      return Promise.resolve(crypto.getRandomValues(array));
    }, strenth);
  }

  @observable
  public status!: KeyRingStatus;

  @observable
  public keyRingType!: string;

  @observable
  public multiKeyStoreInfo!: MultiKeyStoreInfoWithSelected;

  constructor(
    protected readonly requester: MessageRequester,
    protected readonly interactionStore: InteractionStore
  ) {
    this.setKeyRingType("none");
    this.setStatus(KeyRingStatus.NOTLOADED);
    this.setMultiKeyStoreInfo([]);
  }

  @action
  private setKeyRingType(type: string) {
    this.keyRingType = type;
  }

  @action
  private setStatus(status: KeyRingStatus) {
    this.status = status;
  }

  @action
  private setMultiKeyStoreInfo(info: MultiKeyStoreInfoWithSelected) {
    this.multiKeyStoreInfo = info;
  }

  @actionAsync
  public async createMnemonicKey(
    mnemonic: string,
    password: string,
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new CreateMnemonicKeyMsg(mnemonic, password, meta, bip44HDPath);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);

    const type = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
    this.setKeyRingType(type);
  }

  @actionAsync
  public async createPrivateKey(
    privateKey: Uint8Array,
    password: string,
    meta: Record<string, string>
  ) {
    const msg = new CreatePrivateKeyMsg(
      Buffer.from(privateKey).toString("hex"),
      password,
      meta
    );
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);

    const type = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
    this.setKeyRingType(type);
  }

  @actionAsync
  public async createLedgerKey(
    password: string,
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new CreateLedgerKeyMsg(password, meta, bip44HDPath);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);

    const type = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
    this.setKeyRingType(type);
  }

  @actionAsync
  public async addMnemonicKey(
    mnemonic: string,
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new AddMnemonicKeyMsg(mnemonic, meta, bip44HDPath);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setMultiKeyStoreInfo(result);
  }

  @actionAsync
  public async addPrivateKey(
    privateKey: Uint8Array,
    meta: Record<string, string>
  ) {
    const msg = new AddPrivateKeyMsg(
      Buffer.from(privateKey).toString("hex"),
      meta
    );
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setMultiKeyStoreInfo(result);
  }

  @actionAsync
  public async addLedgerKey(
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new AddLedgerKeyMsg(meta, bip44HDPath);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setMultiKeyStoreInfo(result);
  }

  @actionAsync
  public async changeKeyRing(index: number) {
    const msg = new ChangeKeyRingMsg(index);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setMultiKeyStoreInfo(result);

    const type = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
    this.setKeyRingType(type);

    // Emit the key store changed event manually.
    window.dispatchEvent(new Event("keplr_keystorechange"));
  }

  @actionAsync
  public async lock() {
    const msg = new LockKeyRingMsg();
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);
  }

  @actionAsync
  public async unlock(password: string) {
    const msg = new UnlockKeyRingMsg(password);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);

    // Approve all waiting interaction for the enabling key ring.
    for (const interaction of this.interactionStore.getDatas(
      EnableKeyRingMsg.type()
    )) {
      this.interactionStore.approve(
        EnableKeyRingMsg.type(),
        interaction.id,
        {}
      );
    }
  }

  @actionAsync
  public async restore() {
    const msg = new RestoreKeyRingMsg();
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);
    this.setKeyRingType(result.type);
    this.setMultiKeyStoreInfo(result.multiKeyStoreInfo);
  }

  @actionAsync
  public async save() {
    /*
        const msg = new SaveKeyRingMsg();
        await task(this.requester.sendMessage(BACKGROUND_PORT, msg));

        const type = await task(
          this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
        );
        this.setKeyRingType(type);
        */
  }

  @actionAsync
  public async deleteKeyRing(index: number, password: string) {
    const msg = new DeleteKeyRingMsg(index, password);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.setStatus(result.status);
    this.setMultiKeyStoreInfo(result.multiKeyStoreInfo);

    // Possibly, key ring can be changed if deleting key store was selected one.
    const type = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
    this.setKeyRingType(type);
  }

  // Set the coin type to current key store.
  // And, save it, refresh the key store.
  @actionAsync
  public async setKeyStoreCoinType(chainId: string, coinType: number) {
    const status = await task(
      this.requester.sendMessage(
        BACKGROUND_PORT,
        new SetKeyStoreCoinTypeMsg(chainId, coinType)
      )
    );

    await task(this.save());

    const multiKeyStoreInfo = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetMultiKeyStoreInfoMsg())
    );
    this.setMultiKeyStoreInfo(multiKeyStoreInfo);

    this.setStatus(status);
  }
}
