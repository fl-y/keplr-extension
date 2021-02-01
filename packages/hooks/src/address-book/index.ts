import { observable, runInAction, toJS } from "mobx";
import { KVStore } from "@keplr/common";
import { actionAsync, task } from "mobx-utils";
import { ChainInfo } from "@keplr/types";
import { ChainGetter, HasMapStore } from "@keplr/stores";
import { DeepReadonly } from "utility-types";
import { useState } from "react";

export interface AddressBookSelectHandler {
  setRecipient(recipient: string): void;
  setMemo(memo: string): void;
}

export interface AddressBookData {
  name: string;
  address: string;
  memo: string;
}

export class AddressBookConfig {
  @observable
  protected _addressBookDatas!: AddressBookData[];

  protected _selectHandler?: AddressBookSelectHandler;

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainGetter: ChainGetter,
    protected readonly chainId: string
  ) {
    runInAction(() => {
      this._addressBookDatas = [];
    });

    this.loadAddressBookDatas();
  }

  get addressBookDatas(): DeepReadonly<AddressBookData[]> {
    return this._addressBookDatas;
  }

  setSelectHandler(handler: AddressBookSelectHandler) {
    this._selectHandler = handler;
  }

  selectAddressAt(index: number) {
    const data = this.addressBookDatas[index];

    if (this._selectHandler) {
      this._selectHandler.setRecipient(data.address);
      this._selectHandler.setMemo(data.memo);
    }
  }

  @actionAsync
  async addAddressBook(data: AddressBookData) {
    await task(this.loadAddressBookDatas());

    this._addressBookDatas.push(data);

    await task(this.saveAddressBookDatas());
  }

  @actionAsync
  async removeAddressBook(index: number) {
    await task(this.loadAddressBookDatas());

    this._addressBookDatas.splice(index, 1);

    await task(this.saveAddressBookDatas());
  }

  @actionAsync
  async editAddressBookAt(index: number, data: AddressBookData) {
    await task(this.loadAddressBookDatas());

    this._addressBookDatas[index] = data;

    await task(this.saveAddressBookDatas());
  }

  async saveAddressBookDatas() {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    await this.kvStore.set(
      AddressBookConfig.keyForChainInfo(chainInfo),
      toJS(this._addressBookDatas)
    );
  }

  @actionAsync
  async loadAddressBookDatas() {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const datas = await task(
      this.kvStore.get<AddressBookData[]>(
        AddressBookConfig.keyForChainInfo(chainInfo)
      )
    );
    if (!datas) {
      this._addressBookDatas = [];
    } else {
      this._addressBookDatas = datas;
    }
  }

  static keyForChainInfo(chainInfo: ChainInfo): string {
    return `${chainInfo.chainName}`;
  }
}

export class AddressBookConfigMap extends HasMapStore<AddressBookConfig> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainGetter: ChainGetter
  ) {
    super((chainId: string) => {
      return new AddressBookConfig(kvStore, chainGetter, chainId);
    });
  }

  getAddressBookConfig(chainId: string) {
    return this.get(chainId);
  }
}

export const useAddressBookConfig = (
  kvStore: KVStore,
  chainGetter: ChainGetter,
  chainId: string,
  handler: AddressBookSelectHandler
) => {
  const [configMap] = useState(new AddressBookConfigMap(kvStore, chainGetter));

  const config = configMap.getAddressBookConfig(chainId);
  config.setSelectHandler(handler);

  return config;
};
