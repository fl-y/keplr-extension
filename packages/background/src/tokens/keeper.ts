import { Env } from "@keplr/router";
import {
  ChainInfo,
  AppCurrency,
  CW20Currency,
  Secret20Currency
} from "@keplr/types";
import {
  CurrencySchema,
  CW20CurrencyShema,
  Secret20CurrencyShema
} from "../chains";
import { Bech32Address } from "@keplr/cosmos";
import { ChainsKeeper } from "../chains/keeper";
import { KeyRingKeeper } from "../keyring/keeper";
import { KVStore } from "@keplr/common";
import { KeyRingStatus } from "../keyring";
import { ChainUpdaterKeeper } from "../updater/keeper";
import { InteractionKeeper } from "../interaction/keeper";

const Buffer = require("buffer/").Buffer;

export class TokensKeeper {
  private chainsKeeper!: ChainsKeeper;
  private keyRingKeeper!: KeyRingKeeper;

  constructor(
    private readonly kvStore: KVStore,
    private readonly interactionKeeper: InteractionKeeper
  ) {}

  init(chainsKeeper: ChainsKeeper, keyRingKeeper: KeyRingKeeper) {
    this.chainsKeeper = chainsKeeper;
    this.keyRingKeeper = keyRingKeeper;
  }

  async suggestToken(env: Env, chainId: string, contractAddress: string) {
    const chainInfo = await this.chainsKeeper.getChainInfo(chainId);

    const find = chainInfo.currencies.find(
      currency =>
        "contractAddress" in currency &&
        currency.contractAddress === contractAddress
    );
    // If the same currency is already registered, do nothing.
    if (find) {
      return;
    }

    // Validate the contract address.
    Bech32Address.validate(
      contractAddress,
      chainInfo.bech32Config.bech32PrefixAccAddr
    );

    const params = {
      chainId,
      contractAddress
    };

    // TODO: Currently, this line just opens the adding token page to the user.
    //       and, just expects that the adding token page will add the token without knowing the result.
    //       Probably, this approach can be improved.
    this.interactionKeeper.waitApprove(
      env,
      "/setting/token/add",
      "suggest-token",
      params
    );
  }

  async addToken(chainId: string, currency: AppCurrency) {
    const chainInfo = await this.chainsKeeper.getChainInfo(chainId);

    currency = await TokensKeeper.validateCurrency(chainInfo, currency);

    const chainCurrencies = chainInfo.currencies;

    const isTokenForAccount =
      "type" in currency && currency.type === "secret20";
    let isCurrencyUpdated = false;

    for (const chainCurrency of chainCurrencies) {
      if (currency.coinMinimalDenom === chainCurrency.coinMinimalDenom) {
        if (!isTokenForAccount) {
          // If currency is already registered, do nothing.
          return;
        }

        isCurrencyUpdated = true;
      }
    }

    if (!isTokenForAccount) {
      const currencies = await this.getTokensFromChain(chainId);
      currencies.push(currency);
      await this.saveTokensToChain(chainId, currencies);
    } else {
      const currencies = await this.getTokensFromChainAndAccount(chainId);
      if (!isCurrencyUpdated) {
        currencies.push(currency);
        await this.saveTokensToChainAndAccount(chainId, currencies);
      } else {
        const index = currencies.findIndex(
          cur => cur.coinMinimalDenom === currency.coinMinimalDenom
        );
        if (index >= 0) {
          currencies[index] = currency;
          await this.saveTokensToChainAndAccount(chainId, currencies);
        }
      }
    }
  }

  public async getTokens(
    chainId: string,
    defaultCurrencies: AppCurrency[]
  ): Promise<AppCurrency[]> {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    let chainCurrencies =
      (await this.kvStore.get<AppCurrency[]>(version.identifier)) ?? [];

    if (chainCurrencies.length === 0) {
      // If the token hasn't been inited, just set the default currencies as
      await this.saveTokensToChain(chainId, defaultCurrencies);
      chainCurrencies = defaultCurrencies;
    }

    let keyCurrencies: AppCurrency[] = [];
    if (this.keyRingKeeper.keyRingStatus === KeyRingStatus.UNLOCKED) {
      const currentKey = await this.keyRingKeeper.getKey(chainId);

      keyCurrencies =
        (await this.kvStore.get<AppCurrency[]>(
          `${version.identifier}-${Buffer.from(currentKey.address).toString(
            "hex"
          )}`
        )) ?? [];
    }

    return chainCurrencies.concat(keyCurrencies);
  }

