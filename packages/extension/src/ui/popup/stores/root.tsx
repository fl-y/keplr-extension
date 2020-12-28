import { ChainStore } from "./chain";
import { KeyRingStatus, KeyRingStore } from "./keyring";
import { AccountStore } from "./account";
import { ChainInfo } from "../../../background/chains";
import { PriceStore } from "./price";
import { EmbedChainInfos } from "../../../config";
import { QueriesStore } from "../../stores/query/queries";
import { BrowserKVStore } from "../../../common/kvstore";
import { AccountStore as AccountStoreV2 } from "../../stores/account";
import { CoinGeckoPriceStore } from "../../stores/price";
import { InteractionStore } from "./interaction";
import { InExtensionMessageRequester } from "../../../common/message/send/extension";

export class RootStore {
  public chainStore: ChainStore;
  public keyRingStore: KeyRingStore;
  public accountStore: AccountStore;
  public priceStore: PriceStore;

  public queriesStore: QueriesStore;
  public accountStoreV2: AccountStoreV2;
  public priceStoreV2: CoinGeckoPriceStore;
  public interactionStore: InteractionStore;

  constructor() {
    // Order is important.
    this.accountStore = new AccountStore(this);
    this.keyRingStore = new KeyRingStore(this);
    this.priceStore = new PriceStore();

    this.chainStore = new ChainStore(this, EmbedChainInfos);

    this.queriesStore = new QueriesStore(
      new BrowserKVStore("queries"),
      this.chainStore
    );

    this.accountStoreV2 = new AccountStoreV2(this.chainStore);

    this.priceStoreV2 = new CoinGeckoPriceStore(new BrowserKVStore("prices"), {
      usd: {
        symbol: "$"
      },
      krw: {
        symbol: "₩"
      }
    });

    this.interactionStore = new InteractionStore(
      new InExtensionMessageRequester()
    );

    this.chainStore.init();
    this.keyRingStore.restore();
  }

  public setChainInfo(info: ChainInfo) {
    this.accountStore.setChainInfo(info);
    this.keyRingStore.setChainInfo(info);
    this.priceStore.setChainInfo(info);
  }

  public setKeyRingStatus(status: KeyRingStatus) {
    this.accountStore.setKeyRingStatus(status);
  }

  public async refreshChainList(): Promise<void> {
    await this.chainStore.refreshChainList();
  }

  public changeKeyRing() {
    this.accountStore.changeKeyRing();
  }
}

export function createRootStore() {
  return new RootStore();
}
