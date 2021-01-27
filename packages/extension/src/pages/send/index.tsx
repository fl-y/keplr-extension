import React, { FunctionComponent } from "react";
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

import { useHistory } from "react-router";

import { useTxConfig } from "@keplr/hooks";

export const SendPage: FunctionComponent = observer(() => {
  const history = useHistory();

  const intl = useIntl();

  const notification = useNotification();

  const { chainStore, accountStore } = useStore();

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const txConfig = useTxConfig(chainStore);
  txConfig.setChain(chainStore.current.chainId);

  // Cyber chain (eular-6) doesn't require the fees to send tx.
  // So, don't need to show the fee input.
  // This is temporary hardcoding.
  const isCyberNetwork = /^(euler-)(\d)+/.test(chainStore.current.chainId);
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
            accountInfo.sendToken(
              txConfig.amount,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              txConfig.sendCurrency!,
              txConfig.recipient,
              txConfig.toStdFee(),
              txConfig.memo,
              "block",
              () => {
                history.replace("/");
              },
              (e: Error) => {
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
            );
          }
        }}
      >
        <div className={style.formInnerContainer}>
          <div>
            <AddressInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "send.input.recipient" })}
              errorTexts={{
                invalidBech32Address: intl.formatMessage({
                  id: "send.input.recipient.error.invalid",
                }),
                invalidENSName: intl.formatMessage({
                  id: "send.input.recipient.error.ens-invalid-name",
                }),
                ensNameNotFound: intl.formatMessage({
                  id: "send.input.recipient.error.ens-not-found",
                }),
                ensUnsupported: intl.formatMessage({
                  id: "send.input.recipient.error.ens-not-supported",
                }),
                ensUnknownError: intl.formatMessage({
                  id: "sned.input.recipient.error.ens-unknown-error",
                }),
              }}
            />
            <CoinInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "send.input.amount" })}
              balanceText={intl.formatMessage({
                id: "send.input-button.balance",
              })}
              errorTexts={{
                insufficient: intl.formatMessage({
                  id: "send.input.amount.error.insufficient",
                }),
              }}
            />
            <MemoInput
              txConfig={txConfig}
              label={intl.formatMessage({ id: "send.input.memo" })}
            />
            {isCyberNetwork ? null : (
              <FeeButtons
                txConfig={txConfig}
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
