"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Mic, MicOff, PhoneOff, Video, VideoOff, Wifi, WifiOff } from "lucide-react";
import type { Socket } from "socket.io-client";

import {
  createTelehealthSocket,
  rtcConfiguration,
  type RoomJoinedPayload,
  type TelehealthAppointment,
} from "../../../lib/telehealth";

type TelehealthCallProps = {
  appointmentId: string;
};

type CallStatus =
  | "Preparing secure room"
  | "Requesting camera and microphone"
  | "Connecting to telehealth service"
  | "Waiting for the other participant"
  | "Peer joined, setting up media"
  | "Connected"
  | "Peer disconnected"
  | "Call ended";

const getConnectionLabel = (state?: RTCPeerConnectionState) => {
  if (state === "connected") return "Connected";
  if (state === "connecting") return "Connecting";
  if (state === "failed") return "Connection failed";
  if (state === "disconnected") return "Peer disconnected";
  if (state === "closed") return "Call ended";
  return "Waiting";
};

const formatAppointmentTime = (appointment?: TelehealthAppointment | null) => {
  if (!appointment?.scheduled_at) return "Scheduled time unavailable";
  const date = new Date(appointment.scheduled_at);
  if (Number.isNaN(date.getTime())) return "Scheduled time unavailable";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function TelehealthCall({ appointmentId }: TelehealthCallProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const endedRef = useRef(false);

  const [status, setStatus] = useState<CallStatus>("Preparing secure room");
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [error, setError] = useState("");
  const [appointment, setAppointment] = useState<TelehealthAppointment | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const cleanupPeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteConnected(false);
  }, []);

  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const cleanupSocket = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("room:leave");
      socket.disconnect();
    }
    socketRef.current = null;
  }, []);

  const cleanupCall = useCallback(() => {
    cleanupSocket();
    cleanupPeerConnection();
    cleanupMedia();
  }, [cleanupMedia, cleanupPeerConnection, cleanupSocket]);

  const getPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    peerConnectionRef.current = peerConnection;

    localStreamRef.current?.getTracks().forEach((track) => {
      const stream = localStreamRef.current;
      if (stream) peerConnection.addTrack(track, stream);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("webrtc:ice-candidate", { candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      const remoteStream = stream || remoteStreamRef.current || new MediaStream();

      if (!stream) {
        remoteStream.addTrack(event.track);
      }

      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setRemoteConnected(true);
      setStatus("Connected");
    };

    peerConnection.onconnectionstatechange = () => {
      setConnectionState(peerConnection.connectionState);
      if (peerConnection.connectionState === "connected") {
        setStatus("Connected");
        setRemoteConnected(true);
      }
      if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
        setStatus("Peer disconnected");
      }
      if (peerConnection.connectionState === "closed" && !endedRef.current) {
        setStatus("Call ended");
      }
    };

    return peerConnection;
  }, []);

  const createOffer = useCallback(async () => {
    const peerConnection = getPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socketRef.current?.emit("webrtc:offer", { offer });
  }, [getPeerConnection]);

  const handleEndCall = useCallback(() => {
    endedRef.current = true;
    socketRef.current?.emit("call:end", { appointmentId });
    cleanupCall();
    setStatus("Call ended");
  }, [appointmentId, cleanupCall]);

  const toggleMic = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    const nextEnabled = !micEnabled;
    audioTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMicEnabled(nextEnabled);
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    const nextEnabled = !cameraEnabled;
    videoTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
  }, [cameraEnabled]);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        setError("");
        setStatus("Requesting camera and microphone");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setStatus("Connecting to telehealth service");
        const socket = createTelehealthSocket();
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("room:join", { appointmentId });
        });

        socket.on("connect_error", (err) => {
          setError(err.message || "Unable to connect to telehealth service.");
          setStatus("Peer disconnected");
        });

        socket.on("room:joined", (payload: RoomJoinedPayload) => {
          setAppointment(payload.appointment || null);
          setStatus(payload.peerCount > 1 ? "Peer joined, setting up media" : "Waiting for the other participant");
        });

        socket.on("room:error", (payload: { message?: string }) => {
          setError(payload.message || "Unable to join telehealth room.");
          setStatus("Peer disconnected");
        });

        socket.on("peer:joined", () => {
          setStatus("Peer joined, setting up media");
        });

        socket.on("room:ready", async (payload: { initiatorSocketId?: string }) => {
          try {
            if (socket.id && payload.initiatorSocketId && socket.id !== payload.initiatorSocketId) {
              await createOffer();
            }
          } catch {
            setError("Unable to start WebRTC negotiation.");
          }
        });

        socket.on("webrtc:offer", async (payload: { offer: RTCSessionDescriptionInit }) => {
          try {
            const peerConnection = getPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("webrtc:answer", { answer });
          } catch {
            setError("Unable to answer the telehealth call.");
          }
        });

        socket.on("webrtc:answer", async (payload: { answer: RTCSessionDescriptionInit }) => {
          try {
            const peerConnection = getPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
          } catch {
            setError("Unable to complete telehealth connection.");
          }
        });

        socket.on("webrtc:ice-candidate", async (payload: { candidate: RTCIceCandidateInit }) => {
          try {
            const peerConnection = getPeerConnection();
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {
            setError("A network candidate could not be added.");
          }
        });

        socket.on("peer:left", () => {
          cleanupPeerConnection();
          setStatus("Peer disconnected");
        });

        socket.on("call:ended", () => {
          endedRef.current = true;
          cleanupCall();
          setStatus("Call ended");
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to start the telehealth call.";
        setError(message);
        setStatus("Peer disconnected");
        cleanupCall();
      }
    };

    void start();

    return () => {
      cancelled = true;
      cleanupCall();
    };
  }, [appointmentId, cleanupCall, cleanupPeerConnection, createOffer, getPeerConnection]);

  return (
    <main className="telehealth-shell">
      <section className="telehealth-stage">
        <div className="telehealth-hero">
          <div>
            <p className="telehealth-eyebrow">Secure Telehealth Room</p>
            <h1>Appointment {appointmentId}</h1>
            <p>
              {appointment?.patient_name ? `${appointment.patient_name} · ` : ""}
              {formatAppointmentTime(appointment)}
            </p>
          </div>
          <div className="telehealth-status-pill">
            {connectionState === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{getConnectionLabel(connectionState)}</span>
          </div>
        </div>

        {error ? (
          <div className="telehealth-alert" role="alert">
            {error}
          </div>
        ) : null}

        <div className="telehealth-video-grid">
          <div className="telehealth-video-card telehealth-video-card-main">
            <video ref={remoteVideoRef} autoPlay playsInline className="telehealth-video" />
            {!remoteConnected ? (
              <div className="telehealth-placeholder">
                <span className="telehealth-pulse" />
                <p>{status}</p>
                <small>Keep this window open while the other participant joins.</small>
              </div>
            ) : null}
            <div className="telehealth-video-label">Remote participant</div>
          </div>

          <div className="telehealth-video-card telehealth-self-view">
            <video ref={localVideoRef} autoPlay muted playsInline className="telehealth-video" />
            {!cameraEnabled ? (
              <div className="telehealth-camera-off">
                <VideoOff size={22} />
                <span>Camera off</span>
              </div>
            ) : null}
            <div className="telehealth-video-label">You</div>
          </div>
        </div>

        <div className="telehealth-controls">
          <button type="button" onClick={toggleMic} className={!micEnabled ? "is-off" : ""}>
            {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            <span>{micEnabled ? "Mute" : "Unmute"}</span>
          </button>
          <button type="button" onClick={toggleCamera} className={!cameraEnabled ? "is-off" : ""}>
            {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            <span>{cameraEnabled ? "Camera" : "Camera off"}</span>
          </button>
          <button type="button" onClick={handleEndCall} className="telehealth-end-button">
            <PhoneOff size={20} />
            <span>End call</span>
          </button>
        </div>
      </section>

      <aside className="telehealth-side-panel">
        <div className="telehealth-card">
          <CalendarDays size={22} />
          <div>
            <p className="telehealth-card-label">Visit Status</p>
            <h2>{status}</h2>
            <p>
              WebRTC handles the encrypted audio/video peer connection. This service only relays setup signals.
            </p>
          </div>
        </div>

        <div className="telehealth-card telehealth-tips">
          <p className="telehealth-card-label">Quick checks</p>
          <p>Use headphones, stay on a stable network, and allow browser camera and microphone permissions.</p>
        </div>
      </aside>
    </main>
  );
}
