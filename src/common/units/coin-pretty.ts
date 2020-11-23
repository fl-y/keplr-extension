import { IntPretty } from "./int-pretty";
import { Int } from "@chainapsis/cosmosjs/common/int";
import { Dec } from "@chainapsis/cosmosjs/common/decimal";
import { DecUtils } from "../dec-utils";

export class CoinPretty {
  protected intPretty: IntPretty;

  protected options: {
    separator: string;
    upperCase: boolean;
    lowerCase: boolean;
    denomToPrefix: boolean;
  } = {
    separator: " ",
    upperCase: false,
    lowerCase: false,
    denomToPrefix: false
  };

  constructor(protected denom: string, protected amount: Int | Dec) {
    if (amount instanceof Dec) {
      let dec = amount;
      let precision = 0;
      for (let i = 0; i < 18; i++) {
        dec = dec.mul(new Dec(10));
        if (dec.equals(dec.mulTruncate(new Dec(1)))) {
          break;
        }
        precision++;
      }

      const int = amount.mulTruncate(DecUtils.getPrecisionDec(precision));
      this.intPretty = new IntPretty(int.truncate());
      this.intPretty.precision(precision);
    } else {
      this.intPretty = new IntPretty(amount);
    }
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

  denomToPrefix(bool: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.options.denomToPrefix = bool;
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

  toDec(): Dec {
    return this.intPretty.toDec();
  }

  toString(): string {
    let denom = this.denom;
    if (this.options.upperCase) {
      denom = denom.toUpperCase();
    }
    if (this.options.lowerCase) {
      denom = denom.toLowerCase();
    }

    if (this.options.denomToPrefix) {
      return `${denom}${this.options.separator}${this.intPretty.toString()}`;
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
