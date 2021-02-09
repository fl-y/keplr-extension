import React, { FunctionComponent, useEffect } from "react";
import {
  AddressInput,
  FeeButtons,
  CoinInput,
  MemoInput,
} from "../../components/form";
import { useStore } from "../../stores";

import { HeaderLayout } from "../../layouts";

import { observer } from "mobx-react";

import style from "./style.module.scss";
import { useNotification } from "../../components/notification";

import { useIntl } from "react-intl";
import { Button } from "reactstrap";

import { useHistory, useLocation } from "react-router";
import queryString from "querystring";

import { useTxConfig } from "@keplr/hooks";

export const SendPage: FunctionComponent = observer(() => {
  const history = useHistory();
  let search = useLocation().search;
  if (search.startsWith("?")) {
    search = search.slice(1);
  }
  const query = queryString.parse(search) as {
    defaultDenom: string | undefined;
  };

  const intl = useIntl();

  const notification = useNotification();

  const { chainStore, accountStore, priceStore, queriesStore } = useStore();
  const current = chainStore.current;

  const accountInfo = accountStore.getAccount(current.chainId);

  const txConfig = useTxConfig(
    chainStore,
    current.chainId,
    accountInfo.bech32Address,
    queriesStore.get(current.chainId).getQueryBalances()
  );

  useEffect(() => {
    if (query.defaultDenom) {
      const currency = current.currencies.find(
        (cur) => cur.coinMinimalDenom === query.defaultDenom
      );

      if (currency) {
        txConfig.setSendCurrency(currency);
      }
    }
  }, [current.currencies, query.defaultDenom, txConfig]);

  // Cyber chain (eular-6) doesn't require the fees to send tx.
  // So, don't need to show the fee input.
  // This is temporary hardcoding.
  const isCyberNetwork = /^(euler-)(\d)+/.test(current.chainId);
  const txStateIsValid = isCyberNetwork
    ? txConfig.isValid("recipient", "amount", "memo", "gas")
    : txConfig.isValid("recipient", "amount", "memo", "fee", "gas");

  return (
    <HeaderLayout
      showChainName
      canChangeChainInfo={false}
      onBackButton={() => {
        history.goBack();
      }}
    >
      <form
        className={style.formContainer}
        onSubmit={async (e) => {
          e.preventDefault();

          if (accountInfo.isReadyToSendMsgs && txStateIsValid) {
            try {
              await accountInfo.sendToken(
                txConfig.amount,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                txConfig.sendCurrency!,
                txConfig.recipient,
                txConfig.memo
              );
              history.replace("/");
            } catch (e) {
              history.replace("/");
              notification.push({
                type: "warning",
                placement: "top-center",
                duration: 5,
                content: `Fail to send token: ${e.message}`,
                canDelete: true,
                transition: {
                  duration: 0.25,
                },
              });
            }
          }
        }}
      >
        <div className={style.formInnerContainer}>
          <div>
            <AddressInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "send.input.recipient" })}
            />
            <CoinInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "send.input.amount" })}
              balanceText={intl.formatMessage({
                id: "send.input-button.balance",
              })}
            />
            <MemoInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "send.input.memo" })}
            />
            {isCyberNetwork ? null : (
              <FeeButtons
                txConfig={txConfig}
                priceStore={priceStore}
                label={intl.formatMessage({ id: "send.input.fee" })}
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
            data-loading={accountInfo.isSendingMsg}
            disabled={!accountInfo.isReadyToSendMsgs || !txStateIsValid}
          >
            {intl.formatMessage({
              id: "send.button.send",
            })}
          </Button>
        </div>
      </form>
    </HeaderLayout>
  );
});
