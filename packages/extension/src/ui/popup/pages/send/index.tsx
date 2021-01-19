import React, { FunctionComponent, useEffect, useState } from "react";
import {
  AddressInput,
  FeeButtons,
  CoinInput,
  MemoInput,
} from "../../../components/form";
import { useStore } from "../../stores";

import { HeaderLayout } from "../../layouts";

import { PopupWalletProvider } from "../../wallet-provider";

import { observer } from "mobx-react";

import { useCosmosJS } from "../../../hooks";

import style from "./style.module.scss";
// import { useNotification } from "../../../components/notification";

import { useIntl } from "react-intl";
import { Button } from "reactstrap";

import { useHistory } from "react-router";

import { useTxConfig } from "@keplr/hooks";

export const SendPage: FunctionComponent = observer(() => {
  const history = useHistory();

  const intl = useIntl();

  // const notification = useNotification();

  const { chainStore } = useStore();
  const txConfig = useTxConfig(chainStore);
  txConfig.setChain(chainStore.chainInfo.chainId);

  const [walletProvider] = useState(
    new PopupWalletProvider(undefined, {
      onRequestSignature: (id: string) => {
        history.push(`/sign/${id}`);
      },
    })
  );
  const cosmosJS = useCosmosJS(chainStore.chainInfo, walletProvider, {
    useBackgroundTx: true,
  });

  useEffect(() => {
    if (txConfig.sendCurrency) {
      // Remember that the coin's actual denom should start with "type:contractAddress:" if it is for the token based on contract.
      const split = txConfig.sendCurrency.coinMinimalDenom
        .split(/(\w+):(\w+):(\w+)/)
        .filter(Boolean);
      if (split.length == 3) {
        // If token based on the contract.
        switch (split[0]) {
          case "cw20":
            txConfig.setGas(250000);
            break;
          case "secret20":
            txConfig.setGas(250000);
            break;
          default:
            txConfig.setGas(80000);
        }
      } else {
        txConfig.setGas(80000);
      }
    }
  }, [txConfig, txConfig.sendCurrency]);

  // Cyber chain (eular-6) doesn't require the fees to send tx.
  // So, don't need to show the fee input.
  // This is temporary hardcoding.
  const isCyberNetwork = /^(euler-)(\d)+/.test(chainStore.chainInfo.chainId);
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
          if (cosmosJS.sendMsgs && txStateIsValid) {
            e.preventDefault();

            /*
              const msg = await txState.generateSendMsg(
                chainStore.chainInfo.chainId,
                AccAddress.fromBech32(
                  accountStore.bech32Address,
                  chainStore.chainInfo.bech32Config.bech32PrefixAccAddr
                ),
                Axios.create({
                  ...{
                    baseURL: chainStore.chainInfo.rest,
                  },
                  ...chainStore.chainInfo.restConfig,
                })
              );

              const config: TxBuilderConfig = {
                gas: txState.gas,
                memo: txState.memo,
                fee: txState.fees,
              };

              await cosmosJS.sendMsgs(
                [msg],
                config,
                () => {
                  history.replace("/");
                },
                (e) => {
                  history.replace("/");
                  notification.push({
                    type: "danger",
                    content: e.toString(),
                    duration: 5,
                    canDelete: true,
                    placement: "top-center",
                    transition: {
                      duration: 0.25,
                    },
                  });
                },
                "commit"
              );
               */
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
            data-loading={cosmosJS.loading}
            disabled={cosmosJS.sendMsgs == null || !txStateIsValid}
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
