import { ProviderMode } from "@/generated/prisma/enums";

export function providerModeForEnvironment(
  environment: string | undefined,
): ProviderMode {
  return environment === "live" ? ProviderMode.LIVE : ProviderMode.TEST;
}
