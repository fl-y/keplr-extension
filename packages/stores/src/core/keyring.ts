import { Mnemonic } from "@keplr/crypto";
import { BACKGROUND_PORT, MessageRequester } from "@keplr/router";
import {
  AddLedgerKeyMsg,
  AddMnemonicKeyMsg,
  AddPrivateKeyMsg,
  BIP44HDPath,
  ChangeKeyRingMsg,
  CreateLedgerKeyMsg,
  CreateMnemonicKeyMsg,
  CreatePrivateKeyMsg,
  DeleteKeyRingMsg,
  EnableKeyRingMsg,
  GetIsKeyStoreCoinTypeSetMsg,
  GetKeyRingTypeMsg,
  GetMultiKeyStoreInfoMsg,
  KeyRingStatus,
  LockKeyRingMsg,
  MultiKeyStoreInfoWithSelected,
  RestoreKeyRingMsg,
  SetKeyStoreCoinTypeMsg,
  ShowKeyRingMsg,
  UnlockKeyRingMsg,
} from "@keplr/background";

import { computed, observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";

import { Buffer } from "buffer/";
import { InteractionStore } from "./interaction";
import { ChainGetter } from "../common";
import { BIP44 } from "@keplr/types";

export type SelectableAccount = {
  readonly path: BIP44;
  readonly bech32Address: string;
  readonly isExistent: boolean;
  readonly sequence: string;
  readonly coins: { amount: string; denom: string }[];
};

export class KeyRingSelectablesStore {
  @observable
  isInitializing!: boolean;

  @observable
  _isKeyStoreCoinTypeSet!: boolean;

  constructor(
    protected readonly chainGetter: ChainGetter,
    protected readonly requester: MessageRequester,
    protected readonly chainId: string
  ) {
    runInAction(() => {
      this.isInitializing = false;
      this._isKeyStoreCoinTypeSet = true;
    });

    this.init();
  }

  @computed
  get needSelectCoinType(): boolean {
    const chainInfo = this.chainGetter.getChain(this.chainId);
    if (
      !chainInfo.alternativeBIP44s ||
      chainInfo.alternativeBIP44s.length === 0
    ) {
      return false;
    }
    return !this._isKeyStoreCoinTypeSet;
  }

  @actionAsync
  async init() {
    this.isInitializing = true;

    const msg = new GetIsKeyStoreCoinTypeSetMsg(this.chainId);
    this._isKeyStoreCoinTypeSet = await task(
      this.requester.sendMessage(BACKGROUND_PORT, msg)
    );

    this.isInitializing = false;
  }
}

/*
 Actual key ring logic is managed in persistent background. Refer "src/common/message" and "src/background/keyring"
 This store only interact with key ring in persistent background.
 */
export class KeyRingStore {
  static async GenereateMnemonic(strenth: number = 128): Promise<string> {
    return await Mnemonic.generateSeed((array) => {
      return Promise.resolve(crypto.getRandomValues(array));
    }, strenth);
  }

  @observable
  status!: KeyRingStatus;

  @observable
  keyRingType!: string;

  @observable
  multiKeyStoreInfo!: MultiKeyStoreInfoWithSelected;

  @observable.shallow
  selectablesMap!: Map<string, KeyRingSelectablesStore>;

  constructor(
    protected readonly chainGetter: ChainGetter,
    protected readonly requester: MessageRequester,
    protected readonly interactionStore: InteractionStore
  ) {
    runInAction(() => {
      this.keyRingType = "none";
      this.status = KeyRingStatus.NOTLOADED;
      this.multiKeyStoreInfo = [];
      this.selectablesMap = new Map();
    });

    this.restore();
  }

  @actionAsync
  async createMnemonicKey(
    mnemonic: string,
    password: string,
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new CreateMnemonicKeyMsg(mnemonic, password, meta, bip44HDPath);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.status = result.status;

    this.keyRingType = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
  }

  @actionAsync
  async createPrivateKey(
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
    this.status = result.status;

    this.keyRingType = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
  }

  @actionAsync
  async createLedgerKey(
    password: string,
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new CreateLedgerKeyMsg(password, meta, bip44HDPath);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.status = result.status;

    this.keyRingType = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
  }

  @actionAsync
  async addMnemonicKey(
    mnemonic: string,
    meta: Record<string, string>,
    bip44HDPath: BIP44HDPath
  ) {
    const msg = new AddMnemonicKeyMsg(mnemonic, meta, bip44HDPath);
    this.multiKeyStoreInfo = await task(
      this.requester.sendMessage(BACKGROUND_PORT, msg)
    );
  }

  @actionAsync
  async addPrivateKey(privateKey: Uint8Array, meta: Record<string, string>) {
    const msg = new AddPrivateKeyMsg(
      Buffer.from(privateKey).toString("hex"),
      meta
    );
    this.multiKeyStoreInfo = await task(
      this.requester.sendMessage(BACKGROUND_PORT, msg)
    );
  }

  @actionAsync
  async addLedgerKey(meta: Record<string, string>, bip44HDPath: BIP44HDPath) {
    const msg = new AddLedgerKeyMsg(meta, bip44HDPath);
    this.multiKeyStoreInfo = await task(
      this.requester.sendMessage(BACKGROUND_PORT, msg)
    );
  }

  @actionAsync
  async changeKeyRing(index: number) {
    const msg = new ChangeKeyRingMsg(index);
    this.multiKeyStoreInfo = await task(
      this.requester.sendMessage(BACKGROUND_PORT, msg)
    );

    this.keyRingType = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );

    // Emit the key store changed event manually.
    window.dispatchEvent(new Event("keplr_keystorechange"));
  }

  @actionAsync
  async lock() {
    const msg = new LockKeyRingMsg();
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.status = result.status;
  }

  @actionAsync
  async unlock(password: string) {
    const msg = new UnlockKeyRingMsg(password);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.status = result.status;

    // Approve all waiting interaction for the enabling key ring.
    for (const interaction of this.interactionStore.getDatas(
      EnableKeyRingMsg.type()
    )) {
      await this.interactionStore.approve(
        EnableKeyRingMsg.type(),
        interaction.id,
        {}
      );
    }
  }

  @actionAsync
  protected async restore() {
    const msg = new RestoreKeyRingMsg();
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.status = result.status;
    this.keyRingType = result.type;
    this.multiKeyStoreInfo = result.multiKeyStoreInfo;
  }

  async showKeyRing(index: number, password: string): Promise<string> {
    const msg = new ShowKeyRingMsg(index, password);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  @actionAsync
  async save() {
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
  async deleteKeyRing(index: number, password: string) {
    const msg = new DeleteKeyRingMsg(index, password);
    const result = await task(this.requester.sendMessage(BACKGROUND_PORT, msg));
    this.status = result.status;
    this.multiKeyStoreInfo = result.multiKeyStoreInfo;

    // Possibly, key ring can be changed if deleting key store was selected one.
    this.keyRingType = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetKeyRingTypeMsg())
    );
  }

  getKeyStoreSelectables(chainId: string): KeyRingSelectablesStore {
    if (!this.selectablesMap.has(chainId)) {
      runInAction(() => {
        this.selectablesMap.set(
          chainId,
          new KeyRingSelectablesStore(this.chainGetter, this.requester, chainId)
        );
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.selectablesMap.get(chainId)!;
  }

  // Set the coin type to current key store.
  // And, save it, refresh the key store.
  @actionAsync
  async setKeyStoreCoinType(chainId: string, coinType: number) {
    const status = await task(
      this.requester.sendMessage(
        BACKGROUND_PORT,
        new SetKeyStoreCoinTypeMsg(chainId, coinType)
      )
    );

    await task(this.save());

    this.multiKeyStoreInfo = await task(
      this.requester.sendMessage(BACKGROUND_PORT, new GetMultiKeyStoreInfoMsg())
    );

    this.status = status;
  }
}
