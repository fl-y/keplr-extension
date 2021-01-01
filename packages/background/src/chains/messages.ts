import { Message } from "@keplr/router";
import { AccessOrigin, ChainInfoWithEmbed } from "./types";
import { ChainInfo } from "@keplr/types";
import { ROUTE } from "./constants";

export class GetChainInfosMsg extends Message<{
  chainInfos: ChainInfoWithEmbed[];
}> {
  public static type() {
    return "get-chain-infos";
  }

  validateBasic(): void {
    // noop
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetChainInfosMsg.type();
  }
}

export class SuggestChainInfoMsg extends Message<void> {
  public static type() {
    return "suggest-chain-info";
  }

  constructor(public readonly chainInfo: ChainInfo) {
    super();
  }

  validateBasic(): void {
    if (!this.chainInfo) {
      throw new Error("chain info not set");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return SuggestChainInfoMsg.type();
  }
}

export class RemoveSuggestedChainInfoMsg extends Message<ChainInfoWithEmbed[]> {
  public static type() {
    return "remove-suggested-chain-info";
  }

  constructor(public readonly chainId: string) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("Chain id not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RemoveSuggestedChainInfoMsg.type();
  }
}

export class ReqeustAccessMsg extends Message<void> {
  public static type() {
    return "request-access";
  }

  constructor(
    public readonly chainId: string,
    public readonly appOrigin: string
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("chain id is empty");
    }

    if (!this.appOrigin) {
      throw new Error("Empty origin");
    }

    const url = new URL(this.appOrigin);
    if (!url.origin || url.origin === "null") {
      throw new Error("Invalid app origin");
    }
  }

  approveExternal(): boolean {
    return true;
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return ReqeustAccessMsg.type();
  }
}

export class GetAccessOriginMsg extends Message<AccessOrigin> {
  public static type() {
    return "get-access-origin";
  }

  constructor(public readonly chainId: string) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("Empty chain id");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetAccessOriginMsg.type();
  }
}

export class RemoveAccessOriginMsg extends Message<void> {
  public static type() {
    return "remove-access-origin";
  }

  constructor(
    public readonly chainId: string,
    public readonly appOrigin: string
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("Empty chain id");
    }

    if (!this.appOrigin) {
      throw new Error("Empty origin");
    }

    const url = new URL(this.appOrigin);
    if (!url.origin || url.origin === "null") {
      throw new Error("Invalid app origin");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RemoveAccessOriginMsg.type();
  }
}

export class TryUpdateChainMsg extends Message<{
  // Updated chain id
  chainId: string;
  chainInfos: ChainInfoWithEmbed[];
}> {
  public static type() {
    return "try-update-chain";
  }

  constructor(public readonly chainId: string) {
    super();
  }

  validateBasic(): void {
    if (!this.chainId) {
      throw new Error("Empty chain id");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return TryUpdateChainMsg.type();
  }
}
