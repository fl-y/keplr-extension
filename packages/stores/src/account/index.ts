import { HasMapStore } from "../common";
import { DenomHelper } from "@keplr/common";
import { ChainGetter } from "../common";
import { computed, observable, runInAction } from "mobx";
import { actionAsync, task } from "mobx-utils";
import { AppCurrency, Keplr } from "@keplr/types";
import { BaseAccount, TendermintTxTracer } from "@keplr/cosmos";
import Axios, { AxiosInstance } from "axios";
import {
  BroadcastMode,
  encodeSecp256k1Signature,
  makeSignDoc,
  makeStdTx,
  Msg,
  serializeSignDoc,
  StdFee,
} from "@cosmjs/launchpad";
import { fromHex } from "@cosmjs/encoding";
import { Coin, Dec, DecUtils } from "@keplr/unit";
import { QueriesStore } from "../query";
import { Queries } from "../query/queries";
import PQueue from "p-queue";

import { Buffer } from "buffer/";
import { BondStatus } from "../query/cosmos/staking/types";

export enum WalletStatus {
  Loading = "Loading",
  Loaded = "Loaded",
  NotExist = "NotExist",
}

export interface AccountStoreInnerOpts {
  reinitializeWhenKeyStoreChanged: boolean;
}

export class AccountStoreInner {
  @observable
  protected _walletStatus!: WalletStatus;

  @observable
  protected _name!: string;

  @observable
  protected _bech32Address!: string;

  @observable
  protected _isSendingMsg!: boolean;

  public broadcastMode: "sync" | "async" | "block" = "async";

  protected pubKey: Uint8Array;

  // If there are multiple enabling at the same time,
  // keplr wallet works somewhat strangely.
  // So to solve this problem, just make enabling execute sequently.
  protected static enablingQueue: PQueue = new PQueue({
    concurrency: 1,
  });

  constructor(
    protected readonly chainGetter: ChainGetter,
    protected readonly chainId: string,
    protected readonly queries: Queries,
    protected readonly opts: AccountStoreInnerOpts = {
      reinitializeWhenKeyStoreChanged: true,
    }
  ) {
    runInAction(() => {
      this._walletStatus = WalletStatus.Loading;
      this._name = "";
      this._bech32Address = "";
      this._isSendingMsg = false;
    });

    this.pubKey = new Uint8Array();

    this.init();
  }

  protected async enable(keplr: Keplr, chainId: string): Promise<void> {
    const chainInfo = this.chainGetter.getChain(chainId);

    await keplr.experimentalSuggestChain(chainInfo);
    await keplr.enable(chainId);
  }

  @actionAsync
  protected readonly init = async () => {
    // If wallet status is not exist, there is no need to try to init because it always fails.
    if (this.walletStatus === WalletStatus.NotExist) {
      return;
    }

    if (this.opts.reinitializeWhenKeyStoreChanged) {
      // If key store in the keplr extension is changed, this event will be dispatched.
      window.addEventListener("keplr_keystorechange", this.init, {
        once: true,
      });
    }

    // Set wallet status as loading whenever try to init.
    this._walletStatus = WalletStatus.Loading;

    const keplr = await task(AccountStore.getKeplr());
    if (!keplr) {
      this._walletStatus = WalletStatus.NotExist;
      return;
    }

    // TODO: Handle not approved.
    await task(
      AccountStoreInner.enablingQueue.add(() =>
        this.enable(keplr, this.chainId)
      )
    );

    const key = await task(keplr.getKey(this.chainId));
    this._bech32Address = key.bech32Address;
    this._name = key.name;
    this.pubKey = fromHex(key.pubKeyHex);

    // Set the wallet status as loaded after getting all necessary infos.
    this._walletStatus = WalletStatus.Loaded;
  };

  @computed
  get isReadyToSendMsgs(): boolean {
    return (
      this.walletStatus === WalletStatus.Loaded && this.bech32Address !== ""
    );
  }

  async sendMsgs(
    msgs: Msg[],
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    runInAction(() => {
      this._isSendingMsg = true;
    });
    const txHash = await this.broadcastMsgs(
      msgs,
      fee,
      memo,
      this.broadcastMode
    );

    const txTracer = new TendermintTxTracer(
      this.chainGetter.getChain(this.chainId).rpc,
      "/websocket"
    );
    txTracer.traceTx(txHash).then((tx) => {
      runInAction(() => {
        this._isSendingMsg = false;
      });

      // After sending tx, the balances is probably changed due to the fee.
      this.queries
        .getQueryBalances()
        .getQueryBech32Address(this.bech32Address)
        .fetch();

      if (onFulfill) {
        onFulfill(tx);
      }
    });
  }

