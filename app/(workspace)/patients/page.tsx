"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Filter, Search, Users } from "lucide-react";

import { useWorkspace } from "../../components/workspace-shell";
import {
  AvatarInitials,
  Badge,
  EmptyState,
  FilterPill,
  SectionHeader,
  TableActionLink,
  WorkspaceCard,
} from "../../components/workspace-ui";
import PatientModal from "../../components/modal/PatientModal";
import MessageModal from "../../components/modal/MessageModal";

import api from "../../../lib/api";

// local modal state will be added to component

const initialPatients: any[] = [];

export default function PatientsPage() {
  const router = useRouter();
  const { pushToast, requestConfirm } = useWorkspace();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState("All");
  const [patientsState, setPatientsState] = useState<any[]>(initialPatients);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return patientsState.filter((patient) => {
      const matchesQuery = `${patient.patient_id || patient.id || ''} ${patient.first_name || patient.name || ''} ${patient.contact_number || patient.contact || ''}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = activeStatus === "All" || (patient.status === activeStatus);
      return matchesQuery && matchesStatus;
    });
  }, [activeStatus, query, patientsState]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const resp = await api.getPatients('?limit=50');
        // resp may be { patients: [...] } or array depending on helper
        const list = resp.patients || resp.results || resp;
        setPatientsState(list || []);
      } catch (e) {
        // ignore for now
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const selectAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map((patient) => patient.patient_id || patient.id));
  };

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editPatient, setEditPatient] = useState<any | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-6 pb-20">
      <WorkspaceCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader title="Patients" subtitle="Search, filter, and manage the patient roster." />
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patients"
                className="h-11 w-full rounded-[8px] border border-[#E5E7EB] bg-white px-10 text-sm text-slate-900 outline-none focus:border-[var(--accent-sage)] focus:ring-2 focus:ring-[rgba(107,144,128,0.16)] sm:w-72"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-sm text-slate-600 hover:bg-[#F3F4F6]"
            >
              <Filter className="h-4 w-4" strokeWidth={1.5} />
              Filter
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(["All", "Active", "Inactive"] as const).map((status) => (
              <FilterPill key={status} active={activeStatus === status} onClick={() => setActiveStatus(status)}>
                {status}
              </FilterPill>
            ))}
            <FilterPill>Gender</FilterPill>
            <FilterPill>Age Range</FilterPill>
            <FilterPill>Last Visit</FilterPill>
          </div>
          <button
            type="button"
            onClick={() => { setEditPatient(null); setShowPatientModal(true); }}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--accent-sage)] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a7d6f] transition-colors"
          >
            <Users className="h-4 w-4" strokeWidth={1.5} />
            Add Patient
          </button>
        </div>
      </WorkspaceCard>

      <WorkspaceCard className="overflow-hidden">
        {filtered.length ? (
          <table className="w-full border-collapse text-left">
            <thead className="bg-white text-[12px] uppercase tracking-[0.16em] text-[#9CA3AF]">
              <tr className="border-b border-[#F3F4F6]">
                <th className="w-10 px-4 py-4">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={selectAll} className="h-4 w-4 rounded border-[#D1D5DB] accent-[var(--accent-sage)]" />
                </th>
                <th className="px-4 py-4 font-semibold">Patient ID</th>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Age</th>
                <th className="px-4 py-4 font-semibold">Gender</th>
                <th className="px-4 py-4 font-semibold">Contact</th>
                <th className="px-4 py-4 font-semibold">Last Visit</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr
                  key={patient.patient_id || patient.id}
                  onClick={() => { const pid = (patient.patient_id || patient.id || ''); router.push(`/patients/${pid}`); }}
                  className="cursor-pointer border-b border-[#F3F4F6] transition-colors hover:bg-[#FAFBFC]"
                >
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(patient.patient_id || patient.id)}
                      onChange={() => toggleSelected(patient.patient_id || patient.id)}
                      className="h-4 w-4 rounded border-[#D1D5DB] accent-[var(--accent-sage)]"
                    />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">{patient.patient_id || patient.id}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <AvatarInitials initials={patient.initials || ((patient.first_name||'').slice(0,1) + (patient.last_name||'').slice(0,1))} size={36} />
                      <span className="font-medium text-slate-900">{patient.first_name ? `${patient.first_name} ${patient.last_name || ''}` : (patient.name || '')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{patient.age || ''}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{patient.gender || ''}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{patient.contact_number || patient.contact || ''}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{patient.last_visit || patient.lastVisit || ''}</td>
                  <td className="px-4 py-4">
                    <Badge tone={patient.status === "Active" ? "green" : "neutral"}>{patient.status || 'Active'}</Badge>
                  </td>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setEditPatient(patient); setShowPatientModal(true); }}
                      className="rounded-full p-2 text-slate-400 hover:bg-[#F3F4F6] hover:text-slate-700"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No patients found"
              description="Get started by adding your first patient or clearing the active filters."
              action={<button type="button" className="rounded-[12px] bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white">Add Patient</button>}
            />
          </div>
        )}
      </WorkspaceCard>

      {selected.length ? (
            <div className="fixed bottom-20 left-1/2 z-30 flex w-[min(680px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-600">{selected.length} selected</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-[12px] border border-[#E5E7EB] px-4 py-2 text-sm hover:bg-[#F3F4F6]">Export</button>
            <button type="button" onClick={() => { setMessageRecipient(undefined); setShowMessageModal(true); }} className="rounded-[12px] border border-[#E5E7EB] px-4 py-2 text-sm hover:bg-[#F3F4F6]">Message</button>
            <button
              type="button"
              onClick={() => requestConfirm({
                title: "Delete selected patients?",
                description: "This permanently removes the selected patient records and cannot be undone.",
                confirmLabel: "Delete",
                tone: "destructive",
                onConfirm: () => {
                  setSelected([]);
                  pushToast({ type: "success", title: "Patients deleted", message: "The selected records were removed." });
                },
              })}
              className="rounded-[12px] bg-[#EF4444] px-4 py-2 text-sm font-medium text-white"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
      <PatientModal
        isOpen={showPatientModal}
        onClose={() => { setShowPatientModal(false); setEditPatient(null); }}
        onSubmit={async (p) => {
          try {
            const mapPayload = (form: any) => ({
              first_name: form.firstName,
              last_name: form.lastName,
              date_of_birth: form.dateOfBirth,
              gender: form.sex === 'Prefer not to say' ? 'Other' : form.sex,
              contact_number: form.phone,
              email_address: form.email,
              address: [form.street, form.city, form.state, form.zip].filter(Boolean).join(', '),
              emergency_contact_name: form.emergencyContactName,
              emergency_contact_relationship: form.emergencyContactRelationship,
              emergency_contact_phone: form.emergencyContactPhone,
              blood_type: form.bloodType,
              allergies: form.allergies,
              medications: form.medications,
              insurance_provider: form.insuranceProvider,
              policy_number: form.policyNumber,
              group_number: form.groupNumber,
              notes: form.notes,
            });

            if (editPatient) {
              const id = editPatient.patient_id || editPatient.id;
              const payload = mapPayload(p);
              const updated = await api.updatePatient(id, payload);
              setPatientsState((cur) => cur.map((it) => (it.patient_id === id || it.id === id ? (updated.patient || updated) : it)));
              pushToast({ type: 'success', title: 'Patient updated', message: `${p.firstName} ${p.lastName} updated.` });
            } else {
              const payload = mapPayload(p);
              const created = await api.createPatient(payload);
              const payloadBody = created.patient || created;
              setPatientsState((cur) => [payloadBody, ...cur]);
              pushToast({ type: 'success', title: 'Patient added', message: `${p.firstName} ${p.lastName} added.` });
            }
          } catch (err: any) {
            pushToast({ type: 'error', title: 'Save failed', message: err?.message || 'Unable to save patient' });
            throw err;
          }
        }}
        initialData={editPatient ?? undefined}
        mode={editPatient?"edit":"create"}
      />
      <MessageModal isOpen={showMessageModal} onClose={() => setShowMessageModal(false)} onSend={(payload)=>{ pushToast({ type: 'success', title: 'Message sent', message: `To ${payload.to ?? 'recipient'}` }); }} recipient={messageRecipient} />
    </div>
  );
}
