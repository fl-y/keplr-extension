import { ChainGetter } from "@keplr/stores";
import { ObservableQueryBalances } from "@keplr/stores/build/query/balances";
import { useFeeConfig, useMemoConfig, useRecipientConfig } from "./index";
import { useSendGasConfig } from "./send-gas";
import { useAmountConfig } from "./amount";

export const useSendTxConfig = (
  chainGetter: ChainGetter,
  chainId: string,
  sender: string,
  queryBalances: ObservableQueryBalances
) => {
  const amountConfig = useAmountConfig(
    chainGetter,
    chainId,
    sender,
    queryBalances
  );

  const memoConfig = useMemoConfig(chainGetter, chainId);
  const gasConfig = useSendGasConfig(chainGetter, chainId, amountConfig);
  const feeConfig = useFeeConfig(
    chainGetter,
    chainId,
    sender,
    queryBalances,
    amountConfig,
    gasConfig
  );
  const recipientConfig = useRecipientConfig(chainGetter, chainId);

  return {
    amountConfig,
    memoConfig,
    gasConfig,
    feeConfig,
    recipientConfig,
  };
};
