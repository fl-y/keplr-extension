import React, { FunctionComponent, useState } from "react";
import {
  FormGroup,
  Label,
  Input,
  FormFeedback,
  ModalBody,
  Modal,
  InputGroup,
  Button,
} from "reactstrap";
import { AddressBookPage } from "../../ui/popup/pages/setting/address-book";

import styleAddressInput from "./address-input.module.scss";
import classnames from "classnames";
import { TxConfig } from "@keplr/hooks";
import { observer } from "mobx-react";

export interface AddressInputProps {
  txConfig: TxConfig;

  className?: string;
  label?: string;
  errorTexts: {
    invalidBech32Address: string;
    invalidENSName?: string;
    ensNameNotFound?: string;
    ensUnsupported?: string;
    ensUnknownError?: string;
  };

  disableAddressBook?: boolean;
}

export const AddressInput: FunctionComponent<AddressInputProps> = observer(
  ({ txConfig, className, label, errorTexts, disableAddressBook }) => {
    const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);

    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    return (
      <React.Fragment>
        <Modal
          isOpen={isAddressBookOpen}
          backdrop={false}
          className={styleAddressInput.fullModal}
          wrapClassName={styleAddressInput.fullModal}
          contentClassName={styleAddressInput.fullModal}
        >
          <ModalBody className={styleAddressInput.fullModal}>
            <AddressBookPage
              onBackButton={() => setIsAddressBookOpen(false)}
              onSelect={() => {}}
              hideChainDropdown={true}
            />
          </ModalBody>
        </Modal>
        <FormGroup className={className}>
          {label ? (
            <Label for={inputId} className="form-control-label">
              {label}
            </Label>
          ) : null}
          <InputGroup>
            <Input
              id={inputId}
              className={classnames(
                "form-control-alternative",
                styleAddressInput.input
              )}
              value={txConfig.recipient}
              onChange={(e) => {
                txConfig.setRecipient(e.target.value);
                e.preventDefault();
              }}
              autoComplete="off"
            />
            {!disableAddressBook ? (
              <Button
                className={styleAddressInput.addressBookButton}
                color="primary"
                type="button"
                outline
                onClick={() => setIsAddressBookOpen(true)}
              >
                <i className="fas fa-address-book" />
              </Button>
            ) : null}
          </InputGroup>
          {txConfig.getErrorOf("recipient") ? (
            <FormFeedback style={{ display: "block" }}>
              {errorTexts.invalidBech32Address}
            </FormFeedback>
          ) : null}
        </FormGroup>
      </React.Fragment>
    );
  }
);
