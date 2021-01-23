import { ChainIdHelper } from "@keplr/cosmos";

export const INTERACTION_TYPE_PERMISSION = "permission";

export function getBasicAccessPermissionType(chainId: string) {
  const identifier = ChainIdHelper.parse(chainId);

  return `basic-access/${identifier}`;
}

export function splitBasicAccessPermissionType(type: string): string {
  return type.replace("basic-access/", "");
}

export interface PermissionData {
  type: string;
  origins: string[];
}
