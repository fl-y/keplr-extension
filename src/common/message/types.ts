import { Message } from "./message";

export type MessageSender = Pick<browser.runtime.MessageSender, "id" | "url">;

export interface Env {
  readonly extensionId: string;
  readonly extensionBaseURL: string;

  requestInteraction<M extends Message<unknown>>(
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never>;
}

export interface MessageRequester {
  sendMessage<M extends Message<unknown>>(
    port: string,
    msg: M
  ): Promise<M extends Message<infer R> ? R : never>;
}
