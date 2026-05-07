"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, WifiOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";

import {
  createTelehealthSocket,
  type TelehealthCallInvite,
} from "../../../lib/telehealth";

const formatAppointmentTime = (value?: string) => {
  if (!value) return "Scheduled time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Scheduled time unavailable";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function IncomingTelehealthCall() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [invite, setInvite] = useState<TelehealthCallInvite | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [responding, setResponding] = useState<"accept" | "reject" | "">("");

  useEffect(() => {
    let socket: Socket;

    try {
      socket = createTelehealthSocket();
      socketRef.current = socket;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to connect to telehealth notifications.";
      window.setTimeout(() => setConnectionError(message), 0);
      console.warn("[telehealth] notification socket unavailable", { message });
      return;
    }

    socket.on("connect", () => {
      setConnectionError("");
      console.info("[telehealth] notification socket connected", { socketId: socket.id });
    });

    socket.on("disconnect", (reason) => {
      console.info("[telehealth] notification socket disconnected", { reason });
    });

    socket.on("connect_error", (err) => {
      setConnectionError(err.message || "Unable to connect to telehealth notifications.");
      console.warn("[telehealth] notification socket connection error", { message: err.message });
    });

    socket.on("incoming-call", (payload: TelehealthCallInvite) => {
      console.info("[telehealth] incoming call received", { appointmentId: payload.appointmentId });
      setResponding("");
      setInvite(payload);
    });

    socket.on("call-expired", (payload: TelehealthCallInvite) => {
      console.info("[telehealth] call invite expired", { appointmentId: payload.appointmentId });
      setInvite((current) => (current?.appointmentId === payload.appointmentId ? null : current));
      setResponding("");
    });

    socket.on("call-ended", (payload: TelehealthCallInvite) => {
      setInvite((current) => (current?.appointmentId === payload.appointmentId ? null : current));
      setResponding("");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleAccept = () => {
    if (!invite?.appointmentId || !socketRef.current) return;
    setResponding("accept");
    socketRef.current.emit("accept-call", {
      appointmentId: invite.appointmentId,
      callId: invite.callId,
    });
    window.setTimeout(() => {
      router.push(`/telehealth/${encodeURIComponent(invite.appointmentId)}`);
    }, 150);
  };

  const handleReject = () => {
    if (!invite?.appointmentId || !socketRef.current) return;
    setResponding("reject");
    socketRef.current.emit("reject-call", {
      appointmentId: invite.appointmentId,
      callId: invite.callId,
    });
    setInvite(null);
    setResponding("");
  };

  if (!invite && !connectionError) return null;

  return (
    <>
      {connectionError ? (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-[12px] border border-[#FCA5A5] bg-white p-4 text-sm text-[#B91C1C] shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="font-medium">Telehealth notifications offline</p>
              <p className="mt-1 text-[#991B1B]">{connectionError}</p>
            </div>
          </div>
        </div>
      ) : null}

      {invite ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[18px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.14)]">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(107,144,128,0.10)] text-[var(--accent-sage)]">
                <Video className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <button
                type="button"
                onClick={handleReject}
                aria-label="Dismiss call"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-[#F3F4F6] hover:text-slate-700"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-[0.26em] text-[var(--accent-sage)]">Incoming Telehealth Call</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {invite.caller?.fullName || "Clinic staff"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {invite.appointment?.reason || "Telehealth visit"} · {formatAppointmentTime(invite.appointment?.scheduled_at)}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={responding === "reject"}
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F3F4F6] disabled:opacity-60"
              >
                <PhoneOff className="h-4 w-4" strokeWidth={1.75} />
                Reject
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={responding === "accept"}
                className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#5f8273] disabled:opacity-60"
              >
                <Phone className="h-4 w-4" strokeWidth={1.75} />
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
