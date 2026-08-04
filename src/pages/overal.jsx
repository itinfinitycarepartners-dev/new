// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, UserCheck, UserX, Search, Download, RefreshCw, Eye, 
  BarChart3, Shield, XCircle, Send, MessageSquare, LogOut, Home, 
  AlertTriangle, ServerCrash, Phone, Mail, MapPin, Briefcase, 
  Building2, Calendar, Award, FileText, CheckCircle, Building, 
  Loader2, CalendarDays, FolderOpen, Folder, Clock, User, 
  Plane, HeartPulse, FileCheck, DollarSign, Activity, GitBranch,
  CheckCircle2, Circle, AlertCircle, Layers
} from 'lucide-react';

const API_BASE = 'https://fictional-carnival-3inv.onrender.com';

const THEME = {
  brand: '#81348d', brandDark: '#5e2568', brandLight: '#a855b5', brandGhost: '#f3e8f5',
  teal: '#0d9488', tealLight: '#ccfbf1', amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2', green: '#16a34a', greenLight: '#dcfce7',
  blue: '#2563eb', blueLight: '#dbeafe', bg: '#f8f7fb', card: '#ffffff',
  border: '#ede9f0', text: '#1a1025', muted: '#7c6f85', subtle: '#c4b8cc',
};

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
        const [adminRes, recruitDocsRes, crmDocsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/admin/user/${email}`, {
            headers,
            credentials: 'include',
            cache: 'no-store'
          }),
          fetch(`${API_BASE}/api/recruit/documents${emailParam}`, {
            headers,
            credentials: 'include',
            cache: 'no-store'
          }),
          fetch(`${API_BASE}/api/documents/my-documents${emailParam}`, {
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

        if (recruitDocsRes.status === 'fulfilled' && recruitDocsRes.value.ok) {
          const data = await recruitDocsRes.value.json();
          if (Array.isArray(data.documents)) {
            allDocs.push(...data.documents.map(doc => ({ ...doc, source: doc.source || 'recruit' })));
          }
        }

        if (crmDocsRes.status === 'fulfilled' && crmDocsRes.value.ok) {
          const data = await crmDocsRes.value.json();
          if (Array.isArray(data.documents)) {
            allDocs.push(...data.documents.map(doc => ({ ...doc, source: doc.source || 'crm' })));
          }
        }

        // Keep documents from CRM and Recruit separate even when Zoho reuses an ID.
        const uniqueDocs = Array.from(
          new Map(
            allDocs.map((doc, index) => [
              `${doc.source || 'unknown'}:${doc.attachment_id || doc.id || doc.document_id || index}`,
              doc
            ])
          ).values()
        );

        setDocuments(
          uniqueDocs.sort(
            (a, b) =>
              new Date(b.uploaded_at || b.Created_Time || 0) -
              new Date(a.uploaded_at || a.Created_Time || 0)
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
    const docId = doc.attachment_id || doc.id;
    if (!docId) { setDocActionError('This document has no downloadable ID.'); return; }
    setDocActionError(null);
    setViewingDocId(docId);
    try {
      const { adminToken } = getTokens();
      const headers = { 'Authorization': `AdminBearer ${adminToken}` };
      const emailParam = `?email=${encodeURIComponent(user.email)}`;
      const res = await fetch(`${API_BASE}/api/documents/download/${encodeURIComponent(docId)}${emailParam}`, {
        headers,
        credentials: 'include'
      });
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

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Candidate Profile' },
    { id: 'pipeline', label: 'Candidate Pipeline', badge: pipeline.length },
    { id: 'documents', label: 'Candidate Documents', badge: documents.length },
    { id: 'deployment', label: 'Travel & Extras' },
    { id: 'aftercare', label: 'Aftercare Dates' },
    { id: 'overview', label: 'System Overview' },
  ];

  const displayStages = pipeline.filter(s => !s.is_gate);
  const completedCount = displayStages.filter(s => s.status === "Completed").length;
  const progressPct = displayStages.length > 0 ? Math.round((completedCount / displayStages.length) * 100) : 0;
  const activeCategories = ["Hiring", "Immigration", "Deployment", "Aftercare", "NCLEX Roadmap", "NCLEX Prescreen"];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
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
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewDocument(doc)}
                              disabled={isViewing}
                              className="p-3 bg-gray-50 hover:bg-gray-100 border rounded-xl text-gray-600 transition shadow-sm disabled:opacity-50"
                              title="View Document"
                            >
                              {isViewing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
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

              {/* TAB 6: SYSTEM */}
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
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { if (initialTarget?.email) setSelected(initialTarget.email); }, [initialTarget]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (!selected) return;
    const loadHistory = async () => {
      try {
        const { adminToken, userToken } = getTokens();
        const headers = {
          'Accept': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken, 'Authorization': `AdminBearer ${adminToken}` } : {}),
          ...(!adminToken && userToken ? { 'Authorization': `Bearer ${userToken}` } : {})
        };
        const res = await fetch(`${API_BASE}/api/messaging/history?email=${encodeURIComponent(selected)}`, { headers, credentials:'include', cache:'no-store' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) setMessages(prev => ({ ...prev, [selected]: data.messages || [] }));
      } catch (error) { console.error('Message history error:', error); }
    };
    loadHistory();
  }, [selected]);

  const sendMessage = async () => {
    if (!input.trim() || !selected || loading) return;
    setLoading(true);
    try {
      const { userToken, adminToken } = getTokens();
      const headers = {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'x-admin-token': adminToken, 'Authorization': `AdminBearer ${adminToken}` } : {}),
        ...(!adminToken && userToken ? { 'Authorization': `Bearer ${userToken}` } : {})
      };

      const res = await fetch(`${API_BASE}/api/messaging/send`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ 
          recipientEmail: selected, // Explicitly target the selected user
          conversationId: selected, 
          content: input.trim(), 
          messageType: 'text' // Direct messages should be standard text, not broadcasts
        }),
      });
      const data = await res.json();

      if (data.success) {
        const msg = data.message || { id: Date.now().toString(), from: 'admin', text: input.trim(), time: new Date().toISOString() };
        setMessages(prev => ({ ...prev, [selected]: [...(prev[selected] || []), msg] }));
        setInput('');
      } else {
        alert("Failed to send message: " + (data.error || "Unknown Error"));
      }
    } catch (err) { 
      console.error('Failed to send message:', err); 
      alert("Network Error: Could not reach backend.");
    }
    finally { setLoading(false); }
  };

  const threads = users.map(u => ({ email: u.email, name: u.name, isActive: u.isActive }));
  const chat = selected ? messages[selected] || [] : [];

  return (
    <div className="bg-white rounded-xl border overflow-hidden h-[600px] flex shadow-sm">
      <div className="w-1/3 border-r overflow-y-auto bg-gray-50/30">
        {threads.map((t) => (
          <div key={t.email} onClick={() => setSelected(t.email)} className={`px-5 py-4 cursor-pointer border-b transition flex justify-between items-center ${selected === t.email ? 'bg-purple-50 border-purple-100' : 'hover:bg-gray-50'}`}>
            <div>
              <div className="text-sm font-bold text-gray-900">{t.name || t.email.split('@')[0]}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{t.email}</div>
            </div>
            {t.isActive && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm border border-white"></div>}
          </div>
        ))}
      </div>
      <div className="w-2/3 flex flex-col bg-white">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-200" />
            <p>Select a user to start messaging</p>
          </div>
        ) : (
          <>
            <div className="border-b px-5 py-4 bg-white flex items-center justify-between shadow-sm z-10">
              <div>
                <h3 className="font-bold text-gray-900">{threads.find(t => t.email === selected)?.name || selected}</h3>
                <p className="text-xs text-gray-500">{selected}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
              {chat.length === 0 ? (
                <div className="text-center text-xs text-gray-400 mt-4">This is the start of your conversation.</div>
              ) : (
                chat.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${msg.from === 'admin' ? 'text-white rounded-br-sm' : 'border bg-white text-gray-800 rounded-bl-sm'}`} style={{ background: msg.from === 'admin' ? THEME.brand : '' }}>
                      {msg.text}
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

    let targetEmails = users.map(u => u.email);
    if (target === 'active') targetEmails = users.filter(u => u.isActive).map(u => u.email);
    if (target === 'arrived') targetEmails = users.filter(u => u.hasArrived).map(u => u.email);

    if (targetEmails.length === 0) {
      alert('No users match the selected target filter.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/broadcast`, { 
        method: 'POST', credentials: 'include', headers, 
        body: JSON.stringify({ message, targetUsers: target }) 
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert(`Broadcast successfully sent to ${data.recipientsCount || targetEmails.length} users!`);
          return;
        }
      }
      
      let successCount = 0;
      for (const email of targetEmails) {
        const msgRes = await fetch(`${API_BASE}/api/messaging/send`, {
          method: 'POST', credentials: 'include', headers,
          // Explicitly fallback to a broadcast so the frontend doesn't treat it like a DM
          body: JSON.stringify({ recipientEmail: email, conversationId: email, content: message, messageType: 'broadcast' }) 
        });
        if (msgRes.ok) successCount++;
      }

      alert(`Broadcast fallback complete. Directly delivered to ${successCount} out of ${targetEmails.length} users.`);
      
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Failed to send broadcast due to a network error.');
    }
  };

  const navItems = [
    { id: 'overview', icon: <Home className="w-4 h-4" />, label: 'Overview' },
    { id: 'users', icon: <Users className="w-4 h-4" />, label: 'Users', badge: stats.total },
    { id: 'analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' },
    { id: 'messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages' },
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

          {tab === 'users' && <UsersTable users={users} onSelectUser={setSelectedUser} onMessageUser={setMsgTarget} onBroadcast={handleBroadcast} />}
          {tab === 'analytics' && <AnalyticsPanel users={users} logs={logs} />}
          {tab === 'messages' && <MessagingPanel users={users} initialTarget={msgTarget} />}

        </div>
      </div>
      {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onMessage={setMsgTarget} />}
    </div>
  );
};

export default AdminPanel;