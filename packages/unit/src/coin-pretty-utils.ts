import { CoinPretty } from "./coin-pretty";

export class CoinPrettyUtils {
  static amountOf(arr: CoinPretty[], denom: string): CoinPretty | undefined {
    return arr.find((coinPretty) => coinPretty.denom === denom);
  }

  static greater(arr1: CoinPretty[], arr2: CoinPretty[]): boolean {
    if (arr1.length === 0) {
      return false;
    }

    if (arr2.length === 0) {
      return true;
    }

    for (const coinPretty of arr2) {
      const target = CoinPrettyUtils.amountOf(arr1, coinPretty.denom);
      if (!target) {
        return false;
      }

      if (!target.toDec().gt(coinPretty.toDec())) {
        return false;
      }
    }

    return true;
  }
}
