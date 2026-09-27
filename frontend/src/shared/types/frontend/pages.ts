import type { ReactNode } from "react";

export interface ProvidersProps {
  children: ReactNode;
}

export interface ErrorBoundaryProps {
  error: Error & { digest?: string };

  reset: () => void;
}
