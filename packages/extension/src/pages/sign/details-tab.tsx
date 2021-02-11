import React, { FunctionComponent } from "react";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import styleDetailsTab from "./details-tab.module.scss";
import classnames from "classnames";

import { renderMessage } from "./messages";
import { useIntl } from "react-intl";
import { FeeButtons, MemoInput } from "../../components/form";
import { SignDocHelper, TxConfig } from "@keplr/hooks";

export const DetailsTab: FunctionComponent<{
  signDocHelper: SignDocHelper;
  txConfig: TxConfig;
}> = observer(({ signDocHelper, txConfig }) => {
  const { chainStore, priceStore } = useStore();
  const intl = useIntl();

  return (
    <div className={styleDetailsTab.container}>
      <div
        className={classnames(
          styleDetailsTab.section,
          styleDetailsTab.messages
        )}
      >
        <div className={styleDetailsTab.title}>
          {intl.formatMessage({
            id: "sign.list.messages.label",
          })}
        </div>
        {signDocHelper.msgs.map((msg, i) => {
          const msgContent = renderMessage(
            msg,
            chainStore.current.feeCurrencies,
            intl
          );
          return (
            <React.Fragment key={i.toString()}>
              <Msg icon={msgContent.icon} title={msgContent.title}>
                {msgContent.content}
              </Msg>
              <hr />
            </React.Fragment>
          );
        })}
      </div>
      <MemoInput
        txConfig={signDocHelper}
        label={intl.formatMessage({ id: "sign.info.memo" })}
        rows={1}
      />
      <FeeButtons
        txConfig={txConfig}
        priceStore={priceStore}
        label={intl.formatMessage({ id: "sign.info.fee" })}
      />
    </div>
  );
});

const Msg: FunctionComponent<{
  icon?: string;
  title: string;
}> = ({ icon = "fas fa-question", title, children }) => {
  return (
    <div className={styleDetailsTab.msg}>
      <div className={styleDetailsTab.icon}>
        <div style={{ height: "2px" }} />
        <i className={icon} />
        <div style={{ flex: 1 }} />
      </div>
      <div className={styleDetailsTab.contentContainer}>
        <div className={styleDetailsTab.contentTitle}>{title}</div>
        <div className={styleDetailsTab.content}>{children}</div>
      </div>
    </div>
  );
};
