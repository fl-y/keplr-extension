import { Message } from "./message";

export type MessageSender = Pick<browser.runtime.MessageSender, "id" | "url">;

export type FnRequestInteraction = <M extends Message<unknown>>(
  url: string,
  msg?: M,
  options?: {
    forceOpenWindow?: boolean;
    channel?: string;
  }
) => Promise<(M extends Message<infer R> ? R : never) | undefined>;

export interface Env {
  readonly extensionId: string;
  readonly extensionBaseURL: string;

  requestInteraction: FnRequestInteraction;
}

export interface MessageRequester {
  sendMessage<M extends Message<unknown>>(
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never>;
}
