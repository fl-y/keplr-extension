import { Message } from "@keplr/router";
import { ROUTE } from "./constants";

export class GetPermissionOriginsMsg extends Message<string[]> {
  public static type() {
    return "get-permission-origins";
  }

  constructor(public readonly permissionType: string) {
    super();
  }

  validateBasic(): void {
    if (!this.permissionType) {
      throw new Error("empty permission type");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetPermissionOriginsMsg.type();
  }
}

export class RemovePermissionOrigin extends Message<void> {
  public static type() {
    return "remove-permission-origin";
  }

  constructor(
    public readonly permissionType: string,
    public readonly permissionOrigin: string
  ) {
    super();
  }

  validateBasic(): void {
    if (!this.permissionType) {
      throw new Error("empty permission type");
    }

    if (!this.permissionOrigin) {
      throw new Error("empty permission origin");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RemovePermissionOrigin.type();
  }
}
