import { ChainStore } from "./chain";
import { EmbedChainInfos } from "../../../config";
import {
  KeyRingStore,
  InteractionStore,
  QueriesStore,
  CoinGeckoPriceStore,
  AccountStore,
  PermissionStore,
  TxConfigStore,
  SignInteractionStore,
  LedgerInitStore,
} from "@keplr/stores";
import { BrowserKVStore } from "@keplr/common";
import {
  Router,
  ExtensionEnv,
  InExtensionMessageRequester,
  APP_PORT,
} from "@keplr/router";

export class RootStore {
  public readonly chainStore: ChainStore;
  public readonly keyRingStore: KeyRingStore;

  protected readonly interactionStore: InteractionStore;
  public readonly permissionStore: PermissionStore;
  public readonly txConfigStore: TxConfigStore;
  public readonly signInteractionStore: SignInteractionStore;
  public readonly ledgerInitStore: LedgerInitStore;

  public readonly queriesStore: QueriesStore;
  public readonly accountStore: AccountStore;
  public readonly priceStore: CoinGeckoPriceStore;

  constructor() {
    const router = new Router(ExtensionEnv.produceEnv);

    // Order is important.
    this.interactionStore = new InteractionStore(
      router,
      new InExtensionMessageRequester()
    );

    this.chainStore = new ChainStore(
      EmbedChainInfos,
      new InExtensionMessageRequester()
    );

    this.keyRingStore = new KeyRingStore(
      this.chainStore,
      new InExtensionMessageRequester(),
      this.interactionStore
    );

    this.permissionStore = new PermissionStore(
      this.interactionStore,
      new InExtensionMessageRequester()
    );
    this.txConfigStore = new TxConfigStore(this.interactionStore);
    this.signInteractionStore = new SignInteractionStore(this.interactionStore);
    this.ledgerInitStore = new LedgerInitStore(
      this.interactionStore,
      new InExtensionMessageRequester()
    );

    this.queriesStore = new QueriesStore(
      new BrowserKVStore("store_queries"),
      this.chainStore
    );

    this.accountStore = new AccountStore(
      new BrowserKVStore("store_account"),
      this.chainStore,
      this.queriesStore
    );

    this.priceStore = new CoinGeckoPriceStore(
      new BrowserKVStore("store_prices"),
      {
        usd: {
          symbol: "$",
        },
        krw: {
          symbol: "₩",
        },
      }
    );

    router.listen(APP_PORT);
  }
}

export function createRootStore() {
  return new RootStore();
}
