
// @ts-nocheck
import { useAuth } from "@/lib/AuthContext";
import { User, Phone, Mail, MapPin, Briefcase, Plane, Building2, UserCheck, Calendar, Award, FileText, FileCheck, Clock, Shield, CheckCircle, AlertCircle, Building, Loader2, Users, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fictional-carnival-3inv.onrender.com';

// ─── Helper: Format date to "May 15 • 2026" ────────────────────────────────
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
    interviewDate: ""
  });
  const [recruitLoading, setRecruitLoading] = useState(true);
  const [extendedProfile, setExtendedProfile] = useState({
    dependants: [],
    travelSummary: {}
  });
  const [embassyEligibilityStatus, setEmbassyEligibilityStatus] = useState("");

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

  // Fetch Recruit data
  useEffect(() => {
    const fetchRecruitData = async () => {
      if (!user?.email) {
        setRecruitLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("icp_auth_token");
        if (!token) {
          setRecruitLoading(false);
          return;
        }

        console.log("[Profile] Fetching Recruit data...");
        const response = await fetch(`${API_BASE}/api/recruit/candidate`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("[Profile] Recruit response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("[Profile] Recruit data:", data);
          
          if (data.success && data.candidate) {
            setCurrentEmployer(data.candidate.Current_Employer || "");
            setScheduledForInterview(
              data.candidate.Scheduled_for_Interview === true ||
              data.candidate.Scheduled_for_Interview === "true"
            );
            
            // Set the new recruit fields
            setRecruitData({
              hiredLocation: data.candidate.Hired_Location || "",
              hiredDepartment: data.candidate.Hired_Department || "",
              interviewLocation: data.candidate.Interview_Location || "",
              interviewDate: data.candidate.Interview_Date || ""
            });
            
            console.log("[Profile] Recruit data extracted:", {
              hiredLocation: data.candidate.Hired_Location,
              hiredDepartment: data.candidate.Hired_Department,
              interviewLocation: data.candidate.Interview_Location,
              interviewDate: data.candidate.Interview_Date
            });
          }
        } else {
          console.error("[Profile] Recruit API error:", response.status);
        }
      } catch (error) {
        console.error("[Profile] Recruit error:", error);
      } finally {
        setRecruitLoading(false);
      }
    };

    fetchRecruitData();
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
          setExtendedProfile(
            data.profile || {
              dependants: [],
              travelSummary: {}
            }
          );
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
          <InfoRow label="Application Status" value={getValue('applicationStatus')} icon={UserCheck} />
          <InfoRow label="Order Number" value={getValue('orderNumber')} icon={FileText} />
          <InfoRow label="Current Employer" value={currentEmployer || "Not specified"} icon={Building} />
          <InfoRow label="Scheduled for Interview" value={scheduledForInterview ? "Yes" : "No"} icon={Calendar} />
        </Section>

        {/* Interview & Hiring Details */}
        <Section title="Interview & Hiring Details">
          <InfoRow 
            label="Interview Date" 
            value={formatDate(recruitData.interviewDate || getValue('interviewDate'))} 
            icon={CalendarDays} 
          />
          <InfoRow 
            label="Interview Location" 
            value={recruitData.interviewLocation || getValue('interviewLocation')} 
            icon={MapPin} 
          />
          <InfoRow 
            label="Hired Location" 
            value={recruitData.hiredLocation} 
            icon={MapPin} 
          />
          <InfoRow 
            label="Hired Department" 
            value={recruitData.hiredDepartment} 
            icon={Building} 
          />
          <InfoRow 
            label="Interview Notes" 
            value={getValue('notesInterview')} 
            icon={FileText} 
          />
        </Section>
{/* Relias Section */}
        <Section title="Relias">
          <InfoRow label="Relias Enrolled Date" value={getFormattedDate('reliasEnrolledDate')} icon={Calendar} />
          <InfoRow label="Relias Extension" value={getFormattedDate('reliasExtension')} icon={Calendar} />
          <InfoRow label="Initial ICP Assessment" value={getValue('initialICPAssessment')} icon={CheckCircle} />
        </Section>

        {/* Immigration Petition Record — retained from the existing profile */}
        <Section
          title="Immigration"
          className="lg:col-span-2"
        >
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

      
        {Array.isArray(extendedProfile?.dependants) &&
          extendedProfile.dependants.length > 0 && (
            <Section title="Dependants">
              {extendedProfile.dependants.map((dependant, index) => (
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

        {extendedProfile?.travelSummary &&
          Object.values(extendedProfile.travelSummary).some(
            value =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== ""
          ) && (
            <Section title="Travel Summary">
              <InfoRow label="Departure City / Airport" value={extendedProfile.travelSummary.departureCity} icon={Plane} />
              <InfoRow label="Checked Bags" value={extendedProfile.travelSummary.checkedBags} icon={Briefcase} />
              <InfoRow label="Carry On" value={extendedProfile.travelSummary.carryOn} icon={Briefcase} />
              <InfoRow label="Boxes" value={extendedProfile.travelSummary.boxes} icon={Briefcase} />
              <InfoRow label="Pets" value={extendedProfile.travelSummary.pets} icon={Users} />
              <InfoRow label="Travel Cash" value={extendedProfile.travelSummary.travelCash} icon={Briefcase} />
              <InfoRow label="Car Seats" value={extendedProfile.travelSummary.carSeats} icon={Users} />
              <InfoRow label="Wheelchair" value={extendedProfile.travelSummary.wheelchair} icon={UserCheck} />
              <InfoRow label="Phone + Carrier" value={extendedProfile.travelSummary.phoneModelCarrier} icon={Phone} />
              <InfoRow label="SIM Unlocked" value={extendedProfile.travelSummary.simUnlocked} icon={CheckCircle} />
            </Section>
          )}
      </div>
    </div>
  );
}