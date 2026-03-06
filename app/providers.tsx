"use client";

import { Suspense } from "react";
import AuthWatcher from "@/app/components/AuthWatcher";
import AuthBootstrap from "@/app/components/AuthBootstrap";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <AuthBootstrap />
      </Suspense>
      <Suspense fallback={null}>
        <AuthWatcher />
      </Suspense>
    </>
  );
}
