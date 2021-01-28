import React, { FunctionComponent, useEffect, useState } from "react";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import styleDetailsTab from "./details-tab.module.scss";
import classnames from "classnames";

import { MessageObj, renderMessage } from "./messages";
import { DecUtils, CoinUtils, Coin, Dec } from "@keplr/unit";
import { useIntl } from "react-intl";
import { useLanguage } from "../../languages";

export const DetailsTab: FunctionComponent<{ message: string }> = observer(
  ({ message }) => {
    const { chainStore, priceStore } = useStore();

    const intl = useIntl();

    const [fee, setFee] = useState<Coin[]>([]);
    const [feeFiat, setFeeFiat] = useState(new Dec(0));
    const [memo, setMemo] = useState("");
    const [msgs, setMsgs] = useState<MessageObj[]>([]);

    useEffect(() => {
      if (message) {
        const msgObj: {
          fee: {
            amount: [{ amount: string; denom: string }];
            gas: string;
          };
          memo: string;
          msgs: MessageObj[];
        } = JSON.parse(message);

        setMemo(msgObj.memo);
        setMsgs(msgObj.msgs);

        const coinObjs = msgObj.fee.amount;
        const fees: Coin[] = [];
        if (coinObjs) {
          for (const coinObj of coinObjs) {
            fees.push(new Coin(coinObj.denom, coinObj.amount));
          }
        }
        setFee(fees);
      }
    }, [message]);

    const language = useLanguage();
    const fiatCurrency = language.fiatCurrency;

    // Set true if all fees have the coingecko id.
    const [hasCoinGeckoId, setHasCoinGeckoId] = useState(false);

    const current = chainStore.current;
    useEffect(() => {
      let price = new Dec(0);
      // Set true if all fees have the coingecko id.
      let hasCoinGeckoId = true;

      for (const coin of fee) {
        const currency = current.feeCurrencies.find((currency) => {
          return currency.coinMinimalDenom === coin.denom;
        });
        if (currency && currency.coinGeckoId) {
          if (!currency.coinGeckoId) {
            hasCoinGeckoId = false;
          }
          const value = priceStore.getPrice(currency.coinGeckoId, fiatCurrency);
          const parsed = CoinUtils.parseDecAndDenomFromCoin(
            current.feeCurrencies,
            coin
          );
          if (value) {
            price = price.add(
              new Dec(parsed.amount).mul(new Dec(value.toString()))
            );
          }
        }
      }

      setHasCoinGeckoId(hasCoinGeckoId);
      setFeeFiat(price);
    }, [current, fee, fiatCurrency, priceStore]);

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
          {msgs.map((msg, i) => {
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
        <div className={styleDetailsTab.section}>
          <div className={styleDetailsTab.title}>
            {intl.formatMessage({
              id: "sign.info.fee",
            })}
          </div>
          <div className={styleDetailsTab.fee}>
            <div>
              {fee
                .map((fee) => {
                  const parsed = CoinUtils.parseDecAndDenomFromCoin(
                    chainStore.current.feeCurrencies,
                    fee
                  );
                  return `${DecUtils.trim(parsed.amount)} ${parsed.denom}`;
                })
                .join(",")}
            </div>
            <div className={styleDetailsTab.fiat}>
              {/* TODO
                !feeFiat.equals(new Dec(0))
                ? fiatCurrency.symbol +
                  DecUtils.trim(
                    fiatCurrency.parse(parseFloat(feeFiat.toString()))
                  )
                : hasCoinGeckoId
                ? "?"
                : ""*/}
            </div>
          </div>
        </div>
        {memo ? (
          <div className={styleDetailsTab.section}>
            <div className={styleDetailsTab.title}>
              {intl.formatMessage({
                id: "sign.info.memo",
              })}
            </div>
            <div className={styleDetailsTab.memo}>{memo}</div>
          </div>
        ) : null}
      </div>
    );
  }
);

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
