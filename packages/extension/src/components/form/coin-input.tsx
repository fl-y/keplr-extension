import React, { FunctionComponent, useMemo, useState } from "react";

import classnames from "classnames";
import styleCoinInput from "./coin-input.module.scss";

import { FormFeedback, FormGroup, Input, InputGroup, Label } from "reactstrap";
import { observer } from "mobx-react";
import {
  EmptyAmountError,
  InvalidNumberAmountError,
  TxConfig,
  ZeroAmountError,
  NagativeAmountError,
  InsufficientAmountError,
} from "@keplr/hooks";
import { Dec, DecUtils } from "@keplr/unit";
import { useIntl } from "react-intl";

export interface CoinInputProps {
  txConfig: TxConfig;

  balanceText?: string;

  className?: string;
  label?: string;

  disableAllBalance?: boolean;
}

export const CoinInput: FunctionComponent<CoinInputProps> = observer(
  ({ txConfig, className, label }) => {
    const intl = useIntl();

    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    const error = txConfig.getErrorOf("amount");
    const errorText: string | undefined = useMemo(() => {
      if (error) {
        switch (error.constructor) {
          case EmptyAmountError:
            // No need to show the error to user.
            return;
          case InvalidNumberAmountError:
            return intl.formatMessage({
              id: "input.amount.error.invalid-number",
            });
          case ZeroAmountError:
            return intl.formatMessage({
              id: "input.amount.error.is-zero",
            });
          case NagativeAmountError:
            return intl.formatMessage({
              id: "input.amount.error.is-negative",
            });
          case InsufficientAmountError:
            return intl.formatMessage({
              id: "input.amount.error.insufficient",
            });
          default:
            return intl.formatMessage({ id: "input.amount.error.unknown" });
        }
      }
    }, [intl, error]);

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
            step={new Dec(1)
              .quo(
                DecUtils.getPrecisionDec(
                  txConfig.sendCurrency?.coinDecimals ?? 0
                )
              )
              .toString(txConfig.sendCurrency?.coinDecimals ?? 0)}
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
        {errorText != null ? (
          <FormFeedback style={{ display: "block" }}>{errorText}</FormFeedback>
        ) : null}
      </FormGroup>
    );
  }
);
