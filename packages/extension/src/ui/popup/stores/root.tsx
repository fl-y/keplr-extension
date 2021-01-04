import { ChainStore } from "./chain";
import { KeyRingStatus } from "./keyring";
import { AccountStore } from "./account";
import { ChainInfo } from "@keplr/types";
import { PriceStore } from "./price";
import { EmbedChainInfos } from "../../../config";
import {
  KeyRingStore,
  InteractionStore,
  QueriesStore,
  CoinGeckoPriceStore,
  AccountStore as AccountStoreV2,
  PermissionStore,
  TxConfigStore
} from "@keplr/stores";
import { BrowserKVStore } from "../../../common/kvstore";
import {
  Router,
  ExtensionEnv,
  InExtensionMessageRequester,
  APP_PORT
} from "@keplr/router";

export class RootStore {
  public chainStore: ChainStore;
  public keyRingStore: KeyRingStore;
  public accountStore: AccountStore;
  public priceStore: PriceStore;

  protected interactionStore: InteractionStore;
  public permissionStore: PermissionStore;
  public txConfigStore: TxConfigStore;
  public queriesStore: QueriesStore;
  public accountStoreV2: AccountStoreV2;
  public priceStoreV2: CoinGeckoPriceStore;

  constructor() {
    const router = new Router(ExtensionEnv.produceEnv);

    // Order is important.
    this.accountStore = new AccountStore(this);
    this.interactionStore = new InteractionStore(
      router,
      new InExtensionMessageRequester()
    );
    this.keyRingStore = new KeyRingStore(
      new InExtensionMessageRequester(),
      this.interactionStore
    );
    this.priceStore = new PriceStore();

    this.chainStore = new ChainStore(this, EmbedChainInfos);

    this.permissionStore = new PermissionStore(this.interactionStore);
    this.txConfigStore = new TxConfigStore(this.interactionStore);
    this.queriesStore = new QueriesStore(
      new BrowserKVStore("queries"),
      this.chainStore
    );

    this.accountStoreV2 = new AccountStoreV2(
      new BrowserKVStore("account"),
      this.chainStore,
      this.queriesStore
    );

    this.priceStoreV2 = new CoinGeckoPriceStore(new BrowserKVStore("prices"), {
      usd: {
        symbol: "$"
      },
      krw: {
        symbol: "₩"
      }
    });

    router.listen(APP_PORT);

    this.chainStore.init();
    this.keyRingStore.restore();
  }

  public setChainInfo(info: ChainInfo) {
    this.accountStore.setChainInfo(info);
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
