"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthExpired } from "@/app/lib/authEvents";
import { currentBrowserPath, rememberOAuthNextPath } from "@/app/lib/authRouting";

export default function AuthWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthExpired(() => {
      if (pathname === "/login" || pathname === "/auth/callback") {
        return;
      }
      rememberOAuthNextPath(currentBrowserPath());
      router.push("/login?expired=1");
    });

    return () => {
      unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
