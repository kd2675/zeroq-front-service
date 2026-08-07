"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthExpired } from "@/app/lib/authEvents";
import { buildLoginPath, currentBrowserPath } from "@/app/lib/authRouting";

export default function AuthWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthExpired(() => {
      if (pathname === "/login" || pathname === "/auth/callback") {
        return;
      }
      router.push(buildLoginPath(currentBrowserPath(), true));
    });

    return () => {
      unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
