import AuthGuard from "../components/auth-guard";
import WorkspaceShell from "../components/workspace-shell";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard area="workspace">
      <WorkspaceShell>{children}</WorkspaceShell>
    </AuthGuard>
  );
}
