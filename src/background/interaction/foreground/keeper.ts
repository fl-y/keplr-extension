import { InteractionForegroundHandler } from "./types";
import { InteractionWaitingData } from "../types";

export class InteractionForegroundKeeper {
  constructor(protected handler: InteractionForegroundHandler) {}

  pushData(data: InteractionWaitingData): void {
    this.handler.onInteractionDataReceived(data);
  }
}
