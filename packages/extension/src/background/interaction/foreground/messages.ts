import { Message } from "../../../common/message";
import { ROUTE } from "./constants";
import { InteractionWaitingData } from "../types";

export class PushInteractionDataMsg extends Message<void> {
  public static type() {
    return "push-interaction-data";
  }

  constructor(public readonly data: InteractionWaitingData) {
    super();
  }

  validateBasic(): void {
    // notop
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return PushInteractionDataMsg.type();
  }
}
