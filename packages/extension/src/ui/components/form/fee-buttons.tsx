import React, {
  FunctionComponent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import styleFeeButtons from "./fee-buttons.module.scss";

import { Button, ButtonGroup, FormGroup, Label } from "reactstrap";

import classnames from "classnames";
import { observer } from "mobx-react";
import { TxConfig } from "@keplr/hooks";

export interface FeeButtonsProps {
  txConfig: TxConfig;

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
    label,
    feeSelectLabels = { low: "Low", average: "Average", high: "High" },
  }) => {
    useEffect(() => {
      txConfig.setFeeType("average");
    }, []);

    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

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
            onClick={useCallback((e: MouseEvent) => {
              txConfig.setFeeType("low");
              e.preventDefault();
            }, [])}
          >
            <div className={styleFeeButtons.title}>{feeSelectLabels.low}</div>
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": txConfig.feeType !== "low",
              })}
            >
              {txConfig.getFeeTypePretty("low").trim(true).toString()}
            </div>
          </Button>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={txConfig.feeType === "average" ? "primary" : undefined}
            onClick={useCallback((e: MouseEvent) => {
              txConfig.setFeeType("average");
              e.preventDefault();
            }, [])}
          >
            <div className={styleFeeButtons.title}>
              {feeSelectLabels.average}
            </div>
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
            onClick={useCallback((e: MouseEvent) => {
              txConfig.setFeeType("high");
              e.preventDefault();
            }, [])}
          >
            <div className={styleFeeButtons.title}>{feeSelectLabels.high}</div>
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
