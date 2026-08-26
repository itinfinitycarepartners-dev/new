// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, UserCheck, UserX, Search, Download, RefreshCw, Eye, 
  BarChart3, Shield, XCircle, Send, MessageSquare, LogOut, Home, 
  AlertTriangle, ServerCrash, Phone, Mail, MapPin, Briefcase, 
  Building2, Calendar, Award, FileText, CheckCircle, Building, 
  Loader2, CalendarDays, FolderOpen, Folder, Clock, User, 
  Plane, HeartPulse, FileCheck, DollarSign, Activity, GitBranch, Receipt, ClipboardList,
  CheckCircle2, Circle, AlertCircle, Layers
} from 'lucide-react';

const API_BASE = 'https://fictional-carnival-3inv.onrender.com';

const THEME = {
  brand: '#6D28D9', brandDark: '#3B0764', brandLight: '#8B5CF6', brandGhost: '#F5F0FF',
  teal: '#6D28D9', tealLight: '#F5F0FF', amber: '#8B5CF6', amberLight: '#FDF2F8',
  red: '#C026D3', redLight: '#FDF2F8', green: '#8B5CF6', greenLight: '#F5F0FF',
  blue: '#6D28D9', blueLight: '#F5F0FF', bg: '#FDF2F8', card: '#FFFFFF',
  border: '#E8E1F2', text: '#111827', muted: '#64748B', subtle: '#8B5CF6',
};

const DOCUMENT_REJECTION_REASONS = [
  {
    value: "Expired",
    label: "Expired",
    description: "The document that you have provided has either expired or is set to expire outside of the processing window"
  },
  {
    value: "Not applicable",
    label: "Not applicable",
    description: "The document that you have provided does not apply to the document requested"
  },
  {
    value: "Inconclusive",
    label: "Inconclusive",
    description: "The document that you have provided does not provide sufficient evidence to determine the documents viability (signature, date, etc.)"
  }
];

