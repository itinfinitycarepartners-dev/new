// @ts-nocheck
import { useAuth } from "@/lib/AuthContext";
import { User, Phone, Mail, MapPin, Briefcase, Plane, Building2, UserCheck, Calendar, Award, FileText, FileCheck, Clock, Shield, CheckCircle, AlertCircle, Building, Loader2, Users, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fictional-carnival-3inv.onrender.com';


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

  if (typeof value === 'boolean') {
    displayValue = value ? "Yes" : "No";
  }

  // Handle object values without changing the existing profile behavior.
  if (value && typeof value === 'object') {
    if (value.name) displayValue = value.name;
    else if (value.file_Name) displayValue = value.file_Name;
    else if (value.value !== undefined && value.value !== null) displayValue = value.value;
    else if (alwaysVisible) displayValue = "—";
    else return null;
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words">{displayValue}</p>
      </div>
    </div>
  );
}

function Section({ title, children, className = "" }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-5 ${className}`}>
      <h2 className="font-semibold mb-2">{title}</h2>
      <div>{children}</div>
    </div>
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
  const [extendedProfile, setExtendedProfile] = useState({
    dependants: [],
    travelSummary: {}
  });
  const [embassyEligibilityStatus, setEmbassyEligibilityStatus] = useState("");

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
    spouseEmployment: ""
  });
  const [savingTravelPlanning, setSavingTravelPlanning] = useState(false);
  const [travelPlanningMessage, setTravelPlanningMessage] = useState("");

  // Fetch profile data from Zoho API
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("icp_auth_token");
        if (!token) {
          setLoading(false);
          setError("No authentication token found. Please log in again.");
          return;
        }

        console.log("[Profile] Fetching profile data for:", user.email);

        const response = await fetch(`${API_BASE}/api/zoho/my-deals`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("[Profile] Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Profile] Error response:", errorText);
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        const data = await response.json();
        console.log("[Profile] Full API response:", data);

        if (data.success && data.data) {
          setProfileData(data.data);
        } else {
          setError("No profile data found");
        }
      } catch (error) {
        console.error("[Profile] Error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.email]);

  // Fetch canonical Interview & Hiring data from the backend.
  // /api/profile/source-data resolves the correct owner for each field:
  // CRM Deals, Recruit Candidates, or Recruit Applications.
  useEffect(() => {
    const fetchRecruitData = async () => {
      if (!user?.email) {
        setRecruitLoading(false);
        return;
      }

      try {
        const token =
          localStorage.getItem(
            "icp_auth_token"
          );

        if (!token) {
          setRecruitLoading(false);
          return;
        }

        console.log(
          "[Profile] Fetching canonical Interview & Hiring source data..."
        );

        const response =
          await fetch(
            `${API_BASE}/api/profile/source-data?refresh=true&_=${Date.now()}`,
            {
              cache: "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                "Cache-Control":
                  "no-cache",
                Pragma:
                  "no-cache"
              }
            }
          );

        console.log(
          "[Profile] Canonical source response status:",
          response.status
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
            data.message ||
            `HTTP ${response.status}`
          );
        }

        const mapped =
          data.mapped ||
          {};

        const sourcePayload =
          data.interviewHiringSources ||
          {
            crm:
              data.modules?.CRM_Deals ||
              {},
            recruitCandidate:
              data.modules?.Recruit_Candidates ||
              {},
            recruitApplication:
              data.modules?.Recruit_Applications ||
              {}
          };

        setInterviewHiringSources({
          crm:
            sourcePayload.crm ||
            {},
          recruitCandidate:
            sourcePayload.recruitCandidate ||
            {},
          recruitApplication:
            sourcePayload.recruitApplication ||
            {}
        });

        setCurrentEmployer(
          mapped.Current_Employer ||
          ""
        );

        setScheduledForInterview(
          mapped.Scheduled_for_Interview ===
          true
        );

        setRecruitData({
          hiredLocation:
            mapped.Hired_Location ||
            "",
          hiredDepartment:
            mapped.Hired_Department ||
            "",
          interviewLocation:
            mapped.Interview_Location ||
            "",
          interviewDate:
            mapped.Interview_Date ||
            "",
          interviewNotes:
            mapped.Interview_Notes ||
            mapped.Notes_Interview ||
            "",
          rate:
            mapped.Rate ||
            "",
          applicationStatus:
            mapped.Application_Status ||
            mapped.Lead_Management_Status ||
            "",
          candidateStatus:
            mapped.Candidate_Status ||
            ""
        });

        console.log(
          "[Profile] Canonical Interview & Hiring data:",
          {
            interviewDate:
              mapped.Interview_Date,
            interviewLocation:
              mapped.Interview_Location,
            hiredLocation:
              mapped.Hired_Location,
            hiredDepartment:
              mapped.Hired_Department,
            currentEmployer:
              mapped.Current_Employer,
            scheduledForInterview:
              mapped.Scheduled_for_Interview,
            applicationStatus:
              mapped.Application_Status,
            candidateStatus:
              mapped.Candidate_Status
          }
        );
      } catch (error) {
        console.error(
          "[Profile] Canonical Interview & Hiring data error:",
          error
        );
      } finally {
        setRecruitLoading(false);
      }
    };

    fetchRecruitData();

    const refresh =
      () =>
        fetchRecruitData();

    const refreshOnFocus =
      () =>
        fetchRecruitData();

    window.addEventListener(
      "candidate-data-updated",
      refresh
    );

    window.addEventListener(
      "focus",
      refreshOnFocus
    );

    const refreshTimer =
      window.setInterval(
        fetchRecruitData,
        60 * 1000
      );

    return () => {
      window.removeEventListener(
        "candidate-data-updated",
        refresh
      );

      window.removeEventListener(
        "focus",
        refreshOnFocus
      );

      window.clearInterval(
        refreshTimer
      );
    };
  }, [user?.email]);


  useEffect(() => {
    const loadExtendedProfile = async () => {
      if (!user?.email) return;

      const token = localStorage.getItem("icp_auth_token");
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/profile/extended?_=${Date.now()}`,
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
        }
      } catch (error) {
        console.warn(
          "[Profile] Extended profile unavailable:",
          error?.message || error
        );
      }
    };

    loadExtendedProfile();

    const refresh = () =>
      loadExtendedProfile();

    window.addEventListener(
      "candidate-data-updated",
      refresh
    );

    const interval =
      window.setInterval(
        loadExtendedProfile,
        5000
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

  useEffect(() => {
    const loadEligibility = async () => {
      if (!user?.email) return;

      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) return;

      try {
        const response =
          await fetch(
            `${API_BASE}/api/profile/source-data?refresh=true&_=${Date.now()}`,
            {
              cache:"no-store",
              headers:{
                Authorization:`Bearer ${token}`
              }
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        const raw =
          data?.mapped?.State_Licensure_Requirements ??
          data?.mapped?.Deployment_Eligibility ??
          data?.modules?.CRM_Deals?.State_Licensure_Requirements ??
          "";

        const formatEligibility =
          value => {
            if (
              value === null ||
              value === undefined ||
              value === ""
            ) {
              return "";
            }

            if (Array.isArray(value)) {
              return value
                .map(formatEligibility)
                .filter(Boolean)
                .join(", ");
            }

            if (
              typeof value === "object"
            ) {
              return formatEligibility(
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

        const value =
          formatEligibility(raw);

        if (value) {
          setEmbassyEligibilityStatus(
            value
          );
        }
      } catch (error) {
        console.warn(
          "[Profile] Embassy eligibility fallback unavailable:",
          error?.message || error
        );
      }
    };

    loadEligibility();
  }, [user?.email]);

  const saveTravelPlanning = async () => {
    setSavingTravelPlanning(true);
    setTravelPlanningMessage("");

    try {
      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response =
        await fetch(
          `${API_BASE}/api/profile/extended`,
          {
            method: "PUT",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                travelSummary:
                  travelPlanning
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
          "Unable to save travel and arrival planning."
        );
      }

      setExtendedProfile(
        previous => ({
          ...previous,
          ...(data.profile || {}),
          travelSummary:
            data.profile?.travelSummary ||
            travelPlanning
        })
      );

      setTravelPlanningMessage(
        "Travel and arrival planning saved."
      );

      window.dispatchEvent(
        new CustomEvent(
          "candidate-data-updated"
        )
      );
    } catch (error) {
      console.error(
        "[Profile] Travel planning save failed:",
        error
      );

      setTravelPlanningMessage(
        error?.message ||
        "Unable to save travel and arrival planning."
      );
    } finally {
      setSavingTravelPlanning(false);
    }
  };

  // Show loading state
  if (loading || recruitLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state
  if (error) {
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

  // Show empty state
  if (!profileData) {
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

  // Helper to safely get a value from the profile data
  const getValue = (field) => {
    if (!profileData) return null;
    const value = profileData[field];
    if (value === undefined || value === null || value === "—" || value === "") return null;
    return value;
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

  const visibleDependants = (Array.isArray(extendedProfile?.dependants)
    ? extendedProfile.dependants
    : []
  ).filter(dependant =>
    dependant && Object.values(dependant).some(value =>
      value !== null && value !== undefined && String(value).trim() !== ""
    )
  );

  // Log available fields for debugging
  console.log("[Profile] Available fields:", Object.keys(profileData || {}));
  console.log("[Profile] Recruit data:", recruitData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">
            {(getValue('candidateName') || getValue('firstName') || getValue('email') || "?")[0]?.toUpperCase() || "?"}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getValue('candidateName') || getValue('firstName') || getValue('email') || "Candidate"}
          </h1>
          <p className="text-sm text-muted-foreground">{getValue('email') || user?.email}</p>
          {getValue('professionalSpecialty') && (
            <p className="text-sm text-primary font-medium">{getValue('professionalSpecialty')}</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <Section title="Personal Information">
          <InfoRow label="Full Name" value={getValue('candidateName')} icon={User} />
          <InfoRow label="Email" value={getValue('email')} icon={Mail} />
          <InfoRow label="Phone" value={getValue('phone')} icon={Phone} />
          <InfoRow label="Date of Birth" value={getFormattedDate('dateOfBirth')} icon={Calendar} />
          <InfoRow label="Preferred Name" value={getValue('prefferedName')} icon={User} />
          <InfoRow label="Contact Name" value={getValue('contactName')} icon={User} />
        </Section>

        {/* Professional Information */}
        <Section title="Professional Information">
          <InfoRow label="Specialty" value={getValue('professionalSpecialty')} icon={Award} />
          <InfoRow label="Education" value={getValue('Education')} icon={Award} />
          <InfoRow label="Hospital Name" value={getValue('hospitalName')} icon={Building2} />
          <InfoRow
            label="Application Status"
            value={
              resolvedInterviewHiring.applicationStatus
            }
            icon={UserCheck}
          />
          <InfoRow label="Order Number" value={getValue('orderNumber')} icon={FileText} />
          <InfoRow
            label="Current Employer"
            value={
              resolvedInterviewHiring.currentEmployer ||
              "Not specified"
            }
            icon={Building}
          />
          <InfoRow
            label="Scheduled for Interview"
            value={
              resolvedInterviewHiring.scheduledForInterview
                ? "Yes"
                : "No"
            }
            icon={Calendar}
          />
        </Section>

        {/* Interview & Hiring Details */}
        <Section title="Interview & Hiring Details">
          <InfoRow
            label="Interview Date"
            value={
              formatDate(
                resolvedInterviewHiring.interviewDate
              )
            }
            icon={CalendarDays}
          />
          <InfoRow
            label="Interview Location"
            value={
              resolvedInterviewHiring.interviewLocation
            }
            icon={MapPin}
          />
          <InfoRow
            label="Hired Location"
            value={
              resolvedInterviewHiring.hiredLocation
            }
            icon={MapPin}
          />
          <InfoRow
            label="Hired Department"
            value={
              resolvedInterviewHiring.hiredDepartment
            }
            icon={Building}
          />
          <InfoRow
            label="Interview Notes"
            value={
              resolvedInterviewHiring.interviewNotes
            }
            icon={FileText}
          />
          <InfoRow
            label="Rate"
            value={
              resolvedInterviewHiring.rate
            }
            icon={Award}
          />
        </Section>

        {/* Immigration Petition Record — retained from the existing profile */}
        <Section title="Immigration">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Immigration Petition Record
            </h3>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="px-5">
              <InfoRow
                label="Submitted for Immigration"
                value={getSubmittedForImmigrationValue()}
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
                  )
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
                  )
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
                  )
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
                  )
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
                  )
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
                  )
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
                  )
                }
                icon={UserCheck}
                alwaysVisible
              />

              <InfoRow
                label="Approved Embassy Transfer"
                value={
                  extendedProfile?.embassyTransfer?.location ||
                  extendedProfile?.embassyLocation ||
                  getFirstValue(
                    "Embassy_Location",
                    "embassyLocation"
                  )
                }
                icon={MapPin}
                alwaysVisible
              />
            </div>
          </div>
        </Section>

        <Section title="Travel and arrival planning">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Departure city and country / closest international airport", "departureCity", "text"],
              ["Will anyone travel in a wheelchair?", "wheelchair", "text"],
              ["Checked Bags", "checkedBags", "number"],
              ["Personal Carry On", "carryOn", "number"],
              ["Boxes", "boxes", "number"],
              ["Traveling with pets?", "pets", "text"],
              ["Travel Cash ($), excluding reimbursement", "travelCash", "number"],
              ["Car seats or boosters needed?", "carSeats", "text"],
              ["Cell Phone Model + Carrier", "phoneModelCarrier", "text"],
              ["Is the SIM card unlocked?", "simUnlocked", "text"],
              ["Car Purchasing Plan Post Arrival", "carPurchasePlan", "text"]
            ].map(([label, field, type]) => (
              <label key={field} className="block">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <input
                  type={type}
                  value={travelPlanning[field] ?? ""}
                  onChange={event =>
                    setTravelPlanning(previous => ({
                      ...previous,
                      [field]: event.target.value
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </label>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-medium text-muted-foreground">Immediate driving plan after arrival</span>
            <textarea
              value={travelPlanning.drivingPlan || ""}
              onChange={event =>
                setTravelPlanning(previous => ({
                  ...previous,
                  drivingPlan: event.target.value
                }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-medium text-muted-foreground">Employment plans for spouse or adult children</span>
            <textarea
              value={travelPlanning.spouseEmployment || ""}
              onChange={event =>
                setTravelPlanning(previous => ({
                  ...previous,
                  spouseEmployment: event.target.value
                }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={saveTravelPlanning}
              disabled={savingTravelPlanning}
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingTravelPlanning ? "Saving..." : "Save travel planning"}
            </button>
            {travelPlanningMessage && (
              <span className="text-sm text-muted-foreground">
                {travelPlanningMessage}
              </span>
            )}
          </div>
        </Section>


      
        {visibleDependants.length > 0 && (
            <Section title="Dependants">
              {visibleDependants.map((dependant, index) => (
                <div
                  key={`${dependant.name || "dependant"}-${index}`}
                  className="border-b border-border py-3 last:border-0"
                >
                  <p className="text-sm font-semibold">
                    {dependant.name || "Dependant"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      dependant.age ? `Age ${dependant.age}` : null,
                      dependant.relationship || null
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
              <p className="mt-3 text-xs text-muted-foreground">
                Dependant passport documents are uploaded and managed through the Document Library.
              </p>
            </Section>
          )}

      </div>
    </div>
  );
}