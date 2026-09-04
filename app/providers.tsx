"use client";

import { Suspense } from "react";
import { QueryClient, QueryClientProvider, environmentManager } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import AuthWatcher from "@/app/components/AuthWatcher";
import AuthBootstrap from "@/app/components/AuthBootstrap";
import StoreProvider from "@/app/StoreProvider";

type ProvidersProps = {
  children: React.ReactNode;
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export default function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();
  return (
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: "easeOut" }}>
          {children}
          <Suspense fallback={null}>
            <AuthBootstrap />
          </Suspense>
          <Suspense fallback={null}>
            <AuthWatcher />
          </Suspense>
        </MotionConfig>
      </QueryClientProvider>
    </StoreProvider>
  );
}
