import React, { FunctionComponent, useState } from "react";
import { FormGroup, Input, Label } from "reactstrap";
import { TxConfig } from "@keplr/hooks";
import { observer } from "mobx-react";

export interface GasInputProps {
  txConfig: TxConfig;

  label?: string;
  className?: string;
}

// TODO: Handle the max block gas limit(?)
export const GasInput: FunctionComponent<GasInputProps> = observer(
  ({ txConfig, label, className }) => {
    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    return (
      <FormGroup className={className}>
        {label ? (
          <Label for={inputId} className="form-control-label">
            {label}
          </Label>
        ) : null}
        <Input
          id={inputId}
          className="form-control-alternative"
          type="number"
          step={1}
          min={0}
          value={txConfig.gas}
          onChange={(e) => {
            const gas = parseInt(e.target.value);
            if (!isNaN(gas) && gas > 0) {
              txConfig.setGas(gas);
            }
            e.preventDefault();
          }}
          autoComplete="off"
        />
      </FormGroup>
    );
  }
);
