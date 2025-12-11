import { createAvatar } from "@dicebear/core";
import * as botttsNeutral from "@dicebear/bottts-neutral";
import * as initials from "@dicebear/initials";

export type AvatarVariant = "botttsNeutral" | "initials";

export function generateAvatarUri(
  seed: string,
  variant: AvatarVariant
): string {
  let avatar;

  if (variant === "botttsNeutral") {
    avatar = createAvatar(botttsNeutral, {
      seed,
    });
  } else {
    avatar = createAvatar(initials, {
      seed,
      fontWeight: 500,
      fontSize: 42,
    });
  }

  return avatar.toDataUri();
}
