import { Message } from "@keplr/router";
import { ROUTE } from "./constants";

export class SendTxMsg extends Message<unknown> {
  public static type() {
    return "send-tx-to-background";
  }

  constructor(
    public readonly chainId: string,
    public readonly tx: unknown,
    public readonly mode: "async" | "sync" | "block"
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("chain id is empty");
    }

    if (!this.tx) {
      throw new Error("tx is empty");
    }

    if (
      !this.mode ||
      (this.mode !== "sync" && this.mode !== "async" && this.mode !== "block")
    ) {
      throw new Error("invalid mode");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return SendTxMsg.type();
  }
}

export class RequestBackgroundTxMsg extends Message<{}> {
  public static type() {
    return "request-background-tx";
  }

  /**
   * @param chainId Chain id
   * @param txBytes Hex encoded bytes for tx
   * @param mode Broadcast mode
   */
  constructor(
    public readonly chainId: string,
    public readonly txBytes: string,
    public readonly mode: "sync" | "async" | "commit",
    public readonly isRestAPI: boolean = false
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("chain id is empty");
    }

    if (!this.txBytes) {
      throw new Error("tx bytes is empty");
    }

    if (
      !this.mode ||
      (this.mode !== "sync" && this.mode !== "async" && this.mode !== "commit")
    ) {
      throw new Error("invalid mode");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RequestBackgroundTxMsg.type();
  }
}

export class RequestBackgroundTxWithResultMsg extends Message<unknown> {
  public static type() {
    return "request-background-tx-with-result";
  }

  /**
   * @param chainId Chain id
   * @param txBytes Hex encoded bytes for tx
   * @param mode Broadcast mode
   */
  constructor(
    public readonly chainId: string,
    public readonly txBytes: string,
    public readonly mode: "sync" | "async" | "commit",
    public readonly isRestAPI: boolean = false
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("chain id is empty");
    }

    if (!this.txBytes) {
      throw new Error("tx bytes is empty");
    }

    if (
      !this.mode ||
      (this.mode !== "sync" && this.mode !== "async" && this.mode !== "commit")
    ) {
      throw new Error("invalid mode");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RequestBackgroundTxWithResultMsg.type();
  }
}
