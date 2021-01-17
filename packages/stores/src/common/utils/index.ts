import { Currency } from "@keplr/types";
import { CoinPrimitive } from "../types";
import { CoinPretty, Int } from "@keplr/unit";

export class StoreUtils {
  public static getBalancesFromCurrencies(
    currenciesMap: {
      [denom: string]: Currency;
    },
    bals: CoinPrimitive[],
    inferUnknownCurrency: boolean = true
  ): CoinPretty[] {
    const result: CoinPretty[] = [];
    for (const bal of bals) {
      const currency = currenciesMap[bal.denom];
      if (currency) {
        let amount = bal.amount;
        // Some querying result have the dec amount. But, it is usually negligible.
        if (amount.includes(".")) {
          amount = amount.slice(0, amount.indexOf("."));
        }

        result.push(
          new CoinPretty(currency.coinDenom, new Int(amount))
            .precision(currency.coinDecimals)
            .maxDecimals(currency.coinDecimals)
        );
      } else if (inferUnknownCurrency) {
        let amount = bal.amount;
        // Some querying result have the dec amount. But, it is usually negligible.
        if (amount.includes(".")) {
          amount = amount.slice(0, amount.indexOf("."));
        }

        // TODO: Infer the currency?
        result.push(new CoinPretty(bal.denom, new Int(amount)));
      }
    }

    return result;
  }

  public static getBalanceFromCurrency(
    currency: Currency,
    bals: CoinPrimitive[]
  ): CoinPretty {
    const result = StoreUtils.getBalancesFromCurrencies(
      {
        [currency.coinMinimalDenom]: currency,
      },
      bals,
      false
    );

    if (result.length === 1) {
      return result[0];
    }

    return new CoinPretty(currency.coinDenom, new Int(0))
      .precision(currency.coinDecimals)
      .maxDecimals(currency.coinDecimals);
  }
}
