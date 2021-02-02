import React, { FunctionComponent } from "react";

import { HeaderLayout } from "../../layouts";

import { Card, CardBody } from "reactstrap";

import style from "./style.module.scss";
import { Menu } from "./menu";
import { AccountView } from "./account";
import { TxButtonView } from "./tx-button";
import { AssetView } from "./asset";
import { StakeView } from "./stake";

import classnames from "classnames";
import { useHistory } from "react-router";
import { observer } from "mobx-react";
import { useStore } from "../../stores";
import { TokensView } from "./token";
import { BIP44SelectModal } from "./bip44-select-modal";

export const MainPage: FunctionComponent = observer(() => {
  const history = useHistory();
  // const intl = useIntl();

  const { chainStore, accountStore, queriesStore } = useStore();

  // const confirm = useConfirm();

  // TODO
  /*
  const prevChainId = useRef<string | undefined>();
  useEffect(() => {
    if (prevChainId.current !== chainStore.current.chainId) {
      // FIXME: This will be executed twice on initial because chain store set the chain info on constructor and init.
      (async () => {
        if (await ChainUpdaterKeeper.checkChainUpdate(chainStore.current)) {
          // If chain info has been changed, warning the user wether update the chain or not.
          if (
            await confirm.confirm({
              paragraph: intl.formatMessage({
                id: "main.update-chain.confirm.paragraph",
              }),
              yes: intl.formatMessage({
                id: "main.update-chain.confirm.yes",
              }),
              no: intl.formatMessage({
                id: "main.update-chain.confirm.no",
              }),
            })
          ) {
            await chainStore.tryUpdateChain(chainStore.current.chainId);
          }
        }
      })();
    }

    prevChainId.current = chainStore.current.chainId;
  }, [chainStore, chainStore.current, confirm, intl]);
   */

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const queryBalances = queriesStore
    .get(chainStore.current.chainId)
    .getQueryBalances()
    .getQueryBech32Address(accountInfo.bech32Address);

  const tokens = queryBalances.unstakables;

  const hasTokens = tokens.length > 0;

  return (
    <HeaderLayout
      showChainName
      canChangeChainInfo
      menuRenderer={<Menu />}
      rightRenderer={
        <div
          style={{
            height: "64px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingRight: "20px",
          }}
        >
          <i
            className="fas fa-user"
            style={{
              cursor: "pointer",
              padding: "4px",
            }}
            onClick={(e) => {
              e.preventDefault();

              history.push("/setting/set-keyring");
            }}
          />
        </div>
      }
    >
      <BIP44SelectModal />
      <Card className={classnames(style.card, "shadow")}>
        <CardBody>
          <div className={style.containerAccountInner}>
            <AccountView />
            <AssetView />
            <TxButtonView />
          </div>
        </CardBody>
      </Card>
      {chainStore.current.walletUrlForStaking ? (
        <Card className={classnames(style.card, "shadow")}>
          <CardBody>
            <StakeView />
          </CardBody>
        </Card>
      ) : null}
      {hasTokens ? (
        <Card className={classnames(style.card, "shadow")}>
          <CardBody>{<TokensView />}</CardBody>
        </Card>
      ) : null}
    </HeaderLayout>
  );
});
