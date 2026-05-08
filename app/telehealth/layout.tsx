import AuthGuard from "../components/auth-guard";

export default function TelehealthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthGuard area="telehealth">{children}</AuthGuard>;
}
