import { io, type Socket } from "socket.io-client";

import { getStoredToken } from "./session";

const configuredTelehealthUrl = (
  process.env.NEXT_PUBLIC_TELEHEALTH_SOCKET_URL ||
  process.env.NEXT_PUBLIC_TELEHEALTH_URL ||
  process.env.NEXT_PUBLIC_TELEHEALTH_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5100" : "")
).replace(/\/$/, "");

const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(configuredTelehealthUrl);

export const TELEHEALTH_URL =
  process.env.NODE_ENV === "production" && isLocalhostUrl ? "" : configuredTelehealthUrl;

export const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type TelehealthAppointment = {
  appointment_id: string;
  patient_id?: string;
  patient_name?: string;
  appointment_type?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  reason?: string;
  status?: string;
};

export type TelehealthCallInvite = {
  appointmentId: string;
  callId?: string;
  appointment?: TelehealthAppointment;
  caller?: {
    id?: string;
    role?: string;
    fullName?: string;
  };
  patient?: {
    patient_id?: string;
    fullName?: string;
  };
  patientOnline?: boolean;
  expiresAt?: string;
  message?: string;
};

export type RoomJoinedPayload = {
  appointmentId: string;
  peerCount: number;
  appointment?: TelehealthAppointment;
  user?: {
    role?: string;
    patient_id?: string | null;
    fullName?: string;
  };
};

export function createTelehealthSocket(): Socket {
  if (!TELEHEALTH_URL) {
    throw new Error("Telehealth service URL is not configured. Set NEXT_PUBLIC_TELEHEALTH_SOCKET_URL to the deployed telehealth backend.");
  }

  const token = getStoredToken();
  if (!token) {
    throw new Error("Please sign in before joining a telehealth call.");
  }

  return io(TELEHEALTH_URL, {
    auth: { token },
    transports: ["polling", "websocket"],
    upgrade: true,
    timeout: 10000,
    reconnectionAttempts: 5,
  });
}
