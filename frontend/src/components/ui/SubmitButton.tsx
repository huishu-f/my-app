"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import type { ButtonVariant, ButtonSize } from "@my-app/shared";

interface SubmitButtonProps {
  children: React.ReactNode;

  className?: string;

  variant?: ButtonVariant;

  size?: ButtonSize;
}

export function SubmitButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {children}
    </Button>
  );
}
