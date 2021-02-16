import React, { FunctionComponent } from "react";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import styleDetailsTab from "./details-tab.module.scss";
import classnames from "classnames";

import { renderMessage } from "./messages";
import { useIntl } from "react-intl";
import { FeeButtons, MemoInput } from "../../components/form";
import { IFeeConfig, IMemoConfig, SignDocHelper } from "@keplr/hooks";

export const DetailsTab: FunctionComponent<{
  signDocHelper: SignDocHelper;
  memoConfig: IMemoConfig;
  feeConfig: IFeeConfig;
}> = observer(({ signDocHelper, memoConfig, feeConfig }) => {
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
            chainStore.current.currencies,
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
        memoConfig={memoConfig}
        label={intl.formatMessage({ id: "sign.info.memo" })}
        rows={1}
      />
      <FeeButtons
        feeConfig={feeConfig}
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
