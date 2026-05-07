import AuthGuard from "../components/auth-guard";
import PatientPortalShell from "../components/patient-portal-shell";

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard area="portal">
      <PatientPortalShell>{children}</PatientPortalShell>
    </AuthGuard>
  );
}