  async sendToken(
    amount: string,
    currency: AppCurrency,
    recipient: string,
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    const denomHelper = new DenomHelper(currency.coinMinimalDenom);

    const actualAmount = (() => {
      let dec = new Dec(amount);
      dec = dec.mul(DecUtils.getPrecisionDec(currency.coinDecimals));
      return dec.truncate().toString();
    })();

    switch (denomHelper.type) {
      case "native":
        await this.sendMsgs(
          [
            {
              type: "cosmos-sdk/MsgSend",
              value: {
                from_address: this.bech32Address,
                to_address: recipient,
                amount: [
                  {
                    denom: currency.coinMinimalDenom,
                    amount: actualAmount,
                  },
                ],
              },
            },
          ],
          fee,
          memo,
          (tx) => {
            if (tx.code == null || tx.code === 0) {
              // After succeeding to send token, refresh the balance.
              const queryBalance = this.queries
                .getQueryBalances()
                .getQueryBech32Address(this.bech32Address)
                .balances.find((bal) => {
                  return (
                    bal.currency.coinMinimalDenom === currency.coinMinimalDenom
                  );
                });

              if (queryBalance) {
                queryBalance.fetch();
              }
            }

            if (onFulfill) {
              onFulfill(tx);
            }
          }
        );
        return;
      case "secret20":
        if (!("type" in currency) || currency.type !== "secret20") {
          throw new Error("Currency is not secret20");
        }
        await this.sendExecuteSecretContractMsg(
          currency.contractAddress,
          {
            transfer: {
              recipient: recipient,
              amount: actualAmount,
            },
          },
          fee,
          memo,
          (tx) => {
            if (tx.code == null || tx.code === 0) {
              // After succeeding to send token, refresh the balance.
              const queryBalance = this.queries
                .getQueryBalances()
                .getQueryBech32Address(this.bech32Address)
                .balances.find((bal) => {
                  return (
                    bal.currency.coinMinimalDenom === currency.coinMinimalDenom
                  );
                });

              if (queryBalance) {
                queryBalance.fetch();
              }
            }

            if (onFulfill) {
              onFulfill(tx);
            }
          }
        );
        return;
      default:
        throw new Error(`Unsupported type of currency (${denomHelper.type})`);
    }
  }

  /**
   * Send `MsgDelegate` msg to the chain.
   * @param amount Decimal number used by humans.
   *               If amount is 0.1 and the stake currenct is uatom, actual amount will be changed to the 100000uatom.
   * @param validatorAddress
   * @param fee
   * @param memo
   * @param onFulfill
   */
  async sendDelegateMsg(
    amount: string,
    validatorAddress: string,
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    const currency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    let dec = new Dec(amount);
    dec = dec.mulTruncate(DecUtils.getPrecisionDec(currency.coinDecimals));

    const msg = {
      type: "cosmos-sdk/MsgDelegate",
      value: {
        delegator_address: this.bech32Address,
        validator_address: validatorAddress,
        amount: {
          denom: currency.coinMinimalDenom,
          amount: dec.truncate().toString(),
        },
      },
    };

    await this.sendMsgs([msg], fee, memo, (tx) => {
      if (tx.code == null || tx.code === 0) {
        // After succeeding to delegate, refresh the validators and delegations, rewards.
        this.queries
          .getQueryValidators()
          .getQueryStatus(BondStatus.Bonded)
          .fetch();
        this.queries
          .getQueryDelegations()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
        this.queries
          .getQueryRewards()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
      }

      if (onFulfill) {
        onFulfill(tx);
      }
    });
  }

  /**
   * Send `MsgUndelegate` msg to the chain.
   * @param amount Decimal number used by humans.
   *               If amount is 0.1 and the stake currenct is uatom, actual amount will be changed to the 100000uatom.
   * @param validatorAddress
   * @param fee
   * @param memo
   * @param onFulfill
   */
  async sendUndelegateMsg(
    amount: string,
    validatorAddress: string,
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    const currency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    let dec = new Dec(amount);
    dec = dec.mulTruncate(DecUtils.getPrecisionDec(currency.coinDecimals));

    const msg = {
      type: "cosmos-sdk/MsgUndelegate",
      value: {
        delegator_address: this.bech32Address,
        validator_address: validatorAddress,
        amount: {
          denom: currency.coinMinimalDenom,
          amount: dec.truncate().toString(),
        },
      },
    };

    await this.sendMsgs([msg], fee, memo, (tx) => {
      if (tx.code == null || tx.code === 0) {
        // After succeeding to unbond, refresh the validators and delegations, unbonding delegations, rewards.
        this.queries
          .getQueryValidators()
          .getQueryStatus(BondStatus.Bonded)
          .fetch();
        this.queries
          .getQueryDelegations()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
        this.queries
          .getQueryUnbondingDelegations()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
        this.queries
          .getQueryRewards()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
      }

      if (onFulfill) {
        onFulfill(tx);
      }
    });
  }

