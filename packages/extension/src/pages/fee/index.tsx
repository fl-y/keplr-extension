import React, { FunctionComponent, useEffect } from "react";

import { HeaderLayout } from "../../layouts";

import { FeeButtons, GasInput, MemoInput } from "../../components/form";
import { Button } from "reactstrap";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import style from "./style.module.scss";

import { FormattedMessage, useIntl } from "react-intl";
import { useHistory } from "react-router";
import {
  useFeeConfig,
  useGasConfig,
  useInteractionInfo,
  useMemoConfig,
} from "@keplr/hooks";
import { CoinPrimitive } from "@keplr/stores";
import { useAmountConfig } from "@keplr/hooks/build/tx/amount";

export const FeePage: FunctionComponent = observer(() => {
  const history = useHistory();

  const intl = useIntl();

  const {
    chainStore,
    txConfigStore,
    priceStore,
    queriesStore,
    accountStore,
  } = useStore();
  const gasConfig = useGasConfig(chainStore, chainStore.current.chainId);
  const memoConfig = useMemoConfig(chainStore, chainStore.current.chainId);
  const amountConfig = useAmountConfig(
    chainStore,
    chainStore.current.chainId,
    accountStore.getAccount(chainStore.current.chainId).bech32Address,
    queriesStore.get(chainStore.current.chainId).getQueryBalances()
  );
  const feeConfig = useFeeConfig(
    chainStore,
    chainStore.current.chainId,
    accountStore.getAccount(chainStore.current.chainId).bech32Address,
    queriesStore.get(chainStore.current.chainId).getQueryBalances(),
    amountConfig,
    gasConfig
  );

  const interactionInfo = useInteractionInfo(() => {
    txConfigStore.rejectAll();
  });

  useEffect(() => {
    const config = txConfigStore.waitingData;
    if (config) {
      chainStore.selectChain(config.chainId);
      gasConfig.setGas(parseFloat(config.gas));
      memoConfig.setMemo(config.memo);
    }
  }, [chainStore, gasConfig, memoConfig, txConfigStore.waitingData]);

  // Cyber chain (eular-6) doesn't require the fees to send tx.
  // So, don't need to show the fee input.
  // This is temporary hardcoding.
  const isCyberNetwork = /^(euler-)(\d)+/.test(chainStore.current.chainId);
  const txStateIsValid = true;

  return (
    <HeaderLayout
      showChainName
      canChangeChainInfo={false}
      onBackButton={
        interactionInfo.interactionInternal
          ? () => {
              history.goBack();
            }
          : undefined
      }
    >
      <form
        className={style.formContainer}
        onSubmit={async (e) => {
          e.preventDefault();
          if (txStateIsValid && txConfigStore.waitingData) {
            const stdFee = feeConfig.toStdFee();

            const config = {
              ...txConfigStore.waitingData,
              gas: stdFee.gas,
              fee: stdFee.amount
                .map((fee: CoinPrimitive) => `${fee.amount}${fee.denom}`)
                .join(","),
              memo: memoConfig.memo,
            };

            await txConfigStore.approve(config);

            if (
              interactionInfo.interaction &&
              !interactionInfo.interactionInternal
            ) {
              window.close();
            }
          }
        }}
      >
        <div className={style.formInnerContainer}>
          <div>
            <GasInput
              gasConfig={gasConfig}
              label={intl.formatMessage({ id: "fee.input.gas" })}
            />
            <MemoInput
              memoConfig={memoConfig}
              label={intl.formatMessage({ id: "fee.input.memo" })}
            />
            {isCyberNetwork ? null : (
              <FeeButtons
                feeConfig={feeConfig}
                priceStore={priceStore}
                label={intl.formatMessage({
                  id: "fee.input.fee",
                })}
                feeSelectLabels={{
                  low: intl.formatMessage({ id: "fee-buttons.select.low" }),
                  average: intl.formatMessage({
                    id: "fee-buttons.select.average",
                  }),
                  high: intl.formatMessage({ id: "fee-buttons.select.high" }),
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }} />
          <Button
            type="submit"
            color="primary"
            block
            disabled={
              txConfigStore.waitingData == null ||
              gasConfig.getError() != null ||
              memoConfig.getError() != null ||
              feeConfig.getError() != null
            }
            data-loading={txConfigStore.isLoading}
          >
            <FormattedMessage id="fee.button.set" />
          </Button>
        </div>
      </form>
    </HeaderLayout>
  );
});
