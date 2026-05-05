import PatientPortalShell from "../components/patient-portal-shell";

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PatientPortalShell>{children}</PatientPortalShell>;
}