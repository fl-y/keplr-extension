export interface TxBuilderConfigPrimitive {
  readonly accountNumber?: string; // bigInteger.BigNumber;
  readonly sequence?: string; // bigInteger.BigNumber;
  readonly gas: string; // bigInteger.BigNumber;
  readonly gasAdjustment?: number;
  readonly memo: string;
  readonly fee: string; // Coin[] | Coin;
  readonly gasPrice?: number;
}

export interface TxBuilderConfigPrimitiveWithChainId
  extends TxBuilderConfigPrimitive {
  readonly chainId: string;
}
