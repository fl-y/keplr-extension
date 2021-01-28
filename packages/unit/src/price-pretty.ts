import { IntPretty } from "./int-pretty";
import { Int } from "./int";
import { Dec } from "./decimal";
import { FiatCurrency } from "@keplr/types";

export class PricePretty {
  protected intPretty: IntPretty;

  protected options: {
    separator: string;
    upperCase: boolean;
    lowerCase: boolean;
  } = {
    separator: "",
    upperCase: false,
    lowerCase: false,
  };

  constructor(
    protected _fiatCurrency: FiatCurrency,
    protected amount: Int | Dec | IntPretty
  ) {
    if (amount instanceof IntPretty) {
      this.intPretty = amount;
    } else {
      this.intPretty = new IntPretty(amount);
    }

    this.intPretty = this.intPretty
      .maxDecimals(_fiatCurrency.maxDecimals)
      .shrink(true)
      .trim(true);
  }

  get symbol(): string {
    return this._fiatCurrency.symbol;
  }

  get fiatCurrency(): FiatCurrency {
    return this._fiatCurrency;
  }

  separator(str: string): PricePretty {
    const pretty = this.clone();
    pretty.options.separator = str;
    return pretty;
  }

  upperCase(bool: boolean): PricePretty {
    const pretty = this.clone();
    pretty.options.upperCase = bool;
    pretty.options.lowerCase = !bool;
    return pretty;
  }

  lowerCase(bool: boolean): PricePretty {
    const pretty = this.clone();
    pretty.options.lowerCase = bool;
    pretty.options.upperCase = !bool;
    return pretty;
  }

  precision(prec: number): PricePretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.precision(prec);
    return pretty;
  }

  maxDecimals(max: number): PricePretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.maxDecimals(max);
    return pretty;
  }

  trim(bool: boolean): PricePretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.trim(bool);
    return pretty;
  }

  shrink(bool: boolean): PricePretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.shrink(bool);
    return pretty;
  }

  locale(locale: boolean): PricePretty {
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
  ready(bool: boolean): PricePretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.ready(bool);
    return pretty;
  }

  get isReady(): boolean {
    return this.intPretty.isReady;
  }

  add(target: PricePretty): PricePretty {
    const pretty = this.clone();
    pretty.intPretty = pretty.intPretty.add(target.intPretty);
    return pretty;
  }

  toDec(): Dec {
    return this.intPretty.toDec();
  }

  toString(): string {
    let symbol = this.symbol;
    if (this.options.upperCase) {
      symbol = symbol.toUpperCase();
    }
    if (this.options.lowerCase) {
      symbol = symbol.toLowerCase();
    }

    return `${symbol}${this.options.separator}${this.intPretty.toString()}`;
  }

  clone(): PricePretty {
    const pretty = new PricePretty(this._fiatCurrency, this.amount);
    pretty.options = {
      ...this.options,
    };
    pretty.intPretty = this.intPretty.clone();
    return pretty;
  }
}
