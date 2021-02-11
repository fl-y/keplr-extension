import React, { FunctionComponent, useState } from "react";
import { FormGroup, Input, Label } from "reactstrap";
import { TxConfig } from "@keplr/hooks";
import { observer } from "mobx-react";

export interface MemoInputProps {
  txConfig: Pick<TxConfig, "memo" | "setMemo">;

  label?: string;
  className?: string;

  rows?: number;
}

// TODO: Handle the max memo bytes length for each chain.
export const MemoInput: FunctionComponent<MemoInputProps> = observer(
  ({ txConfig, label, className, rows }) => {
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
          type="textarea"
          rows={rows ? rows : 2}
          style={{ resize: "none" }}
          value={txConfig.memo}
          onChange={(e) => {
            txConfig.setMemo(e.target.value);
            e.preventDefault();
          }}
          autoComplete="off"
        />
      </FormGroup>
    );
  }
);
