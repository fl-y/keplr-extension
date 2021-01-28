import React, {
  FunctionComponent,
  MouseEvent,
  useEffect,
  useState,
} from "react";

import styleFeeButtons from "./fee-buttons.module.scss";

import { Button, ButtonGroup, FormGroup, Label } from "reactstrap";

import classnames from "classnames";
import { observer } from "mobx-react";
import { TxConfig } from "@keplr/hooks";
import { CoinGeckoPriceStore } from "@keplr/stores";
import { useLanguage } from "../../languages";

export interface FeeButtonsProps {
  txConfig: TxConfig;
  priceStore: CoinGeckoPriceStore;

  className?: string;
  label?: string;
  feeSelectLabels?: {
    low: string;
    average: string;
    high: string;
  };
}

export const FeeButtons: FunctionComponent<FeeButtonsProps> = observer(
  ({
    txConfig,
    priceStore,
    label,
    feeSelectLabels = { low: "Low", average: "Average", high: "High" },
  }) => {
    useEffect(() => {
      txConfig.setFeeType("average");
    }, [txConfig]);

    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    const language = useLanguage();

    const fiatCurrency = language.fiatCurrency;

    const lowFee = txConfig.getFeeTypePretty("low");
    const lowFeePrice = priceStore.calculatePrice(fiatCurrency, lowFee);

    const averageFee = txConfig.getFeeTypePretty("average");
    const averageFeePrice = priceStore.calculatePrice(fiatCurrency, averageFee);

    const highFee = txConfig.getFeeTypePretty("high");
    const highFeePrice = priceStore.calculatePrice(fiatCurrency, highFee);

    return (
      <FormGroup>
        {label ? (
          <Label for={inputId} className="form-control-label">
            {label}
          </Label>
        ) : null}
        <ButtonGroup id={inputId} className={styleFeeButtons.buttons}>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={txConfig.feeType === "low" ? "primary" : undefined}
            onClick={(e: MouseEvent) => {
              txConfig.setFeeType("low");
              e.preventDefault();
            }}
          >
            <div className={styleFeeButtons.title}>{feeSelectLabels.low}</div>
            {lowFeePrice ? (
              <div
                className={classnames(styleFeeButtons.fiat, {
                  "text-muted": txConfig.feeType !== "low",
                })}
              >
                {lowFeePrice.toString()}
              </div>
            ) : null}
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": txConfig.feeType !== "low",
              })}
            >
              {lowFee.trim(true).toString()}
            </div>
          </Button>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={txConfig.feeType === "average" ? "primary" : undefined}
            onClick={(e: MouseEvent) => {
              txConfig.setFeeType("average");
              e.preventDefault();
            }}
          >
            <div className={styleFeeButtons.title}>
              {feeSelectLabels.average}
            </div>
            {averageFeePrice ? (
              <div
                className={classnames(styleFeeButtons.fiat, {
                  "text-muted": txConfig.feeType !== "average",
                })}
              >
                {averageFeePrice.toString()}
              </div>
            ) : null}
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": txConfig.feeType !== "average",
              })}
            >
              {txConfig.getFeeTypePretty("average").trim(true).toString()}
            </div>
          </Button>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={txConfig.feeType === "high" ? "primary" : undefined}
            onClick={(e: MouseEvent) => {
              txConfig.setFeeType("high");
              e.preventDefault();
            }}
          >
            <div className={styleFeeButtons.title}>{feeSelectLabels.high}</div>
            {highFeePrice ? (
              <div
                className={classnames(styleFeeButtons.fiat, {
                  "text-muted": txConfig.feeType !== "high",
                })}
              >
                {highFeePrice.toString()}
              </div>
            ) : null}
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": txConfig.feeType !== "high",
              })}
            >
              {txConfig.getFeeTypePretty("high").trim(true).toString()}
            </div>
          </Button>
        </ButtonGroup>
      </FormGroup>
    );
  }
);
