import React, { FunctionComponent, useEffect, useState } from "react";
import { Button } from "reactstrap";

import { HeaderLayout } from "../../layouts";

import style from "./style.module.scss";

import { useStore } from "../../stores";

import classnames from "classnames";
import { DataTab } from "./data-tab";
import { DetailsTab } from "./details-tab";
import { FormattedMessage, useIntl } from "react-intl";

import { useHistory } from "react-router";
import { observer } from "mobx-react";
import { useInteractionInfo } from "@keplr/hooks";

import { Buffer } from "src/pages/sign/index";

enum Tab {
  Details,
  Data,
}

export const SignPage: FunctionComponent = observer(() => {
  const history = useHistory();

  const [tab, setTab] = useState<Tab>(Tab.Details);

  const intl = useIntl();

  const { chainStore, keyRingStore, signInteractionStore } = useStore();
  const interactionInfo = useInteractionInfo(() => {
    signInteractionStore.rejectAll();
  });

  useEffect(() => {
    if (signInteractionStore.waitingData) {
      chainStore.selectChain(signInteractionStore.waitingData.chainId);
    }
  }, [chainStore, signInteractionStore.waitingData]);

  // Approve signing automatically if key type is ledger.
  useEffect(() => {
    if (keyRingStore.keyRingType === "ledger") {
      if (signInteractionStore.waitingData) {
        signInteractionStore.approve();
      }
    }
  }, [
    keyRingStore.keyRingType,
    signInteractionStore,
    signInteractionStore.waitingData,
  ]);

  const message = signInteractionStore.waitingData
    ? Buffer.from(signInteractionStore.waitingData.messageHex, "hex").toString()
    : "";

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
      style={{ background: "white" }}
    >
      <div className={style.container}>
        <div className={classnames(style.tabs)}>
          <ul>
            <li className={classnames({ active: tab === Tab.Details })}>
              <a
                className={style.tab}
                onClick={() => {
                  setTab(Tab.Details);
                }}
              >
                {intl.formatMessage({
                  id: "sign.tab.details",
                })}
              </a>
            </li>
            <li className={classnames({ active: tab === Tab.Data })}>
              <a
                className={style.tab}
                onClick={() => {
                  setTab(Tab.Data);
                }}
              >
                {intl.formatMessage({
                  id: "sign.tab.data",
                })}
              </a>
            </li>
          </ul>
        </div>
        <div className={style.tabContainer}>
          {tab === Tab.Data ? <DataTab message={message} /> : null}
          {tab === Tab.Details ? <DetailsTab message={message} /> : null}
        </div>
        <div style={{ flex: 1 }} />
        <div className={style.buttons}>
          {keyRingStore.keyRingType === "ledger" ? (
            <Button
              className={style.button}
              color="primary"
              disabled={true}
              outline
            >
              <FormattedMessage id="sign.button.confirm-ledger" />{" "}
              <i className="fa fa-spinner fa-spin fa-fw" />
            </Button>
          ) : (
            <React.Fragment>
              <Button
                className={style.button}
                color="danger"
                disabled={message === ""}
                data-loading={signInteractionStore.isLoading}
                onClick={(e) => {
                  e.preventDefault();

                  signInteractionStore.reject();
                }}
                outline
              >
                {intl.formatMessage({
                  id: "sign.button.reject",
                })}
              </Button>
              <Button
                className={style.button}
                color="primary"
                disabled={message === ""}
                data-loading={signInteractionStore.isLoading}
                onClick={(e) => {
                  e.preventDefault();

                  signInteractionStore.approve();
                }}
              >
                {intl.formatMessage({
                  id: "sign.button.approve",
                })}
              </Button>
            </React.Fragment>
          )}
        </div>
      </div>
    </HeaderLayout>
  );
});
