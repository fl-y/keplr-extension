import React, { FunctionComponent, useEffect } from "react";

import { HeaderLayout } from "../../layouts";

import { FeeButtons, GasInput, MemoInput } from "../../../../components/form";
import { Button } from "reactstrap";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import style from "./style.module.scss";

import { FormattedMessage, useIntl } from "react-intl";
import { useHistory } from "react-router";
import { useInteractionInfo, useTxConfig } from "@keplr/hooks";
import { CoinPrimitive } from "@keplr/stores";

export const FeePage: FunctionComponent = observer(() => {
  const history = useHistory();

  const intl = useIntl();

  const { chainStore, txConfigStore } = useStore();
  const txConfig = useTxConfig(chainStore);
  txConfig.setChain(chainStore.current.chainId);

  const interactionInfo = useInteractionInfo(() => {
    txConfigStore.rejectAll();
  });

  useEffect(() => {
    const config = txConfigStore.waitingData;
    if (config) {
      chainStore.selectChain(config.chainId);
      txConfig.setGas(parseFloat(config.gas));
      txConfig.setMemo(config.memo);
    }
  }, [chainStore, txConfig, txConfigStore.waitingData]);

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
          const config = txConfigStore.waitingData;
          if (txStateIsValid && config) {
            const stdFee = txConfig.toStdFee();

            config.gas = stdFee.gas;
            config.fee = stdFee.amount
              .map((fee: CoinPrimitive) => `${fee.amount}${fee.denom}`)
              .join(",");
            config.memo = txConfig.memo;

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
              txConfig={txConfig}
              label={intl.formatMessage({ id: "fee.input.gas" })}
            />
            <MemoInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "fee.input.memo" })}
            />
            {isCyberNetwork ? null : (
              <FeeButtons
                txConfig={txConfig}
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
              !txConfig.isValid("fee", "gas", "memo")
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
