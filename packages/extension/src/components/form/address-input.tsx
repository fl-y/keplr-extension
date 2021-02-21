import React, { FunctionComponent, useMemo, useState } from "react";
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
import { AddressBookPage } from "../../pages/setting/address-book";

import styleAddressInput from "./address-input.module.scss";
import classnames from "classnames";
import {
  InvalidBech32Error,
  EmptyAddressError,
  IRecipientConfig,
  IMemoConfig,
} from "@keplr/hooks";
import { observer } from "mobx-react-lite";
import { useIntl } from "react-intl";

export interface AddressInputProps {
  recipientConfig: IRecipientConfig;
  memoConfig?: IMemoConfig;

  className?: string;
  label?: string;

  disableAddressBook?: boolean;
}

export const AddressInput: FunctionComponent<AddressInputProps> = observer(
  ({ recipientConfig, memoConfig, className, label, disableAddressBook }) => {
    const intl = useIntl();

    const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);

    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    const error = recipientConfig.getError();
    const errorText: string | undefined = useMemo(() => {
      if (error) {
        switch (error.constructor) {
          case EmptyAddressError:
            // No need to show the error to user.
            return;
          case InvalidBech32Error:
            return intl.formatMessage({
              id: "input.recipient.error.invalid-bech32",
            });
          default:
            return intl.formatMessage({ id: "input.recipient.error.unknown" });
        }
      }
    }, [intl, error]);

    const selectAddressFromAddressBook = {
      setRecipient: (recipient: string) => {
        recipientConfig.setRecipient(recipient);
      },
      setMemo: (memo: string) => {
        if (memoConfig) {
          memoConfig.setMemo(memo);
        }
      },
    };

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
              hideChainDropdown={true}
              selectHandler={selectAddressFromAddressBook}
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
              value={recipientConfig.recipient}
              onChange={(e) => {
                recipientConfig.setRecipient(e.target.value);
                e.preventDefault();
              }}
              autoComplete="off"
            />
            {!disableAddressBook && memoConfig ? (
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
          {errorText != null ? (
            <FormFeedback style={{ display: "block" }}>
              {errorText}
            </FormFeedback>
          ) : null}
        </FormGroup>
      </React.Fragment>
    );
  }
);
