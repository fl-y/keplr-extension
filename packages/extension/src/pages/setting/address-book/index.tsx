import React, {
  FunctionComponent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { observer } from "mobx-react";
import { HeaderLayout } from "../../../layouts";
import { FormattedMessage, useIntl } from "react-intl";
import { useHistory } from "react-router";
import style from "../style.module.scss";
import {
  Button,
  ButtonDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Modal,
  ModalBody,
} from "reactstrap";
import styleAddressBook from "./style.module.scss";
import { useStore } from "../../../stores";
import { PageButton } from "../page-button";
import { AddAddressModal } from "./add-address-modal";
import { AddressBookData } from "./types";
import { AddressBookKVStore } from "./kv-store";
import { BrowserKVStore } from "@keplr/common";
import { ChainInfo } from "@keplr/types";
import { Bech32Address } from "@keplr/cosmos";
import { useConfirm } from "../../../components/confirm";

export const AddressBookPage: FunctionComponent<{
  onBackButton?: () => void;
  onSelect?: (data: AddressBookData) => void;
  hideChainDropdown?: boolean;
}> = observer(({ onBackButton, onSelect, hideChainDropdown }) => {
  const intl = useIntl();
  const history = useHistory();
  const { chainStore } = useStore();

  const [addressBook, setAddressBook] = useState<AddressBookData[]>([]);

  const [addressBookKVStore] = useState(
    new AddressBookKVStore(new BrowserKVStore("address-book"))
  );

  const refreshAddressBook = useCallback(
    async (chainInfo: ChainInfo) => {
      setAddressBook(await addressBookKVStore.getAddressBook(chainInfo));
    },
    [addressBookKVStore]
  );

  const current = chainStore.current;
  useEffect(() => {
    refreshAddressBook(current);
  }, [current, refreshAddressBook]);

  const [dropdownOpen, setOpen] = useState(false);
  const toggle = () => setOpen(!dropdownOpen);

  const [addAddressModalOpen, setAddressModalOpen] = useState(false);
  const [addAddressModalIndex, setAddAddressModalIndex] = useState(-1);

  const confirm = useConfirm();

  const openAddAddressModal = useCallback(() => {
    setAddressModalOpen(true);
  }, []);

  const closeAddAddressModal = useCallback(() => {
    setAddressModalOpen(false);
    setAddAddressModalIndex(-1);
  }, []);

  const addAddressBook = useCallback(
    async (data: AddressBookData) => {
      closeAddAddressModal();
      if (addAddressModalIndex < 0) {
        await addressBookKVStore.addAddressBook(current, data);
      } else {
        await addressBookKVStore.editAddressBookAt(
          current,
          addAddressModalIndex,
          data
        );
      }
      await refreshAddressBook(current);
    },
    [
      addAddressModalIndex,
      addressBookKVStore,
      current,
      closeAddAddressModal,
      refreshAddressBook,
    ]
  );

  const removeAddressBook = async (index: number) => {
    if (
      await confirm.confirm({
        img: (
          <img
            src={require("../../../public/assets/img/trash.svg")}
            style={{ height: "80px" }}
          />
        ),
        title: intl.formatMessage({
          id: "setting.address-book.confirm.delete-address.title",
        }),
        paragraph: intl.formatMessage({
          id: "setting.address-book.confirm.delete-address.paragraph",
        }),
      })
    ) {
      closeAddAddressModal();
      await addressBookKVStore.removeAddressBook(current, index);
      await refreshAddressBook(current);
    }
  };

  const editAddressBookClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const indexStr = e.currentTarget.getAttribute("data-index");
    if (indexStr) {
      const index = parseInt(indexStr);

      if (index != null && !Number.isNaN(index) && index >= 0) {
        openAddAddressModal();
        setAddAddressModalIndex(index);
      }
    }
  };

  const removeAddressBookClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const indexStr = e.currentTarget.getAttribute("data-index");
    if (indexStr) {
      const index = parseInt(indexStr);

      if (index != null && !Number.isNaN(index) && index >= 0) {
        await removeAddressBook(index);
      }
    }
  };

  const selectAddressBookClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const indexStr = e.currentTarget.getAttribute("data-index");
    if (onSelect && indexStr) {
      const index = parseInt(indexStr);

      if (index != null && !Number.isNaN(index) && index >= 0) {
        onSelect(await addressBookKVStore.getAddressBookAt(current, index));
      }
    }
  };

  const addressBookIcons = (index: number) => {
    return [
      <i
        key="edit"
        className="fas fa-pen"
        data-index={index}
        style={{ cursor: "pointer" }}
        onClick={editAddressBookClick}
      />,
      <i
        key="remove"
        className="fas fa-trash"
        data-index={index}
        style={{ cursor: "pointer" }}
        onClick={removeAddressBookClick}
      />,
    ];
  };

  const defaultOnBackButton = useCallback(() => {
    history.goBack();
  }, [history]);

  return (
    <HeaderLayout
      showChainName={false}
      canChangeChainInfo={false}
      alternativeTitle={intl.formatMessage({
        id: "main.menu.address-book",
      })}
      onBackButton={onBackButton ? onBackButton : defaultOnBackButton}
    >
      <Modal
        isOpen={addAddressModalOpen}
        backdrop={false}
        className={styleAddressBook.fullModal}
        wrapClassName={styleAddressBook.fullModal}
        contentClassName={styleAddressBook.fullModal}
      >
        <ModalBody className={styleAddressBook.fullModal}>
          <AddAddressModal
            closeModal={closeAddAddressModal}
            addAddressBook={addAddressBook}
            chainInfo={chainStore.current}
            addressBookKVStore={addressBookKVStore}
            index={addAddressModalIndex}
          />
        </ModalBody>
      </Modal>
      <div className={style.container}>
        <div className={styleAddressBook.innerTopContainer}>
          {hideChainDropdown ? null : (
            <ButtonDropdown isOpen={dropdownOpen} toggle={toggle}>
              <DropdownToggle caret style={{ boxShadow: "none" }}>
                {chainStore.current.chainName}
              </DropdownToggle>
              <DropdownMenu>
                {chainStore.chainInfos.map((chainInfo) => {
                  return (
                    <DropdownItem
                      key={chainInfo.chainId}
                      onClick={() => {
                        chainStore.selectChain(chainInfo.chainId);
                      }}
                    >
                      {chainInfo.chainName}
                    </DropdownItem>
                  );
                })}
              </DropdownMenu>
            </ButtonDropdown>
          )}
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Button color="primary" size="sm" onClick={openAddAddressModal}>
              <i
                className="fas fa-plus"
                style={{ marginRight: "4px", fontSize: "8px" }}
              />
              <FormattedMessage id="setting.address-book.button.add" />
            </Button>
          </div>
        </div>
        <div style={{ flex: "1 1 0", overflowY: "auto" }}>
          {addressBook.map((data, i) => {
            return (
              <PageButton
                key={i.toString()}
                title={data.name}
                paragraph={
                  data.address.indexOf(
                    chainStore.current.bech32Config.bech32PrefixAccAddr
                  ) === 0
                    ? Bech32Address.shortenAddress(data.address, 34)
                    : data.address
                }
                subParagraph={data.memo}
                icons={addressBookIcons(i)}
                data-index={i}
                onClick={selectAddressBookClick}
                style={{ cursor: onSelect ? undefined : "auto" }}
              />
            );
          })}
        </div>
      </div>
    </HeaderLayout>
  );
});

export * from "./types";
