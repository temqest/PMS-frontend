import { io, type Socket } from "socket.io-client";

import { getStoredToken } from "./session";

export const TELEHEALTH_URL = (
  process.env.NEXT_PUBLIC_TELEHEALTH_URL ||
  process.env.NEXT_PUBLIC_TELEHEALTH_API_URL ||
  ""
).replace(/\/$/, "");

export const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type TelehealthAppointment = {
  appointment_id: string;
  patient_id?: string;
  patient_name?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  reason?: string;
  status?: string;
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
    throw new Error("Telehealth service URL is not configured.");
  }

  const token = getStoredToken();
  if (!token) {
    throw new Error("Please sign in before joining a telehealth call.");
  }

  return io(TELEHEALTH_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
}
