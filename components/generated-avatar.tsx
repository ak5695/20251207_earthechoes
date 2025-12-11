"use client";

import React, { useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { generateAvatarUri, AvatarVariant } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface GeneratedAvatarProps {
  seed: string;
  variant?: AvatarVariant;
  className?: string;
}

export function GeneratedAvatar({
  seed,
  variant = "botttsNeutral",
  className,
}: GeneratedAvatarProps) {
  const avatarUri = useMemo(() => {
    return generateAvatarUri(seed, variant);
  }, [seed, variant]);

  const initials = seed.charAt(0).toUpperCase();

  return (
    <Avatar className={cn("bg-white/10", className)}>
      <AvatarImage src={avatarUri} alt={seed} />
      <AvatarFallback className="bg-slate-800 text-white">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
