import { IntPretty } from "./int-pretty";
import { Int } from "./int";
import { Dec } from "./decimal";
import { Currency } from "@keplr/types";

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
    denomToPrefix: false,
  };

  constructor(
    protected _currency: Currency,
    protected amount: Int | Dec | IntPretty
  ) {
    if (amount instanceof IntPretty) {
      this.intPretty = amount;
    } else {
      this.intPretty = new IntPretty(amount);
    }

    this.intPretty = this.intPretty
      .maxDecimals(_currency.coinDecimals)
      .precision(_currency.coinDecimals);
  }

  get denom(): string {
    return this.currency.coinDenom;
  }

  get currency(): Currency {
    return this._currency;
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

  locale(locale: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.locale(locale);
    return pretty;
  }

  /**
   * Ready indicates the actual value is ready to show the users.
   * Even if the ready option is false, it expects that the value can be shown to users (probably as 0).
   * The method that returns prettied value may return `undefined` or `null` if the value is not ready.
   * But, alternatively, it can return the 0 value that can be shown the users anyway, but indicates that the value is not ready.
   * @param bool
   */
  ready(bool: boolean): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.ready(bool);
    return pretty;
  }

  get isReady(): boolean {
    return this.intPretty.isReady;
  }

  add(target: CoinPretty): CoinPretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.add(target.intPretty);
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
    const pretty = new CoinPretty(this._currency, this.amount);
    pretty.options = {
      ...this.options,
    };
    pretty.intPretty = this.intPretty.clone();
    return pretty;
  }
}
