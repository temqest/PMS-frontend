"use client";

import { useEffect, useState } from "react";
import { Check, X, Mail, Calendar, CheckCircle } from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import {
  AvatarInitials,
  Badge,
  EmptyState,
  SectionHeader,
  WorkspaceCard,
} from "../../components/workspace-ui";

import api from "../../../lib/api";

type PendingUser = {
  id: string;
  username: string;
  fullName: string;
  patient_id?: string;
  created_at?: string;
  role: string;
};

type PendingUsersResponse = {
  users: PendingUser[];
};

export default function AdminPage() {
  const { pushToast } = useWorkspace();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [rejectingMap, setRejectingMap] = useState<Record<string, boolean>>({});

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const resp = (await api.getPendingUsers()) as PendingUsersResponse | PendingUser[];
      setPendingUsers(Array.isArray(resp) ? resp : resp?.users || []);
    } catch (error) {
      pushToast({
        type: "error",
        title: "Error",
        message: "Failed to load pending accounts",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      setActivating(userId);
      await api.activateUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      pushToast({
        type: "success",
        title: "Approved",
        message: "User account has been activated",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Error",
        message: "Failed to activate user account",
      });
    } finally {
      setActivating(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setRejectingMap((prev) => ({ ...prev, [userId]: true }));
      await api.deactivateUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      pushToast({
        type: "success",
        title: "Rejected",
        message: "User account has been rejected",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Error",
        message: "Failed to reject user account",
      });
    } finally {
      setRejectingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            title="Account Management"
            subtitle="Review and activate new user accounts."
          />
        </div>
      </WorkspaceCard>

      {loading ? (
        <WorkspaceCard className="p-12 text-center">
          <p className="text-slate-500">Loading pending accounts...</p>
        </WorkspaceCard>
      ) : pendingUsers.length === 0 ? (
        <WorkspaceCard className="p-12">
          <EmptyState
            title="No Pending Accounts"
            description="All new user accounts have been reviewed."
            icon={CheckCircle}
          />
        </WorkspaceCard>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <WorkspaceCard
              key={user.id}
              className="p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <AvatarInitials initials={getInitials(user.fullName)} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {user.fullName || "Unnamed User"}
                    </p>
                    <div className="flex flex-col gap-1.5 mt-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" strokeWidth={1.5} />
                        {user.username}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" strokeWidth={1.5} />
                        {formatDate(user.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={activating !== null}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#10B981] text-white font-medium text-sm hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {activating === user.id ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2} />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={rejectingMap[user.id] === true}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] border border-[#EF4444] text-[#EF4444] font-medium text-sm hover:bg-[#FEE2E2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {rejectingMap[user.id] ? (
                      <>
                        <span className="h-4 w-4 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" strokeWidth={2} />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </WorkspaceCard>
          ))}
        </div>
      )}
    </div>
  );
}
