import React, { FunctionComponent, useState } from "react";

import classnames from "classnames";
import styleCoinInput from "./coin-input.module.scss";

import { FormGroup, Input, InputGroup, Label } from "reactstrap";
import { observer } from "mobx-react";
import { TxConfig } from "@keplr/hooks";

export interface CoinInputProps {
  txConfig: TxConfig;

  balanceText?: string;

  className?: string;
  label?: string;
  errorTexts: {
    insufficient: string;
  };

  disableAllBalance?: boolean;
}

export const CoinInput: FunctionComponent<CoinInputProps> = observer(
  ({ txConfig, className, label }) => {
    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    return (
      <FormGroup className={className}>
        {label ? (
          <Label
            for={inputId}
            className="form-control-label"
            style={{ width: "100%" }}
          >
            {label}
            {/*txState.balances && currency && balance && !disableAllBalance ? (
              <div
                className={classnames(
                  styleCoinInput.balance,
                  styleCoinInput.clickable,
                  {
                    [styleCoinInput.clicked]: allBalance
                  }
                )}
                onClick={toggleAllBalance}
              >
                {balanceText
                  ? // TODO: Can use api in react-intl?
                    `${balanceText}: 
                        ${CoinUtils.coinToTrimmedString(balance, currency)}`
                  : `Balance: ${CoinUtils.coinToTrimmedString(
                      balance,
                      currency
                    )}`}
              </div>
            ) : null*/}
          </Label>
        ) : null}
        <InputGroup
          id={inputId}
          className={classnames(styleCoinInput.selectContainer, {
            disabled: false,
          })}
        >
          <Input
            className={classnames(
              "form-control-alternative",
              styleCoinInput.input
            )}
            type="number"
            value={txConfig.amount}
            onChange={(e) => {
              e.preventDefault();

              txConfig.setAmount(e.target.value);
            }}
            // step={step}
            min={0}
            // disabled={allBalance}
            autoComplete="off"
          />
          <Input
            type="select"
            className={classnames(
              "form-control-alternative",
              styleCoinInput.select
            )}
            value={
              txConfig.sendCurrency
                ? txConfig.sendCurrency.coinMinimalDenom
                : ""
            }
            onChange={(e) => {
              const currency = txConfig.sendableCurrencies.find((currency) => {
                return currency.coinMinimalDenom === e.target.value;
              });
              txConfig.setSendCurrency(currency);
              e.preventDefault();
            }}
            // disabled={allBalance || !currency}
          >
            {txConfig.sendableCurrencies.map((currency, i) => {
              return (
                <option key={i.toString()} value={currency.coinMinimalDenom}>
                  {currency.coinDenom}
                </option>
              );
            })}
          </Input>
        </InputGroup>
        {/*txConfig.getError("amount", ErrorIdInsufficient) ? (
          <FormFeedback style={{ display: "block" }}>
            {errorTexts.insufficient}
          </FormFeedback>
        ) : null*/}
      </FormGroup>
    );
  }
);
