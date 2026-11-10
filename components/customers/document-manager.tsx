"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge, Button, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  DOCUMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPES,
  REQUIRED_DOCUMENTS,
} from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export type DocItem = {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: string;
  notes: string | null;
  createdAt: string;
  uploaderName: string | null;
  verifierName: string | null;
  extractedName: string | null;
  extractedDob: string | null;
  extractedAddress: string | null;
};

type CheckResult = {
  field: string;
  input: string;
  expected: string;
  score: number;
  status: "MATCH" | "REVIEW" | "MISMATCH" | "NOT_CHECKED";
};

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const statusTone: Record<string, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};

export function DocumentManager({
  customerId,
  customerName,
  documents,
  canVerify,
  canDelete,
  canUpload,
}: {
  customerId: string;
  customerName: string;
  documents: DocItem[];
  canVerify: boolean;
  canDelete: boolean;
  canUpload: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState("AADHAAR");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [active, setActive] = useState<DocItem | null>(null);
  const [name, setName] = useState("");
  const [father, setFather] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [overall, setOverall] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const verifiedTypes = new Set(documents.filter((d) => d.status === "VERIFIED").map((d) => d.type));

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.push("warning", "Choose a file", "PDF, JPG, JPEG or PNG (max 5 MB).");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("type", uploadType);
      form.append("file", file);
      const res = await fetch(`/api/customers/${customerId}/documents`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.push("success", "Document uploaded", `${DOCUMENT_LABELS[uploadType]} saved securely.`);
      setFile(null);
      setShowUpload(false);
      const input = document.getElementById("doc-file") as HTMLInputElement | null;
      if (input) input.value = "";
      router.refresh();
    } catch (err) {
      toast.push("error", "Upload failed", err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  }

  function openVerify(doc: DocItem) {
    setActive(doc);
    setName(doc.extractedName || "");
    setFather("");
    setDob(doc.extractedDob || "");
    setAddress(doc.extractedAddress || "");
    setNotes(doc.notes || "");
    setResults(null);
    setOverall(null);
  }

  async function runCheck() {
    if (!active) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/documents/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, fatherName: father, dob, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed.");
      setResults(data.results);
      setOverall(data.overall);
    } catch (err) {
      toast.push("error", "Cross-check failed", err instanceof Error ? err.message : undefined);
    } finally {
      setChecking(false);
    }
  }

  async function decide(status: "VERIFIED" | "REJECTED") {
    if (!active) return;
    if (status === "REJECTED" && !notes.trim()) {
      toast.push("warning", "Reason required", "Reject karne ke liye note likhein.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes || undefined,
          extractedName: name || undefined,
          extractedDob: dob || undefined,
          extractedAddress: address || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      toast.push(
        "success",
        status === "VERIFIED" ? "Document verified" : "Document rejected",
        data.advanced ? "All required documents complete — status advanced to Documents Verified." : undefined,
      );
      setActive(null);
      router.refresh();
    } catch (err) {
      toast.push("error", "Update failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function remove(doc: DocItem) {
    if (!window.confirm(`Delete ${DOCUMENT_LABELS[doc.type]}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      toast.push("success", "Document deleted", doc.fileName);
      router.refresh();
    } catch (err) {
      toast.push("error", "Delete failed", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-navy-900">Documents</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Private storage · PDF/JPG/PNG max 5 MB · access logged
          </p>
        </div>
        {canUpload ? (
          <Button size="sm" variant="outline" onClick={() => setShowUpload((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Upload
          </Button>
        ) : null}
      </div>

      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Required checklist</p>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_DOCUMENTS.map((t) => {
            const has = verifiedTypes.has(t);
            const uploaded = documents.some((d) => d.type === t);
            return (
              <span
                key={t}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset",
                  has
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : uploaded
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-white text-slate-500 ring-slate-200",
                )}
              >
                {has ? <CheckCircle2 className="h-3 w-3" /> : uploaded ? <AlertTriangle className="h-3 w-3" /> : null}
                {DOCUMENT_LABELS[t]}
              </span>
            );
          })}
        </div>
      </div>

      {showUpload ? (
        <form onSubmit={upload} className="border-b border-slate-100 bg-solar-50/40 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <div>
              <label className="label">Document type</label>
              <Select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="text-xs">
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{DOCUMENT_LABELS[t]}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="label">File</label>
              <input
                id="doc-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={uploading} size="sm" className="w-full sm:w-auto">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Aadhaar number is never typed into this CRM. Only the document file is stored, access-controlled.
          </p>
        </form>
      ) : null}

      <div className="divide-y divide-slate-100">
        {documents.length ? (
          documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-800">{DOCUMENT_LABELS[doc.type] || doc.type}</p>
                  <Badge tone={statusTone[doc.status] || "neutral"}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</Badge>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{doc.fileName} · {sizeLabel(doc.size)}</p>
                <p className="text-[10px] text-slate-400">
                  Uploaded {formatDate(doc.createdAt)}{doc.uploaderName ? ` by ${doc.uploaderName}` : ""}
                  {doc.verifierName ? ` · ${doc.status === "REJECTED" ? "Rejected" : "Verified"} by ${doc.verifierName}` : ""}
                </p>
                {doc.notes ? <p className="mt-1 text-[10px] text-rose-600">Note: {doc.notes}</p> : null}
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`/api/documents/${doc.id}/file?download=1`}
                  className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                {canVerify ? (
                  <button
                    onClick={() => openVerify(doc)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-solar-200 bg-solar-50 px-2 text-[10px] font-semibold text-solar-700 hover:bg-solar-100"
                    title="Verify"
                  >
                    <ShieldCheck className="h-3 w-3" /> Verify
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    onClick={() => remove(doc)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-xs font-semibold text-slate-600">No documents uploaded yet</p>
            <p className="mt-1 text-[11px] text-slate-400">Aadhaar, bill, bank passbook aur photo upload karein.</p>
          </div>
        )}
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-pop sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
              <div>
                <p className="text-sm font-bold text-navy-900">Verify {DOCUMENT_LABELS[active.type]}</p>
                <p className="text-[11px] text-slate-500">{customerName} · manual cross-check</p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-800">
                Document dekhein aur usme likhi details yahan type karein. System CRM record se compare karke
                match score dikhayega. Yeh OCR nahi hai — final verification staff ki visual confirmation par hai.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Name on document</label>
                  <input className="input text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="As printed" />
                </div>
                <div>
                  <label className="label">Father&apos;s name</label>
                  <input className="input text-xs" value={father} onChange={(e) => setFather(e.target.value)} />
                </div>
                <div>
                  <label className="label">Date of birth</label>
                  <input className="input text-xs" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="DD/MM/YYYY" />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input text-xs" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={runCheck} disabled={checking || !name.trim()}>
                  {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Run cross-check
                </Button>
                {overall ? (
                  <Badge tone={overall === "MATCH" ? "success" : overall === "MISMATCH" ? "danger" : "warning"}>
                    Overall: {overall}
                  </Badge>
                ) : null}
              </div>

              {results ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="table-base text-[11px]">
                    <thead>
                      <tr><th>Field</th><th>Document</th><th>CRM record</th><th className="text-right">Score</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.field}>
                          <td className="font-medium">{r.field}</td>
                          <td className="max-w-[130px] truncate">{r.input || "—"}</td>
                          <td className="max-w-[130px] truncate">{r.expected || "—"}</td>
                          <td className="text-right">{r.status === "NOT_CHECKED" ? "—" : `${r.score}%`}</td>
                          <td>
                            <Badge tone={r.status === "MATCH" ? "success" : r.status === "MISMATCH" ? "danger" : r.status === "REVIEW" ? "warning" : "neutral"}>
                              {r.status.replace("_", " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div>
                <label className="label">Verification note / rejection reason</label>
                <textarea className="input min-h-[70px] text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional for approval, required for rejection" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="success" size="sm" onClick={() => decide("VERIFIED")} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Mark verified
                </Button>
                <Button variant="danger" size="sm" onClick={() => decide("REJECTED")} disabled={saving}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                <a href={`/api/documents/${active.id}/file`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <Eye className="h-3.5 w-3.5" /> Open document
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
