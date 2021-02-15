import React, { FunctionComponent, useMemo, useState } from "react";

import styleToken from "./token.module.scss";
import { observer } from "mobx-react";
import { useStore } from "../../stores";
import { useHistory } from "react-router";
import { Hash } from "@keplr/crypto";
import { ObservableQueryBalanceInner } from "@keplr/stores/build/query/balances";

const TokenView: FunctionComponent<{
  balance: ObservableQueryBalanceInner;
  onClick: () => void;
}> = observer(({ onClick, balance }) => {
  const [backgroundColors] = useState([
    "#5e72e4",
    "#11cdef",
    "#2dce89",
    "#fb6340",
  ]);

  const name = balance.currency.coinDenom.toUpperCase();
  const minimalDenom = balance.currency.coinMinimalDenom;
  const amount = balance.balance.trim(true);

  const backgroundColor = useMemo(() => {
    const hash = Hash.sha256(Buffer.from(minimalDenom));
    if (hash.length > 0) {
      return backgroundColors[hash[0] % backgroundColors.length];
    } else {
      return backgroundColors[0];
    }
  }, [backgroundColors, minimalDenom]);

  return (
    <div
      className={styleToken.tokenContainer}
      onClick={(e) => {
        e.preventDefault();

        onClick();
      }}
    >
      <div className={styleToken.icon}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "100000px",
            backgroundColor,

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            color: "#FFFFFF",
            fontSize: "16px",
          }}
        >
          {name.length > 0 ? name[0] : "?"}
        </div>
      </div>
      <div className={styleToken.innerContainer}>
        <div className={styleToken.content}>
          <div className={styleToken.name}>{name}</div>
          <div className={styleToken.amount}>
            {amount.toString()}
            {balance.isFetching ? (
              <i className="fas fa-spinner fa-spin ml-1" />
            ) : null}
          </div>
        </div>
        <div className={styleToken.arrow}>
          <i className="fas fa-angle-right" />
        </div>
      </div>
    </div>
  );
});

export const TokensView: FunctionComponent = observer(() => {
  const { chainStore, accountStore, queriesStore } = useStore();

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const tokens = queriesStore
    .get(chainStore.current.chainId)
    .getQueryBalances()
    .getQueryBech32Address(accountInfo.bech32Address).unstakables;

  const history = useHistory();

  return (
    <div className={styleToken.tokensContainer}>
      <h1 className={styleToken.title}>Tokens</h1>
      {tokens.map((token, i) => {
        return (
          <TokenView
            key={i.toString()}
            balance={token}
            onClick={() => {
              history.push({
                pathname: "/send",
                search: `?defaultDenom=${token.currency.coinMinimalDenom}`,
              });
            }}
          />
        );
      })}
    </div>
  );
});
