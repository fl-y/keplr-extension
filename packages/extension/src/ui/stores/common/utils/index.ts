import { Currency } from "../../../../common/currency";
import { CoinPrimitive } from "../types";
import { CoinPretty } from "../../../../common/units";
import { Int } from "@chainapsis/cosmosjs/common/int";

export class StoreUtils {
  public static getBalancesFromCurrencies(
    currenciesMap: {
      [denom: string]: Currency;
    },
    bals: CoinPrimitive[]
  ) {
    // TODO: Handle the contract token.
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
      }
    }

    return result;
  }
}
