import { ChainStore } from "./chain";
import { EmbedChainInfos } from "../config";
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
  TokensStore,
  ChainSuggestStore,
} from "@keplr/stores";
import { BrowserKVStore } from "@keplr/common";
import {
  Router,
  ExtensionEnv,
  InExtensionMessageRequester,
  APP_PORT,
} from "@keplr/router";
import { ChainInfoWithEmbed } from "@keplr/background";

export class RootStore {
  public readonly chainStore: ChainStore;
  public readonly keyRingStore: KeyRingStore;

  protected readonly interactionStore: InteractionStore;
  public readonly permissionStore: PermissionStore;
  public readonly txConfigStore: TxConfigStore;
  public readonly signInteractionStore: SignInteractionStore;
  public readonly ledgerInitStore: LedgerInitStore;
  public readonly chainSuggestStore: ChainSuggestStore;

  public readonly queriesStore: QueriesStore;
  public readonly accountStore: AccountStore;
  public readonly priceStore: CoinGeckoPriceStore;
  public readonly tokensStore: TokensStore<ChainInfoWithEmbed>;

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
    this.chainSuggestStore = new ChainSuggestStore(this.interactionStore);

    this.queriesStore = new QueriesStore(
      new BrowserKVStore("store_queries"),
      this.chainStore
    );

    this.accountStore = new AccountStore(this.chainStore, this.queriesStore, {
      defaultOpts: {
        prefetching: true,
      },
      chainOpts: this.chainStore.chainInfos.map((chainInfo) => {
        return { chainId: chainInfo.chainId };
      }),
    });

    this.priceStore = new CoinGeckoPriceStore(
      new BrowserKVStore("store_prices"),
      {
        usd: {
          currency: "usd",
          symbol: "$",
          maxDecimals: 2,
        },
        krw: {
          currency: "krw",
          symbol: "₩",
          maxDecimals: 0,
        },
      }
    );

    this.tokensStore = new TokensStore(
      this.chainStore,
      new InExtensionMessageRequester()
    );

    router.listen(APP_PORT);
  }
}

export function createRootStore() {
  return new RootStore();
}
