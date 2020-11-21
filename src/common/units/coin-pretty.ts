import { IntPretty } from "./int-pretty";
import { Int } from "@chainapsis/cosmosjs/common/int";

export class CoinPretty {
  protected intPretty: IntPretty;

  protected options: {
    separator: string;
    upperCase: boolean;
    lowerCase: boolean;
  } = {
    separator: " ",
    upperCase: false,
    lowerCase: false
  };

  constructor(protected denom: string, protected amount: Int) {
    this.intPretty = new IntPretty(amount);
  }

  separator(str: string): CoinPretty {
    const pretty = this.clone();
    pretty.options.separator = str;
    return pretty;
  }

  upperCase(bool: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.options.upperCase = bool;
    pretty.options.lowerCase = !bool;
    return pretty;
  }

  lowerCase(bool: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.options.lowerCase = bool;
    pretty.options.upperCase = !bool;
    return pretty;
  }

  precision(prec: number): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.precision(prec);
    return pretty;
  }

  maxDecimals(max: number): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.maxDecimals(max);
    return pretty;
  }

  trim(bool: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.trim(bool);
    return pretty;
  }

  shrink(bool: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.shrink(bool);
    return pretty;
  }

  toString(): string {
    let denom = this.denom;
    if (this.options.upperCase) {
      denom = denom.toUpperCase();
    }
    if (this.options.lowerCase) {
      denom = denom.toLowerCase();
    }

    return `${this.intPretty.toString()}${this.options.separator}${denom}`;
  }

  clone(): CoinPretty {
    const pretty = new CoinPretty(this.denom, this.amount);
    pretty.options = {
      ...this.options
    };
    pretty.intPretty = this.intPretty.clone();
    return pretty;
  }
}
