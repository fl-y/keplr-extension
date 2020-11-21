import { Int } from "@chainapsis/cosmosjs/common/int";
import { Dec } from "@chainapsis/cosmosjs/common/decimal";
import { DecUtils } from "../dec-utils";
import { CoinUtils } from "../coin-utils";

export class IntPretty {
  protected int: Int;

  protected options: {
    precision: number;
    maxDecimals: number;
    trim: boolean;
    shrink: boolean;
  } = {
    precision: 0,
    maxDecimals: 0,
    trim: false,
    shrink: false
  };

  constructor(int: Int) {
    this.int = int;
  }

  precision(prec: number): IntPretty {
    const pretty = this.clone();
    pretty.options.precision = prec;
    return pretty;
  }

  maxDecimals(max: number): IntPretty {
    const pretty = this.clone();
    pretty.options.maxDecimals = max;
    return pretty;
  }

  trim(bool: boolean): IntPretty {
    const pretty = this.clone();
    pretty.options.trim = bool;
    return pretty;
  }

  shrink(bool: boolean): IntPretty {
    const pretty = this.clone();
    pretty.options.shrink = bool;
    return pretty;
  }

  toString(): string {
    let dec = new Dec(this.int);
    if (this.options.precision) {
      dec = dec.quo(DecUtils.getPrecisionDec(this.options.precision));
    }

    let result = "";
    if (!this.options.shrink) {
      result = dec.toString(this.options.maxDecimals);
    } else {
      result = CoinUtils.shrinkDecimals(
        this.int,
        this.options.precision,
        0,
        this.options.maxDecimals
      );
    }
    if (this.options.trim) {
      result = DecUtils.trim(result);
    }
    return result;
  }

  clone(): IntPretty {
    const pretty = new IntPretty(this.int);
    pretty.options = {
      ...this.options
    };
    return pretty;
  }
}