// ─── PIPELINE CONFIG ─────────────────────────────────────────────────────────
const STAGES_CONFIG = [
  { id: 1, stage_name: "Applied", category: "Hiring" },
  { id: 2, stage_name: "Associated with Job", category: "Hiring" },
  { id: 3, stage_name: "Qualified - Match", category: "Hiring" },
  { id: 7, stage_name: "Select Prescreen Time", category: "Hiring" },
  { id: 9, stage_name: "Prescreen Completed", category: "Hiring" },
  { id: 12, stage_name: "Interview Scheduled", category: "Hiring" },
  { id: 13, stage_name: "Interview Attended", category: "Hiring" },
  { id: 14, stage_name: "Offer Made", category: "Hiring" },
  { id: 15, stage_name: "Offer Accepted", category: "Hiring" },
  { id: 18, stage_name: "Employment Contract Signed", category: "Hiring" },
  { id: 20, stage_name: "Hired", category: "Hiring" },
  { id: 21, stage_name: "Licensure", category: "Immigration" },
  { id: 22, stage_name: "i140 Submitted", category: "Immigration" },
  { id: 24, stage_name: "Approved", category: "Immigration" },
  { id: 28, stage_name: "Deployment Details", category: "Deployment" },
  { id: 39, stage_name: "Orientation Start", category: "Aftercare" },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

const extractString = (val) => {
  if (val === undefined || val === null || val === "" || val === "—") return "—";
  if (typeof val === 'boolean') return val ? "Yes" : "No";
  if (typeof val === 'object') {
    if (val.name) return val.name;
    if (val.file_Name) return val.file_Name;
    if (Array.isArray(val)) {
      const arr = val.map(extractString).filter(v => v !== "—");
      return arr.length > 0 ? arr.join(', ') : "—";
    }
    return JSON.stringify(val);
  }
  return String(val).trim() || "—";
};

const ET = (ts) => {
  if (!ts || ts === "—") return '—';
  try {
    return new Date(ts).toLocaleString('en-US', {
      timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return '—'; }
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const safeStr = extractString(dateStr);
    const d = new Date(safeStr);
    if (isNaN(d.getTime())) return safeStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', ' •');
  } catch { return extractString(dateStr); }
};

const initials = (name) => {
  const safe = extractString(name);
  return (safe !== "—" ? safe : '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusColor = (status) => ({
  active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800',
  arrived: 'bg-blue-100 text-blue-800', pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800', 'in progress': 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800', 'not started': 'bg-gray-100 text-gray-800'
}[status?.toLowerCase()] || 'bg-gray-100 text-gray-800');

const getTokens = () => {
  try {
    let adminToken = localStorage.getItem('adminToken') || '';
    let userToken = localStorage.getItem('token') || '';
    if (!adminToken) {
      const userStr = localStorage.getItem('adminUser') || localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        adminToken = userObj.adminToken || userObj.token || '';
        userToken = userObj.token || adminToken;
      }
    }
    return {
      adminToken: adminToken ? adminToken.replace(/^"|"$/g, '') : '',
      userToken: userToken ? userToken.replace(/^"|"$/g, '') : ''
    };
  } catch (e) { return { adminToken: '', userToken: '' }; }
};

const classifyDocument = (name) => {
  const safeName = extractString(name);
  if (safeName === "—") return { category: "Other", icon: FileText, color: "bg-gray-50 text-gray-700" };
  const lower = safeName.toLowerCase();
  if (lower.includes('resume') || lower.includes('contract') || lower.includes('offer')) 
    return { category: "Recruitment", icon: Briefcase, color: "bg-blue-50 text-blue-700" };
  if (lower.includes('visa') || lower.includes('license') || lower.includes('passport')) 
    return { category: "Immigration", icon: Award, color: "bg-purple-50 text-purple-700" };
  if (lower.includes('flight') || lower.includes('housing') || lower.includes('checklist')) 
    return { category: "Deployment", icon: Home, color: "bg-emerald-50 text-emerald-700" };
  return { category: "Document", icon: FileText, color: "bg-gray-50 text-gray-700" };
};

// ─── CANDIDATE PERSPECTIVE UI COMPONENTS ─────────────────────────────────────
const Section = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-xl border p-5 shadow-sm ${className}`} style={{ borderColor: THEME.border }}>
    <h2 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">{title}</h2>
    <div>{children}</div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon, isDate = false, isTime = false }) => {
  let displayValue = extractString(value);
  if (displayValue !== "—") {
    if (isDate) displayValue = formatDate(displayValue);
    if (isTime) displayValue = ET(displayValue);
  }

  const isMissing = displayValue === "—" || displayValue === "";

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: THEME.border }}>
      {Icon && <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: THEME.muted }} />}
      <div>
        <p className="text-xs" style={{ color: THEME.muted }}>{label}</p>
        <p className={`text-sm mt-0.5 ${isMissing ? 'font-medium text-gray-400 italic' : 'font-semibold text-gray-900'}`}>
          {isMissing ? 'Not specified' : displayValue}
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subtitle, color }) => (
  <div className="bg-white rounded-xl border p-5 transition-all hover:shadow-md" style={{ borderColor: THEME.border }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium" style={{ color: THEME.muted }}>{label}</span>
      <div className="p-2 rounded-lg" style={{ background: color || THEME.brandGhost }}>{icon}</div>
    </div>
    <div className="text-3xl font-bold" style={{ color: THEME.text }}>{value}</div>
    {subtitle && <div className="text-xs mt-1" style={{ color: THEME.muted }}>{subtitle}</div>}
  </div>
);

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

// ─── PIPELINE RENDER CONSTANTS ───────────────────────────────────────────────
const PIPELINE_CATEGORIES = {
  Hiring: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Immigration: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Deployment: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Aftercare: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "NCLEX Roadmap": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "NCLEX Prescreen": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

const PIPELINE_STATUS = {
  "Completed": { icon: CheckCircle2, color: "text-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "In Progress": { icon: Clock, color: "text-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "Blocked": { icon: AlertCircle, color: "text-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
  "Not Started": { icon: Circle, color: "text-gray-400", badge: "bg-gray-100 text-gray-600 border-gray-200" },
};

// ─── MODALS & PANELS ─────────────────────────────────────────────────────────

const UserDetailModal = ({ user, onClose, onMessage }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [documents, setDocuments] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [adminDetails, setAdminDetails] = useState({});
  const [docActionError, setDocActionError] = useState(null);
  const [viewingDocId, setViewingDocId] = useState(null);
  const [approvalBusyKey, setApprovalBusyKey] = useState(null);
  const [rejectingDocument, setRejectingDocument] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const userPendingRequests =
    Array.isArray(user?.pendingRequests)
      ? user.pendingRequests.filter(
          request =>
            request.status === "Pending Approval"
        )
      : [];

  useEffect(() => {
    if (!user) return;

    const fetchDetailedData = async () => {
      setLoading(true);
      setDocActionError(null);

      try {
        const { adminToken, userToken } = getTokens();
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(adminToken ? {
            'Authorization': `AdminBearer ${adminToken}`,
            'x-admin-token': adminToken
          } : {}),
          ...(!adminToken && userToken ? { 'Authorization': `Bearer ${userToken}` } : {})
        };

        const email = encodeURIComponent(user.email);
        const emailParam = `?email=${email}`;

        // The admin endpoint is the source of truth for the candidate's full
        // profile, MongoDB pipeline, submitted aftercare dates, and login history.
        const [
          adminRes,
          documentsRes
        ] = await Promise.allSettled([
          fetch(`${API_BASE}/api/admin/user/${email}`, {
            headers,
            credentials: 'include',
            cache: 'no-store'
          }),
          fetch(`${API_BASE}/api/admin/documents/${email}`, {
            headers,
            credentials: 'include',
            cache: 'no-store'
          })
        ]);

        if (adminRes.status === 'fulfilled' && adminRes.value.ok) {
          const adminPayload = await adminRes.value.json();
          const detail = adminPayload?.user || {};
          setAdminDetails(detail);

          const zoho = detail?.zohoData || {};
          const latestDeal =
            zoho?.latestDeal ||
            zoho?.deal ||
            (Array.isArray(zoho?.allDeals) ? zoho.allDeals[0] : {}) ||
            {};

          const candidate =
            zoho?.candidate ||
            zoho?.recruitCandidate ||
            zoho?.candidateRecord ||
            {};

          // Merge every known source so the admin can see all available user data.
          setProfile({
            ...zoho,
            ...latestDeal,
            ...candidate,
            candidateName: zoho.candidateName || candidate.Full_Name || candidate.Candidate_Name || detail.name,
            email: zoho.email || candidate.Email || detail.email,
            orientationStartDate:
              detail?.submittedDates?.orientationStartDate ||
              user.orientationStartDate ||
              null,
            independentFloorStartDate:
              detail?.submittedDates?.independentFloorStartDate ||
              user.independentFloorStartDate ||
              null,
          });

          setPipeline(
            Array.isArray(detail.pipelineStages)
              ? detail.pipelineStages
              : []
          );
        } else {
          const status = adminRes.status === 'fulfilled' ? adminRes.value.status : 'network';
          throw new Error(`Unable to load the complete admin record (${status}).`);
        }

        let allDocs = [];

        if (
          documentsRes.status === 'fulfilled' &&
          documentsRes.value.ok
        ) {
          const data =
            await documentsRes.value.json();

          if (Array.isArray(data.documents)) {
            allDocs = data.documents.filter(
              document =>
                document.source !==
                  "recruit_field" &&
                ![
                  "Proof_of_NCLEX",
                  "Birth_Certificate"
                ].includes(
                  document
                    .recruit_field_api_name
                )
            );
          }
        } else {
          const status =
            documentsRes.status === 'fulfilled'
              ? documentsRes.value.status
              : 'network';

          console.warn(
            `Unable to load the complete document list (${status}).`
          );
        }

        setDocuments(
          allDocs.sort(
            (a, b) =>
              new Date(
                b.uploaded_at ||
                b.Created_Time ||
                0
              ) -
              new Date(
                a.uploaded_at ||
                a.Created_Time ||
                0
              )
          )
        );
      } catch (error) {
        console.error('Error fetching detailed candidate data:', error);
        setDocActionError(error.message || 'Unable to load the candidate details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedData();
  }, [user]);

  const handleViewDocument = async (doc) => {
    const docId =
      doc.attachment_id ||
      doc.crm_attachment_id ||
      doc.recruit_attachment_id ||
      doc.document_id ||
      doc.id;

    if (!docId) {
      setDocActionError(
        'This document has no downloadable ID.'
      );
      return;
    }
    setDocActionError(null);
    setViewingDocId(docId);
    try {
      const { adminToken } = getTokens();
      const headers = { 'Authorization': `AdminBearer ${adminToken}` };
      const emailParam = `?email=${encodeURIComponent(user.email)}`;
      const sourceParam =
        `&source=${encodeURIComponent(
          doc.source || ""
        )}`;

      const fieldParam =
        doc.crm_field_api_name
          ? `&field=${encodeURIComponent(
              doc.crm_field_api_name
            )}`
          : "";

      const recordParam =
        doc.source === "crm"
          ? `&crmRecordId=${encodeURIComponent(
              doc.deal_id ||
              doc.crm_record_id ||
              doc.crm_deal_id ||
              ""
            )}`
          : `&recruitRecordId=${encodeURIComponent(
              doc.candidate_id ||
              doc.recruit_record_id ||
              ""
            )}`;

      const fieldUploadParam =
        doc.crm_file_upload_field === true
          ? "&fieldUpload=true"
          : "";

      const res = await fetch(
        `${API_BASE}/api/admin/documents/download/${encodeURIComponent(
          docId
        )}${emailParam}${sourceParam}${fieldParam}${recordParam}${fieldUploadParam}`,
        {
          headers,
          credentials: 'include'
        }
      );
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('Failed to open document:', e);
      setDocActionError(`Couldn't open "${extractString(doc.document_name || doc.File_Name)}". ${e.message}`);
    } finally {
      setViewingDocId(null);
    }
  };


  const updateDocumentApproval = async (
    doc,
    action,
    selectedReason = ""
  ) => {
    const approvalKey =
      doc.approval_key ||
      [
        doc.source || "unknown",
        doc.crm_field_api_name || "",
        doc.attachment_id ||
          doc.id ||
          doc.document_id ||
          ""
      ].join(":");

    if (!approvalKey) {
      setDocActionError(
        "This document has no approval identifier."
      );
      return;
    }

    if (action === "reject" && !selectedReason) {
      setRejectingDocument(doc);
      setRejectionReason("");
      return;
    }

    const reason = action === "reject" ? selectedReason : "";

    if (
      action === "reject" &&
      !reason.trim()
    ) {
      return;
    }

    setApprovalBusyKey(approvalKey);
    setDocActionError(null);

    try {
      const { adminToken } = getTokens();

      const response = await fetch(
        `${API_BASE}/api/admin/documents/${encodeURIComponent(
          user.email
        )}/${encodeURIComponent(
          approvalKey
        )}/approval`,
        {
          method: "POST",
          headers: {
            Authorization:
              `AdminBearer ${adminToken}`,
            "x-admin-token":
              adminToken,
            "Content-Type":
              "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            action,
            reason,
            document: {
              attachment_id:
                doc.attachment_id ||
                doc.id ||
                null,
              document_name:
                doc.document_name ||
                doc.File_Name ||
                "Document",
              source:
                doc.source ||
                "unknown",
              crm_field_api_name:
                doc.crm_field_api_name ||
                null,
              uploaded_at:
                doc.uploaded_at ||
                null
            }
          })
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to update document approval."
        );
      }

      setDocuments(previous =>
        previous.map(item => {
          const itemKey =
            item.approval_key ||
            [
              item.source ||
                "unknown",
              item.crm_field_api_name ||
                "",
              item.attachment_id ||
                item.id ||
                item.document_id ||
                ""
            ].join(":");

          return itemKey === approvalKey
            ? {
                ...item,
                approval_key:
                  approvalKey,
                approval_status:
                  action === "approve"
                    ? "approved"
                    : "rejected",
                approved_at:
                  action === "approve"
                    ? new Date().toISOString()
                    : null,
                rejection_reason:
                  action === "reject"
                    ? reason
                    : null
              }
            : item;
        })
      );
      setRejectingDocument(null);
      setRejectionReason("");
    } catch (error) {
      setDocActionError(
        error.message ||
        "Unable to update document approval."
      );
    } finally {
      setApprovalBusyKey(null);
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Candidate Profile' },
    { id: 'pipeline', label: 'Candidate Pipeline', badge: pipeline.length },
    { id: 'documents', label: 'Candidate Documents', badge: documents.length },
    { id: 'deployment', label: 'Travel & Extras' },
    { id: 'aftercare', label: 'Aftercare Dates' },
    { id: 'allData', label: 'All User Information' },
    { id: 'overview', label: 'System Overview' },
  ];

  const displayStages = pipeline.filter(s => !s.is_gate);
  const completedCount = displayStages.filter(s => s.status === "Completed").length;
  const progressPct = displayStages.length > 0 ? Math.round((completedCount / displayStages.length) * 100) : 0;
  const activeCategories = ["Hiring", "Immigration", "Deployment", "Aftercare", "NCLEX Roadmap", "NCLEX Prescreen"];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {rejectingDocument && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Reject document</h2>
            <p className="mt-2 text-sm text-gray-600">
              Select the reason that should be sent to the candidate.
            </p>
            <label className="mt-5 block text-sm font-semibold text-gray-900" htmlFor="document-rejection-reason">
              Reason for rejection
            </label>
            <select
              id="document-rejection-reason"
              value={rejectionReason}
              onChange={event => setRejectionReason(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
            >
              <option value="">Select a reason</option>
              {DOCUMENT_REJECTION_REASONS.map(reason => (
                <option key={reason.value} value={`${reason.label} - ${reason.description}`}>
                  {reason.label} - {reason.description}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRejectingDocument(null); setRejectionReason(""); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason}
                onClick={() => updateDocumentApproval(rejectingDocument, "reject", rejectionReason)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Reject document
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-gray-50 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {userPendingRequests.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3">
            <p className="text-sm font-bold text-amber-900">
              {userPendingRequests.length} request{userPendingRequests.length === 1 ? "" : "s"} awaiting approval
            </p>
            <p className="text-xs text-amber-800">
              This candidate has a pending request awaiting admin approval. Open the Requests panel to review it before approving profile changes.
            </p>
          </div>
        )}
        
        {/* HEADER */}
        <div className="bg-white border-b px-8 py-6 z-10 sticky top-0" style={{ borderColor: THEME.border }}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: THEME.brandGhost }}>
                <span className="text-2xl font-bold" style={{ color: THEME.brand }}>
                  {initials(profile.candidateName || profile.firstName || user.name || user.email)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {extractString(profile.candidateName) !== "—" ? extractString(profile.candidateName) : extractString(user.name) !== "—" ? extractString(user.name) : 'Candidate'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{extractString(profile.email) !== "—" ? extractString(profile.email) : user.email}</p>
                {extractString(profile.professionalSpecialty) !== "—" && (
                  <p className="text-sm font-medium mt-0.5" style={{ color: THEME.brand }}>{extractString(profile.professionalSpecialty)}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => { onMessage(user); onClose(); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 shadow-sm" style={{ background: THEME.brand }}>
                <MessageSquare className="w-4 h-4" /> Message
              </button>
              <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-gray-100 transition border border-gray-200">
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex pt-6 gap-6 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                {t.label}
                {t.badge > 0 && <span className="bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full text-xs font-semibold">{t.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="p-8 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-600" />
              <p>Fetching comprehensive candidate data via Admin Bypass...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: PROFILE */}
              {activeTab === 'profile' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <Section title={<><User className="w-5 h-5 text-purple-600" /> Personal Information</>}>
                    <InfoRow label="Full Name" value={profile.candidateName || profile.firstName} icon={Users} />
                    <InfoRow label="Preferred Name" value={profile.prefferedName} icon={UserCheck} />
                    <InfoRow label="Date of Birth" value={profile.dateOfBirth} isDate icon={Calendar} />
                    <InfoRow label="Phone" value={profile.phone} icon={Phone} />
                    <InfoRow label="Email" value={profile.email} icon={Mail} />
                    <InfoRow label="Alt Email" value={profile.altEmail} icon={Mail} />
                    <InfoRow label="US Address" value={profile.usaddress} icon={MapPin} />
                    <InfoRow label="Contact Name" value={profile.contactName} icon={UserCheck} />
                  </Section>

                  <Section title={<><Award className="w-5 h-5 text-purple-600" /> Professional Details</>}>
                    <InfoRow label="Specialty" value={profile.professionalSpecialty} icon={HeartPulse} />
                    <InfoRow label="Education" value={profile.Education} icon={Award} />
                    <InfoRow label="Current Employer" value={profile.current_employer || profile.hospitalName} icon={Building2} />
                    <InfoRow label="Application Status" value={profile.applicationStatus || profile.Application_Status || profile.Lead_Management_Status} icon={Briefcase} />
                    <InfoRow
                      label="Embassy Eligibility Status"
                      value={
                        profile.State_Licensure_Requirements ||
                        profile.embassyEligibilityStatus ||
                        profile.embassy_eligibility_status
                      }
                      icon={Shield}
                    />
                    <InfoRow label="Proof of NCLEX" value={profile.Proof_of_NCLEX || profile.proofOfNCLEX} icon={FileCheck} />
                    <InfoRow label="Birth Certificate" value={profile.Birth_Certificate || profile.birthCertificate} icon={FileText} />
                  </Section>

                  <Section title={<><Building className="w-5 h-5 text-purple-600" /> Interview & Hiring Details</>}>
                    <InfoRow label="Scheduled for Interview" value={profile.scheduled_for_interview} icon={CalendarDays} />
                    <InfoRow label="Interview Date" value={profile.interviewdate || profile.interviewDate} isDate icon={Calendar} />
                    <InfoRow label="Interview Location" value={profile.interviewlocation || profile.interviewLocation} icon={MapPin} />
                    <InfoRow label="Hired Location" value={profile.hiredlocation} icon={MapPin} />
                    <InfoRow label="Hired Department" value={profile.hireddept || profile.Departmenet} icon={Building} />
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">Interview Notes</h4>
                      <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
                        {extractString(profile.notesInterview) !== "—" ? extractString(profile.notesInterview) : "No interview notes recorded."}
                      </p>
                    </div>
                  </Section>
                  
                  <div className="space-y-6">
                    <Section title={<><FileCheck className="w-5 h-5 text-emerald-600" /> Relias & Assessments</>}>
                      <InfoRow label="Initial ICP Assessment" value={profile.initialICPAssessment} icon={CheckCircle} />
                      <InfoRow label="Relias Enrolled Date" value={profile.reliasEnrolledDate} isDate icon={Calendar} />
                      <InfoRow label="Relias Extension" value={profile.reliasExtension} isDate icon={CalendarDays} />
                    </Section>

                    <Section title={<><Folder className="w-5 h-5 text-amber-600" /> Contracts & Offers</>}>
                      <InfoRow label="Offer & Agreement on File" value={profile.OfferandAgreementonFile} icon={Folder} />
                      <InfoRow label="Agreement Signed" value={profile.AgreementSigned} icon={FileText} />
                      <InfoRow label="Order Number" value={profile.orderNumber} icon={CheckCircle} />
                    </Section>
                  </div>
                </div>
              )}

              {/* TAB 2: PIPELINE */}
              {activeTab === 'pipeline' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">Overall Progress</span>
                      <span className="text-sm font-bold text-purple-700">{completedCount} / {displayStages.length} stages</span>
                    </div>
                    <div className="relative pt-2">
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {pipeline.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">No pipeline established yet.</p>
                    </div>
                  ) : (
                    activeCategories.map(cat => {
                      const catStages = pipeline.filter(s => s?.stage_category === cat).sort((a, b) => a.stage_order - b.stage_order);
                      if (!catStages || catStages.length === 0) return null;
                      
                      const colors = PIPELINE_CATEGORIES[cat] || PIPELINE_CATEGORIES.Hiring;
                      const catCompleted = catStages.filter(s => s?.status === "Completed").length;
                      
                      return (
                        <div key={cat} className="bg-white rounded-xl border overflow-hidden shadow-sm">
                          <div className={`px-5 py-4 flex items-center justify-between border-b ${colors.bg} border-gray-100`}>
                            <h2 className={`font-bold text-sm ${colors.text}`}>{cat} Phase</h2>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white shadow-sm border ${colors.text}`}>
                              {catCompleted}/{catStages.length} complete
                            </span>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {catStages.map((stage) => {
                              const cfg = PIPELINE_STATUS[stage.status] || PIPELINE_STATUS["Not Started"];
                              const Icon = cfg.icon;
                              const isGate = stage.is_gate === true;
                              
                              return (
                                <div key={stage.id || stage._id} className={`flex items-start gap-4 px-5 py-4 ${isGate ? 'bg-blue-50/30 border-l-4 border-l-blue-400' : ''}`}>
                                  <div className="flex-shrink-0 mt-0.5">
                                    {isGate ? <GitBranch className={`w-5 h-5 ${cfg.color}`} /> : <Icon className={`w-5 h-5 ${cfg.color}`} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold ${stage.status === 'Completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                      {isGate && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2 font-bold">GATE</span>}
                                      {stage.stage_name}
                                    </p>
                                    {stage.completed_date && <p className="text-xs text-emerald-600 font-semibold mt-1">Completed {formatDate(stage.completed_date)}</p>}
                                    {stage.status === 'In Progress' && <p className="text-xs text-blue-600 font-semibold mt-1">Currently in progress</p>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${cfg.badge}`}>
                                      {stage.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: DOCUMENTS */}
              {activeTab === 'documents' && (
              <div className="space-y-5">
                <div className="space-y-4">
                  {docActionError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {docActionError}
                    </div>
                  )}
                  {documents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                      <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium text-lg">No documents found.</p>
                      <p className="text-sm text-gray-400 mt-1">Checked both Zoho CRM and Zoho Recruit.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map((doc, idx) => {
                        const { category, icon: DocIcon, color } = classifyDocument(doc.document_name || doc.File_Name);
                        const docId = doc.attachment_id || doc.id || idx;
                        const isViewing = viewingDocId === (doc.attachment_id || doc.id);
                        return (
                          <div key={docId} className="bg-white rounded-xl border p-5 flex items-center justify-between shadow-sm transition hover:shadow-md hover:border-purple-200">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                                <DocIcon className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-gray-900 truncate pr-4">
                                  {extractString(doc.document_name || doc.File_Name) !== "—" ? extractString(doc.document_name || doc.File_Name) : 'Unnamed Document'}
                                </p>
                                <div className="flex gap-2 mt-1.5 items-center flex-wrap">
                                  <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{category}</span>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${doc.source === 'recruit' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                    {doc.source === 'recruit' ? 'Recruit' : 'CRM'}
                                  </span>
                                  <span
                                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                                      doc.approval_status === "approved"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : doc.approval_status === "rejected"
                                          ? "bg-red-50 text-red-700"
                                          : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {doc.already_approved === true ||
                                      doc.approval_status === "approved"
                                      ? "Approved"
                                      : doc.approval_status === "rejected"
                                        ? "Rejected"
                                        : "Pending approval"}
                                  </span>
                                </div>
                                {doc.rejection_reason && (
                                  <p className="mt-2 text-xs text-red-600">
                                    {doc.rejection_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2">
                              <button
                                onClick={() =>
                                  handleViewDocument(doc)
                                }
                                disabled={isViewing}
                                className="rounded-lg border bg-gray-50 p-2.5 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                                title="View Document"
                              >
                                {isViewing
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Eye className="h-4 w-4" />}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentApproval(
                                    doc,
                                    "approve"
                                  )
                                }
                                disabled={
                                  approvalBusyKey ===
                                    doc.approval_key ||
                                  doc.already_approved ===
                                    true ||
                                  doc.approval_status ===
                                    "approved"
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentApproval(
                                    doc,
                                    "reject"
                                  )
                                }
                                disabled={
                                  approvalBusyKey ===
                                    doc.approval_key
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* TAB 4: DEPLOYMENT */}
              {activeTab === 'deployment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Section title={<><Plane className="w-5 h-5 text-blue-600" /> Flight Itinerary</>} className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                      <InfoRow label="Primary Airline" value={profile.primaryairline} icon={Plane} />
                      <InfoRow label="Departure City" value={profile.departcity} icon={MapPin} />
                      <InfoRow label="Port of Entry" value={profile.entryport} icon={MapPin} />
                      
                      <InfoRow label="Scheduled Departure" value={profile.scheduleddeparturedate} icon={Clock} />
                      <InfoRow label="Scheduled Arrival" value={profile.scheduledarrivaldate} icon={Clock} />
                      <InfoRow label="Initial Departure" value={profile.initial_departure_time} icon={Clock} />
                      <InfoRow label="Final Arrival" value={profile.final_destination_arrival} icon={Clock} />

                      <InfoRow label="Flight Numbers" value={[profile.fligtnumber1, profile.fligtnumber2, profile.fligtnumber3, profile.fligtnumber4].filter(f=>f&&f!=="—").join(', ')} icon={Plane} />
                      <InfoRow label="Final Flight" value={`${extractString(profile.finalflightairline)} ${extractString(profile.finalflightnumber)}`.trim()} icon={Plane} />
                      <InfoRow label="Layovers" value={[profile.layover1location, profile.layover2location, profile.layover3location].filter(l=>l&&l!=="—").join(', ')} icon={MapPin} />
                      
                      <InfoRow label="Confirmation #" value={profile.confirmationnumbers} icon={FileText} />
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoRow label="Flight Booked Status" value={profile.Flight_Booked_Emailed || profile.flightConfirmation} icon={CheckCircle} />
                      <InfoRow label="RN Flight Cost" value={profile.RN_Flight_Cost} icon={DollarSign} />
                      <InfoRow label="Dependent Flight Cost" value={profile.Dependent_Flight_Cost} icon={DollarSign} />
                      
                      {profile.primaryairlinetrack !== "—" && profile.primaryairlinetrack && (
                        <div className="col-span-1 md:col-span-3">
                          <a href={profile.primaryairlinetrack} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">
                            <Plane className="w-4 h-4"/> Track Primary Flight
                          </a>
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section title={<><Users className="w-5 h-5 text-emerald-600" /> Concierge & Welcome</>}>
                    <InfoRow label="Assigned Concierge" value={profile.conciergeName || profile.concierge_assigned} icon={Users} />
                    <InfoRow label="Concierge Phone" value={profile.conciergePhone} icon={Phone} />
                    <InfoRow label="Concierge Email" value={profile.conciergeEmail} icon={Mail} />
                    <InfoRow label="Hotel Booked" value={profile.hotel_booked} icon={Building} />
                    <InfoRow label="Meet & Greet" value={profile.client_meet_and_greet} icon={Users} />
                    <InfoRow label="Welcome Packet Emailed" value={profile.welcome_packet_emailed} icon={CheckCircle} />
                    <InfoRow label="Welcome Appointments" value={profile.welcomeAppointments} icon={CalendarDays} />
                  </Section>

                  <Section title={<><DollarSign className="w-5 h-5 text-amber-600" /> Financial & Labor</>}>
                    <InfoRow label="Concierge Labor Costs" value={profile.concierge_labor_costs} icon={DollarSign} />
                    <InfoRow label="Concierge Travel Exp." value={profile.concierge_travel_expenses} icon={DollarSign} />
                    <InfoRow label="Exchange Rate" value={profile.exchangeRate} icon={RefreshCw} />
                  </Section>
                </div>
              )}

              {/* TAB 5: AFTERCARE DATES */}
              {activeTab === 'aftercare' && (
                <div className="space-y-6">
                  <Section title={<><CalendarDays className="w-5 h-5 text-rose-600" /> Candidate-Submitted Aftercare Dates</>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                      <InfoRow
                        label="Orientation Start Date"
                        value={
                          adminDetails?.submittedDates?.orientationStartDate ||
                          profile.orientationStartDate ||
                          user.orientationStartDate
                        }
                        isDate
                        icon={Calendar}
                      />
                      <InfoRow
                        label="Start Date on Floor Independently"
                        value={
                          adminDetails?.submittedDates?.independentFloorStartDate ||
                          profile.independentFloorStartDate ||
                          user.independentFloorStartDate
                        }
                        isDate
                        icon={CalendarDays}
                      />
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      These dates are entered by the candidate in the portal and saved to MongoDB.
                      Their pipeline stages are completed only after the backend confirms the save.
                    </p>
                  </Section>

                  <Section title={<><Activity className="w-5 h-5 text-purple-600" /> Pipeline Summary</>}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">Completed stages</p>
                        <p className="text-xl font-bold text-gray-900">
                          {adminDetails?.pipelineProgress?.completed ?? completedCount}
                          {' / '}
                          {adminDetails?.pipelineProgress?.total ?? displayStages.length}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">Overall progress</p>
                        <p className="text-xl font-bold text-purple-700">
                          {adminDetails?.pipelineProgress?.percentage ?? progressPct}%
                        </p>
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">Current stage</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {adminDetails?.pipelineProgress?.currentStage || user?.pipeline?.currentStage || 'Not started'}
                        </p>
                      </div>
                    </div>
                  </Section>
                </div>
              )}

              {/* TAB 6: ALL USER INFORMATION */}
              {activeTab === 'allData' && (
                <div className="space-y-6">
                  <Section title={<><Layers className="w-5 h-5 text-purple-600" /> Complete Candidate Record</>}>
                    <p className="text-sm text-gray-500 mb-4">
                      This table shows every non-empty field returned by the backend from the candidate's
                      Recruit, CRM, account, session, and MongoDB records.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Field</th>
                            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Object.entries({
                            ...user,
                            ...adminDetails,
                            ...profile,
                          })
                            .filter(([key, value]) => {
                              if ([
                                'zohoData',
                                'allDeals',
                                'deals',
                                'latestDeal',
                                'pipelineStages',
                                'loginHistory',
                                'pipelineProgress',
                                'submittedDates',
                                'pipeline'
                              ].includes(key)) return false;
                              return value !== undefined && value !== null && value !== '' && extractString(value) !== '—';
                            })
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([key, value]) => (
                              <tr key={key} className="align-top">
                                <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                                  {key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')}
                                </td>
                                <td className="px-4 py-3 text-gray-700 break-all whitespace-pre-wrap">
                                  {extractString(value)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                </div>
              )}

              {/* TAB 7: SYSTEM */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <Section title={<><Shield className="w-5 h-5 text-gray-700" /> Identity & Security</>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                      <InfoRow label="Registered Email" value={user.email} icon={Mail} />
                      <InfoRow label="Latest IP Address" value={adminDetails.ip || user.ip} icon={MapPin} />
                      <InfoRow label="Platform/Device" value={`${adminDetails.platform || user.platform || 'Web'} ${(adminDetails.version || user.version) && (adminDetails.version || user.version) !== '—' ? 'v' + (adminDetails.version || user.version) : ''}`} icon={Home} />
                      <InfoRow label="Session Status" value={(adminDetails.isActive ?? user.isActive) ? '🟢 Active' : '🔴 Expired'} icon={RefreshCw} />
                    </div>
                  </Section>
                  <Section title={<><Activity className="w-5 h-5 text-gray-700" /> Login Diagnostics</>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                      <InfoRow label="Session Created" value={adminDetails.sessionCreated || user.sessionCreated} isTime icon={Calendar} />
                      <InfoRow label="Last Login" value={adminDetails.loginHistory?.[0]?.timestamp || user.lastLogin} isTime icon={Calendar} />
                      <InfoRow label="Last Active Ping" value={adminDetails.lastActive || user.lastActive} isTime icon={CalendarDays} />
                      <InfoRow label="Expires At" value={(adminDetails.sessionExpiry || user.sessionExpiry) ? new Date(adminDetails.sessionExpiry || user.sessionExpiry).toISOString() : '—'} isTime icon={Clock} />
                    </div>
                  </Section>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const AnalyticsPanel = ({ users, logs }) => { 
  const safeUsers = users || [];
  const safeLogs = logs || [];

  const days = useMemo(() => {
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), count: 0 };
    });
    safeUsers.forEach((u) => {
      if (!u?.lastLogin) return;
      try {
        const diffDays = Math.floor((new Date().getTime() - new Date(u.lastLogin).getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 7) result[6 - diffDays].count++;
      } catch (e) {}
    });
    return result;
  }, [safeUsers]);

  const maxDays = Math.max(...days.map(d => d.count), 1);

  if (safeUsers.length === 0 && safeLogs.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: THEME.border }}>
        <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ color: THEME.muted }} />
        <p style={{ color: THEME.muted }}>No data available for analytics yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: THEME.border }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: THEME.text }}>Logins — Last 7 Days</h3>
        <div className="space-y-3">
          {days.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-sm w-12" style={{ color: THEME.text }}>{d.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(d.count / maxDays) * 100}%`, background: THEME.brand }} />
              </div>
              <span className="text-sm font-medium w-8 text-right" style={{ color: THEME.text }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: THEME.border }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: THEME.text }}>Recent Activity</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {safeLogs.slice(0, 15).map((log, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: THEME.border }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: THEME.brand }}>
                {initials(log?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: THEME.text }}>{log?.name || log?.email}</div>
                <div className="text-xs" style={{ color: THEME.muted }}>{log?.status} • {ET(log?.timestamp)}</div>
              </div>
              <StatusBadge status={log?.status === 'success' ? 'active' : 'expired'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BroadcastModal = ({ isOpen, onClose, onSend }) => { 
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try { await onSend(message, target); setMessage(''); onClose(); } 
    finally { setSending(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border" style={{ borderColor: THEME.brand }}>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: THEME.brand }}>
          <Send className="w-5 h-5" /> Broadcast Message
        </h3>
        <label className="block text-sm font-semibold text-gray-600 mb-1">Target Audience</label>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 bg-gray-50">
          <option value="all">All Registered Users</option>
          <option value="active">Only Active Sessions</option>
          <option value="arrived">Only Arrived in the US</option>
        </select>
        <label className="block text-sm font-semibold text-gray-600 mb-1">Message Content</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-4 py-3 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" rows={5} placeholder="Type your broadcast message here..." />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          <button onClick={handleSend} disabled={sending || !message.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition hover:opacity-90 disabled:opacity-50 shadow-md" style={{ background: THEME.brand }}>
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UsersTable = ({ users, onSelectUser, onMessageUser, onBroadcast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.email?.toLowerCase().includes(q) && !u.name?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'expired' && u.isActive) return false;
      return true;
    }).sort((a, b) => new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime());
  }, [users, search, statusFilter]);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search users by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border focus:outline-none shadow-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg border focus:outline-none shadow-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={() => setShowBroadcast(true)} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold shadow-sm transition hover:opacity-90" style={{ background: THEME.brand }}>
          <Send className="w-4 h-4" /> Broadcast
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px]">
            <thead style={{ background: THEME.bg }}>
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">User Details</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">Pipeline Progress</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">Current Stage</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">Orientation Start</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">Independent Floor Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-500">Last Login</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-t" style={{ borderColor: THEME.border }}>
              {filtered.map((u) => (
                <tr key={u.email} className="hover:bg-purple-50/50 transition cursor-pointer" onClick={() => onSelectUser(u)}>
                  <td className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ background: THEME.brand }}>
                      {initials(u.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{u.name || '—'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={u.isActive ? 'active' : 'expired'} /></td>
                  <td className="px-5 py-3 min-w-[170px]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{u.pipeline?.completed || 0}/{u.pipeline?.total || 0}</span>
                      <span className="font-bold text-purple-700">{u.pipeline?.percentage || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.max(0, Math.min(100, u.pipeline?.percentage || 0))}%` }} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 min-w-[180px]">{u.pipeline?.currentStage || 'Not started'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(u.orientationStartDate)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(u.independentFloorStartDate)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{ET(u.lastLogin)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onSelectUser(u); }} className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg mr-2 shadow-sm transition"><Eye className="w-4 h-4" style={{ color: THEME.brand }} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onMessageUser(u); }} className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg shadow-sm transition"><MessageSquare className="w-4 h-4" style={{ color: THEME.teal }} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-gray-400 font-medium">No users found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <BroadcastModal isOpen={showBroadcast} onClose={() => setShowBroadcast(false)} onSend={onBroadcast} />
    </div>
  );
};

const MessagingPanel = ({ users, initialTarget }) => { 
  const [messages, setMessages] = useState({});
  const [selected, setSelected] = useState(initialTarget?.email || null);
  const [department, setDepartment] = useState('admin');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [departmentConversations, setDepartmentConversations] = useState([]);
  const [expandedDepartments, setExpandedDepartments] = useState({
    admin: true,
    public: true,
    immigration: true,
    recruitment: true,
    deployment: true,
    aftercare: true
  });
  const chatEndRef = useRef(null);

  useEffect(() => { if (initialTarget?.email) setSelected(initialTarget.email); }, [initialTarget]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getAdminHeaders = () => {
    const { adminToken } = getTokens();
    return {
      'Content-Type': 'application/json',
      ...(adminToken ? {
        'Authorization': `AdminBearer ${adminToken}`,
        'x-admin-token': adminToken
      } : {})
    };
  };

  const readResponse = async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      setLoadingHistory(true);
      setMessageError('');
      try {
        const conversationsResponse = await fetch(`${API_BASE}/api/admin/messaging/conversations`, {
          credentials: 'include',
          headers: getAdminHeaders()
        });
        const conversationsData = await readResponse(conversationsResponse);
        if (!cancelled) {
          setDepartmentConversations(conversationsData.conversations || []);
        }
        if (!selected) return;
        const conversation = (conversationsData.conversations || []).find(item =>
          (item.participants || []).some(email => String(email).toLowerCase() === String(selected).toLowerCase()) &&
          (item.department || 'admin') === department
        );

        if (!conversation) {
          if (!cancelled) setMessages(prev => ({ ...prev, [selected]: [] }));
          return;
        }

        const historyResponse = await fetch(
          `${API_BASE}/api/admin/messaging/messages/${conversation._id}`,
          { credentials: 'include', headers: getAdminHeaders() }
        );
        const historyData = await readResponse(historyResponse);
        if (!cancelled) {
          setMessages(prev => ({ ...prev, [selected]: historyData.messages || [] }));
        }
      } catch (error) {
        if (!cancelled) setMessageError(error.message || 'Could not load this conversation.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [selected, department]);

  const sendMessage = async () => {
    if (
      !input.trim() ||
      loading ||
      (
        department !== "public" &&
        !selected
      )
    ) {
      return;
    }

    setLoading(true);
    setMessageError("");

    try {
      const content =
        input.trim();

      if (
        department ===
        "public"
      ) {
        const response =
          await fetch(
            `${API_BASE}/api/admin/messaging/broadcast`,
            {
              method:
                "POST",
              credentials:
                "include",
              headers:
                getAdminHeaders(),
              body:
                JSON.stringify({
                  content
                })
            }
          );

        await readResponse(
          response
        );

        setInput("");
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/admin/messaging/send`,
          {
            method:
              "POST",
            credentials:
              "include",
            headers:
              getAdminHeaders(),
            body:
              JSON.stringify({
                recipientEmail:
                  selected,
                content,
                department
              })
          }
        );

      const data =
        await readResponse(
          response
        );

      const newMessage =
        data.message || {
          _id:
            Date.now()
              .toString(),
          senderEmail:
            "admin",
          content,
          department,
          createdAt:
            new Date()
              .toISOString()
        };

      setMessages(
        previous => ({
          ...previous,
          [selected]: [
            ...(previous[selected] || []),
            newMessage
          ]
        })
      );

      setInput("");
    } catch (
      error
    ) {
      console.error(
        "Failed to send message:",
        error
      );

      setMessageError(
        error.message ||
        "Could not send the message."
      );
    } finally {
      setLoading(false);
    }
  };

  const threads = users.map(u => ({ email: u.email, name: u.name, isActive: u.isActive }));
  const departments = [
    { id: "admin", label: "Admin Messages" },
    { id: "public", label: "Public Messages" },
    { id: "immigration", label: "Immigration" },
    { id: "recruitment", label: "Recruitment" },
    { id: "deployment", label: "Deployment" },
    { id: "aftercare", label: "Aftercare" }
  ];
  const getConversationEmail = conversation =>
    (conversation.participants || []).find(email => {
      const normalized = String(email || '').trim().toLowerCase();
      return normalized !== 'admin' && !normalized.startsWith('admin@');
    });
  const getConversationName = conversation => {
    const email = getConversationEmail(conversation);
    const thread = threads.find(item => String(item.email).toLowerCase() === String(email).toLowerCase());
    return thread?.name || email?.split('@')[0] || 'Unknown user';
  };
  const conversationsByDepartment = department => {
    if (department === "public") {
      return [];
    }

    const uniqueConversations = new Map();
    departmentConversations
      .filter(conversation =>
        String(conversation.department || 'admin').trim().toLowerCase() === department &&
        getConversationEmail(conversation)
      )
      .forEach(conversation => {
        const email = getConversationEmail(conversation).trim().toLowerCase();
        const existing = uniqueConversations.get(email);
        if (!existing || new Date(conversation.lastMessageAt || 0) > new Date(existing.lastMessageAt || 0)) {
          uniqueConversations.set(email, conversation);
        }
      });
    return Array.from(uniqueConversations.values());
  };
  const chat = selected ? messages[selected] || [] : [];

  return (
    <div className="bg-white rounded-xl border overflow-hidden h-[600px] flex shadow-sm">
      <div className="w-1/3 border-r overflow-y-auto bg-gray-50/30">
        {departments.map(item => {
          const departmentThreads =
            conversationsByDepartment(
              item.id
            );
          const isExpanded =
            expandedDepartments[
              item.id
            ];

          return (
            <div key={item.id} className="border-b border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setExpandedDepartments(
                    previous => ({
                      ...previous,
                      [item.id]:
                        !previous[
                          item.id
                        ]
                    })
                  );
                  setDepartment(
                    item.id
                  );

                  if (
                    item.id ===
                    "public"
                  ) {
                    setSelected(
                      null
                    );
                  }
                }}
                className={`w-full px-4 py-3 flex items-center justify-between text-left font-bold text-sm ${
                  department === item.id
                    ? "bg-purple-50 text-purple-800"
                    : "bg-white text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs font-semibold text-gray-400">
                  {item.id === "public"
                    ? "Group"
                    : departmentThreads.length}
                </span>
              </button>
              {isExpanded &&
                item.id !== "public" &&
                departmentThreads.length === 0 && (
                  <div className="px-7 py-2 text-xs italic text-gray-400 bg-gray-50">
                    No messages
                  </div>
                )}

              {isExpanded &&
                item.id === "public" && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepartment(
                        "public"
                      );
                      setSelected(
                        null
                      );
                    }}
                    className={`w-full px-7 py-3 text-left border-t border-gray-100 transition ${
                      department === "public"
                        ? "bg-purple-100"
                        : "bg-gray-50 hover:bg-purple-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">
                      Community / Public
                    </div>
                    <div className="text-xs text-gray-500">
                      Post a message visible to all candidates
                    </div>
                  </button>
                )}

              {isExpanded && item.id !== "public" && departmentThreads.map(conversation => {
                const email = getConversationEmail(conversation);
                const thread = threads.find(user => String(user.email).toLowerCase() === String(email).toLowerCase());
                return (
                  <button
                    type="button"
                    key={conversation._id}
                    onClick={() => {
                      setDepartment(
                        item.id
                      );
                      setSelected(
                        email
                      );
                    }}
                    className={`w-full px-7 py-3 text-left border-t border-gray-100 transition ${
                      selected === email &&
                      department === item.id
                        ? "bg-purple-100"
                        : "bg-gray-50 hover:bg-purple-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{getConversationName(conversation)}</div>
                        <div className="pl-2 text-xs text-gray-500 truncate">
                          {conversation.lastMessage?.content || "No messages yet"}
                        </div>
                      </div>
                      {thread?.isActive && <div className="w-2 h-2 shrink-0 rounded-full bg-green-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="w-2/3 flex flex-col bg-white">
        {department === "public" ? (
          <>
            <div className="border-b px-5 py-4 bg-white shadow-sm">
              <h3 className="font-bold text-gray-900">
                Public Messages
              </h3>
              <p className="text-xs text-gray-500">
                Messages posted here are visible to the candidate community.
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 px-8 text-center">
              <MessageSquare className="mb-3 h-12 w-12 text-purple-200" />
              <p className="font-semibold text-gray-700">
                Community message
              </p>
              <p className="mt-1 max-w-md text-sm text-gray-500">
                Use the composer below to post a public message to all candidates. Individual replies should be handled in the appropriate Admin, Immigration, Recruitment, Deployment, or Aftercare section.
              </p>

              {messageError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {messageError}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-white flex gap-3">
              <input
                value={input}
                onChange={event =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={event =>
                  event.key === "Enter" &&
                  sendMessage()
                }
                placeholder="Post a public message..."
                className="flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  loading ||
                  !input.trim()
                }
                className="px-6 py-2.5 rounded-xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center gap-2"
                style={{
                  background:
                    THEME.brand
                }}
              >
                {loading
                  ? "Posting"
                  : "Post"}{" "}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : !selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-200" />
            <p>Select a user to start messaging</p>
          </div>
        ) : (
          <>
            <div className="border-b px-5 py-4 bg-white flex items-center justify-between shadow-sm z-10">
              <div>
                <h3 className="font-bold text-gray-900">
                  {threads.find(t => String(t.email).toLowerCase() === String(selected).toLowerCase())?.name || selected.split('@')[0]}
                </h3>
                <p className="text-xs text-gray-500">
                  {departments.find(
                    item =>
                      item.id === department
                  )?.label || department}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#efeae2]">
              {messageError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{messageError}</div>}
              {loadingHistory ? (
                <div className="text-center text-xs text-gray-400 mt-4">Loading conversation...</div>
              ) : chat.length === 0 ? (
                <div className="text-center text-xs text-gray-400 mt-4">This is the start of your conversation.</div>
              ) : (
                chat.map((msg) => (
                  <div key={msg._id || msg.id} className={`flex ${msg.senderEmail === 'admin' || msg.from === 'admin' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%]">
                      <div className={`mb-1 px-2 text-xs font-semibold ${msg.senderEmail === 'admin' || msg.from === 'admin' ? 'text-left text-emerald-700' : 'text-right text-gray-700'}`}>
                        {msg.senderEmail === 'admin' || msg.from === 'admin'
                          ? 'Admin'
                          : threads.find(thread => String(thread.email).toLowerCase() === String(msg.senderEmail || '').toLowerCase())?.name || getConversationName({ participants: [msg.senderEmail] })}
                      </div>
                      <div className={`ml-2 rounded-lg px-3 py-2 text-sm shadow-sm ${msg.senderEmail === 'admin' || msg.from === 'admin' ? 'rounded-bl-none bg-[#d9fdd3] text-gray-800' : 'rounded-br-none bg-white text-gray-800'}`}>
                        <div className="whitespace-pre-wrap break-words">{msg.content || msg.text}</div>
                        <div className="mt-1 text-right text-[10px] text-gray-500">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t bg-white flex gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" />
              <button onClick={sendMessage} disabled={loading || !input.trim()} className="px-6 py-2.5 rounded-xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center gap-2" style={{ background: THEME.brand }}>
                {loading ? 'Sending' : 'Send'} <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


const AdminRequestsPanel = ({ onOpenUser }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");

  const load = useCallback(async () => {
    try {
      const { adminToken, userToken } = getTokens();
      const response = await fetch(
        `${API_BASE}/api/admin/requests?pendingOnly=true&_=${Date.now()}`,
        {
          cache:"no-store",
          credentials:"include",
          headers:{
            ...(adminToken ? {
              Authorization:`AdminBearer ${adminToken}`,
              "x-admin-token":adminToken
            } : {}),
            ...(!adminToken && userToken ? {
              Authorization:`Bearer ${userToken}`
            } : {})
          }
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Unable to load requests.");
      }
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (error) {
      console.error("[Admin Requests]", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const decide = async (request, decision) => {
    setBusyId(String(request._id));
    try {
      const { adminToken, userToken } = getTokens();
      const response = await fetch(
        `${API_BASE}/api/admin/requests/${request._id}/decision`,
        {
          method:"POST",
          credentials:"include",
          headers:{
            "Content-Type":"application/json",
            ...(adminToken ? {
              Authorization:`AdminBearer ${adminToken}`,
              "x-admin-token":adminToken
            } : {}),
            ...(!adminToken && userToken ? {
              Authorization:`Bearer ${userToken}`
            } : {})
          },
          body:JSON.stringify({decision})
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Unable to update request.");
      }
      await load();
    } catch (error) {
      alert(error.message);
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading candidate requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Candidate Requests</h2>
        <p className="text-sm text-gray-500">
          Requests are tied to the specific candidate and remain pending until an admin approves or rejects them.
        </p>
      </div>
      {requests.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">No pending requests.</div>
      ) : (
        requests.map(request => {
          const details = request.details || {};
          return (
            <div key={String(request._id)} className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenUser?.({email:request.candidate_email,pendingRequests:[request]})}
                    className="font-bold text-purple-700 hover:underline"
                  >
                    {request.candidate_email}
                  </button>
                  <p className="mt-1 text-sm font-semibold capitalize">
                    {String(request.request_type || "request").replaceAll("_"," ")}
                  </p>
                  <div className="mt-2 text-sm text-gray-600">
                    {Object.entries(details)
                      .filter(([key]) =>
                        ![
                          "passport_attachment_id",
                          "passport_deal_id",
                          "passport_source",
                          "passport_mime_type"
                        ].includes(key)
                      )
                      .map(([key,value]) => (
                        <div key={key}>
                          <span className="font-medium">{key.replaceAll("_"," ")}:</span>{" "}
                          {String(value ?? "")}
                        </div>
                      ))}

                    {request.request_type === "add_dependant" &&
                      details.passport_attachment_id && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { adminToken } = getTokens();
                              const response = await fetch(
                                `${API_BASE}/api/admin/documents/download/${encodeURIComponent(
                                  details.passport_attachment_id
                                )}?email=${encodeURIComponent(
                                  request.candidate_email
                                )}&source=crm&crmRecordId=${encodeURIComponent(
                                  details.passport_deal_id || ""
                                )}`,
                                {
                                  headers: {
                                    Authorization:
                                      `AdminBearer ${adminToken}`,
                                    "x-admin-token":
                                      adminToken
                                  },
                                  credentials:
                                    "include"
                                }
                              );

                              if (!response.ok) {
                                throw new Error(
                                  `Server returned ${response.status}`
                                );
                              }

                              const blob =
                                await response.blob();

                              const url =
                                URL.createObjectURL(blob);

                              window.open(
                                url,
                                "_blank",
                                "noopener,noreferrer"
                              );

                              setTimeout(
                                () => URL.revokeObjectURL(url),
                                60000
                              );
                            } catch (error) {
                              alert(
                                error.message ||
                                "Unable to open passport image."
                              );
                            }
                          }}
                          className="mt-3 rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700"
                        >
                          View Passport Image
                        </button>
                      )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(request,"approve")}
                    disabled={busyId === String(request._id)}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(request,"reject")}
                    disabled={busyId === String(request._id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const AdminReceiptsPanel = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [sideDrafts, setSideDrafts] = useState({});
  const [busyId, setBusyId] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      const { adminToken, userToken } = getTokens();
      const response = await fetch(
        `${API_BASE}/api/admin/receipts?_=${Date.now()}`,
        {
          cache:"no-store",
          credentials:"include",
          headers:{
            ...(adminToken ? {
              Authorization:`AdminBearer ${adminToken}`,
              "x-admin-token":adminToken
            } : {}),
            ...(!adminToken && userToken ? {
              Authorization:`Bearer ${userToken}`
            } : {})
          }
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Unable to load receipts.");
      }
      setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
    } catch (error) {
      console.error("[Admin Receipts]", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viewReceipt = async receipt => {
    const attachmentId =
      receipt.crm_attachment_id ||
      receipt.recruit_attachment_id ||
      receipt.attachment_id ||
      null;

    if (!attachmentId) {
      alert("This receipt does not have a downloadable attachment ID.");
      return;
    }

    try {
      const { adminToken } =
        getTokens();

      const source =
        receipt.crm_attachment_id
          ? "crm"
          : "recruit";

      const response =
        await fetch(
          `${API_BASE}/api/admin/documents/download/${encodeURIComponent(
            attachmentId
          )}?email=${encodeURIComponent(
            receipt.candidate_email
          )}&source=${encodeURIComponent(
            source
          )}&crmRecordId=${encodeURIComponent(
            receipt.crm_deal_id ||
            ""
          )}&recruitRecordId=${encodeURIComponent(
            receipt.recruit_candidate_id ||
            ""
          )}`,
          {
            headers: {
              Authorization:
                `AdminBearer ${adminToken}`
            },
            credentials: "include"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(
          blob
        );

      setReceiptPreview(
        previous => {
          if (
            previous?.url
          ) {
            URL.revokeObjectURL(
              previous.url
            );
          }

          return {
            url,
            type:
              blob.type ||
              receipt.file_type ||
              "",
            name:
              receipt.original_name ||
              receipt.document_name ||
              "Receipt"
          };
        }
      );
    } catch (error) {
      alert(
        error.message ||
        "Unable to open receipt."
      );
    }
  };

  const loadExpenseReport = async email => {
    try {
      const { adminToken } =
        getTokens();

      const response =
        await fetch(
          `${API_BASE}/api/admin/reimbursement/expense-report?email=${encodeURIComponent(
            email
          )}&_=${Date.now()}`,
          {
            cache:
              "no-store",
            credentials:
              "include",
            headers: {
              Authorization:
                `AdminBearer ${adminToken}`,
              "x-admin-token":
                adminToken
            }
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
          "Unable to load expense report."
        );
      }

      setReportPreview(
        data.report ||
        null
      );
    } catch (
      error
    ) {
      alert(
        error.message ||
        "Unable to load expense report."
      );
    }
  };

  const save = async receipt => {
    const id =
      String(
        receipt.id ||
        receipt._id ||
        ""
      );

    const rawAmount =
      drafts[id] ??
      receipt.admin_correct_amount ??
      "";

    const amount =
      Number(rawAmount);

    const amountType =
      String(
        sideDrafts[id] ??
        receipt.admin_amount_type ??
        ""
      )
        .trim()
        .toLowerCase();

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setSaveMessage(
        "Enter a valid amount before submitting."
      );
      return;
    }

    if (
      amountType !== "credit" &&
      amountType !== "deduction"
    ) {
      setSaveMessage(
        "Select Credit or Deduction before submitting the amount."
      );
      return;
    }

    setBusyId(id);
    setSaveMessage("");

    try {
      const { adminToken } =
        getTokens();

      if (!adminToken) {
        throw new Error(
          "Admin session is unavailable. Please sign in again."
        );
      }

      const response =
        await fetch(
          `${API_BASE}/api/admin/receipts/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                `AdminBearer ${adminToken}`,
              "x-admin-token":
                adminToken
            },
            body:
              JSON.stringify({
                correctAmount:
                  amount,
                correctAmountUsd:
                  amount,
                amountType:
                  amountType
              })
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
          "Unable to submit amount."
        );
      }

      setSaveMessage(
        `${amountType === "credit" ? "Credit" : "Deduction"} of $${amount.toFixed(2)} saved successfully.`
      );

      if (data.report) {
        setReportPreview(
          data.report
        );
      }

      await load();

      if (
        selectedCandidate &&
        !data.report
      ) {
        await loadExpenseReport(
          selectedCandidate
        );
      }
    } catch (error) {
      console.error(
        "[Admin Receipts] Submit amount failed:",
        error
      );
      setSaveMessage(
        error.message ||
        "Unable to submit amount."
      );
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading receipts...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Receipts</h2>
        <p className="text-sm text-gray-500">
          Review each receipt, enter the verified amount, then classify it as a Credit or Deduction for the Expense Report.
        </p>
      </div>
      {saveMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            /successfully/i.test(saveMessage)
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {saveMessage}
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          No receipts uploaded from the Documents section yet.
        </div>
      ) : !selectedCandidate ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(
            receipts.reduce((groups, receipt) => {
              const email =
                receipt.candidate_email ||
                "Unknown candidate";

              if (!groups[email]) {
                groups[email] = [];
              }

              groups[email].push(receipt);
              return groups;
            }, {})
          ).map(([email, candidateReceipts]) => (
            <button
              key={email}
              type="button"
              onClick={() => {
                setSelectedCandidate(
                  email
                );
                loadExpenseReport(
                  email
                );
              }}
              className="rounded-xl border bg-white p-4 text-left hover:border-purple-300 hover:bg-purple-50/40"
            >
              <p className="font-semibold text-purple-800">
                {email}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {candidateReceipts.length} receipt{candidateReceipts.length === 1 ? "" : "s"}
              </p>
              <p className="mt-3 text-xs font-semibold text-purple-600">
                Open user receipts →
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() =>
              setSelectedCandidate("")
            }
            className="text-sm font-semibold text-purple-700"
          >
            ← Back to candidates
          </button>

          <div className="rounded-xl border bg-purple-50 p-4">
            <p className="text-xs uppercase tracking-wide text-purple-500">
              Candidate receipts
            </p>
            <p className="font-semibold text-purple-900">
              {selectedCandidate}
            </p>
          </div>

          {reportPreview && (
            <div className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-purple-500">
                    Expense Report
                  </p>
                  <p className="font-semibold">
                    {reportPreview.candidate_name || selectedCandidate}
                  </p>
                  <p className="text-xs text-gray-500">
                    {reportPreview.arrival_date
                      ? `Arrival: ${reportPreview.arrival_date}`
                      : ""}
                    {reportPreview.facility
                      ? ` • ${reportPreview.facility}`
                      : ""}
                  </p>
                </div>

                <div className="text-right text-sm">
                  <p>
                    Credits: ${Number(
                      reportPreview.totals?.credits || 0
                    ).toFixed(2)}
                  </p>
                  <p>
                    Deductions: ${Number(
                      reportPreview.totals?.deductions || 0
                    ).toFixed(2)}
                  </p>
                  <p className="font-bold text-purple-800">
                    Due to {reportPreview.totals?.due_to || "Neither"}:
                    {" "}
                    ${Number(
                      reportPreview.totals?.amount_due || 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {receipts
            .filter(receipt =>
              receipt.candidate_email ===
              selectedCandidate
            )
            .map(receipt => {
              const id =
                String(
                  receipt.id ||
                  receipt._id
                );

              return (
                <div key={id} className="rounded-xl border bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto] md:items-end">
                    <div>
                      <p className="font-semibold">
                        {receipt.category_label ||
                          receipt.category_id ||
                          "Receipt"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {receipt.original_name ||
                          receipt.document_name}
                      </p>

                      {receipt.admin_reviewed === true && (
                        <p className="mt-1 text-xs font-semibold text-emerald-600">
                          Saved as{" "}
                          {receipt.admin_amount_type === "deduction"
                            ? "Deduction"
                            : "Credit"}
                          {" • "}
                          ${Number(
                            receipt.admin_correct_amount_usd ??
                            receipt.admin_correct_amount ??
                            0
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        Verified Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                          drafts[id] ??
                          receipt.admin_correct_amount ??
                          ""
                        }
                        onChange={event =>
                          setDrafts(previous => ({
                            ...previous,
                            [id]:
                              event.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        Report Type
                      </label>
                      <select
                        value={
                          sideDrafts[id] ??
                          receipt.admin_amount_type ??
                          ""
                        }
                        onChange={event =>
                          setSideDrafts(previous => ({
                            ...previous,
                            [id]:
                              event.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                      >
                        <option value="">
                          Select type
                        </option>
                        <option value="credit">
                          Credit
                        </option>
                        <option value="deduction">
                          Deduction
                        </option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          viewReceipt(receipt)
                        }
                        className="rounded-lg border px-3 py-2 text-sm font-semibold text-purple-700"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          save(receipt)
                        }
                        disabled={
                          busyId === id
                        }
                        className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === id
                          ? "Submitting..."
                          : "Submit Amount"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {receiptPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <p className="font-semibold">
                  {receiptPreview.name}
                </p>
                <p className="text-xs text-gray-500">
                  Receipt preview
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    receiptPreview?.url
                  ) {
                    URL.revokeObjectURL(
                      receiptPreview.url
                    );
                  }
                  setReceiptPreview(
                    null
                  );
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="min-h-[65vh] flex-1 overflow-auto bg-gray-100 p-3">
              {String(
                receiptPreview.type || ""
              ).startsWith("image/") ? (
                <img
                  src={receiptPreview.url}
                  alt={receiptPreview.name}
                  className="mx-auto max-h-[78vh] max-w-full object-contain"
                />
              ) : String(
                  receiptPreview.type || ""
                ).includes("pdf") ? (
                <iframe
                  src={`${receiptPreview.url}#toolbar=1&navpanes=0`}
                  title={receiptPreview.name}
                  className="min-h-[75vh] w-full rounded-lg border-0 bg-white"
                />
              ) : (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                  <FileText className="h-12 w-12 text-gray-400" />
                  <p className="font-semibold">
                    This file loaded successfully.
                  </p>
                  <a
                    href={receiptPreview.url}
                    download={receiptPreview.name}
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Download Receipt
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crossOriginBlock, setCrossOriginBlock] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [msgTarget, setMsgTarget] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });
  const [backendHealth, setBackendHealth] = useState({ zoho: false, db: false });
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);

  const openMessageThread = useCallback((user) => {
    setMsgTarget(user);
    setTab('messages');
  }, []);

  const forceLogout = useCallback(() => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    fetch(`${API_BASE}/admin/logout`, { credentials: 'include' }).catch(() => {});
    window.location.href = '/#/login'; 
  }, []);

  const fetchUsers = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);
    setCrossOriginBlock(false);
    
    try {
      const { userToken, adminToken } = getTokens();
      
      const headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {}),
        ...(adminToken ? { 'x-admin-token': adminToken } : {})
      };

      let uRes = await fetch(`${API_BASE}/api/admin/users`, { 
        method: 'GET',
        credentials: 'include', 
        headers 
      });

      if (!uRes.ok && (uRes.status === 401 || uRes.status === 403) && !isRetry) {
        try {
          await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: 'admin', password: 'admin' }),
            credentials: 'include'
          });
        } catch (autoLoginErr) {}
        
        return fetchUsers(true);
      }

      if (!uRes.ok) {
        if (isRetry) setCrossOriginBlock(true);
        throw new Error(`Connection blocked. The browser is dropping the secure admin cookie.`);
      }

      const hRes = await fetch(`${API_BASE}/api/admin/login-history?limit=200`, { 
        method: 'GET',
        credentials: 'include', 
        headers 
      }).catch(() => ({ ok: false }));

      const healthRes = await fetch(`${API_BASE}/api/zoho/status`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' } 
      }).catch(() => ({ ok: false }));

      if (healthRes.ok) {
        const healthData = await healthRes.json().catch(() => ({}));
        setBackendHealth({ zoho: healthData?.connected === true, db: true }); 
      }

      const uData = await uRes.json();
      const hData = hRes.ok ? await hRes.json().catch(() => ({})) : {};

      if (uData.success) {
        setUsers(uData.users || []);
        setStats({ total: uData.totalUsers || 0, active: uData.activeUsers || 0, expired: uData.expiredUsers || 0 });
      }
      
      if (hData.success) {
        setLogs(hData.logs || []);
      }

    } catch (err) {
      setError(err.message || 'Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(false);
    const interval = setInterval(() => fetchUsers(false), 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const handleBroadcast = async (message, target) => {
    const { adminToken, userToken } = getTokens();
    const headers = { 
      'Content-Type': 'application/json', 
      ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {}),
      ...(adminToken ? { 'x-admin-token': adminToken } : {})
    };

    let recipientEmails = null;
    if (target === 'active') {
      recipientEmails = users.filter(u => u.isActive).map(u => u.email);
    } else if (target === 'arrived') {
      recipientEmails = users.filter(u => u.hasArrived).map(u => u.email);
    }

    if (recipientEmails && recipientEmails.length === 0) {
      alert('No users match the selected target filter.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/broadcast`, { 
        method: 'POST', 
        credentials: 'include', 
        headers, 
        body: JSON.stringify({ 
          message, 
          targetUsers: target,
          recipientEmails 
        }) 
      });

      const data = await res.json();
      if (data.success) {
        alert(`Broadcast successfully sent to ${data.recipientsCount || (recipientEmails ? recipientEmails.length : users.length)} users!`);
      } else {
        alert('Failed to send broadcast: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Failed to send broadcast due to a network error.');
    }
  };

  useEffect(() => {
    let active = true;

    const refreshAdminQueues = async () => {
      try {
        const { adminToken, userToken } = getTokens();
        const headers = {
          ...(adminToken ? {
            Authorization:`AdminBearer ${adminToken}`,
            "x-admin-token":adminToken
          } : {}),
          ...(!adminToken && userToken ? {
            Authorization:`Bearer ${userToken}`
          } : {})
        };

        const [requestsRes, receiptsRes] =
          await Promise.all([
            fetch(`${API_BASE}/api/admin/requests?pendingOnly=true&_=${Date.now()}`, {
              cache:"no-store",
              credentials:"include",
              headers
            }),
            fetch(`${API_BASE}/api/admin/receipts?_=${Date.now()}`, {
              cache:"no-store",
              credentials:"include",
              headers
            })
          ]);

        const requestsData =
          await requestsRes.json().catch(() => ({}));
        const receiptsData =
          await receiptsRes.json().catch(() => ({}));

        if (!active) return;

        if (requestsRes.ok && requestsData.success === true) {
          setPendingRequestCount(
            Array.isArray(requestsData.requests)
              ? requestsData.requests.length
              : 0
          );
        }

        if (receiptsRes.ok && receiptsData.success === true) {
          setReceiptCount(
            Array.isArray(receiptsData.receipts)
              ? receiptsData.receipts.length
              : 0
          );
        }
      } catch {
      }
    };

    refreshAdminQueues();
    const interval = setInterval(refreshAdminQueues, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'overview', icon: <Home className="w-4 h-4" />, label: 'Overview' },
    { id: 'users', icon: <Users className="w-4 h-4" />, label: 'Users', badge: stats.total },
    { id: 'analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' },
    { id: 'messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages' },
    { id: 'requests', icon: <ClipboardList className="w-4 h-4" />, label: 'Requests', badge: pendingRequestCount },
    { id: 'receipts', icon: <Receipt className="w-4 h-4" />, label: 'Receipts', badge: receiptCount },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <div className="w-56 min-h-screen flex flex-col sticky top-0" style={{ background: THEME.brandDark }}>
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white tracking-wide">Candidate Portal</h1>
          <p className="text-xs text-white/50 uppercase tracking-widest mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${tab === item.id ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              {item.icon} {item.label}
              {item.badge > 0 && <span className="ml-auto bg-white/20 text-white text-xs px-2 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={forceLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/10 hover:text-white transition">
            <LogOut className="w-4 h-4" /> Exit Panel
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">{navItems.find(n => n.id === tab)?.label || 'Dashboard'}</h2>
          <div className="flex items-center gap-5 text-xs text-gray-500 font-medium tracking-wide uppercase">
            <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full shadow-sm ${backendHealth.zoho ? 'bg-green-500' : 'bg-red-500'}`} /> Zoho API</span>
            <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full shadow-sm ${backendHealth.db ? 'bg-green-500' : 'bg-red-500'}`} /> Database</span>
            <button onClick={() => fetchUsers(false)} disabled={loading} className="p-2 ml-2 rounded-lg hover:bg-gray-100 transition border border-transparent hover:border-gray-200 text-purple-700 shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          {crossOriginBlock ? (
            <div className="mb-6 p-6 rounded-xl bg-red-50 border border-red-200 shadow-sm flex items-start gap-4">
              <ServerCrash className="w-8 h-8 text-red-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-800 text-lg">Cross-Origin Cookie Block Detected</h3>
                <p className="text-sm text-red-700 mt-2 mb-4 leading-relaxed">
                  Your frontend successfully logged in to the backend, but your browser immediately deleted the authentication cookie because your frontend and backend are hosted on different domains. <b>Browsers strictly block cross-domain cookies by default for security.</b>
                </p>
                <div className="bg-white p-4 rounded-lg border border-red-100 text-sm font-mono text-gray-800 shadow-inner">
                  <p className="text-gray-500 mb-2 font-sans font-semibold">To fix this, change 1 line in your backend `server.js` inside `app.post("/admin/login")`:</p>
                  <p className="line-through text-gray-400">res.setHeader("Set-Cookie", "admin_session=...; SameSite=Lax");</p>
                  <p className="text-green-700 font-bold mt-1">res.setHeader("Set-Cookie", "admin_session=authenticated; HttpOnly; Path=/; Max-Age=86400; SameSite=None; Secure");</p>
                </div>
              </div>
            </div>
          ) : error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-sm">Connection Warning</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {(tab === 'overview' || tab === 'users' || tab === 'analytics') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard icon={<Users className="w-6 h-6 text-purple-700" />} label="Total Users" value={stats.total} />
              <StatCard icon={<UserCheck className="w-6 h-6 text-green-600" />} label="Active Sessions" value={stats.active} color={THEME.greenLight} />
              <StatCard icon={<UserX className="w-6 h-6 text-red-600" />} label="Expired" value={stats.expired} color={THEME.redLight} />
            </div>
          )}

          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-purple-700"/> Recent Logins</h3>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {logs.slice(0, 10).map((l, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shadow-sm">{initials(l.name)}</div>
                         <div>
                            <div className="font-semibold text-gray-900">{l.name || l.email.split('@')[0]}</div>
                            <div className="text-xs text-gray-500">{l.email}</div>
                         </div>
                      </div>
                      <StatusBadge status={l.status === 'success' ? 'active' : 'expired'} />
                    </div>
                  ))}
                  {logs.length === 0 && <p className="text-gray-400 text-sm italic">No activity data available.</p>}
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && <UsersTable users={users} onSelectUser={setSelectedUser} onMessageUser={openMessageThread} onBroadcast={handleBroadcast} />}
          {tab === 'analytics' && <AnalyticsPanel users={users} logs={logs} />}
          {tab === 'messages' && <MessagingPanel users={users} initialTarget={msgTarget} />}
          {tab === 'requests' && <AdminRequestsPanel onOpenUser={setSelectedUser} />}
          {tab === 'receipts' && <AdminReceiptsPanel />}

        </div>
      </div>
      {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onMessage={openMessageThread} />}
    </div>
  );
};

export default AdminPanel;