  /**
   * Send `MsgBeginRedelegate` msg to the chain.
   * @param amount Decimal number used by humans.
   *               If amount is 0.1 and the stake currenct is uatom, actual amount will be changed to the 100000uatom.
   * @param srcValidatorAddress
   * @param dstValidatorAddress
   * @param fee
   * @param memo
   * @param onFulfill
   */
  async sendBeginRedelegateMsg(
    amount: string,
    srcValidatorAddress: string,
    dstValidatorAddress: string,
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    const currency = this.chainGetter.getChain(this.chainId).stakeCurrency;

    let dec = new Dec(amount);
    dec = dec.mulTruncate(DecUtils.getPrecisionDec(currency.coinDecimals));

    const msg = {
      type: "cosmos-sdk/MsgBeginRedelegate",
      value: {
        delegator_address: this.bech32Address,
        validator_src_address: srcValidatorAddress,
        validator_dst_address: dstValidatorAddress,
        amount: {
          denom: currency.coinMinimalDenom,
          amount: dec.truncate().toString(),
        },
      },
    };

    await this.sendMsgs([msg], fee, memo, (tx) => {
      if (tx.code == null || tx.code === 0) {
        // After succeeding to redelegate, refresh the validators and delegations, rewards.
        this.queries
          .getQueryValidators()
          .getQueryStatus(BondStatus.Bonded)
          .fetch();
        this.queries
          .getQueryDelegations()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
        this.queries
          .getQueryRewards()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
      }

      if (onFulfill) {
        onFulfill(tx);
      }
    });
  }

  async sendWithdrawDelegationRewardMsgs(
    validatorAddresses: string[],
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    const msgs = validatorAddresses.map((validatorAddress) => {
      return {
        type: "cosmos-sdk/MsgWithdrawDelegationReward",
        value: {
          delegator_address: this.bech32Address,
          validator_address: validatorAddress,
        },
      };
    });

    await this.sendMsgs(msgs, fee, memo, (tx) => {
      if (tx.code == null || tx.code === 0) {
        // After succeeding to withdraw rewards, refresh rewards.
        this.queries
          .getQueryRewards()
          .getQueryBech32Address(this.bech32Address)
          .fetch();
      }

      if (onFulfill) {
        onFulfill(tx);
      }
    });
  }

  async sendGovVoteMsg(
    proposalId: string,
    option: "Yes" | "No" | "Abstain" | "NoWithVeto",
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ) {
    const msg = {
      type: "cosmos-sdk/MsgVote",
      value: {
        option,
        proposal_id: proposalId,
        voter: this.bech32Address,
      },
    };

    await this.sendMsgs([msg], fee, memo, (tx) => {
      if (tx.code == null || tx.code === 0) {
        // After succeeding to vote, refresh the proposal.
        const proposal = this.queries
          .getQueryGovernance()
          .proposals.find((proposal) => proposal.id === proposalId);
        if (proposal) {
          proposal.fetch();
        }
      }

      if (onFulfill) {
        onFulfill(tx);
      }
    });
  }

  async createSecret20ViewingKey(
    contractAddress: string,
    fee: StdFee,
    memo: string = ""
  ): Promise<string> {
    const random = new Uint8Array(15);
    crypto.getRandomValues(random);
    const entropy = Buffer.from(random).toString("hex");

    return new Promise<string>(async (resolve) => {
      const encrypted = await this.sendExecuteSecretContractMsg(
        contractAddress,
        {
          create_viewing_key: { entropy },
        },
        fee,
        memo,
        async (result) => {
          if (result && "data" in result && result.data) {
            const dataOutputCipher = Buffer.from(result.data as any, "hex");

            const keplr = await AccountStore.getKeplr();

            if (!keplr) {
              throw new Error("Can't get the Keplr API");
            }

            const enigmaUtils = keplr.getEnigmaUtils(this.chainId);

            const nonce = encrypted.slice(0, 32);

            const dataOutput = Buffer.from(
              Buffer.from(
                await enigmaUtils.decrypt(dataOutputCipher, nonce)
              ).toString(),
              "base64"
            ).toString();

            // Expected: {"create_viewing_key":{"key":"api_key_1k1T...btJQo="}}
            const data = JSON.parse(dataOutput);
            const viewingKey = data["create_viewing_key"]["key"];

            resolve(viewingKey);
          }
        }
      );
    });
  }

