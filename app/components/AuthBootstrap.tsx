"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { bootstrapAccessToken, getAccessToken } from "@/app/lib/auth";

let bootstrapStarted = false;

export default function AuthBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (bootstrapStarted || pathname === "/login") {
      return;
    }

    bootstrapStarted = true;
    if (getAccessToken()) {
      return;
    }

    void bootstrapAccessToken();
  }, [pathname]);

  return null;
}
