import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="auth-halo" aria-hidden="true" />
      <main className="auth-main">{children}</main>
    </AuthGuard>
  );
}
