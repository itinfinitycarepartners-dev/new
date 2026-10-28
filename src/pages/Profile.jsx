// @ts-nocheck
import { useAuth } from "@/lib/AuthContext";
import { User, Phone, Mail, MapPin, Briefcase, Plane, Building2, UserCheck, Calendar, Award, FileText, FileCheck, Clock, Shield, CheckCircle, AlertCircle, Building, Loader2, Users, CalendarDays, ExternalLink, Camera, Globe2, BadgeCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';


// Fast profile snapshot cache.  The cached payload is used only to paint the page
// immediately; the backend remains the source of truth and refreshes in the background.
const PROFILE_CACHE_PREFIX = "icp_profile_snapshot_v2:";
const PROFILE_CACHE_MAX_AGE_MS = 30 * 60 * 1000;

const readProfileBrowserCache = (email) => {
  if (!email) return null;
  try {
    const raw = sessionStorage.getItem(
      `${PROFILE_CACHE_PREFIX}${String(email).trim().toLowerCase()}`
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.savedAt) return null;
    if (Date.now() - Number(parsed.savedAt) > PROFILE_CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeProfileBrowserCache = (email, data) => {
  if (!email || !data) return;
  try {
    sessionStorage.setItem(
      `${PROFILE_CACHE_PREFIX}${String(email).trim().toLowerCase()}`,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // Storage can be unavailable/full; the network path still works.
  }
};

// Normalize eligibility values without making another network request.
const formatEligibilityValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) {
    return value.map(formatEligibilityValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return formatEligibilityValue(
      value.value ??
      value.name ??
      value.label ??
      value.display_value ??
      value.displayValue ??
      ""
    );
  }
  return String(value).trim();
};


const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "—" || dateStr === "" || dateStr === null || dateStr === undefined) return null;
  
  try {
    // Try to parse the date
    let date = new Date(dateStr);
    
    // If invalid, try to clean up the string
    if (isNaN(date.getTime())) {
      // Remove any extra text and try again
      const cleanStr = dateStr.replace(/(\w+ \d{1,2}, \d{4})/, '$1');
      date = new Date(cleanStr);
      if (isNaN(date.getTime())) return dateStr; // Return original if still invalid
    }
    
    // Format as "May 15 • 2026"
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const formatted = date.toLocaleDateString('en-US', options);
    
    // Replace comma with bullet
    return formatted.replace(',', ' •');
  } catch (e) {
    return dateStr; // Return original on error
  }
};

// ─── Helper: Format date with time ──────────────────────────────────────────
const formatDateTime = (dateStr) => {
  if (!dateStr || dateStr === "—" || dateStr === "" || dateStr === null || dateStr === undefined) return null;
  
  try {
    let date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };
    const formatted = date.toLocaleDateString('en-US', options);
    
    // Replace comma with bullet and add time
    return formatted.replace(',', ' •');
  } catch (e) {
    return dateStr;
  }
};

function InfoRow({ label, value, icon: Icon, alwaysVisible = false }) {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    value === "—";

  if (isEmpty && !alwaysVisible) return null;

  let displayValue = isEmpty ? "—" : value;

  if (typeof value === "boolean") {
    displayValue = value ? "Yes" : "No";
  }

  if (value && typeof value === "object") {
    if (value.name) displayValue = value.name;
    else if (value.file_Name) displayValue = value.file_Name;
    else if (value.value !== undefined && value.value !== null) displayValue = value.value;
    else if (alwaysVisible) displayValue = "—";
    else return null;
  }

  return (
    <div className="grid grid-cols-[26px_minmax(112px,0.82fr)_minmax(0,1fr)] items-center gap-2 border-b border-[#f0edf6] py-[10px] last:border-b-0">
      <div className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px] bg-gradient-to-br from-[#f3ecff] to-[#e9dcff] text-[#7c4fd6] shadow-[0_1px_2px_rgba(92,54,160,0.12)] ring-1 ring-[#e4d6fb]">
        {Icon ? <Icon className="h-[13px] w-[13px] stroke-[2.1]" /> : null}
      </div>
      <div className="truncate text-[11px] font-medium text-[#8f8aa0]">
        {label}
      </div>
      <div className="min-w-0 truncate text-[11.5px] font-semibold text-[#37324a]">
        {displayValue}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
  icon: SectionIcon = User,
  actionLabel = "Edit",
  onAction,
  hideAction = false
}) {
  return (
    <section
      className={`rounded-[16px] border border-[#ece8f4] bg-white p-[16px] shadow-[0_2px_12px_rgba(57,38,99,0.035)] ${className}`}
    >
      <div className="mb-[7px] flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#8b5bd5] to-[#6a35c9] text-white shadow-[0_2px_6px_rgba(107,53,201,0.35)]">
            <SectionIcon className="h-[14px] w-[14px] stroke-[2.2]" />
          </span>
          <h2 className="truncate text-[12.5px] font-bold text-[#302a42]">
            {title}
          </h2>
        </div>

        {!hideAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-[7px] border border-[#e7ddf8] bg-white px-[10px] py-[5px] text-[9.5px] font-semibold text-[#8b5bd5] shadow-[0_1px_3px_rgba(92,54,160,0.04)] transition hover:bg-[#faf7ff]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentEmployer, setCurrentEmployer] = useState("");
  const [scheduledForInterview, setScheduledForInterview] = useState(false);
  const [recruitData, setRecruitData] = useState({
    hiredLocation: "",
    hiredDepartment: "",
    interviewLocation: "",
    interviewDate: "",
    interviewNotes: "",
    rate: "",
    applicationStatus: "",
    candidateStatus: ""
  });
  const [recruitLoading, setRecruitLoading] = useState(true);
  const [interviewHiringSources, setInterviewHiringSources] = useState({
    crm: {},
    recruitCandidate: {},
    recruitApplication: {}
  });
  // Full canonical source records used as field-level fallbacks across the
  // entire Profile page, not only Interview & Hiring.
  const [canonicalProfileSources, setCanonicalProfileSources] = useState({
    mapped: {},
    crm: {},
    recruitCandidate: {},
    recruitApplication: {}
  });
  const [liveCrmProfile, setLiveCrmProfile] = useState({});
  const [extendedProfile, setExtendedProfile] = useState({
    dependants: [],
    travelSummary: {}
  });
  const [embassyEligibilityStatus, setEmbassyEligibilityStatus] = useState("");
  const [preferredLicensureAgentUrl, setPreferredLicensureAgentUrl] = useState("");
  const [showPreferredLicensureAgentOffer, setShowPreferredLicensureAgentOffer] = useState(false);
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState(null);
  const profileRequestInFlight = useRef(false);
  const canonicalRequestInFlight = useRef(false);

  // Candidate photo is resolved by the backend from Zoho CRM Candidate_Photo
  // first, then Zoho Recruit Candidates/{id}/photo. Recruit does not expose the
  // photo as a normal Candidates field, so the browser must use this proxy.
  useEffect(() => {
    if (!user?.email) {
      setCandidatePhotoUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    const loadCandidatePhoto = async () => {
      const token = localStorage.getItem("icp_auth_token");

      if (!token) {
        if (!cancelled) setCandidatePhotoUrl(null);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/candidate/photo?width=192`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.ok) {
          if (!cancelled) setCandidatePhotoUrl(null);
          return;
        }

        const blob = await response.blob();

        if (!blob || blob.size === 0) {
          if (!cancelled) setCandidatePhotoUrl(null);
          return;
        }

        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setCandidatePhotoUrl(objectUrl);
        }
      } catch (error) {
        console.warn(
          "[Profile] Candidate photo unavailable:",
          error?.message || error
        );

        if (!cancelled) {
          setCandidatePhotoUrl(null);
        }
      }
    };

    const startPhotoLoad = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => loadCandidatePhoto(), { timeout: 1800 });
      } else {
        window.setTimeout(loadCandidatePhoto, 900);
      }
    };

    startPhotoLoad();

    const refresh = () => startPhotoLoad();
    const onVisibility = () => {
      if (!document.hidden) startPhotoLoad();
    };

    window.addEventListener("candidate-data-updated", refresh);
    window.addEventListener("crm-recruit-updated", refresh);
    window.addEventListener("pipeline-updated", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(
      loadCandidatePhoto,
      5 * 60 * 1000
    );

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      window.clearInterval(timer);
      window.removeEventListener("candidate-data-updated", refresh);
      window.removeEventListener("crm-recruit-updated", refresh);
      window.removeEventListener("pipeline-updated", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.email]);
  const [travelPlanning, setTravelPlanning] = useState({
    departureCity: "",
    wheelchair: "No",
    checkedBags: "0",
    carryOn: "0",
    boxes: "0",
    pets: "No",
    travelCash: "",
    carSeats: "No",
    phoneModelCarrier: "",
    simUnlocked: "",
    drivingPlan: "",
    carPurchasePlan: "",
    foundationsCompleted: "",
    spouseEmployment: "",
    finalBankingPlan: "",
    finalBankNameCity: "",
    finalTransportationPlan: ""
  });
  const [savingTravelPlanning, setSavingTravelPlanning] = useState(false);
  const [savingBankingPlanning, setSavingBankingPlanning] = useState(false);
  const [travelPlanningMessage, setTravelPlanningMessage] = useState("");
  const [bankingPlanningMessage, setBankingPlanningMessage] = useState("");
  const [travelSaved, setTravelSaved] = useState(false);
  const [bankingSaved, setBankingSaved] = useState(false);
  const [planningOptions, setPlanningOptions] = useState({
    finalTransportationPlan: [],
    finalBankingPlan: []
  });
  const [showTravelDependantForm, setShowTravelDependantForm] = useState(false);
  const [travelDependantDraft, setTravelDependantDraft] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    phone: "",
    passportFile: null
  });
  const [savingTravelDependant, setSavingTravelDependant] = useState(false);

  // Fast primary profile load.  A session snapshot paints instantly on refresh,
  // while the canonical endpoint refreshes the data in the background.
  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const email = String(user.email).trim().toLowerCase();
    const cached = readProfileBrowserCache(email);

    if (cached?.data) {
      setProfileData(cached.data);
      setError(null);
      setLoading(false);
    }

    const fetchProfile = async () => {
      if (profileRequestInFlight.current) return;
      const token = localStorage.getItem("icp_auth_token");
      if (!token) {
        if (!cached?.data) {
          setError("No authentication token found. Please log in again.");
          setLoading(false);
        }
        return;
      }

      profileRequestInFlight.current = true;
      try {
        const response = await fetch(
          `${API_BASE}/api/zoho/my-deals?refresh=false`,
          { cache: "default", headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (!cancelled && data.success && data.data) {
          setProfileData(previous => {
            const merged = { ...(previous || {}), ...data.data };
            writeProfileBrowserCache(email, merged);
            return merged;
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled && !cached?.data) setError(err?.message || "Unable to load profile.");
      } finally {
        profileRequestInFlight.current = false;
        if (!cancelled && !cached?.data) setLoading(false);
      }
    };

    // Canonical source-data is the primary request. /my-deals is only a fallback
    // and starts after a short delay so it cannot compete with first paint.
    // Cached profile is already usable; refresh quietly after the first paint.
    // Cold loads still start immediately instead of waiting 1.8s.
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) fetchProfile();
    }, cached?.data ? 350 : 0);

    const refresh = () => fetchProfile();
    window.addEventListener("candidate-data-updated", refresh);
    window.addEventListener("crm-recruit-updated", refresh);
    window.addEventListener("pipeline-updated", refresh);

    const profileRefreshTimer = window.setInterval(fetchProfile, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener("candidate-data-updated", refresh);
      window.removeEventListener("crm-recruit-updated", refresh);
      window.removeEventListener("pipeline-updated", refresh);
      window.clearInterval(profileRefreshTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [user?.email]);

  // Canonical source data is the preferred fast path for CRM/Recruit ownership.
  useEffect(() => {
    if (!user?.email) {
      setRecruitLoading(false);
      return;
    }

    let cancelled = false;
    const email = String(user.email).trim().toLowerCase();
    const cache = readProfileBrowserCache(email);

    const applyCanonical = (data) => {
      if (!data || data.success !== true || cancelled) return;
      const mapped = data.mapped || {};
      const rawCrm = data.modules?.CRM_Deals || {};
      const rawRecruitCandidate = data.modules?.Recruit_Candidates || {};
      const rawRecruitApplication = data.modules?.Recruit_Applications || {};
      const sourcePayload = data.interviewHiringSources || {
        crm: rawCrm,
        recruitCandidate: rawRecruitCandidate,
        recruitApplication: rawRecruitApplication
      };

      // Reuse the canonical response for eligibility instead of issuing a second
      // /api/profile/source-data request during page load.
      const eligibilityRaw =
        mapped.State_Licensure_Requirements ??
        mapped.Deployment_Eligibility ??
        rawCrm.State_Licensure_Requirements ??
        "";
      const eligibilityValue = formatEligibilityValue(eligibilityRaw);
      if (eligibilityValue) setEmbassyEligibilityStatus(eligibilityValue);

      setCanonicalProfileSources({ mapped, crm: rawCrm, recruitCandidate: rawRecruitCandidate, recruitApplication: rawRecruitApplication });
      setProfileData(previous => {
        const next = { ...(previous || {}) };
        const isBlank = value => value === undefined || value === null || (typeof value === "string" && ["", "—", "-", "null", "undefined"].includes(value.trim().toLowerCase()));
        Object.entries(data.profileFallback || { ...rawRecruitCandidate, ...rawCrm, ...mapped }).forEach(([key, value]) => {
          if (isBlank(next[key]) && !isBlank(value)) next[key] = value;
        });
        writeProfileBrowserCache(email, next);
        return next;
      });
      setInterviewHiringSources({
        crm: { ...rawCrm, ...(sourcePayload.crm || {}) },
        recruitCandidate: { ...rawRecruitCandidate, ...(sourcePayload.recruitCandidate || {}) },
        recruitApplication: { ...rawRecruitApplication, ...(sourcePayload.recruitApplication || {}) }
      });
      setCurrentEmployer(mapped.Current_Employer || "");
      setScheduledForInterview(mapped.Scheduled_for_Interview === true);
      setRecruitData({
        hiredLocation: mapped.Hired_Location || "",
        hiredDepartment: mapped.Hired_Department || "",
        interviewLocation: mapped.Interview_Location || "",
        interviewDate: mapped.Interview_Date || "",
        interviewNotes: mapped.Interview_Notes || mapped.Notes_Interview || "",
        rate: mapped.Rate || "",
        applicationStatus: mapped.Application_Status || mapped.Lead_Management_Status || "",
        candidateStatus: mapped.Candidate_Status || ""
      });
      setError(null);
      setLoading(false);
      setRecruitLoading(false);
    };

    const fetchRecruitData = async () => {
      if (canonicalRequestInFlight.current) return;
      const token = localStorage.getItem("icp_auth_token");
      if (!token) {
        setRecruitLoading(false);
        return;
      }
      canonicalRequestInFlight.current = true;
      try {
        const response = await fetch(
          `${API_BASE}/api/profile/source-data?refresh=false`,
          { cache: "default", headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success === true) applyCanonical(data);
      } catch (err) {
        if (!cache?.data && !profileData) console.warn("[Profile] Canonical source unavailable:", err?.message || err);
      } finally {
        canonicalRequestInFlight.current = false;
        if (!cancelled) setRecruitLoading(false);
      }
    };

    // Canonical data is allowed to arrive after the initial paint.
    fetchRecruitData();
    const refresh = () => fetchRecruitData();
    window.addEventListener("candidate-data-updated", refresh);
    window.addEventListener("crm-recruit-updated", refresh);
    window.addEventListener("pipeline-updated", refresh);
    const timer = window.setInterval(fetchRecruitData, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener("candidate-data-updated", refresh);
      window.removeEventListener("crm-recruit-updated", refresh);
      window.removeEventListener("pipeline-updated", refresh);
      window.clearInterval(timer);
    };
  }, [user?.email]);

  // ─── Deterministic live CRM profile fallback ────────────────────────────────
  // The same endpoint that keeps Pipeline current also returns the tracked raw
  // CRM Deal fields. This layer updates Profile within the short live CRM window
  // without forcing Recruit or waiting for the comprehensive candidate cache.
  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;
    let inFlight = false;

    const loadLiveCrmProfile = async () => {
      if (cancelled || document.hidden || inFlight) return;

      const token = localStorage.getItem("icp_auth_token");
      if (!token) return;

      inFlight = true;
      try {
        const response = await fetch(
          `${API_BASE}/api/pipeline/live-crm-state`,
          { cache: "default", headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json().catch(() => ({}));
        if (cancelled || !response.ok || data.success !== true) return;

        const fields = data.changedFields || data.fields || {};
        if (fields && typeof fields === "object") {
          setLiveCrmProfile(previous => ({
            ...previous,
            ...fields
          }));

          // Fill blank transformed values immediately, but never erase a usable
          // value when CRM sends an empty field.
          setProfileData(previous => {
            const next = { ...(previous || {}) };
            for (const [key, value] of Object.entries(fields)) {
              const existing = next[key];
              const existingBlank =
                existing === undefined ||
                existing === null ||
                String(existing).trim() === "" ||
                String(existing).trim() === "—";
              const incomingUsable =
                value !== undefined &&
                value !== null &&
                String(value).trim() !== "" &&
                String(value).trim() !== "—";

              if (existingBlank && incomingUsable) {
                next[key] = value;
              }
            }
            return next;
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn(
            "[Profile] Live CRM fallback unavailable:",
            error?.message || error
          );
        }
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(loadLiveCrmProfile, { timeout: 5000 });
      else window.setTimeout(loadLiveCrmProfile, 3000);
    };
    start();
    const refresh = () => start();
    const onVisibility = () => { if (!document.hidden) start(); };

    window.addEventListener("candidate-data-updated", refresh);
    window.addEventListener("crm-recruit-updated", refresh);
    window.addEventListener("pipeline-updated", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("candidate-data-updated", refresh);
      window.removeEventListener("crm-recruit-updated", refresh);
      window.removeEventListener("pipeline-updated", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.email]);


  useEffect(() => {
    const loadPreferredLicensureAgentUrl = async () => {
      if (!user?.email) return;

      const token = localStorage.getItem("icp_auth_token");
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/requests`,
          {
            cache: "default",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json().catch(() => ({}));

        if (
          response.ok &&
          data.success === true
        ) {
          setPreferredLicensureAgentUrl(
            String(
              data.licenseEndorsementUrl ||
              ""
            ).trim()
          );
        }
      } catch (error) {
        console.warn(
          "[Profile] Preferred licensure agent link unavailable:",
          error?.message || error
        );
      }
    };

    const start = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(loadPreferredLicensureAgentUrl, { timeout: 5000 });
      else window.setTimeout(loadPreferredLicensureAgentUrl, 2500);
    };
    start();

    const refresh = () => start();

    window.addEventListener(
      "candidate-data-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "candidate-data-updated",
        refresh
      );
    };
  }, [user?.email]);


  useEffect(() => {
    const loadPlanningOptions = async () => {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/profile/planning-options`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success === true) {
          setPlanningOptions({
            finalTransportationPlan:
              Array.isArray(data.finalTransportationPlan)
                ? data.finalTransportationPlan
                : [],
            finalBankingPlan:
              Array.isArray(data.finalBankingPlan)
                ? data.finalBankingPlan
                : []
          });
        }
      } catch (error) {
        console.warn(
          "[Profile] CRM planning options unavailable:",
          error?.message || error
        );
      }
    };

    loadPlanningOptions();
  }, [user?.email]);

  useEffect(() => {
    const loadExtendedProfile = async () => {
      if (!user?.email) return;

      const token = localStorage.getItem("icp_auth_token");
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/profile/extended`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success === true) {
          const nextProfile =
            data.profile || {
              dependants: [],
              travelSummary: {}
            };

          setExtendedProfile(nextProfile);
          setTravelPlanning(previous => ({
            ...previous,
            ...(nextProfile.travelSummary || {})
          }));

          const persistedTravel =
            nextProfile.travelSummary || {};

          const hasTravelSaved =
            [
              "departureCity",
              "wheelchair",
              "checkedBags",
              "carryOn",
              "boxes",
              "pets",
              "travelCash",
              "carSeats",
              "phoneModelCarrier",
              "simUnlocked",
              "drivingPlan",
              "carPurchasePlan",
              "foundationsCompleted",
              "spouseEmployment",
              "finalTransportationPlan"
            ].some(field =>
              String(persistedTravel[field] ?? "").trim() !== ""
            );

          const hasBankingSaved =
            [
              "finalBankingPlan",
              "finalBankNameCity"
            ].some(field =>
              String(persistedTravel[field] ?? "").trim() !== ""
            );

          setTravelSaved(hasTravelSaved);
          setBankingSaved(hasBankingSaved);
        }
      } catch (error) {
        console.warn(
          "[Profile] Extended profile unavailable:",
          error?.message || error
        );
      }
    };

    // Cross-browser persistence must come from PostgreSQL immediately.
    // Do not delay this authoritative profile request behind idle callbacks.
    loadExtendedProfile();

    const refresh = () => loadExtendedProfile();

    window.addEventListener(
      "candidate-data-updated",
      refresh
    );

    const interval =
      window.setInterval(
        loadExtendedProfile,
        10 * 60 * 1000
      );

    return () => {
      window.removeEventListener(
        "candidate-data-updated",
        refresh
      );
      window.clearInterval(
        interval
      );
    };
  }, [user?.email]);

  // Eligibility is populated from the canonical source-data response above.

  const savePlanningSection = async section => {
    const isBanking = section === "banking";

    if (isBanking) {
      setSavingBankingPlanning(true);
      setBankingPlanningMessage("");
    } else {
      setSavingTravelPlanning(true);
      setTravelPlanningMessage("");
    }

    try {
      const token =
        localStorage.getItem("icp_auth_token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const travelFields = [
        "departureCity",
        "wheelchair",
        "checkedBags",
        "carryOn",
        "boxes",
        "pets",
        "travelCash",
        "carSeats",
        "phoneModelCarrier",
        "simUnlocked",
        "drivingPlan",
        "carPurchasePlan",
        "foundationsCompleted",
        "spouseEmployment",
        "finalTransportationPlan"
      ];

      const bankingFields = [
        "finalBankingPlan",
        "finalBankNameCity"
      ];

      const fields =
        isBanking
          ? bankingFields
          : travelFields;

      const sectionValues =
        fields.reduce(
          (result, field) => {
            result[field] =
              travelPlanning[field] ?? "";
            return result;
          },
          {}
        );

      const response =
        await fetch(
          `${API_BASE}/api/profile/extended`,
          {
            method: "PUT",
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              section,
              travelSummary: sectionValues
            })
          }
        );

      const data =
        await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.error ||
          `Unable to save ${isBanking ? "banking" : "travel and arrival"} planning.`
        );
      }

      const savedTravel =
        data.profile?.travelSummary || {};

      // The server returns the complete merged PostgreSQL record, so neither
      // section can wipe the other section from the screen.
      setTravelPlanning(previous => ({
        ...previous,
        ...savedTravel
      }));

      setExtendedProfile(previous => ({
        ...previous,
        ...(data.profile || {}),
        travelSummary: savedTravel
      }));

      const message =
        data.crmSync?.attempted === true &&
        data.crmSync?.success === false
          ? `Saved permanently in the portal. CRM sync needs retry: ${data.crmSync?.error || "CRM update failed."}`
          : isBanking
            ? "Banking plan saved permanently."
            : "Travel and arrival planning saved permanently.";

      if (isBanking) {
        setBankingPlanningMessage(message);
        setBankingSaved(true);
      } else {
        setTravelPlanningMessage(message);
        setTravelSaved(true);
      }

      window.dispatchEvent(
        new CustomEvent("profile-planning-saved", {
          detail: {
            email: user?.email,
            section,
            travelSummary: savedTravel
          }
        })
      );
    } catch (error) {
      console.error(
        `[Profile] ${section} planning save failed:`,
        error
      );

      const message =
        error?.message ||
        `Unable to save ${isBanking ? "banking" : "travel and arrival"} planning.`;

      if (isBanking) {
        setBankingPlanningMessage(message);
      } else {
        setTravelPlanningMessage(message);
      }
    } finally {
      if (isBanking) {
        setSavingBankingPlanning(false);
      } else {
        setSavingTravelPlanning(false);
      }
    }
  };

  const saveTravelPlanning = () =>
    savePlanningSection("travel");

  const saveBankingPlanning = () =>
    savePlanningSection("banking");

  const hasCanonicalProfileFallback = Boolean(
    profileData ||
    Object.keys(liveCrmProfile || {}).length > 0 ||
    Object.keys(canonicalProfileSources?.crm || {}).length > 0 ||
    Object.keys(canonicalProfileSources?.mapped || {}).length > 0 ||
    Object.keys(canonicalProfileSources?.recruitCandidate || {}).length > 0
  );

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show the hard error only when every canonical/live fallback is empty.
  // A temporary /my-deals failure must not hide a valid CRM-backed profile.
  if (error && !hasCanonicalProfileFallback) {
    return (
      <div className="text-center py-12 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Unable to Load Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show empty only if the broad profile AND all canonical/live sources are empty.
  if (!hasCanonicalProfileFallback) {
    return (
      <div className="text-center py-12 max-w-lg mx-auto">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground mb-2">No Profile Found</h2>
        <p className="text-sm text-muted-foreground">Your profile will appear once ICP sets up your record.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const unwrapProfileSourceValue = value => {
    if (value === undefined || value === null) return null;

    if (Array.isArray(value)) {
      const values = value
        .map(unwrapProfileSourceValue)
        .filter(item => item !== null && item !== undefined && item !== "");
      return values.length ? values.join(", ") : null;
    }

    if (typeof value === "object") {
      const unwrapped =
        value.value ??
        value.name ??
        value.display_value ??
        value.displayValue ??
        value.label;
      return unwrapped !== undefined
        ? unwrapProfileSourceValue(unwrapped)
        : value;
    }

    const text = String(value).trim();
    if (["", "—", "-", "null", "undefined"].includes(text.toLowerCase())) {
      return null;
    }

    return value;
  };

  // Read the normal comprehensive profile first, then fall back field-by-field
  // to the CURRENT raw CRM Deal, canonical mapped value and Recruit records.
  // This prevents a blank transformed profile field from hiding a populated CRM field.
  const getValue = (field) => {
    const candidates = [
      liveCrmProfile?.[field],
      profileData?.[field],
      canonicalProfileSources?.crm?.[field],
      canonicalProfileSources?.mapped?.[field],
      canonicalProfileSources?.recruitCandidate?.[field],
      canonicalProfileSources?.recruitApplication?.[field]
    ];

    for (const candidateValue of candidates) {
      const value = unwrapProfileSourceValue(candidateValue);
      if (value !== null && value !== undefined && value !== "") return value;
    }

    return null;
  };

  // ─── Helper to get formatted date value ────────────────────────────────────
  const getFormattedDate = (field) => {
    const value = getValue(field);
    return value ? formatDate(value) : null;
  };

  const getFirstValue = (...fields) => {
    for (const field of fields) {
      const value = getValue(field);

      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== "—"
      ) {
        return value;
      }
    }

    return null;
  };

  const getFirstFormattedDate = (...fields) => {
    const value = getFirstValue(...fields);
    return value ? formatDate(value) : null;
  };


  const getSourceValue = (
    source,
    ...fields
  ) => {
    const record =
      interviewHiringSources?.[
        source
      ] ||
      {};

    for (const field of fields) {
      const value =
        record?.[field];

      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== "—"
      ) {
        return value;
      }
    }

    return null;
  };

  // CRM is kept as a live first-class source for Interview/Hiring.
  // Recruit Candidate/Application fields remain available as source owners and
  // fallbacks. Existing CRM profileData from /api/zoho/my-deals is also retained.
  const resolvedInterviewHiring = {
    interviewDate:
      getSourceValue(
        "crm",
        "Interview_Date"
      ) ||
      getValue(
        "interviewDate"
      ) ||
      recruitData.interviewDate ||
      getSourceValue(
        "recruitCandidate",
        "Interview_Date"
      ),

    interviewLocation:
      getSourceValue(
        "crm",
        "Interview_Location"
      ) ||
      getValue(
        "interviewLocation"
      ) ||
      recruitData.interviewLocation ||
      getSourceValue(
        "recruitCandidate",
        "Interview_Location"
      ),

    hiredLocation:
      getSourceValue(
        "crm",
        "Hired_Location",
        "Account_Name",
        "Hospital_Name"
      ) ||
      getValue(
        "Account_Name"
      ) ||
      getValue(
        "hospitalName"
      ) ||
      recruitData.hiredLocation ||
      getSourceValue(
        "recruitCandidate",
        "Hired_Location"
      ) ||
      getValue(
        "hiredLocation"
      ) ||
      getValue(
        "Hired_Location"
      ),

    hiredDepartment:
      getSourceValue(
        "crm",
        "Hired_Department",
        "Department",
        "Department_Name"
      ) ||
      getValue(
        "Hired_Department"
      ) ||
      getValue(
        "Department"
      ) ||
      recruitData.hiredDepartment ||
      getSourceValue(
        "recruitCandidate",
        "Hired_Department"
      ) ||
      getValue(
        "hiredDepartment"
      ) ||
      getValue(
        "hireddept"
      ),

    interviewNotes:
      getSourceValue(
        "crm",
        "Interview_Notes",
        "Notes_Interview"
      ) ||
      getValue(
        "notesInterview"
      ) ||
      recruitData.interviewNotes ||
      getSourceValue(
        "recruitCandidate",
        "Interview_Notes",
        "Notes_Interview"
      ),

    rate:
      getSourceValue(
        "crm",
        "CRM_Rate",
        "Rate"
      ) ||
      getValue(
        "CRM_Rate"
      ) ||
      getValue(
        "Rate"
      ) ||
      getValue(
        "rate"
      ) ||
      getValue(
        "hiringRate"
      ) ||
      recruitData.rate ||
      getSourceValue(
        "crm",
        "Offer_Rate"
      ) ||
      getSourceValue(
        "recruitCandidate",
        "Offer_Rate"
      ),

    currentEmployer:
      getSourceValue(
        "recruitCandidate",
        "Current_Employer"
      ) ||
      currentEmployer ||
      getSourceValue(
        "crm",
        "Current_Employer",
        "Account_Name",
        "Hospital_Name"
      ) ||
      getValue(
        "current_employer"
      ),

    scheduledForInterview:
      getSourceValue(
        "recruitApplication",
        "Scheduled_for_Interview"
      ) ??
      getSourceValue(
        "recruitCandidate",
        "Scheduled_for_Interview"
      ) ??
      getSourceValue(
        "crm",
        "Scheduled_for_Interview"
      ) ??
      scheduledForInterview,

    applicationStatus:
      getSourceValue(
        "recruitApplication",
        "Application_Status",
        "Lead_Management_Status"
      ) ||
      recruitData.applicationStatus ||
      getSourceValue(
        "crm",
        "Application_Status"
      ) ||
      getValue(
        "applicationStatus"
      )
  };

  const getSubmittedForImmigrationValue = () => {
    const raw = getFirstValue(
      "Added_to_Weekly_I140_Candidates",
      "submittedToImmigration",
      "submitted_for_immigration",
      "Submitted_for_Immigration"
    );

    if (raw === null || raw === undefined || raw === "") {
      return null;
    }

    if (typeof raw === "boolean") {
      return raw ? "Yes" : "No";
    }

    const normalized = String(raw).trim().toLowerCase();

    if (
      [
        "true",
        "yes",
        "1",
        "checked",
        "complete",
        "completed",
        "submitted"
      ].includes(normalized)
    ) {
      return "Yes";
    }

    if (
      [
        "false",
        "no",
        "0",
        "unchecked"
      ].includes(normalized)
    ) {
      return "No";
    }

    // The current CRM field is a date, so a populated date also means submitted.
    if (!Number.isNaN(new Date(raw).getTime())) {
      return "Yes";
    }

    return raw;
  };

  const travelDependants = (
    Array.isArray(extendedProfile?.travelDependants)
      ? extendedProfile.travelDependants
      : []
  ).filter(item =>
    item &&
    Object.values(item).some(value =>
      value !== null && value !== undefined && String(value).trim() !== ""
    )
  );

  const approvedTravelDependants = travelDependants.filter(
    item => String(item?.approval_status || "").toLowerCase() === "approved"
  );
  const totalTravellingIncludingYourself = 1 + approvedTravelDependants.length;

  const addTravelDependant = async () => {
    const firstName = String(travelDependantDraft.firstName || "").trim();
    const lastName = String(travelDependantDraft.lastName || "").trim();
    const dob = String(travelDependantDraft.dob || "").trim();
    const email = String(travelDependantDraft.email || "").trim();
    const phone = String(travelDependantDraft.phone || "").trim();
    const passportFile = travelDependantDraft.passportFile || null;

    if (!firstName || !lastName || !dob) {
      setTravelPlanningMessage("First name, last name and DOB are required.");
      return;
    }
    if (!passportFile) {
      setTravelPlanningMessage("Please attach the dependant's passport as an image or PDF.");
      return;
    }

    const passportMime = String(passportFile.type || "").toLowerCase();
    const passportIsImage = passportMime.startsWith("image/");
    const passportIsPdf = passportMime === "application/pdf" || /\.pdf$/i.test(passportFile.name || "");
    if (!passportIsImage && !passportIsPdf) {
      setTravelPlanningMessage("Passport attachment must be an image or PDF.");
      return;
    }
    if (passportFile.size > 15 * 1024 * 1024) {
      setTravelPlanningMessage("Passport attachment must be under 15MB.");
      return;
    }

    const birthDate = new Date(`${dob}T00:00:00`);
    let age = null;
    if (!Number.isNaN(birthDate.getTime())) {
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      if (
        today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
      ) age -= 1;
    }
    if (age !== null && age >= 18 && (!email || !phone)) {
      setTravelPlanningMessage("Dependants aged 18 or older must include a valid email and phone number.");
      return;
    }

    setSavingTravelDependant(true);
    setTravelPlanningMessage("");

    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const formData = new FormData();
      formData.append("file", passportFile);
      formData.append("document_name", `Travel Dependant Passport - ${firstName} ${lastName}`.trim());
      formData.append("document_category", "travel-dependant-passport");
      formData.append("category_key", "travel-dependant-passport");
      formData.append("section", "Travel and Arrival Planning");
      formData.append("document_department", "Deployment");
      formData.append("destination", "crm");

      const uploadResponse = await fetch(`${API_BASE}/api/profile/travel-dependants/evidence`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || uploadData.success !== true) {
        throw new Error(uploadData.error || "Unable to upload dependant passport.");
      }

      const uploadResult = uploadData.evidence || uploadData.upload || uploadData.document || uploadData;
      const pendingUploadId = String(
        uploadData.pending_upload_id ||
        uploadResult?.pending_upload_id ||
        uploadResult?._id ||
        uploadResult?.id ||
        ""
      ).trim();

      if (!pendingUploadId) {
        throw new Error("Passport uploaded, but the evidence reference was not returned. Please try again.");
      }

      const attachmentId = String(
        uploadData.attachment_id ||
        uploadData.crmAttachmentId ||
        uploadResult?.attachment_id ||
        uploadResult?.attachmentId ||
        uploadResult?.crmAttachmentId ||
        ""
      ).trim();

      const nextDependant = {
        firstName, lastName, dob, email, phone,
        addedAt: new Date().toISOString(),
        passport_file_name: passportFile.name,
        passport_mime_type: passportFile.type || "",
        passport_source: String(
          uploadData.source || uploadResult?.source || (pendingUploadId ? "pending" : "crm")
        ).trim(),
        passport_attachment_id: attachmentId,
        passport_pending_upload_id: pendingUploadId,
        passport_approval_key: String(
          uploadData.approval_key || uploadResult?.approval_key ||
          (pendingUploadId ? `pending:${pendingUploadId}` : "")
        ).trim(),
        passport_crm_record_id: String(
          uploadData.crm_record_id || uploadResult?.crm_record_id || uploadResult?.deal_id || ""
        ).trim()
      };

      const requestResponse = await fetch(`${API_BASE}/api/profile/travel-dependants/request`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...nextDependant, age })
      });
      const requestData = await requestResponse.json().catch(() => ({}));
      if (!requestResponse.ok || requestData.success !== true) {
        throw new Error(requestData.error || "Unable to submit dependent for admin approval.");
      }

      setTravelDependantDraft({
        firstName: "", lastName: "", dob: "", email: "", phone: "", passportFile: null
      });
      setShowTravelDependantForm(false);
      setTravelPlanningMessage(
        "Dependent submitted for admin approval. It will appear permanently in your profile after approval."
      );
      window.dispatchEvent(new CustomEvent("candidate-data-updated", {
        detail: { event: "travel-dependant-saved" }
      }));
    } catch (error) {
      setTravelPlanningMessage(error?.message || "Unable to save dependant travel information.");
    } finally {
      setSavingTravelDependant(false);
    }
  };

  const visibleDependants = (Array.isArray(extendedProfile?.dependants)
    ? extendedProfile.dependants
    : []
  ).filter(dependant =>
    dependant && Object.values(dependant).some(value =>
      value !== null && value !== undefined && String(value).trim() !== ""
    )
  );

  // Approved dependant requests are copied into the extended profile by the
  // backend. Show the approved travel choice regardless of the field name used
  // by older/newer request payloads.
  const getDependantTravelPlan = dependant => {
    const raw =
      dependant?.arrival_plan ||
      dependant?.arrivalPlan ||
      dependant?.travelPlan ||
      dependant?.travel_plan ||
      dependant?.travelStatus ||
      "";

    const value = String(raw || "").trim();
    if (!value) return "";

    const normalized = value
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (
      normalized === "follow to join" ||
      normalized === "join to follow"
    ) {
      return "Follow to Join";
    }

    if (
      normalized === "coming with you" ||
      normalized === "arriving" ||
      normalized === "arriving with you"
    ) {
      return "Coming With You";
    }

    if (
      normalized === "coming later" ||
      normalized === "later"
    ) {
      return "Coming Later";
    }

    return value;
  };

  const displayName =
    getFirstValue(
      "candidateName",
      "Candidate_Name",
      "Full_Name",
      "Name"
    ) ||
    [
      getFirstValue("firstName", "First_Name"),
      getFirstValue("lastName", "Last_Name")
    ].filter(Boolean).join(" ") ||
    getValue("email") ||
    user?.email ||
    "Candidate";

  const displayEmail =
    getValue("email") ||
    user?.email ||
    "—";

  const applicationStatusValue =
    resolvedInterviewHiring.applicationStatus ||
    recruitData.applicationStatus ||
    getFirstValue(
      "Application_Status",
      "Lead_Management_Status",
      "applicationStatus"
    ) ||
    "Qualified - Match";

  const nationalityValue =
    getFirstValue(
      "nationality",
      "Nationality",
      "citizenship",
      "Country_of_Citizenship",
      "Citizenship",
      "Country_of_Nationality"
    ) ||
    "—";

  const currentLocationValue =
    getFirstValue(
      "currentLocation",
      "Current_Location",
      "Location",
      "Current_City"
    ) ||
    [
      getFirstValue("city", "City", "Current_City"),
      getFirstValue("state", "State", "Current_State"),
      getFirstValue("country", "Country", "Country_of_Residence")
    ].filter(Boolean).join(", ") ||
    "—";

  const positionValue =
    getFirstValue(
      "position",
      "Position",
      "professionalSpecialty",
      "Professional_Specialty",
      "Nurse_Specialty",
      "Speciality",
      "Specialty"
    ) ||
    "—";

  const yearsOfExperienceValue =
    getFirstValue(
      "yearsOfExperience",
      "Years_of_Experience",
      "Experience_Years",
      "Experience_in_Years",
      "Experience"
    ) ||
    "—";

  const appliedOnValue =
    formatDate(
      getSourceValue(
        "crm",
        "Applied_On",
        "Created_Time"
      ) ||
      getSourceValue(
        "recruitCandidate",
        "Applied_On",
        "Created_Time"
      ) ||
      getFirstValue(
        "Applied_On",
        "dateApplied",
        "appliedOn",
        "Created_Time"
      )
    ) ||
    "—";

  const interviewTypeValue =
    getSourceValue(
      "crm",
      "Interview_Type"
    ) ||
    getSourceValue(
      "recruitCandidate",
      "Interview_Type"
    ) ||
    getFirstValue(
      "Interview_Type",
      "interviewType"
    ) ||
    "—";

  const interviewStatusValue =
    getSourceValue(
      "crm",
      "Interview_Status"
    ) ||
    getSourceValue(
      "recruitCandidate",
      "Interview_Status",
      "Candidate_Status"
    ) ||
    recruitData.candidateStatus ||
    "—";

  const profileInitial =
    String(displayName)
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "?";

  return (
    <div className="mx-auto w-full max-w-[1080px] pb-10">
      {/* Screenshot-matched profile summary */}
      <div className="relative overflow-hidden rounded-[16px] border border-[#eee9f6] bg-gradient-to-r from-[#fbf8ff] via-[#f7f1ff] to-[#eee5ff] px-[28px] py-[22px] shadow-[0_2px_12px_rgba(57,38,99,0.04)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[36%] overflow-hidden">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#dbc6ff]/50 blur-2xl" />
          <div className="absolute bottom-[-42px] right-24 h-36 w-36 rounded-full bg-white/60 blur-2xl" />
          <div className="absolute bottom-[-16px] right-[8px] h-24 w-[190px] rotate-[-10deg] rounded-[50%] bg-[#d8c5fb]/45" />
          <div className="absolute bottom-[3px] right-[55px] h-[90px] w-[58px] rotate-[20deg] rounded-[50%] border border-[#cbb4f6]/40 bg-[#e5d8fb]/55" />
        </div>

        <div className="relative z-10 flex min-h-[114px] items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-[22px]">
            <div className="relative shrink-0">
              <div className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-[#e6faf3] text-[36px] font-bold text-[#16a879] ring-2 ring-white shadow-[0_2px_8px_rgba(57,38,99,0.10)]">
                {candidatePhotoUrl ? (
                  <img
                    src={candidatePhotoUrl}
                    alt={`${displayName} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profileInitial
                )}
              </div>
              <button
                type="button"
                aria-label="Change profile photo"
                className="absolute bottom-[1px] right-[-2px] flex h-[27px] w-[27px] items-center justify-center rounded-full border-[3px] border-[#f7f1ff] bg-white text-[#8a64d4] shadow-sm"
              >
                <Camera className="h-[12px] w-[12px]" />
              </button>
            </div>

            <div className="min-w-0 pt-1">
              <h1 className="truncate pb-[2px] text-[28px] font-bold leading-[1.12] tracking-[-0.02em] text-[#272238]">
                {displayName}
              </h1>
              <p className="mt-[8px] truncate text-[11px] font-medium text-[#777188]">
                {displayEmail}
              </p>

              <div className="mt-[12px] flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-[5px] rounded-full bg-white/85 px-[9px] py-[5px] text-[9.5px] font-semibold text-[#1da576] shadow-[0_1px_4px_rgba(45,159,116,0.07)]">
                  <CheckCircle className="h-[11px] w-[11px] fill-[#24bd8c] text-[#24bd8c]" />
                  {applicationStatusValue}
                </span>
                <span className="inline-flex items-center gap-[5px] rounded-full bg-white/85 px-[9px] py-[5px] text-[9.5px] font-semibold text-[#7954c7] shadow-[0_1px_4px_rgba(109,75,177,0.07)]">
                  <Briefcase className="h-[11px] w-[11px]" />
                  Profile Strength: Strong
                </span>
              </div>
            </div>
          </div>

          {/* Exclusive Member Rewards — animated envelope trigger */}
          <button
            type="button"
            onClick={() => setShowPreferredLicensureAgentOffer(true)}
            aria-label="Open Exclusive Member Rewards"
            title="Exclusive Member Rewards"
            className="group relative mr-0 flex h-[100px] w-[200px] shrink-0 items-center justify-center rounded-[20px] outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#8b5bd5] focus-visible:ring-offset-2 sm:h-[108px] sm:w-[148px] md:mr-[18px] md:h-[116px] md:w-[205px]"
          >
            <div className="pointer-events-none absolute left-[-10px] top-[28px] h-[66px] w-[98px] rounded-[50%] border border-[#d9c7f7]/50 bg-[#e9dffc]/35 sm:left-0 sm:h-[78px] sm:w-[116px] md:left-[-18px] md:top-[32px] md:h-[82px] md:w-[126px]" />
            <div className="pointer-events-none absolute right-[-5px] top-[3px] h-[74px] w-[48px] rotate-[24deg] rounded-[50%] border border-[#d8c3f8]/60 bg-[#e4d6fb]/45 sm:right-[4px] sm:h-[88px] sm:w-[56px] md:left-[24px] md:right-auto md:top-[8px] md:h-[100px] md:w-[66px]" />

            <div className="relative z-10 h-[68px] w-[98px] sm:h-[100px] sm:w-[150px] md:h-[100px] md:w-[150px]">
              {/* Letter rises as the envelope opens */}
              <div className="absolute left-[10%] top-[8%] z-[2] h-[72%] w-[80%] rounded-[7px] border border-[#e8ddf8] bg-white px-[10px] pt-[11px] shadow-[0_5px_14px_rgba(83,43,145,0.13)] transition-all duration-300 ease-out group-hover:-translate-y-[23px] group-focus-visible:-translate-y-[23px]">
                <div className="h-[4px] w-[72%] rounded-full bg-[#8b5bd5]/55" />
                <div className="mt-[6px] h-[3px] w-full rounded-full bg-[#d9ccf1]" />
                <div className="mt-[5px] h-[3px] w-[82%] rounded-full bg-[#e4dbf3]" />
              </div>

              {/* Envelope back */}
              <div className="absolute inset-x-0 bottom-0 z-[1] h-[78%] rounded-[10px] bg-gradient-to-br from-[#5e2aa9] to-[#7a40d2] shadow-[0_9px_18px_rgba(82,35,154,0.24)]" />

              {/* Opening flap */}
              <div className="absolute inset-x-0 top-[22%] z-[4] h-[45%] origin-top bg-[#8b5bd5] [clip-path:polygon(0_0,100%_0,50%_100%)] transition-all duration-300 ease-out group-hover:-translate-y-[14px] group-hover:scale-y-[-1] group-focus-visible:-translate-y-[14px] group-focus-visible:scale-y-[-1]" />

              {/* Front folds */}
              <div className="absolute inset-x-0 bottom-0 z-[5] h-[62%] rounded-b-[10px] bg-[#6d36ba] [clip-path:polygon(0_0,50%_62%,100%_0,100%_100%,0_100%)]" />
              <div className="absolute inset-x-0 bottom-0 z-[6] h-[58%] rounded-b-[10px] bg-gradient-to-t from-[#5f2da9] to-[#7540c5] [clip-path:polygon(0_100%,50%_35%,100%_100%)]" />

              <div className="absolute bottom-[8px] left-1/2 z-[7] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/15 px-[7px] py-[3px] text-[6.5px] font-bold uppercase tracking-[0.08em] text-white/90 sm:text-[7px] md:text-[7.5px]">
                Preferred Licensure Agent
              </div>
            </div>

            <span className="pointer-events-none absolute -bottom-[4px] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-[#e7ddf8] bg-white/95 px-2 py-1 text-[8px] font-semibold text-[#7954c7] opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:block">
              Preferred Licensure Agent
            </span>
          </button>
        </div>
      </div>

      {/* Exactly the same 2 x 2 card arrangement shown in the screenshot */}
      <div className="mt-[14px] grid gap-[14px] lg:grid-cols-2">
        <Section
          title="Personal Information"
          icon={User}
          hideAction
        >
          <div className="grid gap-4 md:grid-cols-[1fr_118px] md:items-start">
            <div>
              <InfoRow label="Full Name" value={displayName} icon={User} alwaysVisible />
              <InfoRow label="Email" value={displayEmail} icon={Mail} alwaysVisible />
              <InfoRow label="Phone" value={getFirstValue("phone", "Phone", "Mobile", "Mobile_Phone", "Phone_Number", "mobilePhone") || "—"} icon={Phone} alwaysVisible />
              <InfoRow label="Nationality" value={nationalityValue} icon={Globe2} alwaysVisible />
              <InfoRow label="Current Location" value={currentLocationValue} icon={MapPin} alwaysVisible />
              <InfoRow
                label="Date of Birth"
                value={getFirstFormattedDate("dateOfBirth", "DOB", "Date_of_Birth_DOB", "Date_of_Birth", "Birth_Date") || "—"}
                icon={Calendar}
                alwaysVisible
              />
              <InfoRow
                label="Preferred Name"
                value={getFirstValue("prefferedName", "preferredName", "Preferred_Name") || "—"}
                icon={User}
                alwaysVisible
              />
              <InfoRow
                label="Contact Name"
                value={getFirstValue("contactName", "Contact_Name") || "—"}
                icon={User}
                alwaysVisible
              />
            </div>

            <div className="relative hidden h-[118px] items-center justify-center sm:flex">
              <div className="absolute left-4 top-8 h-16 w-16 rounded-full bg-white/55 blur-2xl" />
              <div className="absolute bottom-4 right-2 h-16 w-16 rounded-full bg-[#dcc8ff]/45 blur-2xl" />

              <div className="relative rotate-[-8deg] rounded-[20px] bg-gradient-to-br from-[#6731cc] to-[#8b5cf6] px-4 py-5 text-white shadow-[0_12px_24px_rgba(103,49,204,0.22)]">
                <div className="mb-3 flex justify-center">
                  <User className="h-8 w-8" />
                </div>
                <div className="mx-auto h-2 w-16 rounded-full bg-white/30" />
                <div className="mx-auto mt-2 h-2 w-11 rounded-full bg-white/20" />
              </div>

              <div className="absolute right-0 top-8 rotate-[12deg] rounded-[18px] border border-white/70 bg-white px-4 py-5 text-[#8b5cf6] shadow-md">
                <Mail className="h-8 w-8" />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Professional Information"
          icon={Briefcase}
          hideAction
        >
          <div className="grid gap-4 md:grid-cols-[1fr_118px] md:items-start">
            <div>
              <InfoRow label="Application Status" value={applicationStatusValue} icon={Briefcase} alwaysVisible />
              <InfoRow
                label="Current Employer"
                value={resolvedInterviewHiring.currentEmployer || "—"}
                icon={Building2}
                alwaysVisible
              />
              <InfoRow label="Position" value={positionValue} icon={UserCheck} alwaysVisible />
              <InfoRow label="Years of Experience" value={yearsOfExperienceValue} icon={Clock} alwaysVisible />
              <InfoRow
                label="Scheduled for Interview"
                value={resolvedInterviewHiring.scheduledForInterview ? "Yes" : "No"}
                icon={Calendar}
                alwaysVisible
              />
              <InfoRow
                label="Specialty"
                value={getFirstValue("professionalSpecialty", "Professional_Specialty", "Nurse_Specialty", "Speciality", "Specialty") || "—"}
                icon={Award}
                alwaysVisible
              />
              
              <InfoRow
                label="Hospital Name"
                value={getFirstValue("hospitalName", "Hospital_Name", "Account_Name", "Hired_Location") || "—"}
                icon={Building2}
                alwaysVisible
              />
              
            </div>

            <div className="relative hidden h-[118px] items-center justify-center sm:flex">
              <div className="absolute left-4 top-8 h-16 w-16 rounded-full bg-white/55 blur-2xl" />
              <div className="absolute bottom-4 right-2 h-16 w-16 rounded-full bg-[#dcc8ff]/45 blur-2xl" />

              <div className="relative rotate-[-8deg] rounded-[20px] bg-gradient-to-br from-[#6731cc] to-[#8b5cf6] px-4 py-5 text-white shadow-[0_12px_24px_rgba(103,49,204,0.22)]">
                <div className="mb-3 flex justify-center">
                  <Briefcase className="h-8 w-8" />
                </div>
                <div className="mx-auto h-2 w-16 rounded-full bg-white/30" />
                <div className="mx-auto mt-2 h-2 w-11 rounded-full bg-white/20" />
              </div>

              <div className="absolute right-0 top-8 rotate-[12deg] rounded-[18px] border border-white/70 bg-white px-4 py-5 text-[#8b5cf6] shadow-md">
                <Building2 className="h-8 w-8" />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Interview & Hiring Details"
          icon={Users}
          hideAction
        >
          <div className="grid gap-4 md:grid-cols-[1fr_118px] md:items-start">
            <div>
              <InfoRow label="Applied On" value={appliedOnValue} icon={CalendarDays} alwaysVisible />
              <InfoRow label="Interview Type" value={interviewTypeValue} icon={Phone} alwaysVisible />
              <InfoRow
                label="Interview Date"
                value={formatDate(resolvedInterviewHiring.interviewDate) || "—"}
                icon={Calendar}
                alwaysVisible
              />
              <InfoRow label="Interview Status" value={interviewStatusValue} icon={Clock} alwaysVisible />
              <InfoRow
                label="Interview Location"
                value={resolvedInterviewHiring.interviewLocation || "—"}
                icon={MapPin}
                alwaysVisible
              />
              <InfoRow
                label="Hired Location"
                value={resolvedInterviewHiring.hiredLocation || "—"}
                icon={MapPin}
                alwaysVisible
              />
              <InfoRow
                label="Hired Department"
                value={resolvedInterviewHiring.hiredDepartment || "—"}
                icon={Building}
                alwaysVisible
              />
              <InfoRow
                label="Interview Notes"
                value={resolvedInterviewHiring.interviewNotes || "—"}
                icon={FileText}
                alwaysVisible
              />
              <InfoRow
                label="Rate"
                value={resolvedInterviewHiring.rate || "—"}
                icon={Award}
                alwaysVisible
              />
            </div>

            <div className="relative hidden h-[118px] items-center justify-center sm:flex">
              <div className="absolute left-4 top-8 h-16 w-16 rounded-full bg-white/55 blur-2xl" />
              <div className="absolute bottom-4 right-2 h-16 w-16 rounded-full bg-[#dcc8ff]/45 blur-2xl" />

              <div className="relative rotate-[-8deg] rounded-[20px] bg-gradient-to-br from-[#6731cc] to-[#8b5cf6] px-4 py-5 text-white shadow-[0_12px_24px_rgba(103,49,204,0.22)]">
                <div className="mb-3 flex justify-center">
                  <Calendar className="h-8 w-8" />
                </div>
                <div className="mx-auto h-2 w-16 rounded-full bg-white/30" />
                <div className="mx-auto mt-2 h-2 w-11 rounded-full bg-white/20" />
              </div>

              <div className="absolute right-0 top-8 rotate-[12deg] rounded-[18px] border border-white/70 bg-white px-4 py-5 text-[#8b5cf6] shadow-md">
                <Phone className="h-8 w-8" />
              </div>
            </div>
          </div>
        </Section>

        <section className="rounded-[16px] border border-[#ece8f4] bg-white p-[16px] shadow-[0_2px_12px_rgba(57,38,99,0.035)]">
          <div className="mb-[9px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-[27px] w-[27px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#8b5bd5] to-[#6a35c9] text-white shadow-[0_2px_6px_rgba(107,53,201,0.35)]">
                <Globe2 className="h-[14px] w-[14px] stroke-[2.2]" />
              </span>
              <h2 className="text-[12.5px] font-bold text-[#302a42]">Immigration</h2>
            </div>
            <button
              type="button"
              className="rounded-[7px] border border-[#e7ddf8] bg-white px-[10px] py-[5px] text-[9.5px] font-semibold text-[#8b5bd5] shadow-[0_1px_3px_rgba(92,54,160,0.04)] transition hover:bg-[#faf7ff]"
            >
              View All
            </button>
          </div>

          <div className="relative overflow-hidden rounded-[11px] border border-[#e8dcfb] bg-gradient-to-r from-[#fbf7ff] via-[#f8f2ff] to-[#f0e5ff] px-[14px] py-[10px]">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[37%]">
              <div className="absolute bottom-[-20px] right-[10px] h-[76px] w-[145px] rotate-[-8deg] rounded-[50%] bg-[#d9c4fb]/45" />
              <div className="absolute bottom-[5px] right-[63px] h-[88px] w-[47px] rotate-[22deg] rounded-[50%] border border-[#d1b8f4]/45 bg-[#e4d7fb]/55" />
            </div>

            <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_120px] items-center gap-2">
              <div>
                <div className="mb-[2px] text-[9.5px] font-bold text-[#7550bd]">
                  Immigration Petition Record
                </div>

                <InfoRow
                  label="Submitted for Immigration"
                  value={getSubmittedForImmigrationValue() || "—"}
                  icon={FileCheck}
                  alwaysVisible
                />
                <InfoRow
                  label="Submitted Date"
                  value={
                    getFirstFormattedDate(
                      "Submitted_for_Immigration_Date",
                      "Submitted_For_Immigration_Date",
                      "submittedForImmigrationDate",
                      "submittedToImmigrationDate",
                      "Added_to_Weekly_I140_Candidates"
                    ) || "—"
                  }
                  icon={Calendar}
                  alwaysVisible
                />
                <InfoRow
                  label="I-140 Filed Date"
                  value={
                    getFirstFormattedDate(
                      "Filed_Date",
                      "i140FiledDate",
                      "I_140_Filed_Date"
                    ) || "—"
                  }
                  icon={Calendar}
                  alwaysVisible
                />
                <InfoRow
                  label="I-140 Approval Date"
                  value={
                    getFirstFormattedDate(
                      "Approval_datetime",
                      "Approval_Date",
                      "i140ApprovalDate",
                      "I_140_Approval_Date"
                    ) || "—"
                  }
                  icon={Calendar}
                  alwaysVisible
                />
                <InfoRow
                  label="I-140 Priority Date"
                  value={
                    getFirstFormattedDate(
                      "Priority_Date",
                      "i140PriorityDate",
                      "I_140_Priority_Date"
                    ) || "—"
                  }
                  icon={Calendar}
                  alwaysVisible
                />
                <InfoRow
                  label="English Complete"
                  value={
                    getFirstValue(
                      "IELTS_Complete",
                      "englishComplete",
                      "English_Complete",
                      "EnglishComplete"
                    ) || "—"
                  }
                  icon={CheckCircle}
                  alwaysVisible
                />
                <InfoRow
                  label="English Exp Date"
                  value={
                    getFirstFormattedDate(
                      "IELTS_Scheduled_Exam_Date_if_applicable",
                      "englishExpDate",
                      "English_Exp_Date",
                      "English_Expiration_Date"
                    ) || "—"
                  }
                  icon={Calendar}
                  alwaysVisible
                />
                <InfoRow
                  label="Embassy Eligibility Status"
                  value={
                    embassyEligibilityStatus ||
                    getFirstValue(
                      "State_Licensure_Requirements",
                      "embassyEligibilityStatus",
                      "Deployment_Eligibility"
                    ) ||
                    "—"
                  }
                  icon={UserCheck}
                  alwaysVisible
                />
                <InfoRow
                  label="Embassy Location"
                  value={
                    (
                      extendedProfile
                        ?.embassyTransfer
                        ?.status ===
                      "Approved"
                        ? extendedProfile
                            ?.embassyTransfer
                            ?.location
                        : null
                    ) ||
                    getFirstValue(
                      "Embassy_Location",
                      "embassyLocation"
                    ) ||
                    extendedProfile
                      ?.embassyLocation ||
                    "—"
                  }
                  icon={MapPin}
                  alwaysVisible
                />
              </div>

              <div className="relative hidden min-h-[210px] items-center justify-center sm:flex">
                <div className="relative z-10 rotate-[-8deg] rounded-[8px] bg-gradient-to-br from-[#3c217e] to-[#5d2ea8] px-[13px] py-[12px] text-white shadow-[0_8px_18px_rgba(61,27,128,0.28)]">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#ddb64d] text-[#f1c857]">
                    <Globe2 className="h-[18px] w-[18px]" />
                  </div>
                  <div className="mt-[9px] h-[4px] w-[39px] rounded-full bg-white/30" />
                  <div className="mt-[5px] h-[4px] w-[28px] rounded-full bg-white/20" />
                </div>
                <div className="absolute right-[2px] top-[20px] z-0 rotate-[8deg] rounded-[7px] border border-white/80 bg-white px-[11px] py-[12px] text-[#7b56c8] shadow-sm">
                  <FileText className="h-[27px] w-[27px]" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Existing lower-profile functionality retained below the screenshot area */}
      <div className="mt-7 space-y-4">
        <Section
          title="Travel and arrival planning"
          icon={Plane}
          actionLabel={
            savingTravelPlanning
              ? "Saving..."
              : travelSaved
                ? "Saved ✓"
                : "Save Travel"
          }
          onAction={saveTravelPlanning}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Departure city and country / closest international airport
              </span>
              <input
                type="text"
                value={travelPlanning.departureCity ?? ""}
                onChange={event => {
                  setTravelPlanning(previous => ({ ...previous, departureCity: event.target.value }));
                  setTravelSaved(false);
                  setTravelPlanningMessage("");
                }}
                className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Total Travelling Including Yourself
              </span>
              <input
                type="number"
                value={totalTravellingIncludingYourself}
                readOnly
                className="mt-1 w-full rounded-lg border border-[#e6def1] bg-slate-50 px-3 py-2 text-sm font-semibold"
              />
            </label>
            {[
              ["Will anyone travel in a wheelchair?", "wheelchair", "text"],
              ["Checked Bags", "checkedBags", "number"],
              ["Personal Carry On", "carryOn", "number"],
              ["Boxes", "boxes", "number"],
              ["Traveling with pets?", "pets", "text"],
              ["Travel Cash ($), excluding reimbursement", "travelCash", "number"],
              ["Car seats or boosters needed?", "carSeats", "text"],
              ["Cell Phone Model + Carrier", "phoneModelCarrier", "text"],
              ["Is the SIM card unlocked?", "simUnlocked", "text"]
            ].map(([label, field, type]) => (
              <label key={field} className="block">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <input
                  type={type}
                  value={travelPlanning[field] ?? ""}
                  onChange={event =>
                    {
                      setTravelPlanning(previous => ({
                        ...previous,
                        [field]: event.target.value
                      }));
                      setTravelSaved(false);
                      setTravelPlanningMessage("");
                    }
                  }
                  className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Employment plans for spouse or adult children
              </span>
              <textarea
                value={travelPlanning.spouseEmployment || ""}
                onChange={event => {
                  setTravelPlanning(previous => ({ ...previous, spouseEmployment: event.target.value }));
                  setTravelSaved(false);
                  setTravelPlanningMessage("");
                }}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Immediate driving plan after arrival
              </span>
              <textarea
                value={travelPlanning.drivingPlan || ""}
                onChange={event => {
                  setTravelPlanning(previous => ({ ...previous, drivingPlan: event.target.value }));
                  setTravelSaved(false);
                  setTravelPlanningMessage("");
                }}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Car Purchasing Plan Post Arrival
              </span>
              <input
                type="text"
                value={travelPlanning.carPurchasePlan ?? ""}
                onChange={event => {
                  setTravelPlanning(previous => ({
                    ...previous,
                    carPurchasePlan: event.target.value
                  }));
                  setTravelSaved(false);
                  setTravelPlanningMessage("");
                }}
                className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Final Transportation Plan
              </span>
              <select
                value={travelPlanning.finalTransportationPlan || ""}
                onChange={event => {
                  setTravelPlanning(previous => ({
                    ...previous,
                    finalTransportationPlan: event.target.value
                  }));
                  setTravelSaved(false);
                  setTravelPlanningMessage("");
                }}
                className="mt-1 w-full rounded-lg border border-[#e6def1] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
              >
                <option value="">Select transportation plan</option>
                {[
                  ...new Set([
                    travelPlanning.finalTransportationPlan || "",
                    ...planningOptions.finalTransportationPlan
                  ].filter(Boolean))
                ].map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Options are loaded directly from CRM Deals field Final_Transportation_Plan.
              </p>
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-[#e6def1] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#302a42]">
                  Dependents Travelling With Me
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dependents over 18 must include a valid email and phone number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTravelDependantForm(previous => !previous);
                  setTravelPlanningMessage("");
                }}
                className="inline-flex items-center border border-[#302a42] bg-white px-4 py-2 text-sm font-semibold text-[#302a42] hover:bg-slate-50"
              >
                + ADD Dependent
              </button>
            </div>

            {approvedTravelDependants.length > 0 ? (
              <div className="mt-4 space-y-2">
                {approvedTravelDependants.map((item, index) => (
                  <div
                    key={`${item.firstName || "dependent"}-${item.lastName || ""}-${index}`}
                    className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">
                      {[item.firstName, item.lastName].filter(Boolean).join(" ") || `Dependent ${index + 1}`}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {[item.age !== null && item.age !== undefined ? `Age ${item.age}` : null, item.email || null, item.phone || null, item.passport_file_name ? `Passport: ${item.passport_file_name}` : null]
                        .filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {showTravelDependantForm ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["First Name", "firstName", "text"],
                  ["Last Name", "lastName", "text"],
                  ["DOB", "dob", "date"],
                  ["Email", "email", "email"],
                  ["Phone", "phone", "tel"]
                ].map(([label, field, type]) => (
                  <label key={field} className="block">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <input
                      type={type}
                      value={travelDependantDraft[field] || ""}
                      onChange={event =>
                        setTravelDependantDraft(previous => ({
                          ...previous,
                          [field]: event.target.value
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <label className="block md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Passport Attachment</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf"
                    onChange={event => {
                      const file = event.target.files?.[0] || null;
                      if (!file) {
                        setTravelDependantDraft(previous => ({ ...previous, passportFile: null }));
                        return;
                      }
                      const mime = String(file.type || "").toLowerCase();
                      const isImage = mime.startsWith("image/");
                      const isPdf = mime === "application/pdf" || /\.pdf$/i.test(file.name || "");
                      if (!isImage && !isPdf) {
                        setTravelPlanningMessage("Passport attachment must be an image or PDF.");
                        event.target.value = "";
                        return;
                      }
                      if (file.size > 15 * 1024 * 1024) {
                        setTravelPlanningMessage("Passport attachment must be under 15MB.");
                        event.target.value = "";
                        return;
                      }
                      setTravelDependantDraft(previous => ({ ...previous, passportFile: file }));
                      setTravelPlanningMessage("");
                    }}
                    className="mt-1 w-full rounded-lg border border-[#e6def1] bg-white px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG, WEBP, HEIC or HEIF. Maximum 15MB.</p>
                  {travelDependantDraft.passportFile ? (
                    <p className="mt-1 text-xs font-semibold text-[#6d3bb8]">
                      Selected: {travelDependantDraft.passportFile.name}
                    </p>
                  ) : null}
                </label>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTravelDependantForm(false)}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingTravelDependant}
                    onClick={addTravelDependant}
                    className="rounded-lg bg-[#6d3bb8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingTravelDependant ? "Saving..." : "Add Dependent"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {travelPlanningMessage ? (
            <p className={`mt-4 text-sm font-medium ${
              travelSaved ? "text-emerald-600" : "text-muted-foreground"
            }`}>
              {travelPlanningMessage}
            </p>
          ) : null}
        </Section>

        <Section
          title="Final Banking Plan"
          icon={Building2}
          actionLabel={
            savingBankingPlanning
              ? "Saving..."
              : bankingSaved
                ? "Saved ✓"
                : "Save Banking"
          }
          onAction={saveBankingPlanning}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Final Banking Plan
              </span>
              <select
                value={travelPlanning.finalBankingPlan || ""}
                onChange={event =>
                  {
                    setTravelPlanning(previous => ({
                      ...previous,
                      finalBankingPlan: event.target.value
                    }));
                    setBankingSaved(false);
                    setBankingPlanningMessage("");
                  }
                }
                className="mt-1 w-full rounded-lg border border-[#e6def1] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
              >
                <option value="">Select banking plan</option>
                {[
                  ...new Set([
                    travelPlanning.finalBankingPlan || "",
                    ...planningOptions.finalBankingPlan
                  ].filter(Boolean))
                ].map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            {travelPlanning.finalBankingPlan ===
              "Already Have an Account – Provide Bank Name and City" ? (
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Bank Name and City
                </span>
                <input
                  type="text"
                  value={travelPlanning.finalBankNameCity || ""}
                  onChange={event =>
                    {
                      setTravelPlanning(previous => ({
                        ...previous,
                        finalBankNameCity: event.target.value
                      }));
                      setBankingSaved(false);
                      setBankingPlanningMessage("");
                    }
                  }
                  placeholder="e.g. Chase Bank, Nashville"
                  className="mt-1 w-full rounded-lg border border-[#e6def1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#eee6fb]"
                />
              </label>
            ) : null}
          </div>

          <p className="mt-3 text-xs font-medium text-amber-700">
            Complete your Final Banking Plan at least 15 days before arrival and before the Welcome Packet is due.
          </p>

          {bankingPlanningMessage ? (
            <p className={`mt-3 text-sm font-medium ${
              bankingSaved ? "text-emerald-600" : "text-muted-foreground"
            }`}>
              {bankingPlanningMessage}
            </p>
          ) : null}
        </Section>

        {visibleDependants.length > 0 ? (
          <Section title="Dependents after I140 Filing" icon={Users} hideAction>
            {visibleDependants.map((dependant, index) => (
              <div
                key={`${dependant.name || "dependant"}-${index}`}
                className="border-b border-[#f0edf6] py-3 last:border-0"
              >
                <p className="text-sm font-semibold text-[#302a42]">{dependant.name || "Dependant"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    dependant.age ? `Age ${dependant.age}` : null,
                    dependant.relationship || null
                  ].filter(Boolean).join(" · ")}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#f3ecff] text-[#7c4fd6]">
                    <Plane className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-[#8f8aa0]">
                      Travel Plan
                    </p>
                    <p className="text-xs font-semibold text-[#37324a]">
                      {getDependantTravelPlan(dependant) || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              Dependant passport documents are uploaded and managed through the Document Library.
            </p>
          </Section>
        ) : null}
      </div>

      {showPreferredLicensureAgentOffer ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Exclusive Member Rewards</h2>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm leading-6 text-foreground">
                ICP candidates receive an exclusive member offering of 10% off processing fees for the selected service. If you elect to use this service, you will be re-directed to a 3rd party licensure HUB for processing. Please follow the instructions provided to begin this process. An agent will guide you through this journey.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPreferredLicensureAgentOffer(false)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!preferredLicensureAgentUrl}
                onClick={() => {
                  if (preferredLicensureAgentUrl) {
                    window.open(
                      preferredLicensureAgentUrl,
                      "_blank",
                      "noopener,noreferrer"
                    );
                    setShowPreferredLicensureAgentOffer(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Licensure HUB
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
