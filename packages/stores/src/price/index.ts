import { ObservableQuery } from "../common";
import { CoinGeckoSimplePrice } from "./types";
import Axios from "axios";
import { KVStore } from "@keplr/common";
import { Dec, CoinPretty, Int } from "@keplr/unit";

export class CoinGeckoPriceStore extends ObservableQuery<CoinGeckoSimplePrice> {
  protected coinIds: string[];
  protected vsCurrencies: string[];

  protected supportedVsCurrencies: {
    [vsCurrency: string]: {
      symbol: string;
    };
  };

  constructor(
    kvStore: KVStore,
    supportedVsCurrencies: {
      [vsCurrency: string]: {
        symbol: string;
      };
    }
  ) {
    const instance = Axios.create({
      baseURL: "https://api.coingecko.com/api/v3"
    });

    super(kvStore, instance, "/simple/price");

    this.coinIds = [];
    this.vsCurrencies = [];

    this.supportedVsCurrencies = supportedVsCurrencies;
  }

  protected canFetch(): boolean {
    return this.coinIds.length > 0 && this.vsCurrencies.length > 0;
  }

  protected refetch() {
    const url = `/simple/price?ids=${this.coinIds.join(
      ","
    )}&vs_currencies=${this.vsCurrencies.join(",")}`;

    this.setUrl(url);
  }

  getPrice(coinId: string, vsCurrency: string): number | undefined {
    if (!this.supportedVsCurrencies[vsCurrency]) {
      return undefined;
    }

    if (
      !this.coinIds.includes(coinId) ||
      !this.vsCurrencies.includes(vsCurrency)
    ) {
      if (!this.coinIds.includes(coinId)) {
        this.coinIds.push(coinId);
      }

      if (!this.vsCurrencies.includes(vsCurrency)) {
        this.vsCurrencies.push(vsCurrency);
      }

      this.refetch();
    }

    if (!this.response) {
      return undefined;
    }

    const coinPrices = this.response.data[coinId];
    if (!coinPrices) {
      return undefined;
    }
    return coinPrices[vsCurrency];
  }

  calculatePrice(
    coinId: string,
    vsCurrrency: string,
    dec: Dec | { toDec(): Dec }
  ): CoinPretty {
    const vsCurrencyInfo = this.supportedVsCurrencies[vsCurrrency];
    if (!vsCurrencyInfo) {
      return new CoinPretty("?", new Int(0))
        .ready(false)
        .denomToPrefix(true)
        .separator("");
    }

    const price = this.getPrice(coinId, vsCurrrency);
    if (price === undefined) {
      return new CoinPretty(vsCurrencyInfo.symbol, new Int(0))
        .ready(false)
        .denomToPrefix(true)
        .separator("");
    }

    if (!(dec instanceof Dec)) {
      dec = dec.toDec();
    }

    const priceDec = new Dec(price.toString());

    return new CoinPretty(vsCurrencyInfo.symbol, dec.mul(priceDec))
      .denomToPrefix(true)
      .separator("");
  }
}