  public async clearTokens(chainId: string): Promise<void> {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    await this.kvStore.set(version.identifier, null);

    const reverse = await this.getTokensToAccountReverse(chainId);
    for (const hexAddress of reverse) {
      await this.kvStore.set(`${version.identifier}-${hexAddress}`, null);
    }
    await this.setTokensToAccountReverse(chainId, []);
  }

  private async getTokensFromChain(chainId: string): Promise<AppCurrency[]> {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    return (await this.kvStore.get<AppCurrency[]>(version.identifier)) ?? [];
  }

  private async saveTokensToChain(chainId: string, currencies: AppCurrency[]) {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    await this.kvStore.set(version.identifier, currencies);
  }

  private async getTokensFromChainAndAccount(
    chainId: string
  ): Promise<AppCurrency[]> {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    const currentKey = await this.keyRingKeeper.getKey(chainId);
    return (
      (await this.kvStore.get<Promise<AppCurrency[]>>(
        `${version.identifier}-${Buffer.from(currentKey.address).toString(
          "hex"
        )}`
      )) ?? []
    );
  }

  private async saveTokensToChainAndAccount(
    chainId: string,
    currencies: AppCurrency[]
  ) {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    const currentKey = await this.keyRingKeeper.getKey(chainId);
    const hexAddress = Buffer.from(currentKey.address).toString("hex");
    await this.kvStore.set(`${version.identifier}-${hexAddress}`, currencies);

    await this.insertTokensToAccountReverse(chainId, hexAddress);
  }

  private async getTokensToAccountReverse(chainId: string): Promise<string[]> {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    return (await this.kvStore.get(`${version.identifier}-addresses`)) ?? [];
  }

  private async setTokensToAccountReverse(
    chainId: string,
    addresses: string[]
  ) {
    const version = ChainUpdaterKeeper.getChainVersion(chainId);

    await this.kvStore.set(`${version.identifier}-addresses`, addresses);
  }

  private async insertTokensToAccountReverse(chainId: string, address: string) {
    const reverse = await this.getTokensToAccountReverse(chainId);
    if (reverse.indexOf(address) < 0) {
      reverse.push(address);
      await this.setTokensToAccountReverse(chainId, reverse);
    }
  }

  async getSecret20ViewingKey(
    chainId: string,
    contractAddress: string
  ): Promise<string> {
    const chainInfo = await this.chainsKeeper.getChainInfo(chainId);

    for (const currency of chainInfo.currencies) {
      if ("type" in currency && currency.type === "secret20") {
        if (currency.contractAddress === contractAddress) {
          return currency.viewingKey;
        }
      }
    }

    throw new Error("There is no matched secret20");
  }

  async checkAccessOrigin(env: Env, chainId: string, origin: string) {
    await this.chainsKeeper.checkAccessOrigin(env, chainId, origin);
  }

  static async validateCurrency(
    chainInfo: ChainInfo,
    currency: AppCurrency
  ): Promise<AppCurrency> {
    // Validate the schema.
    if ("type" in currency) {
      switch (currency.type) {
        case "cw20":
          currency = await TokensKeeper.validateCW20Currency(
            chainInfo,
            currency
          );
          break;
        case "secret20":
          currency = await TokensKeeper.validateSecret20Currency(
            chainInfo,
            currency
          );
          break;
        default:
          throw new Error("Unknown type of currency");
      }
    } else {
      currency = await CurrencySchema.validateAsync(currency);
    }

    return currency;
  }

  static async validateCW20Currency(
    chainInfo: ChainInfo,
    currency: CW20Currency
  ): Promise<CW20Currency> {
    // Validate the schema.
    currency = await CW20CurrencyShema.validateAsync(currency);

    // Validate the contract address.
    Bech32Address.validate(
      currency.contractAddress,
      chainInfo.bech32Config.bech32PrefixAccAddr
    );

    return currency;
  }

  static async validateSecret20Currency(
    chainInfo: ChainInfo,
    currency: Secret20Currency
  ): Promise<Secret20Currency> {
    // Validate the schema.
    currency = await Secret20CurrencyShema.validateAsync(currency);

    // Validate the contract address.
    Bech32Address.validate(
      currency.contractAddress,
      chainInfo.bech32Config.bech32PrefixAccAddr
    );

    return currency;
  }
}
