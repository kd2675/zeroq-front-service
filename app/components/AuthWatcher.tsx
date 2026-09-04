"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { onAuthExpired } from "@/app/lib/authEvents";
import { buildLoginPath, currentBrowserPath } from "@/app/lib/authRouting";
import { resetExploreSession } from "@/lib/features/explore/exploreSlice";
import { useAppDispatch } from "@/lib/hooks";

export default function AuthWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthExpired(() => {
      if (pathname === "/login" || pathname === "/auth/callback") {
        return;
      }
      queryClient.clear();
      dispatch(resetExploreSession());
      router.push(buildLoginPath(currentBrowserPath(), true));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, pathname, queryClient, router]);

  return null;
}