  async sendExecuteSecretContractMsg(
    contractAddress: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    obj: object,
    // TODO: Add the `sentFunds`.
    fee: StdFee,
    memo: string = "",
    onFulfill?: (tx: any) => void
  ): Promise<Uint8Array> {
    const encryptedMsg = await (async () => {
      runInAction(() => {
        this._isSendingMsg = true;
      });
      try {
        return await this.encryptSecretContractMsg(contractAddress, obj);
      } finally {
        runInAction(() => {
          this._isSendingMsg = false;
        });
      }
    })();

    const msg = {
      type: "wasm/MsgExecuteContract",
      value: {
        sender: this.bech32Address,
        contract: contractAddress,
        callback_code_hash: "",
        msg: Buffer.from(encryptedMsg).toString("base64"),
        sent_funds: [],
        callback_sig: null,
      },
    };

    await this.sendMsgs([msg], fee, memo, onFulfill);

    return encryptedMsg;
  }

  protected async encryptSecretContractMsg(
    contractAddress: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    obj: object
  ): Promise<Uint8Array> {
    const queryContractCodeHashResponse = await this.queries
      .getQuerySecretContractCodeHash()
      .getQueryContract(contractAddress)
      .waitResponse();

    if (!queryContractCodeHashResponse) {
      throw new Error(
        `Can't get the code hash of the contract (${contractAddress})`
      );
    }

    const contractCodeHash = queryContractCodeHashResponse.data.result;

    const keplr = await AccountStore.getKeplr();
    if (!keplr) {
      throw new Error("Can't get the Keplr API");
    }

    const enigmaUtils = keplr.getEnigmaUtils(this.chainId);
    return await enigmaUtils.encrypt(contractCodeHash, obj);
  }

  // Return the tx hash.
  protected async broadcastMsgs(
    msgs: Msg[],
    fee: StdFee,
    memo: string = "",
    mode: "block" | "async" | "sync" = "async"
  ): Promise<Uint8Array> {
    if (this.walletStatus !== WalletStatus.Loaded) {
      throw new Error(`Wallet is not loaded: ${this.walletStatus}`);
    }

    if (msgs.length === 0) {
      throw new Error("There is no msg to send");
    }

    const account = await BaseAccount.fetchFromRest(
      this.instance,
      this.bech32Address
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const keplr = (await AccountStore.getKeplr())!;

    const txConfig = await keplr.getTxConfig(this.chainId, {
      gas: fee.gas,
      memo,
      fee: fee.amount.map((fee) => `${fee.amount} ${fee.denom}`).join(","),
    });

    const signDoc = makeSignDoc(
      msgs,
      {
        gas: txConfig.gas,
        // 케플러를 cosmjs에 더 친화적으로 바꿔서 밑의 라인을 줄이자...
        amount: txConfig.fee
          ? txConfig.fee
              .split(",")
              .map((feeStr) => {
                return Coin.parse(feeStr);
              })
              .map((coin) => {
                return {
                  amount: coin.amount.toString(),
                  denom: coin.denom,
                };
              })
          : [],
      },
      this.chainId,
      txConfig.memo,
      account.getAccountNumber().toString(),
      account.getSequence().toString()
    );

    const signature = await keplr.sign(
      this.chainId,
      this.bech32Address,
      serializeSignDoc(signDoc)
    );

    const signedTx = makeStdTx(
      signDoc,
      encodeSecp256k1Signature(this.pubKey, fromHex(signature.signatureHex))
    );

    return await keplr.sendTx(this.chainId, signedTx, mode as BroadcastMode);
  }

  get instance(): AxiosInstance {
    const chainInfo = this.chainGetter.getChain(this.chainId);
    return Axios.create({
      ...{
        baseURL: chainInfo.rest,
      },
      ...chainInfo.restConfig,
    });
  }

  get walletStatus(): WalletStatus {
    return this._walletStatus;
  }

  get name(): string {
    return this._name;
  }

  get bech32Address(): string {
    return this._bech32Address;
  }

  get isSendingMsg(): boolean {
    return this._isSendingMsg;
  }
}

export class AccountStore extends HasMapStore<AccountStoreInner> {
  constructor(
    protected readonly chainGetter: ChainGetter,
    protected readonly queriesStore: QueriesStore,
    accountPrefetchingChainIds: string[] = []
  ) {
    super((chainId: string) => {
      return new AccountStoreInner(
        this.chainGetter,
        chainId,
        this.queriesStore.get(chainId)
      );
    });

    for (const chainId of accountPrefetchingChainIds) {
      this.getAccount(chainId);
    }
  }

  getAccount(chainId: string): AccountStoreInner {
    return this.get(chainId);
  }

  static async getKeplr(): Promise<Keplr | undefined> {
    if (window.keplr) {
      return window.keplr;
    }

    if (document.readyState === "complete") {
      return window.keplr;
    }

    return new Promise((resolve) => {
      const documentStateChange = (event: Event) => {
        if (
          event.target &&
          (event.target as Document).readyState === "complete"
        ) {
          resolve(window.keplr);
          document.removeEventListener("readystatechange", documentStateChange);
        }
      };

      document.addEventListener("readystatechange", documentStateChange);
    });
  }
}
