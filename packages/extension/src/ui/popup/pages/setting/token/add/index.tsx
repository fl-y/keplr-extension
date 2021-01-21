import React, { FunctionComponent, useEffect } from "react";
import { HeaderLayout } from "../../../../layouts/header-layout";
import { useHistory, useLocation } from "react-router";
import { useIntl, FormattedMessage } from "react-intl";

import style from "./style.module.scss";
import { Button, Form, InputGroupAddon } from "reactstrap";
import { Input } from "../../../../../components/form";
import { observer } from "mobx-react";
import { useStore } from "../../../../stores";
import useForm from "react-hook-form";
import { AccAddress } from "@chainapsis/cosmosjs/common/address";
import {
  CW20Currency,
  Secret20Currency,
} from "../../../../../../common/currency";
import { sendMessage } from "../../../../../../common/message/send";
import { BACKGROUND_PORT } from "../../../../../../common/message/constant";
import queryString from "query-string";
import { fitWindow } from "../../../../../../common/window";
import {
  ApproveSuggestedTokenMsg,
  RejectSuggestedTokenMsg,
} from "../../../../../../background/tokens/messages";

interface FormData {
  contractAddress: string;
  // For the secret20
  viewingKey: string;
}

export const AddTokenPage: FunctionComponent = observer(() => {
  const history = useHistory();
  const intl = useIntl();

  const location = useLocation();
  const query = queryString.parse(location.search);
  const external = query.external ?? false;

  useEffect(() => {
    if (external) {
      fitWindow();
    }
  }, [external]);

  const { chainStore, queriesStore, accountStoreV2 } = useStore();

  const accountInfo = accountStoreV2.getAccount(chainStore.chainInfo.chainId);

  useEffect(() => {
    if (query.chainId && typeof query.chainId === "string") {
      chainStore.setChain(query.chainId);
    }
  }, [chainStore, query.chainId]);

  useEffect(() => {
    // Force reject when closing window.
    const beforeunload = async () => {
      if (external) {
        const msg = new RejectSuggestedTokenMsg(chainStore.chainInfo.chainId);
        await sendMessage(BACKGROUND_PORT, msg);
      }
    };

    addEventListener("beforeunload", beforeunload);
    return () => {
      removeEventListener("beforeunload", beforeunload);
    };
  }, [chainStore.chainInfo.chainId, external]);

  const form = useForm<FormData>({
    defaultValues: {
      contractAddress: (query.contractAddress as string) ?? "",
      viewingKey: query.viewingKey
        ? decodeURIComponent(query.viewingKey as string)
        : "",
    },
  });

  const contractAddress = form.watch("contractAddress");

  const queries = queriesStore.get(chainStore.chainInfo.chainId);
  const queryContractInfo = queries
    .getQuerySecret20ContractInfo()
    .getQueryContract(contractAddress);

  const tokenInfo = queryContractInfo.tokenInfo;

  const isSecret20 =
    (chainStore.chainInfo.features ?? []).find(
      (feature) => feature === "secretwasm"
    ) != null;

  // const notification = useNotification();
  // const loadingIndicator = useLoadingIndicator();

  const createViewingKey = async () => {
    const viewingKey = await accountInfo.createSecret20ViewingKey(
      contractAddress,
      {
        gas: "150000",
        amount: [
          {
            denom: "test",
            amount: "1",
          },
        ],
      }
    );

    console.log(viewingKey);
  };

  return (
    <HeaderLayout
      showChainName={false}
      canChangeChainInfo={false}
      alternativeTitle={intl.formatMessage({
        id: "setting.token.add",
      })}
      onBackButton={
        query.external
          ? undefined
          : () => {
              history.goBack();
            }
      }
    >
      <Form
        className={style.container}
        onSubmit={form.handleSubmit(async (data) => {
          if (tokenInfo?.decimals && tokenInfo.name && tokenInfo.symbol) {
            if (!isSecret20) {
              const currency: CW20Currency = {
                type: "cw20",
                contractAddress: data.contractAddress,
                coinMinimalDenom: tokenInfo.name,
                coinDenom: tokenInfo.symbol,
                coinDecimals: tokenInfo.decimals,
              };

              await chainStore.addToken(currency);
            } else {
              const currency: Secret20Currency = {
                type: "secret20",
                contractAddress: data.contractAddress,
                viewingKey: data.viewingKey,
                coinMinimalDenom: tokenInfo.name,
                coinDenom: tokenInfo.symbol,
                coinDecimals: tokenInfo.decimals,
              };

              await chainStore.addToken(currency);
            }

            if (external) {
              const msg = new ApproveSuggestedTokenMsg(
                chainStore.chainInfo.chainId
              );
              await sendMessage(BACKGROUND_PORT, msg);
              window.close();
            } else {
              history.push({
                pathname: "/",
              });
            }
          }
        })}
      >
        <Input
          type="text"
          label={intl.formatMessage({
            id: "setting.token.add.contract-address",
          })}
          name="contractAddress"
          autoComplete="off"
          ref={form.register({
            required: "Contract address is required",
            validate: (value: string): string | undefined => {
              try {
                AccAddress.fromBech32(
                  value,
                  chainStore.chainInfo.bech32Config.bech32PrefixAccAddr
                );
              } catch {
                return "Invalid address";
              }
            },
          })}
          error={
            form.errors.contractAddress
              ? form.errors.contractAddress.message
              : tokenInfo == null
              ? queryContractInfo.error?.message
              : undefined
          }
        />
        {isSecret20 ? (
          <Input
            type="text"
            label={intl.formatMessage({
              id: "setting.token.add.secret20.viewing-key",
            })}
            name="viewingKey"
            autoComplete="off"
            ref={form.register({
              required: "Viewing key is required",
            })}
            error={
              form.errors.viewingKey
                ? form.errors.viewingKey.message
                : undefined
            }
            append={
              <InputGroupAddon addonType="append">
                <Button
                  color="primary"
                  disabled={!accountInfo.isReadyToSendMsgs || tokenInfo == null}
                  onClick={async (e) => {
                    e.preventDefault();

                    await createViewingKey();
                  }}
                >
                  <FormattedMessage id="setting.token.add.secret20.viewing-key.button.create" />
                </Button>
              </InputGroupAddon>
            }
          />
        ) : null}
        <Input
          type="text"
          label={intl.formatMessage({
            id: "setting.token.add.name",
          })}
          value={tokenInfo?.name ?? ""}
          readOnly={true}
        />
        <Input
          type="text"
          label={intl.formatMessage({
            id: "setting.token.add.symbol",
          })}
          value={tokenInfo?.symbol ?? ""}
          readOnly={true}
        />
        <Input
          type="text"
          label={intl.formatMessage({
            id: "setting.token.add.decimals",
          })}
          value={tokenInfo?.decimals ?? ""}
          readOnly={true}
        />
        <div style={{ flex: 1 }} />
        <Button
          type="submit"
          color="primary"
          disabled={tokenInfo == null || queryContractInfo.isFetching}
        >
          <FormattedMessage id="setting.token.add.button.submit" />
        </Button>
      </Form>
    </HeaderLayout>
  );
});
