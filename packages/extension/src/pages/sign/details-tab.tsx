import React, { FunctionComponent } from "react";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import styleDetailsTab from "./details-tab.module.scss";
import classnames from "classnames";

import { renderMessage } from "./messages";
import { useIntl } from "react-intl";
import { FeeButtons, MemoInput } from "../../components/form";
import { IFeeConfig, IMemoConfig, SignDocHelper } from "@keplr/hooks";
import { useLanguage } from "../../languages";
import { FormGroup, Label } from "reactstrap";

export const DetailsTab: FunctionComponent<{
  signDocHelper: SignDocHelper;
  memoConfig: IMemoConfig;
  feeConfig: IFeeConfig;

  hideFeeButtons: boolean | undefined;
}> = observer(({ signDocHelper, memoConfig, feeConfig, hideFeeButtons }) => {
  const { chainStore, priceStore } = useStore();
  const intl = useIntl();

  const language = useLanguage();

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
      {!hideFeeButtons ? (
        <FeeButtons
          feeConfig={feeConfig}
          priceStore={priceStore}
          label={intl.formatMessage({ id: "sign.info.fee" })}
        />
      ) : feeConfig.fee ? (
        <FormGroup>
          <Label for="fee-price" className="form-control-label">
            Fee
          </Label>
          <div id="fee-price">
            <div>
              {feeConfig.fee.maxDecimals(6).trim(true).toString()}
              {priceStore.calculatePrice(
                language.fiatCurrency,
                feeConfig.fee
              ) ? (
                <div
                  className="ml-2"
                  style={{ display: "inline-block", fontSize: "12px" }}
                >
                  {priceStore
                    .calculatePrice(language.fiatCurrency, feeConfig.fee)
                    ?.toString()}
                </div>
              ) : null}
            </div>
          </div>
        </FormGroup>
      ) : null}
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
