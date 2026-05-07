import TelehealthCall from "../../components/telehealth/TelehealthCall";
import "../../components/telehealth/telehealth.css";

type TelehealthPageProps = {
  params: Promise<{ appointmentId: string }>;
};

export default async function TelehealthPage({ params }: TelehealthPageProps) {
  const { appointmentId } = await params;

  return <TelehealthCall appointmentId={decodeURIComponent(appointmentId)} />;
}
