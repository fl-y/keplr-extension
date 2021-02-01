import React, { FunctionComponent, useEffect, useState } from "react";
import { HeaderLayout } from "../../../layouts";
import { AddressInput, Input, MemoInput } from "../../../components/form";
import { Button } from "reactstrap";
import { FormattedMessage, useIntl } from "react-intl";
import { observer } from "mobx-react";
import { AddressBookConfig, TxConfig } from "@keplr/hooks";

/**
 *
 * @param closeModal
 * @param addAddressBook
 * @param chainInfo
 * @param index If index is lesser than 0, it is considered as adding address book. If index is equal or greater than 0, it is considered as editing address book.
 * @param addressBookKVStore
 * @constructor
 */
export const AddAddressModal: FunctionComponent<{
  closeModal: () => void;
  txConfig: TxConfig;
  addressBookConfig: AddressBookConfig;
  index: number;
}> = observer(({ closeModal, txConfig, addressBookConfig, index }) => {
  const intl = useIntl();

  const [name, setName] = useState("");

  useEffect(() => {
    if (index >= 0) {
      const data = addressBookConfig.addressBookDatas[index];
      setName(data.name);
      txConfig.setRecipient(data.address);
      txConfig.setMemo(data.memo);
    }
  }, [addressBookConfig.addressBookDatas, index, txConfig]);

  return (
    <HeaderLayout
      showChainName={false}
      canChangeChainInfo={false}
      alternativeTitle={
        index >= 0
          ? intl.formatMessage({
              id: "setting.address-book.edit-address.title",
            })
          : intl.formatMessage({
              id: "setting.address-book.add-address.title",
            })
      }
      onBackButton={closeModal}
    >
      <form
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <Input
          type="text"
          label={intl.formatMessage({ id: "setting.address-book.name" })}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <AddressInput
          txConfig={txConfig}
          label={intl.formatMessage({ id: "setting.address-book.address" })}
          disableAddressBook={true}
        />
        <MemoInput
          txConfig={txConfig}
          label={intl.formatMessage({ id: "setting.address-book.memo" })}
        />
        <div style={{ flex: 1 }} />
        <Button
          type="submit"
          color="primary"
          disabled={!name || !txConfig.isValid("recipient", "memo")}
          onClick={async (e) => {
            e.preventDefault();

            if (!txConfig.recipient) {
              throw new Error("Invalid address");
            }

            if (index < 0) {
              await addressBookConfig.addAddressBook({
                name,
                address: txConfig.recipient,
                memo: txConfig.memo,
              });
            } else {
              await addressBookConfig.editAddressBookAt(index, {
                name,
                address: txConfig.recipient,
                memo: txConfig.memo,
              });
            }

            closeModal();
          }}
        >
          <FormattedMessage id={"setting.address-book.button.save"} />
        </Button>
      </form>
    </HeaderLayout>
  );
});
