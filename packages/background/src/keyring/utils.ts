import { TxBuilderConfigPrimitive } from "./types";
import { Coin } from "@keplr/unit";
import bigInteger from "big-integer";

// TODO: Remove this inteface, and use the more cosmjs friendly type.
export interface TxBuilderConfig {
  /**
   * @param accountNumber - uint64, If this is undefined or negative, tx builder should calculate that automatically or throw error.
   * If there are several signers, this should be undefined or negative.
   */
  accountNumber?: bigInteger.BigNumber;
  /**
   * @param sequence - uint64, If this is undefined or negative, tx builder should calculate that automatically or throw error.
   * If there are several signers, this should be undefined or negative.
   */
  sequence?: bigInteger.BigNumber;
  /**
   * @param gas - uint64, How much gas will it consume.<br/>
   * TODO: If this parameter is negative, this means that gas will be set automatically with simulated value.
   */
  gas: bigInteger.BigNumber;
  /**
   * @param gasAdjustment - TODO: If gas parameter is negative(auto), simulated gas will be multiplied with this.
   */
  gasAdjustment?: number;
  memo: string;
  fee: Coin[] | Coin;
  gasPrice?: number;
}

export function feeToString(fee: Coin | Coin[]) {
  let feeStr = "";
  if (!Array.isArray(fee)) {
    feeStr = fee.toString();
  } else {
    const coinStrs: string[] = [];
    for (const coin of fee) {
      coinStrs.push(coin.toString());
    }
    feeStr = coinStrs.join(",");
  }
  return feeStr;
}

export function feeFromString(feeStr: string): Coin | Coin[] {
  if (feeStr === "") {
    return [];
  }

  let fee: Coin[] | Coin = [];
  const coinStrs = feeStr.split(",");
  if (coinStrs.length === 1) {
    fee = Coin.parse(coinStrs[0]);
  }
  if (Array.isArray(fee)) {
    for (const coinStr of coinStrs) {
      fee.push(Coin.parse(coinStr));
    }
  }
  return fee;
}

export function txBuilderConfigToPrimitive(
  config: TxBuilderConfig
): TxBuilderConfigPrimitive {
  return {
    accountNumber: config.accountNumber?.toString(),
    sequence: config.sequence?.toString(),
    gas: config.gas?.toString(),
    gasAdjustment: config.gasAdjustment,
    memo: config.memo,
    fee: feeToString(config.fee),
    gasPrice: config.gasPrice
  };
}

export function txBuilderConfigFromPrimitive(
  primitive: TxBuilderConfigPrimitive
): TxBuilderConfig {
  let accountNumber: bigInteger.BigNumber | undefined;
  if (primitive.accountNumber) {
    accountNumber = bigInteger(primitive.accountNumber);
  }

  let sequence: bigInteger.BigNumber | undefined;
  if (primitive.sequence) {
    sequence = bigInteger(primitive.sequence);
  }

  const gas: bigInteger.BigNumber = bigInteger(primitive.gas);

  return {
    accountNumber,
    sequence,
    gas,
    gasAdjustment: primitive.gasAdjustment,
    memo: primitive.memo,
    fee: feeFromString(primitive.fee),
    gasPrice: primitive.gasPrice
  };
}
