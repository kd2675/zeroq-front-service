"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import useAuthSession from "@/app/hooks/useAuthSession";
import { logout } from "@/app/lib/auth";
import { resetExploreSession } from "@/lib/features/explore/exploreSlice";
import { useAppDispatch } from "@/lib/hooks";

/** 보호 화면의 세션 복구·로그인 이동·로그아웃 동작을 한곳에서 일관되게 처리한다. */
export default function useProtectedPage() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const session = useAuthSession();

  useEffect(() => {
    if (session.isHydrated && session.authStatus === "out") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, session.authStatus, session.isHydrated]);

  const signOut = async () => {
    queryClient.clear();
    dispatch(resetExploreSession());
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  };

  return {
    ...session,
    isReady: session.isHydrated && session.authStatus === "in",
    signOut,
  };
}
