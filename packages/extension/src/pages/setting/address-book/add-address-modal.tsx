import React, { FunctionComponent, useState, useEffect } from "react";
import { HeaderLayout } from "../../../layouts";
import { AddressInput, Input, MemoInput } from "../../../components/form";
import { Button } from "reactstrap";
import { AddressBookData } from "./types";
import { AddressBookKVStore } from "./kv-store";
import { ChainInfo } from "@keplr/types";
import { FormattedMessage, useIntl } from "react-intl";
import { observer } from "mobx-react";
import { useTxConfig } from "@keplr/hooks";
import { useStore } from "../../../stores";

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
  addAddressBook: (data: AddressBookData) => void;
  chainInfo: ChainInfo;
  index: number;
  addressBookKVStore: AddressBookKVStore;
}> = observer(
  ({ closeModal, addAddressBook, chainInfo, index, addressBookKVStore }) => {
    const intl = useIntl();

    const [name, setName] = useState("");

    const { chainStore, queriesStore, accountStore } = useStore();
    const txConfig = useTxConfig(
      chainStore,
      accountStore.getAccount(chainStore.current.chainId).bech32Address,
      queriesStore.get(chainStore.current.chainId).getQueryBalances()
    );

    // Make sure to load the editables only once.
    const [editingLoaded, setEditingLoaded] = useState(false);

    useEffect(() => {
      if (!editingLoaded) {
        if (index >= 0) {
          addressBookKVStore.getAddressBook(chainInfo).then((datas) => {
            const data = datas[index];
            setName(data.name);
            txConfig.setRecipient(data.address);
            txConfig.setMemo(data.memo);
          });
          setEditingLoaded(true);
        }
      }
    }, [addressBookKVStore, chainInfo, editingLoaded, index, txConfig]);

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
            onClick={(e) => {
              if (!txConfig.recipient) {
                throw new Error("Invalid address");
              }

              addAddressBook({
                name,
                address: txConfig.recipient,
                memo: txConfig.memo,
              });

              e.preventDefault();
            }}
          >
            <FormattedMessage id={"setting.address-book.button.save"} />
          </Button>
        </form>
      </HeaderLayout>
    );
  }
);
