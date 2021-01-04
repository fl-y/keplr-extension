import React, { FunctionComponent, useEffect, useMemo } from "react";

import { HeaderLayout } from "../../layouts/header-layout";

import { FeeButtons, GasInput, MemoInput } from "../../../components/form";
import { Button } from "reactstrap";

import bigInteger from "big-integer";
import { observer } from "mobx-react";
import { useStore } from "../../stores";

import style from "./style.module.scss";

import { FormattedMessage, useIntl } from "react-intl";
import { useTxState, withTxStateProvider } from "../../../contexts/tx";
import { Int } from "@chainapsis/cosmosjs/common/int";
import { useHistory } from "react-router";
import { useInteractionInfo } from "../../../hooks/use-interaction-info";

export const FeePage: FunctionComponent = withTxStateProvider(
  observer(() => {
    const history = useHistory();

    const interactionInfo = useInteractionInfo();

    const intl = useIntl();

    const { chainStore, txConfigStore } = useStore();
    const txState = useTxState();

    const memorizedFeeCurrencies = useMemo(
      () => chainStore.chainInfo.feeCurrencies,
      [chainStore.chainInfo.feeCurrencies]
    );

    useEffect(() => {
      txState.setFeeCurrencies(memorizedFeeCurrencies);
    }, [memorizedFeeCurrencies, txState]);

    useEffect(() => {
      const config = txConfigStore.waitingData;
      if (config) {
        chainStore.setChain(config.chainId);
        txState.setGas(parseInt(new Int(config.gas).toString()));

        // Always returns the fee by fee buttons.
        /*if (config.fee instanceof Coin) {
            txState.setFees([config.fee])
          }*/
        // TODO: handle multiple fees.

        txState.setMemo(config.memo);
      }
    }, [chainStore, txConfigStore.waitingData, txState]);

    // Cyber chain (eular-6) doesn't require the fees to send tx.
    // So, don't need to show the fee input.
    // This is temporary hardcoding.
    const isCyberNetwork = /^(euler-)(\d)+/.test(chainStore.chainInfo.chainId);
    const txStateIsValid = isCyberNetwork
      ? txState.isValid("gas", "memo")
      : txState.isValid("gas", "memo", "fees");

    return (
      <HeaderLayout
        showChainName
        canChangeChainInfo={false}
        onBackButton={
          !interactionInfo.interactionInternal
            ? () => {
                history.goBack();
              }
            : undefined
        }
      >
        <form
          className={style.formContainer}
          onSubmit={async e => {
            e.preventDefault();
            const config = txConfigStore.waitingData;
            if (txStateIsValid && config) {
              config.gas = bigInteger(txState.gas).toString();
              config.fee = txState.fees.join(",");
              config.memo = txState.memo;

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
              <GasInput label={intl.formatMessage({ id: "fee.input.gas" })} />
              <MemoInput label={intl.formatMessage({ id: "fee.input.memo" })} />
              {isCyberNetwork ? null : (
                <FeeButtons
                  label={intl.formatMessage({
                    id: "fee.input.fee"
                  })}
                  feeSelectLabels={{
                    low: intl.formatMessage({ id: "fee-buttons.select.low" }),
                    average: intl.formatMessage({
                      id: "fee-buttons.select.average"
                    }),
                    high: intl.formatMessage({ id: "fee-buttons.select.high" })
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }} />
            <Button
              type="submit"
              color="primary"
              block
              disabled={txConfigStore.waitingData == null}
              data-loading={txConfigStore.isLoading}
            >
              <FormattedMessage id="fee.button.set" />
            </Button>
          </div>
        </form>
      </HeaderLayout>
    );
  })
);
