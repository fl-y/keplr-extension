import React, { FunctionComponent, useEffect, useState } from "react";
import { Button, Col, CustomInput, Modal, ModalBody, Row } from "reactstrap";
import { Bech32Address } from "@keplr/cosmos";

import style from "./bip44-select-modal.module.scss";
import { useStore } from "../../stores";
import { observer } from "mobx-react";
import { FormattedMessage } from "react-intl";
import { BIP44 } from "@keplr/types";
import { useLoadingIndicator } from "../../components/loading-indicator";

const BIP44Selectable: FunctionComponent<{
  selectable: {
    path: BIP44;
    bech32Address: string;
  };
  selected: boolean;
  onSelect: () => void;
}> = observer(({ selectable, selected, onSelect }) => {
  const { chainStore, queriesStore } = useStore();
  const queries = queriesStore.get(chainStore.current.chainId);

  const account = queries
    .getQueryAccount()
    .getQueryBech32Address(selectable.bech32Address);
  const stakable = queries
    .getQueryBalances()
    .getQueryBech32Address(selectable.bech32Address).stakable;

  return (
    <div
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        onSelect();
      }}
    >
      <CustomInput
        type="radio"
        id={`selectable-${selectable.bech32Address}`}
        checked={selected}
        onChange={() => {
          /* To prevent the readonly mode of `checked` prop, just set empty function */
        }}
      >
        <div className={style.selectable}>
          <div
            className={style.path}
          >{`m/44’/${selectable.path.coinType}’`}</div>
          <Row>
            <Col>
              <div className={style.label}>
                <FormattedMessage id="main.modal.select-account.label.address" />
              </div>
              <div className={style.value}>
                {Bech32Address.shortenAddress(selectable.bech32Address, 26)}
              </div>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className={style.label}>
                <FormattedMessage id="main.modal.select-account.label.balance" />
              </div>
              <div className={style.value}>
                {stakable.balance
                  .trim(true)
                  .shrink(true)
                  .maxDecimals(6)
                  .toString()}
                {stakable.isFetching ? (
                  <i className="fas fa-spinner fa-spin ml-1" />
                ) : null}
              </div>
            </Col>
            <Col>
              <div className={style.label}>
                <FormattedMessage id="main.modal.select-account.label.sequence" />
              </div>
              <div className={style.value}>
                {account.sequence}
                {account.isFetching ? (
                  <i className="fas fa-spinner fa-spin ml-1" />
                ) : null}
              </div>
            </Col>
          </Row>
        </div>
      </CustomInput>
    </div>
  );
});

export const BIP44SelectModal: FunctionComponent = observer(() => {
  const { chainStore, keyRingStore } = useStore();

  const selectables = keyRingStore.getKeyStoreSelectables(
    chainStore.current.chainId
  );

  const loadingIndicator = useLoadingIndicator();
  useEffect(() => {
    loadingIndicator.setIsLoading(
      "bip44-selectables-init",
      selectables.isInitializing
    );
  }, [loadingIndicator, selectables.isInitializing]);

  const [selectedCoinType, setSelectedCoinType] = useState(-1);

  return (
    <Modal
      isOpen={!selectables.isInitializing && selectables.needSelectCoinType}
      centered
    >
      <ModalBody>
        <div className={style.title}>
          <FormattedMessage id="main.modal.select-account.title" />
        </div>
        <div>
          {selectables.selectables.map((selectable) => {
            return (
              <BIP44Selectable
                key={selectable.bech32Address}
                selectable={selectable}
                selected={selectedCoinType === selectable.path.coinType}
                onSelect={() => {
                  setSelectedCoinType(selectable.path.coinType);
                }}
              />
            );
          })}
        </div>
        <Button
          type="button"
          color="primary"
          block
          style={{ marginTop: "10px" }}
          disabled={selectedCoinType < 0}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (selectedCoinType >= 0) {
              await keyRingStore.setKeyStoreCoinType(
                chainStore.current.chainId,
                selectedCoinType
              );
            }
          }}
        >
          <FormattedMessage id="main.modal.select-account.button.select" />
        </Button>
      </ModalBody>
    </Modal>
  );
});
