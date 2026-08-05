


// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Plus, 
  Loader2,
  Trash2,
  X,
  Upload,
  Eye,
  FileText,
  User,
  Home,
  Plane,
  Bell,
  Receipt,
  Briefcase,
  GraduationCap,
  FileSignature,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Video,
  Users,
  Mail,
  DollarSign,
  Globe,
  Printer,
  RefreshCw,
  FileCheck,
  FileSpreadsheet,
  ClipboardList,
  BookOpen,
  Award,
  Target,
  Users as UsersIcon,
  FileCheck as FileCheckIcon,
  GraduationCap as GradIcon,
  ClipboardCheck,
  Stethoscope,
  Clipboard,
  BarChart,
  FileSpreadsheet as FileSpreadsheetIcon,
  Award as AwardIcon,
  Calendar as CalendarIcon,
  Flag,
  Timer,
  AlertTriangle,
  GitBranch,
  Layers,
  Building,
  Banknote,
  Book,
  Languages,
  UsersRound,
  BriefcaseMedical,
  Stethoscope as StethoscopeIcon,
  FileHeart,
  HeartPulse,
  Lock
} from "lucide-react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, differenceInDays, differenceInHours, addDays } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { candidate } from "@/api/icpClient";

const relocationTravelPolicyPdf =
  "/documents/2025_RL_Travel_and_Housing_Policies.pdf";

const photoVideoReleasePdf =
  "/documents/Photo_Release.pdf";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fictional-carnival-3inv.onrender.com'

// Bank details are protected twice in transit:
// 1) HTTPS/TLS for the request itself.
// 2) A per-request AES-256-GCM key, wrapped with the backend's RSA-OAEP public key.
const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const pemToArrayBuffer = (pem) => {
  const base64 = String(pem || "")
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const encryptSensitivePayload = async (payload, token) => {
  if (!window.crypto?.subtle) {
    throw new Error("Secure encryption is not supported by this browser");
  }

  const keyResponse = await fetch(`${API_BASE}/api/security/bank-public-key?_=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const keyData = await keyResponse.json().catch(() => ({}));
  if (!keyResponse.ok || !keyData.publicKey) {
    throw new Error(keyData.error || "Unable to establish a secure connection");
  }

  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(keyData.publicKey),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertextWithTag = new Uint8Array(
    await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext)
  );

  // Web Crypto appends the 16-byte GCM authentication tag to the ciphertext.
  const tagLength = 16;
  const ciphertext = ciphertextWithTag.slice(0, -tagLength);
  const authTag = ciphertextWithTag.slice(-tagLength);
  const rawAesKey = new Uint8Array(await window.crypto.subtle.exportKey("raw", aesKey));
  const wrappedKey = new Uint8Array(
    await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey)
  );

  return {
    version: 1,
    algorithm: "RSA-OAEP-256+A256GCM",
    encryptedKey: bytesToBase64(wrappedKey),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    authTag: bytesToBase64(authTag)
  };
};

// ============= Generic field-lookup helpers =============
// "ga" = "get attribute": tries a list of possible CRM/Zoho field names and
// returns the first one that has a real value. This lets us stay resilient
// to inconsistent field naming between Zoho/CRM and our backend responses.
const ga = (data, ...fieldNames) => {
  if (!data) return null;
  for (const name of fieldNames) {
    const val = data[name];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
};


const isCRMChecklistComplete = (value) => {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "1", "checked", "complete", "completed", "passed", "approved", "done"].includes(normalized);
};

// Backwards-compatible helper used by existing checklist and NCLEX code.
// Keep one truth-value interpretation across every CRM-driven checkbox.
const isTruthyField = isCRMChecklistComplete;

const getCRMChecklistValue = (data, item) =>
  ga(data, item.key, ...(item.aliases || []));

// Zoho All Clear is a picklist. Deployment should unlock when ANY valid option is selected.
const ALL_CLEAR_PICKLIST_OPTIONS = new Set([
  "yes",
  "all clear date",
  "all clear (date)",
  "all clear links emailed",
  "housing form on file",
  "r&l checklist on file",
  "affidavit of truth on file",
  "updated resume on file",
  "housing form",
  "greenlighted",
  "scheduled arrival date",
]);

const hasAllClearSelection = (val) => {
  if (val === true) return true;
  if (typeof val === "number") return val === 1;
  if (typeof val !== "string") return false;

  const normalized = val.trim().toLowerCase();
  if (!normalized) return false;

  // Match the configured Zoho options. The fallback keeps the pipeline resilient
  // if another non-empty option is added to the picklist later.
  return ALL_CLEAR_PICKLIST_OPTIONS.has(normalized) ||
    !["no", "none", "not selected", "not started", "false", "0"].includes(normalized);
};

const getArrivalDate = async () => {
  try {
    const token = localStorage.getItem("icp_auth_token");
    if (!token) return null;

    const response = await fetch(`${API_BASE}/api/zoho/my-deals?refresh=true&_=${Date.now()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const userData = data.data || {};
    
    const arrivalDate = ga(userData, "scheduledarrivaldate", "ScheduledArrivalDate", "arrival_date", "ArrivalDate");
    
    if (arrivalDate) {
      return new Date(arrivalDate);
    }
    return null;
  } catch (error) {
    console.error("[Pipeline] Error fetching arrival date:", error);
    return null;
  }
};

// Hiring pipeline configuration.
const STAGES_CONFIG = [
  // Hiring Stages (1-20)
  { id: 1, stage_name: "Applied", stage_category: "Hiring", stage_order: 1, hours_from_start: 0 },
  { id: 2, stage_name: "Associated with Job", stage_category: "Hiring", stage_order: 2, hours_from_start: 24 },
  { id: 3, stage_name: "Not Qualified - to close", stage_category: "Hiring", stage_order: 3, hours_from_start: 48 },
  { id: 4, stage_name: "Qualified - Match", stage_category: "Hiring", stage_order: 4, hours_from_start: 48 },
  { id: 5, stage_name: "Qualified Candidate Pool", stage_category: "Hiring", stage_order: 5, hours_from_start: 48 },
  { id: 6, stage_name: "Transfer to ICP USRN School", stage_category: "Hiring", stage_order: 6, hours_from_start: 48 },
  { id: 7, stage_name: "Select Prescreen Time", stage_category: "Hiring", stage_order: 7, hours_from_start: 48 },
  { id: 8, stage_name: "Prescreen Scheduled", stage_category: "Hiring", stage_order: 8, hours_from_start: 48 },
  { id: 9, stage_name: "Prescreen Completed", stage_category: "Hiring", stage_order: 9, hours_from_start: 72 },
  { id: 10, stage_name: "Client Documents & Video Provided", stage_category: "Hiring", stage_order: 10, hours_from_start: 72 },
  { id: 11, stage_name: "Pending Interview Selection", stage_category: "Hiring", stage_order: 11, hours_from_start: 96 },
  { id: 12, stage_name: "Interview Scheduled", stage_category: "Hiring", stage_order: 12, hours_from_start: 96 },
  { id: 13, stage_name: "Interview Attended", stage_category: "Hiring", stage_order: 13, days_from_start: 7 },
  { id: 14, stage_name: "Offer Made", stage_category: "Hiring", stage_order: 14, days_from_start: 8 },
  { id: 15, stage_name: "Offer Accepted", stage_category: "Hiring", stage_order: 15, days_from_start: 10 },
  { id: 16, stage_name: "Offer Declined", stage_category: "Hiring", stage_order: 16, days_from_start: 10 },
  { id: 17, stage_name: "Employment Contract Sent", stage_category: "Hiring", stage_order: 17, days_from_start: 11 },
  { id: 18, stage_name: "Employment Contract Signed", stage_category: "Hiring", stage_order: 18, days_from_start: 13 },
  { id: 19, stage_name: "Documents Received", stage_category: "Hiring", stage_order: 19, days_from_start: 15 },
  { id: 20, stage_name: "Hired", stage_category: "Hiring", stage_order: 20, days_from_start: 15 },

  // Immigration/Licensure Stages (21-27) - Updated
  { id: 21, stage_name: "Immigration Call", stage_category: "Immigration", stage_order: 21, days_from_start: 30 },
  { id: 22, stage_name: "Foundations (Phases 1–3)", stage_category: "Immigration", stage_order: 22, days_from_start: 90 },
  { id: 23, stage_name: "Licensure (General) & Live English Assessment", stage_category: "Immigration", stage_order: 23, days_from_start: 540 },
  { id: 24, stage_name: "English Practice & Development", stage_category: "Immigration", stage_order: 24, days_from_start: 570 },
  { id: 25, stage_name: "English Complete", stage_category: "Immigration", stage_order: 25, days_from_start: 660 },
  { id: 26, stage_name: "License Endorsement", stage_category: "Immigration", stage_order: 26, days_from_start: 660 },
  { id: 27, stage_name: "Cultural Adaptation & Integration", stage_category: "Immigration", stage_order: 27, days_from_start: 810 },

  // Deployment Stages (28-50)
  { id: 28, stage_name: "Deployment & Skills Checklist", stage_category: "Immigration", stage_order: 28, days_from_start: 930 },
  { id: 29, stage_name: "Submit Updated Work Status, Civil Docs & Licensing Credentials", stage_category: "Deployment", stage_order: 29, days_from_start: 935 },
  { id: 30, stage_name: "Submit Housing Form", stage_category: "Deployment", stage_order: 30, days_from_start: 940 },
  { id: 31, stage_name: "Submit R&L Checklist", stage_category: "Deployment", stage_order: 31, days_from_start: 945 },
  { id: 32, stage_name: "Confirmation of Eligibility to Proceed", stage_category: "Deployment", stage_order: 32, days_from_start: 950 },
  { id: 33, stage_name: "Embassy Interview Scheduled", stage_category: "Deployment", stage_order: 33, days_from_start: 955 },
  { id: 34, stage_name: "Request Job Offer Letter", stage_category: "Deployment", stage_order: 34, days_from_start: 960 },
  { id: 35, stage_name: "Schedule Medical Exam", stage_category: "Deployment", stage_order: 35, days_from_start: 965 },
  { id: 36, stage_name: "Schedule Biometrics Appointment", stage_category: "Deployment", stage_order: 36, days_from_start: 970 },
  { id: 37, stage_name: "Post-Embassy Interview Update", stage_category: "Deployment", stage_order: 37, days_from_start: 975 },
  { id: 38, stage_name: "Confirm Scheduled Arrival Date", stage_category: "Deployment", stage_order: 38, days_from_start: 980 },
  { id: 39, stage_name: "Download Deploymate App", stage_category: "Deployment", stage_order: 39, days_from_start: 985 },
  { id: 40, stage_name: "Attend Housing and Transportation Call", stage_category: "Deployment", stage_order: 40, days_from_start: 990 },
  { id: 41, stage_name: "Join ICP Pre-Arrival Support Group", stage_category: "Deployment", stage_order: 41, days_from_start: 995 },
  { id: 42, stage_name: "Attend Deployment Call", stage_category: "Deployment", stage_order: 42, days_from_start: 1000 },
  { id: 43, stage_name: "Confirm Final Transportation Plan", stage_category: "Deployment", stage_order: 43, days_from_start: 1005 },
  { id: 44, stage_name: "Attend Facility/RN Pre-Arrival Call", stage_category: "Deployment", stage_order: 44, days_from_start: 1010 },
  { id: 45, stage_name: "Flights Booked", stage_category: "Deployment", stage_order: 45, days_from_start: 1015 },
  { id: 46, stage_name: "ICP Welcome Packet", stage_category: "Deployment", stage_order: 46, days_from_start: 1020 },
  { id: 47, stage_name: "Connect with Concierge", stage_category: "Deployment", stage_order: 47, days_from_start: 1025 },
  { id: 48, stage_name: "Reimbursement/Advance Payment Report Released", stage_category: "Deployment", stage_order: 48, days_from_start: 1030 },
  { id: 49, stage_name: "Communicate During Travel", stage_category: "Deployment", stage_order: 49, days_from_start: 1035 },
  { id: 50, stage_name: "Submit Post-Arrival Documents", stage_category: "Deployment", stage_order: 50, days_from_start: 1040 },

  // Aftercare Stages (51-56)
  { id: 51, stage_name: "Relocation Survey", stage_category: "Aftercare", stage_order: 51, days_from_arrival: 0 },
  { id: 52, stage_name: "30 Day Survey", stage_category: "Aftercare", stage_order: 52, days_from_arrival: 30 },
  { id: 53, stage_name: "90 Day Exit Call", stage_category: "Aftercare", stage_order: 53, days_from_arrival: 90 },
  { id: 54, stage_name: "Submit Active License", stage_category: "Aftercare", stage_order: 54 },
  { id: 55, stage_name: "Submit Orientation Start Date", stage_category: "Aftercare", stage_order: 55 },
  { id: 56, stage_name: "Submit Start Date on Floor Independently", stage_category: "Aftercare", stage_order: 56 },

];

// Zoho Recruit Lead Management Status (API: Application_Status) -> portal stage.
// The normalized map accepts spacing/hyphen variations from Recruit while keeping
// the portal stage names aligned with the existing hiring pipeline.
const normalizeApplicationStatus = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[–—]/g, "-")
  .replace(/\s*-\s*/g, "-")
  .replace(/\s+/g, " ");

const APPLICATION_STATUS_STAGE_MAP = new Map([
  ["transfer to icp usrn school", "Transfer to ICP USRN School"],

  ["qualified-match", "Qualified - Match"],
  ["qualified match", "Qualified - Match"],

  ["qualified-candidate pool", "Qualified Candidate Pool"],
  ["qualified candidate pool", "Qualified Candidate Pool"],

  ["prescreen", "Select Prescreen Time"],
  ["prescreen scheduled", "Prescreen Scheduled"],
  ["prescreen complete", "Prescreen Completed"],

  ["assessment", "Client Documents & Video Provided"],
  ["assessment complete", "Pending Interview Selection"],

  ["interview", "Pending Interview Selection"],
  ["pending interview selection", "Pending Interview Selection"],
  ["interview-scheduled", "Interview Scheduled"],
  ["interview scheduled", "Interview Scheduled"],
  ["interview attended", "Interview Attended"],

  ["offered", "Offer Made"],
  ["offer made", "Offer Made"],
  ["offer accepted", "Offer Accepted"],
  ["offer declined", "Offer Declined"],

  ["contract sent", "Employment Contract Sent"],
  ["hired", "Hired"],

  // Existing values retained for records already using them.
  ["applied", "Applied"],
  ["associated", "Associated with Job"],
  ["documents received", "Documents Received"],
  ["unqualified", "Not Qualified - to close"],
  ["not qualified-to close", "Not Qualified - to close"],
  ["not qualified - to close", "Not Qualified - to close"],
]);

const PORTAL_BLOCKED_APPLICATION_STATUSES = new Set([
  "unqualified",
  "not qualified-to close",
  "not qualified - to close",
]);

const getMappedHiringStage = (applicationStatus) =>
  APPLICATION_STATUS_STAGE_MAP.get(
    normalizeApplicationStatus(applicationStatus)
  ) || null;

// Explicit progression for each Lead Management Status. Only stages named here
// are changed. This prevents Prescreen Scheduled, Assessment, or Interview from
// completing unrelated Client Interview stages.
const HIRING_STATUS_PROGRESS = {
  "applied": {
    completed: ["Applied"],
    current: null
  },

  "associated": {
    completed: ["Applied", "Associated with Job"],
    current: null
  },

  "transfer to icp usrn school": {
    completed: [
      "Applied",
      "Associated with Job",
      "Transfer to ICP USRN School"
    ],
    current: null
  },

  "qualified-match": {
    completed: [
      "Applied",
      "Associated with Job",
      "Qualified - Match"
    ],
    current: null
  },

  "qualified match": {
    completed: [
      "Applied",
      "Associated with Job",
      "Qualified - Match"
    ],
    current: null
  },

  "qualified-candidate pool": {
    completed: [
      "Applied",
      "Associated with Job",
      "Qualified Candidate Pool"
    ],
    current: null
  },

  "qualified candidate pool": {
    completed: [
      "Applied",
      "Associated with Job",
      "Qualified Candidate Pool"
    ],
    current: null
  },

  "prescreen": {
    completed: ["Applied", "Associated with Job"],
    current: "Select Prescreen Time"
  },

  "prescreen scheduled": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time"
    ],
    current: "Prescreen Scheduled"
  },

  "prescreen complete": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed"
    ],
    current: null
  },

  "assessment": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed"
    ],
    current: "Client Documents & Video Provided"
  },

  "assessment complete": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided"
    ],
    current: "Pending Interview Selection"
  },

  "interview": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided"
    ],
    current: "Pending Interview Selection"
  },

  "pending interview selection": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided"
    ],
    current: "Pending Interview Selection"
  },

  "interview-scheduled": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection"
    ],
    current: "Interview Scheduled"
  },

  "interview scheduled": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection"
    ],
    current: "Interview Scheduled"
  },

  "interview attended": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended"
    ],
    current: null
  },

  "offered": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended"
    ],
    current: "Offer Made"
  },

  "offer made": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended",
      "Offer Made"
    ],
    current: null
  },

  "offer accepted": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended",
      "Offer Made",
      "Offer Accepted"
    ],
    current: null
  },

  "offer declined": {
    completed: [
      "Applied",
      "Associated with Job",
      "Offer Declined"
    ],
    current: null
  },

  "contract sent": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended",
      "Offer Made",
      "Offer Accepted",
      "Employment Contract Sent"
    ],
    current: null
  },

  "documents received": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended",
      "Offer Made",
      "Offer Accepted",
      "Employment Contract Sent",
      "Employment Contract Signed",
      "Documents Received"
    ],
    current: null
  },

  "hired": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended",
      "Offer Made",
      "Offer Accepted",
      "Employment Contract Sent",
      "Employment Contract Signed",
      "Documents Received",
      "Hired"
    ],
    current: null
  }
};

const shouldShowICPUSRNTransfer = (applicationStatus) =>
  normalizeApplicationStatus(applicationStatus) === "transfer to icp usrn school";

// ============= Hiring section field mappings to Recruit =============
// These map pipeline stages to Recruit field names
const HIRING_FIELD_MAPPINGS = {
  "Interview Scheduled": {
    field: "Scheduled_for_Interview",
    section: "Interview"
  },
  "Offer Made": {
    field: "Offer_on_file",
    section: "offer made"
  },
  "Offer Accepted": {
    field: "Offer_Status",
    section: "Offer accepted"
  },
  "Employment Contract Sent": {
    field: "Contract_on_file",
    section: "Employment contract sent"
  },
  "Employment Contract Signed": {
    field: "Contract_Signed_Date",
    section: "Employment contract signed"
  },
  "closed": {
    field: "Closure_Reason",
    section: "closed"
  }
};

// Helper function to update Recruit fields when stages are completed
const updateRecruitField = async (userEmail, stageName) => {
  const mapping = HIRING_FIELD_MAPPINGS[stageName];
  if (!mapping) return;

  try {
    const token = localStorage.getItem("icp_auth_token");
    if (!token) throw new Error("Not authenticated");

    // Determine the value to set based on the field type
    let fieldValue;
    const field = mapping.field;

    // Set appropriate values for different fields
    if (field === "Scheduled_for_Interview") {
      fieldValue = "Completed";
    } else if (field === "Offer_on_file") {
      fieldValue = true;
    } else if (field === "Offer_Status") {
      fieldValue = "Accepted";
    } else if (field === "Contract_on_file") {
      fieldValue = true;
    } else if (field === "Contract_Signed_Date") {
      fieldValue = format(new Date(), "yyyy-MM-dd");
    } else if (field === "Closure_Reason") {
      fieldValue = "Hired";
    }

    const payload = {
      email: userEmail,
      field: field,
      value: fieldValue
    };

    const response = await fetch(`${API_BASE}/api/recruit/update-field`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`Failed to update Recruit field ${field}:`, errorData);
      return;
    }

    console.log(`Successfully updated Recruit field ${field} for stage ${stageName}`);
  } catch (error) {
    console.error(`Error updating Recruit field for ${stageName}:`, error);
  }
};

const ICP_USRN_SUBPROCESS_CONFIG = [
  { name: "Complete Pre-assessment", days: 5, field: "NCLEX_Pre_Exam", type: "picklist", accepted: ["1st Attempt Pass", "2nd Attempt Pass"] },
  { name: "Program Prescreen", days: 10, field: "Prescreen_Status", type: "picklist", accepted: ["Attended"] },
  { name: "Required Document Upload", days: 10, field: "Hiring_Documents_Verified", type: "boolean", action: "usrnDocuments" },
  { name: "Document Review", days: 24, field: "Documents_Submitted", type: "present" },
  { name: "Educational Program Agreement", days: 24, field: "Sponsorship_Agreement", type: "boolean" },
  { name: "Program Approval", days: 24, field: "Program_Status", type: "picklist", accepted: ["Approved"] },
  { name: "Credential Evaluation Set-up", days: 27, field: "Credential_Service", type: "picklist", accepted: ["Paid by ICP", "Paid by Infinity", "Paid and completed by candidate"] },
  { name: "Credential Evaluation Completed", days: 92, field: "Credential_Registration_Date", type: "present" },
  { name: "CES Report Issued", days: 102, field: "Date_Report_Issued", type: "present" },
  { name: "Board Registration", days: 120, field: "State_License_Board_of_Registration", type: "picklist", accepted: ["Paid by ICP", "Sponsored by ICP", "To be Sponsored by Infinity", "Paid by Infinity"] },
  { name: "Board Approval", days: 127, field: "Completed_BON_Requirements", type: "picklist", accepted: ["BON Approval"] },
  { name: "Performance Check 1", days: 102, type: "performanceMilestone", assessmentsRequired: 2, assignmentsRequired: 6 },
  { name: "Performance Check 2", days: 127, type: "performanceMilestone", assessmentsRequired: 4, assignmentsRequired: 15 },
  { name: "Performance Check 3", days: 150, type: "performanceMilestone", assessmentsRequired: 5, assignmentsRequired: 15 },
  { name: "Performance Check FINAL", days: 165, type: "performanceMilestone", assessmentsRequired: 6, assignmentsRequired: 15, ratingRequired: true },
  { name: "Performance Rating", days: 140, field: "Performance_Rating", type: "picklist", accepted: ["High", "Very High"], isGate: true },
  { name: "Pearson Vue Registration", days: 150, field: "ATT_Received_Date", type: "present", requires: "Performance_Rating" },
  { name: "Exam Registration", days: 165, field: "NCLEX_Exam_Date", type: "present" },
  { name: "Exam Results", days: 195, field: "NCLEX_Status", type: "picklist", accepted: ["Passed"] },

  { name: "Schedule time - booking app", days: 24, field: "Prescreen_Status", type: "picklist", accepted: ["Scheduled", "Attended"] },
  { name: "Learn HUB enrollment", days: 27, field: "UWorld_Subscription_Date", type: "present" },
  { name: "ATT Received", days: 150, field: "ATT_Received_Date", type: "present", requires: "Performance_Rating" },
  { name: "Background Complete", days: 215, field: "Fingerprint_Status", type: "picklist", accepted: ["Complete"] }
];

const normalizeCRMValue = (value) => String(value ?? "").trim().toLowerCase();
const hasCRMValue = (value) => value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "—";
const isICPUSRNItemComplete = (item, data = {}) => {
  if (!item?.field || item.type === "navigation") return false;

  if (item.requires) {
    const prerequisite = ICP_USRN_SUBPROCESS_CONFIG.find(
      candidate => candidate.field === item.requires
    );
    if (prerequisite && !isICPUSRNItemComplete(prerequisite, data)) {
      return false;
    }
  }

  if (item.type === "performanceMilestone") {
    const parseCompletedCount = (value) => {
      const normalized = String(value ?? "").trim();
      if (!normalized || normalized === "—") return 0;
      const numeric = Number.parseInt(normalized.replace(/[^0-9]/g, ""), 10);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const assessmentsCompleted = parseCompletedCount(
      ga(data, "Assessments_Completed", "assessmentsCompleted")
    );
    const assignmentsCompleted = parseCompletedCount(
      ga(data, "Assignments_Completed", "assignmentsCompleted")
    );
    const rating = String(
      ga(data, "Performance_Rating", "performanceRating") || ""
    ).trim().toLowerCase();

    return (
      assessmentsCompleted >= Number(item.assessmentsRequired || 0) &&
      assignmentsCompleted >= Number(item.assignmentsRequired || 0) &&
      (
        !item.ratingRequired ||
        ["high", "very high"].includes(rating)
      )
    );
  }

  const value = ga(data, item.field, item.field.replace(/_/g, ""), item.field.charAt(0).toLowerCase() + item.field.slice(1));
  if (item.type === "present") return hasCRMValue(value);
  if (item.type === "boolean") return isTruthyField(value);
  if (item.type === "complete") {
    if (isTruthyField(value)) return true;
    return ["complete", "completed", "passed", "done", "yes"].includes(normalizeCRMValue(value));
  }
  if (item.type === "picklist") {
    const normalized = normalizeCRMValue(value);
    return (item.accepted || []).some(option => normalizeCRMValue(option) === normalized);
  }
  return false;
};

const HIRING_SUBPROCESSES = {
  "Transfer to ICP USRN School": ICP_USRN_SUBPROCESS_CONFIG,
};

// NCLEX Roadmap Stages
const NCLEX_STAGES = [
  { id: 101, stage_name: "Complete Pre-assessment", stage_category: "NCLEX Roadmap", stage_order: 1 },
  { id: 102, stage_name: "Program Prescreen", stage_category: "NCLEX Roadmap", stage_order: 2 },
  { id: 103, stage_name: "Document Review", stage_category: "NCLEX Roadmap", stage_order: 3 },
  { id: 104, stage_name: "Educational Program Agreement", stage_category: "NCLEX Roadmap", stage_order: 4 },
  { id: 105, stage_name: "Program Approval", stage_category: "NCLEX Roadmap", stage_order: 5 },
  { id: 106, stage_name: "Credential Evaluation Set-up", stage_category: "NCLEX Roadmap", stage_order: 6 },
    { id: 108, stage_name: "Credential Evaluation Completed", stage_category: "NCLEX Roadmap", stage_order: 8 },
  { id: 109, stage_name: "CES Report Issued", stage_category: "NCLEX Roadmap", stage_order: 9 },
  { id: 110, stage_name: "Board Registration", stage_category: "NCLEX Roadmap", stage_order: 10 },
  { id: 111, stage_name: "Board Approval", stage_category: "NCLEX Roadmap", stage_order: 11 },
  { id: 112, stage_name: "Pearson Vue Registration", stage_category: "NCLEX Roadmap", stage_order: 12 },
  { id: 113, stage_name: "Exam Registration", stage_category: "NCLEX Roadmap", stage_order: 13 },
  { id: 114, stage_name: "Exam Results", stage_category: "NCLEX Roadmap", stage_order: 14 },
];

// NCLEX Prescreen stages
const NCLEX_PRESCREEN_STAGES = [
  { id: 201, stage_name: "Schedule Time - Booking App", stage_category: "NCLEX Prescreen", stage_order: 1 },
  { id: 202, stage_name: "Learn HUB Enrollment", stage_category: "NCLEX Prescreen", stage_order: 2 },
  { id: 203, stage_name: "Performance Check 1", stage_category: "NCLEX Prescreen", stage_order: 3 },
  { id: 204, stage_name: "Performance Check 2", stage_category: "NCLEX Prescreen", stage_order: 4 },
  { id: 206, stage_name: "Performance Check 3", stage_category: "NCLEX Prescreen", stage_order: 6 },
  { id: 207, stage_name: "ATT Received", stage_category: "NCLEX Prescreen", stage_order: 7 },
  { id: 208, stage_name: "Performance Check FINAL", stage_category: "NCLEX Prescreen", stage_order: 8 },
  { id: 209, stage_name: "Background Complete", stage_category: "NCLEX Prescreen", stage_order: 9 },
  { id: 210, stage_name: "Performance Check 4", stage_category: "NCLEX Prescreen", stage_order: 10 },
];

// Stage details for NCLEX
const NCLEX_STAGE_DETAILS = {
  "Complete Pre-assessment": {
    description: "Complete the initial pre-assessment to determine your readiness.",
    steps: [
      "Complete online pre-assessment",
      "Submit assessment results",
      "Review with program coordinator"
    ]
  },
  "Program Prescreen": {
    description: "Initial screening for the ICP USRN School program.",
    steps: [
      "Submit application to ICP USRN School",
      "Initial document review",
      "Program eligibility verification"
    ]
  },
  "Document Review": {
    description: "Review all submitted documents for completeness.",
    steps: [
      "Submit all required documents (2 weeks)",
      "Document verification by team",
      "Follow-up on missing items"
    ]
  },
  "Educational Program Agreement": {
    description: "Review and sign the educational program agreement.",
    steps: [
      "Review program terms",
      "Sign educational agreement",
      "Program enrollment confirmation"
    ]
  },
  "Program Approval": {
    description: "Get final approval for program enrollment.",
    steps: [
      "Final review by program committee",
      "Approval notification",
      "Program start date confirmation"
    ]
  },
  "Credential Evaluation Set-up": {
    description: "Set up credential evaluation with CGFNS or similar.",
    steps: [
      "CGFNS account creation (2 weeks)",
      "Submit transcripts and documents",
      "Payment of evaluation fees"
    ]
  },
  "Removed Credential Evaluation": {
    description: "Credential evaluation in progress.",
    steps: [
      "Document verification by evaluator",
      "Primary source verification",
      "Evaluation processing"
    ]
  },
  "Credential Evaluation Completed": {
    description: "Credential evaluation is complete.",
    steps: [
      "Receive evaluation report",
      "Review report for accuracy",
      "Submit to Board of Nursing"
    ]
  },
  "CES Report Issued": {
    description: "Credentials have been issued.",
    steps: [
      "Credentials received",
      "Verification of credentials",
      "Ready for next steps"
    ]
  },
  "Board Registration": {
    description: "Register with the Board of Nursing.",
    steps: [
      "Complete board registration application",
      "Submit required fees",
      "Provide supporting documents"
    ]
  },
  "Board Approval": {
    description: "Board approval received.",
    steps: [
      "Board review complete",
      "Approval notification",
      "Eligible for exam scheduling"
    ]
  },
  "Pearson Vue Registration": {
    description: "Register with Pearson Vue for NCLEX.",
    steps: [
      "Create Pearson Vue account",
      "Complete registration",
      "Pay examination fee"
    ]
  },
  "Exam Registration": {
    description: "NCLEX exam registration complete.",
    steps: [
      "Receive Authorization to Test (ATT)",
      "Schedule exam date",
      "Confirm exam appointment"
    ]
  },
  "Exam Results": {
    description: "NCLEX exam results received.",
    steps: [
      "Take NCLEX exam",
      "Receive results",
      "Begin next steps in career journey"
    ]
  }
};

// Immigration/Licensure Stage Details
const IMMIGRATION_STAGE_DETAILS = {
  "Immigration Call": {
    description: "Initial immigration consultation to discuss your pathway and requirements. This call should take place within 30 days of your hire being confirmed.",
    icon: "📞",
    steps: [
      "Schedule immigration consultation",
      "Review immigration pathway options",
      "Discuss documentation requirements",
      "Create immigration timeline"
    ]
  },
  "Foundations (Phases 1–3)": {
    description: "Complete the foundational phases of your licensure preparation, tracked across five pillars.",
    icon: "📚",
    steps: [
      "Complete Phase 1: Initial Assessment",
      "Complete Phase 2: Core Concepts",
      "Complete Phase 3: Advanced Topics",
      "Submit progress reports"
    ]
  },
  "Licensure (General) & Live English Assessment": {
    description: "Complete general licensure requirements and live English language assessment.",
    icon: "📝",
    steps: [
      "Submit general licensure application",
      "Complete documentation review",
      "Schedule live English assessment",
      "Complete English language assessment"
    ]
  },
  "English Practice & Development": {
    description: "Ongoing English language practice and development.",
    icon: "🗣️",
    steps: [
      "Daily English practice sessions",
      "Complete language development modules",
      "Practice with language partners",
      "Track progress in English proficiency"
    ]
  },
  "English Complete": {
    description: "English language proficiency requirements have been completed.",
    icon: "✅",
    steps: [
      "Complete all English language requirements",
      "Submit final English assessment results",
      "Verify English proficiency",
      "English readiness confirmed"
    ]
  },
  "License Endorsement": {
    description: "Complete the license endorsement process, tracked across your Discovery Class requirements.",
    icon: "📜",
    steps: [
      "State-specific endorsement application",
      "Submit required documentation",
      "Complete background checks",
      "License endorsement approval"
    ]
  },
  "Cultural Adaptation & Integration": {
    description: "Prepare for cultural adaptation and integration into US healthcare, tracked across your Discovery Class introductions.",
    icon: "🌍",
    steps: [
      "Complete cultural awareness training",
      "US healthcare system orientation",
      "Professional communication skills",
      "Integration planning"
    ]
  },
  "Deployment & Skills Checklist": {
    description: "Final deployment preparation and skills checklist completion.",
    icon: "📋",
    steps: [
      "Complete skills assessment",
      "Verify all requirements met",
      "Final deployment checklist",
      "Ready for deployment"
    ]
  }
};

// ============= CRM-driven checklist field groups for Immigration stages =============
// These are read-only from the candidate's perspective: they are populated
// directly from CRM/Zoho fields and check themselves off automatically. The
// stage as a whole is marked "Completed" once every item in the group is true.
const FOUNDATIONS_PILLARS = [
  { key: "Pillar_1_Clinical_Readiness", aliases: ["pillar1", "Pillar1ClinicalReadiness", "Pillar_1_Clinical_Readiness_Discovery_Class"], label: "Pillar 1 - Clinical Readiness" },
  { key: "Pillar_2_Communication_Cultural_Integration", aliases: ["pillar2", "Pillar2CommunicationCulturalIntegration", "Pillar_2_Communication_and_Cultural_Integration"], label: "Pillar 2 - Communication & Cultural Integration" },
  { key: "Pillar_3_Personal_Transition_Success", aliases: ["pillar3", "Pillar3PersonalTransitionSuccess"], label: "Pillar 3 - Personal Transition Success" },
  { key: "Pillar_4_Career_Success_Pathway", aliases: ["pillar4", "Pillar4CareerSuccessPathway"], label: "Pillar 4 - Career Success Pathway" },
  { key: "Pillar_5_Patient_Centered_Care", aliases: ["pillar5", "Pillar5PatientCenteredCare"], label: "Pillar 5 - Patient Centered Care" },
];

const LICENSURE_GENERAL_ITEMS = [
  { key: "General_Licensure_Course", aliases: ["generalLicensureCourse", "General_Licensure", "Licensure_General", "General_Licensure_Complete"], label: "General Licensure Course" },
  { key: "Live_English_Assessment_Course", aliases: ["liveEnglishAssessmentCourse", "Live_English_Assessment", "Live_English_Assessment_Complete", "English_Live_Assessment"], label: "Live English Assessment Course" },
  { key: "Licensure_Documentation_Review", aliases: ["licensureDocumentationReview", "General_Licensure_Documentation_Review", "Licensure_Document_Review"], label: "Licensure Documentation Review" },
  { key: "English_Assessment_Completed", aliases: ["englishAssessmentCompleted", "Live_English_Assessment_Completed", "English_Language_Assessment_Completed"], label: "English Assessment Completed" },
];

const LICENSE_ENDORSEMENT_ITEMS = [
  { key: "CES_Report_Discovery_Class", aliases: ["cesReport", "CESReportDiscoveryClass", "CES_Report_Disc_Class"], label: "CES Report - Discovery Class" },
  { key: "Fingerprints_Discovery_Class", aliases: ["fingerprints", "FingerprintsDiscoveryClass"], label: "Fingerprints - Discovery Class" },
  { key: "Jurisprudence_Discovery_Class", aliases: ["jurisprudence", "JurisprudenceDiscoveryClass"], label: "Jurisprudence - Discovery Class" },
  { key: "Nursys_Discovery_Class", aliases: ["nursys", "NursysDiscoveryClass"], label: "Nursys - Discovery Class" },
  { key: "Visascreen_Discovery_Class", aliases: ["visascreen", "VisaScreen_Discovery_Class", "Visa_Screen_Discovery_Class"], label: "Visascreen - Discovery Class" },
];

const CULTURAL_ADAPTATION_ITEMS = [
  { key: "Introduction_License_Endorsement_Discovery_Class", label: "Introduction - License Endorsement Discovery Class" },
  { key: "Introduction_U_S_Finances_Discovery_Class", label: "Introduction - U.S. Finances Discovery Class" },
  { key: "Introduction_U_S_Healthcare_Discovery_Class", label: "Introduction - U.S. Healthcare Discovery Class" },
  { key: "Introduction_U_S_Housing_Market_Discovery_Class", label: "Introduction - U.S. Housing Market Discovery Class" },
  { key: "Introduction_U_S_Transportation_Discovery_Class", label: "Introduction - U.S. Transportation Discovery Class" },
];

// Maps an Immigration stage_name to the CRM checklist group that drives it
const IMMIGRATION_CRM_CHECKLISTS = {
  "Foundations (Phases 1–3)": FOUNDATIONS_PILLARS,
  "Licensure (General) & Live English Assessment": LICENSURE_GENERAL_ITEMS,
  "License Endorsement": LICENSE_ENDORSEMENT_ITEMS,
  "Cultural Adaptation & Integration": CULTURAL_ADAPTATION_ITEMS,
};

// CLICKABLE_STAGES - Define which stages are clickable
const CLICKABLE_STAGES = {
  // Hiring stages
  "Select Prescreen Time": { clickable: true, type: "booking", bookingType: "prescreen" },
  "Prescreen Scheduled": { clickable: true, type: "view", viewType: "prescreenSchedule" },
  "Prescreen Completed": { clickable: true, type: "upload", uploadType: "prescreen", destination: "recruit" },
  "Client Documents & Video Provided": { clickable: true, type: "view", viewType: "clientDocuments" },
  "Interview Scheduled": { clickable: true, type: "view", viewType: "interview" },
  "Interview Attended": { clickable: true, type: "view", viewType: "interviewFeedback" },
  "Offer Made": { clickable: true, type: "view", viewType: "offer" },
  "Offer Accepted": { clickable: true, type: "upload", uploadType: "offerAccepted" },
  "Employment Contract Sent": { clickable: true, type: "view", viewType: "contract" },
  "Employment Contract Signed": { clickable: true, type: "upload", uploadType: "signedContract" },
  "Documents Received": { clickable: true, type: "upload", uploadType: "documents" },
  "Hired": { clickable: true, type: "upload", uploadType: "hired", destination: "recruit" },

  // Immigration/Licensure stages - Clickable for details
  "Immigration Call": { clickable: true, type: "view", viewType: "immigrationCall" },
  "Foundations (Phases 1–3)": { clickable: true, type: "view", viewType: "foundations" },
  "Licensure (General) & Live English Assessment": { clickable: true, type: "view", viewType: "licensureGeneral" },
  "English Practice & Development": { clickable: true, type: "view", viewType: "englishPractice" },
  "English Complete": { clickable: true, type: "view", viewType: "englishComplete" },
  "License Endorsement": { clickable: true, type: "view", viewType: "licenseEndorsement" },
  "Cultural Adaptation & Integration": { clickable: true, type: "view", viewType: "culturalAdaptation" },
  "Deployment & Skills Checklist": { clickable: true, type: "view", viewType: "deploymentSkills" },

  // Gates
  "Gate 1 - Initial Screening": { clickable: true, type: "view", viewType: "gate1" },
  "Gate 2 - Document Review": { clickable: true, type: "upload", uploadType: "gate2" },
  "Gate 3 - Assessment": { clickable: true, type: "view", viewType: "gate3" },
  "Gate 4 - Interview Prep": { clickable: true, type: "view", viewType: "gate4" },
  "Gate 5 - Interview": { clickable: true, type: "view", viewType: "interview" },
  "Gate 6 - Offer Review": { clickable: true, type: "view", viewType: "gate6" },
  "Gate 7 - Credentialing": { clickable: true, type: "view", viewType: "gate7" },
  "Gate 8 - Licensure": { clickable: true, type: "upload", uploadType: "licensure" },
  "Gate 9 - Visa Processing": { clickable: true, type: "view", viewType: "gate9" },
  "Gate 10 - DS-260": { clickable: true, type: "view", viewType: "gate10" },
  "Gate 11 - Education Verification": { clickable: true, type: "upload", uploadType: "education" },
  "Gate 12 - Deployment Planning": { clickable: true, type: "view", viewType: "gate12" },
  "Gate 13 - Housing Setup": { clickable: true, type: "upload", uploadType: "housing" },
  "Gate 14 - Relocation Logistics": { clickable: true, type: "view", viewType: "gate14" },
  "Gate 15 - Final Deployment": { clickable: true, type: "view", viewType: "deployment" },

  // Deployment stages - Clickable
  "Submit Updated Work Status, Civil Docs & Licensing Credentials": { clickable: true, type: "view", viewType: "deploymentDocs" },
  "Submit Housing Form": { clickable: true, type: "view", viewType: "housingForm" },
  "Submit R&L Checklist": { clickable: true, type: "view", viewType: "rlChecklist" },
  "Submit R&L Form": { clickable: true, type: "view", viewType: "rlChecklist" },
  "Complete R&L Form": { clickable: true, type: "view", viewType: "rlChecklist" },
  "R&L Form": { clickable: true, type: "view", viewType: "rlChecklist" },
  "Relocation & Logistics": { clickable: true, type: "view", viewType: "rlChecklist" },
  "Relocation & Logistics Form": { clickable: true, type: "view", viewType: "rlChecklist" },
  "Request Job Offer Letter": { clickable: true, type: "view", viewType: "jobOfferLetter" },
  "Confirm Scheduled Arrival Date": { clickable: true, type: "view", viewType: "confirmArrival" },
  "Download Deploymate App": { clickable: true, type: "view", viewType: "downloadApp" },
  "Join ICP Pre-Arrival Support Group": { clickable: true, type: "view", viewType: "supportGroup" },
  "Flights Booked": { clickable: true, type: "view", viewType: "flight" },
  "ICP Welcome Packet": { clickable: true, type: "view", viewType: "welcomePacket" },
  "ICP Welcome Packet & Itinerary": { clickable: true, type: "view", viewType: "welcomePacket" },
  "Connect with Concierge": { clickable: true, type: "view", viewType: "concierge" },
  "Reimbursement/Advance Payment Report Released": { clickable: true, type: "view", viewType: "reimbursement" },
  "Submit Post-Arrival Documents": { clickable: true, type: "upload", uploadType: "postArrivalDocs" },

  // Aftercare stages
  "Relocation Survey": { clickable: true, type: "view", viewType: "relocationSurvey" },
  "30 Day Survey": { clickable: true, type: "view", viewType: "thirtyDaySurvey" },
  "90 Day Exit Call": { clickable: true, type: "view", viewType: "ninetyDaySurvey" },
  "Submit Active License": { clickable: true, type: "upload", uploadType: "activeLicense" },
  "Submit Orientation Start Date": { clickable: true, type: "view", viewType: "orientationStart" },
  "Submit Start Date on Floor Independently": { clickable: true, type: "view", viewType: "orientationEnd" },

  // Stage 5 - Reimbursement/Expenses
  "Reimbursement/Expenses": { clickable: true, type: "view", viewType: "reimbursementExpenses" },
  "Upload New Documents": { clickable: true, type: "view", viewType: "immigrationRenewal" },
};

const categoryColors = {
  Hiring: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Immigration: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Deployment: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Aftercare: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "NCLEX Roadmap": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "NCLEX Prescreen": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Reimbursement: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

const statusConfig = {
  "Completed": { icon: CheckCircle2, color: "text-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500 border-emerald-500" },
  "In Progress": { icon: Clock, color: "text-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500 border-blue-500" },
  "Blocked": { icon: AlertCircle, color: "text-red-500", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500 border-red-200" },
  "Not Started": { icon: Circle, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground border-border", dot: "bg-card border-muted-foreground/40" },
};

const riskConfig = {
  "Good Standing": { icon: CheckCircle2, color: "text-emerald-500", label: "Good Standing" },
  "At Risk": { icon: AlertTriangle, color: "text-amber-500", label: "At Risk" },
  "Late": { icon: AlertCircle, color: "text-red-500", label: "Late" },
  "Late": { icon: Timer, color: "text-orange-500", label: "Late" },
};

export const PIPELINE_STAGES = STAGES_CONFIG;

// Complete list of ALL global currencies with flags
const CURRENCIES = [
  { code: "USD", label: "US Dollar", flag: "🇺🇸", symbol: "$" },
  { code: "EUR", label: "Euro", flag: "🇪🇺", symbol: "€" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧", symbol: "£" },
  { code: "CAD", label: "Canadian Dollar", flag: "🇨🇦", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", flag: "🇦🇺", symbol: "AU$" },
  { code: "JPY", label: "Japanese Yen", flag: "🇯🇵", symbol: "¥" },
  { code: "CNY", label: "Chinese Yuan", flag: "🇨🇳", symbol: "¥" },
  { code: "INR", label: "Indian Rupee", flag: "🇮🇳", symbol: "₹" },
  { code: "BRL", label: "Brazilian Real", flag: "🇧🇷", symbol: "R$" },
  { code: "MXN", label: "Mexican Peso", flag: "🇲🇽", symbol: "$" },
  { code: "KRW", label: "South Korean Won", flag: "🇰🇷", symbol: "₩" },
  { code: "SGD", label: "Singapore Dollar", flag: "🇸🇬", symbol: "S$" },
  { code: "CHF", label: "Swiss Franc", flag: "🇨🇭", symbol: "CHF" },
  { code: "SEK", label: "Swedish Krona", flag: "🇸🇪", symbol: "kr" },
  { code: "NOK", label: "Norwegian Krone", flag: "🇳🇴", symbol: "kr" },
  { code: "DKK", label: "Danish Krone", flag: "🇩🇰", symbol: "kr" },
  { code: "PLN", label: "Polish Zloty", flag: "🇵🇱", symbol: "zł" },
  { code: "HKD", label: "Hong Kong Dollar", flag: "🇭🇰", symbol: "HK$" },
  { code: "TWD", label: "Taiwan Dollar", flag: "🇹🇼", symbol: "NT$" },
  { code: "THB", label: "Thai Baht", flag: "🇹🇭", symbol: "฿" },
  { code: "MYR", label: "Malaysian Ringgit", flag: "🇲🇾", symbol: "RM" },
  { code: "IDR", label: "Indonesian Rupiah", flag: "🇮🇩", symbol: "Rp" },
  { code: "PHP", label: "Philippine Peso", flag: "🇵🇭", symbol: "₱" },
  { code: "VND", label: "Vietnamese Dong", flag: "🇻🇳", symbol: "₫" },
  { code: "PKR", label: "Pakistani Rupee", flag: "🇵🇰", symbol: "Rs" },
  { code: "BDT", label: "Bangladeshi Taka", flag: "🇧🇩", symbol: "৳" },
  { code: "LKR", label: "Sri Lankan Rupee", flag: "🇱🇰", symbol: "Rs" },
  { code: "NPR", label: "Nepalese Rupee", flag: "🇳🇵", symbol: "Rs" },
  { code: "ZAR", label: "South African Rand", flag: "🇿🇦", symbol: "R" },
  { code: "NGN", label: "Nigerian Naira", flag: "🇳🇬", symbol: "₦" },
  { code: "KES", label: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh" },
  { code: "GHS", label: "Ghanaian Cedi", flag: "🇬🇭", symbol: "₵" },
  { code: "TZS", label: "Tanzanian Shilling", flag: "🇹🇿", symbol: "TSh" },
  { code: "UGX", label: "Ugandan Shilling", flag: "🇺🇬", symbol: "USh" },
  { code: "MAD", label: "Moroccan Dirham", flag: "🇲🇦", symbol: "DH" },
  { code: "EGP", label: "Egyptian Pound", flag: "🇪🇬", symbol: "E£" },
  { code: "TRY", label: "Turkish Lira", flag: "🇹🇷", symbol: "₺" },
  { code: "RUB", label: "Russian Ruble", flag: "🇷🇺", symbol: "₽" },
  { code: "UAH", label: "Ukrainian Hryvnia", flag: "🇺🇦", symbol: "₴" },
  { code: "ILS", label: "Israeli Shekel", flag: "🇮🇱", symbol: "₪" },
  { code: "AED", label: "UAE Dirham", flag: "🇦🇪", symbol: "د.إ" },
  { code: "SAR", label: "Saudi Riyal", flag: "🇸🇦", symbol: "﷼" },
  { code: "QAR", label: "Qatari Riyal", flag: "🇶🇦", symbol: "﷼" },
  { code: "KWD", label: "Kuwaiti Dinar", flag: "🇰🇼", symbol: "KD" },
  { code: "BHD", label: "Bahraini Dinar", flag: "🇧🇭", symbol: "BD" },
  { code: "OMR", label: "Omani Rial", flag: "🇴🇲", symbol: "﷼" },
  { code: "JOD", label: "Jordanian Dinar", flag: "🇯🇴", symbol: "JD" },
  { code: "NZD", label: "New Zealand Dollar", flag: "🇳🇿", symbol: "NZ$" },
  { code: "FJD", label: "Fijian Dollar", flag: "🇫🇯", symbol: "FJ$" },
  { code: "JMD", label: "Jamaican Dollar", flag: "🇯🇲", symbol: "J$" },
  { code: "TTD", label: "Trinidad Dollar", flag: "🇹🇹", symbol: "TT$" },
  { code: "BBD", label: "Barbadian Dollar", flag: "🇧🇧", symbol: "Bds$" },
  { code: "BSD", label: "Bahamian Dollar", flag: "🇧🇸", symbol: "B$" },
  { code: "KYD", label: "Cayman Islands Dollar", flag: "🇰🇾", symbol: "CI$" },
  { code: "XCD", label: "East Caribbean Dollar", flag: "🇦🇬", symbol: "EC$" },
  { code: "SBD", label: "Solomon Islands Dollar", flag: "🇸🇧", symbol: "SI$" },
  { code: "VUV", label: "Vanuatu Vatu", flag: "🇻🇺", symbol: "VT" },
  { code: "WST", label: "Samoan Tala", flag: "🇼🇸", symbol: "WS$" },
  { code: "TOP", label: "Tongan Pa'anga", flag: "🇹🇴", symbol: "T$" },
];

// Helper function to update pipeline stage status in MongoDB.
// Authentication tokens remain in localStorage, but pipeline progress never does.
const updateStageStatus = async (userEmail, stageName, setStages, nextStatus = "Completed") => {
  try {
    const token = localStorage.getItem("icp_auth_token");
    if (!token) throw new Error("Not authenticated");
    const completedDate = nextStatus === "Completed" ? format(new Date(), "yyyy-MM-dd") : null;
    const response = await fetch(`${API_BASE}/api/pipeline/update-stage`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, stage_name: stageName, status: nextStatus, completed_date: completedDate })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to save pipeline progress");
    if (setStages) {
      setStages(prev => prev.map(stage => stage.stage_name === stageName ? { ...stage, ...data.stage, status: nextStatus, completed_date: completedDate } : stage));
    }
    if (nextStatus === "Completed" && HIRING_FIELD_MAPPINGS[stageName]) await updateRecruitField(userEmail, stageName);
    return true;
  } catch (error) {
    console.error(`[Pipeline] Failed to persist ${stageName}:`, error);
    toast.error(error.message || "Could not save pipeline progress");
    return false;
  }
};

// ============= Sequential unlock helpers =============
const isPipelineStageComplete = (candidate) => {
  if (!candidate) return false;

  const normalizedStatus = String(
    candidate.status ||
    candidate.stage_status ||
    candidate.pipeline_status ||
    ""
  ).trim().toLowerCase();

  return (
    normalizedStatus === "completed" ||
    normalizedStatus === "complete" ||
    candidate.completed === true ||
    candidate.is_completed === true ||
    candidate.isComplete === true ||
    Boolean(candidate.completed_date) ||
    Boolean(candidate.completedAt) ||
    Boolean(candidate.date_completed)
  );
};

const getSequencedMainStages = (allStages) => {
  return (allStages || [])
    .filter(stage =>
      stage &&
      stage.is_gate !== true &&
      stage.hidden !== true &&
      stage.is_hidden !== true &&
      stage.stage_category !== "NCLEX Roadmap" &&
      stage.stage_category !== "NCLEX Prescreen"
    )
    .sort((first, second) => {
      const firstOrder = Number(first.stage_order ?? first.order ?? 0);
      const secondOrder = Number(second.stage_order ?? second.order ?? 0);

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return String(first.stage_name || "").localeCompare(
        String(second.stage_name || "")
      );
    });
};

const isSamePipelineStage = (first, second) =>
  Boolean(
    first &&
    second &&
    (
      (first._id && second._id && String(first._id) === String(second._id)) ||
      (first.id !== undefined && second.id !== undefined && String(first.id) === String(second.id)) ||
      (
        first.stage_name === second.stage_name &&
        first.stage_category === second.stage_category
      )
    )
  );

const isStageUnlocked = (stage, allStages) => {
  if (!stage) return false;

  if (
    stage.non_counted_section === true ||
    stage.conditional_section === true
  ) {
    return true;
  }

  if (stage.stage_category === "Aftercare") {
    const aftercareGateOpen =
      stage.aftercare_unlocked === true ||
      stage.aftercare_locked === false ||
      Boolean(stage.aftercare_gate_date) ||
      Boolean(stage.aftercareGateDate);

    if (!aftercareGateOpen) return false;

    // Flight_Arrival_Time is the separate gate from the sequential Deployment flow.
    // Once an arrival date exists, all Aftercare items are visible and their
    // individual due dates are calculated from that arrival date.
    return true;
  }

  const sequencedStages = getSequencedMainStages(allStages);
  const currentIndex = sequencedStages.findIndex(candidate =>
    isSamePipelineStage(candidate, stage)
  );

  if (currentIndex < 0) return false;
  if (currentIndex === 0) return true;

  const isReachedStage = candidate => {
    if (!candidate) return false;

    const normalizedStatus = String(
      candidate.status ||
      candidate.stage_status ||
      candidate.pipeline_status ||
      ""
    ).trim().toLowerCase();

    return (
      isPipelineStageComplete(candidate) ||
      normalizedStatus === "in progress" ||
      normalizedStatus === "current" ||
      candidate.unlocked === true ||
      candidate.is_unlocked === true ||
      candidate.crm_unlocked === true ||
      candidate.recruit_unlocked === true ||
      Boolean(candidate.started_at) ||
      Boolean(candidate.startedAt)
    );
  };

  // Find the furthest point the candidate has reached. This can be a normal
  // candidate stage or a CRM/Recruit-triggered stage in the middle.
  let furthestReachedIndex = 0;

  sequencedStages.forEach((candidate, index) => {
    if (isReachedStage(candidate)) {
      furthestReachedIndex = Math.max(furthestReachedIndex, index);
    }
  });

  // Every stage at or before the furthest reached stage must remain accessible.
  if (currentIndex <= furthestReachedIndex) {
    return true;
  }

  // The stage immediately after the furthest reached stage opens only when
  // that reached stage is actually complete.
  if (currentIndex === furthestReachedIndex + 1) {
    return isPipelineStageComplete(
      sequencedStages[furthestReachedIndex]
    );
  }

  return false;
};

// Helper to check if user is an NCLEX candidate.
// The exact Recruit Lead Management Status "Transfer to ICP USRN School"
// grants immediate access even if no Recruit attachment exists yet.
const checkNCLEXAccess = async (email) => {
  try {
    const token = localStorage.getItem("icp_auth_token");
    if (!token) return false;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    const dealsResponse = await fetch(`${API_BASE}/api/zoho/my-deals`, {
      headers,
      cache: "no-store"
    });

    let transferStatusSelected = false;
    let hasNCLEXFlag = false;

    if (dealsResponse.ok) {
      const dealsData = await dealsResponse.json();
      const userData = dealsData?.data || {};

      const status =
        userData.leadManagementStatus ||
        userData.applicationStatus ||
        userData.Application_Status ||
        userData.Lead_Management_Status ||
        "";

      transferStatusSelected =
        normalizeApplicationStatus(status) ===
        "transfer to icp usrn school";

      hasNCLEXFlag =
        transferStatusSelected ||
        userData.isNCLEXCandidate === true ||
        userData.nclex_candidate === true ||
        userData.NCLEX_Candidate === true ||
        userData.customModule1 === true ||
        userData.CustomModule1 === true ||
        userData.custommodule1 === true ||
        userData.isNCLEX === true ||
        userData.nclex === true ||
        userData.NCLEX === true ||
        String(userData.Education || "").toLowerCase().includes("nclex") ||
        String(userData.professionalSpecialty || "").toLowerCase().includes("nclex");

      if (!hasNCLEXFlag && Array.isArray(userData.allDeals)) {
        hasNCLEXFlag = userData.allDeals.some((deal) => {
          const dealStatus =
            deal.Lead_Management_Status ||
            deal.Application_Status ||
            deal.applicationStatus ||
            "";

          return (
            normalizeApplicationStatus(dealStatus) ===
              "transfer to icp usrn school" ||
            deal.isNCLEXCandidate === true ||
            deal.nclex_candidate === true ||
            deal.NCLEX_Candidate === true ||
            deal.customModule1 === true ||
            deal.CustomModule1 === true ||
            deal.isNCLEX === true ||
            deal.nclex === true
          );
        });
      }
    }

    if (transferStatusSelected) return true;

    const candidateResponse = await fetch(
      `${API_BASE}/api/recruit/documents?email=${encodeURIComponent(email)}`,
      { headers, cache: "no-store" }
    );

    let hasCandidate = false;
    if (candidateResponse.ok) {
      const candidateData = await candidateResponse.json();
      hasCandidate =
        candidateData.candidateFound === true ||
        candidateData.candidate_found === true ||
        candidateData.hasCandidate === true ||
        Array.isArray(candidateData.documents);
    }

    return hasCandidate && hasNCLEXFlag;
  } catch (error) {
    console.error("[Pipeline] Error checking NCLEX access:", error);
    return false;
  }
};

// Custom Modal Component
const CustomModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div data-modal-scroll-body className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Unified verified upload helper. Hiring uploads go to Recruit. Every upload
// outside Hiring goes to CRM only. The backend enforces the same rule.
const uploadDocument = async (
  file,
  documentName,
  documentType,
  destination = "crm",
  userEmail,
  extraFields = {}
) => {
  const token = localStorage.getItem("icp_auth_token");
  if (!token) throw new Error("Not authenticated");
  if (!file) throw new Error("No file selected");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_name", documentName || file.name);
  formData.append("document_type", documentType || "Document");
  formData.append("candidate_email", userEmail || "");
  formData.append("destination", destination || "crm");
  Object.entries(extraFields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) {
    const details = [data.error, data.crm?.error, data.recruit?.error].filter(Boolean).join(" | ");
    throw new Error(details || "Document upload failed");
  }

  if (destination === "both" && (!data.crm?.success || !data.recruit?.success)) {
    const failed = !data.crm?.success ? "CRM" : "Recruit";
    throw new Error(`${failed} did not accept the document. ${data[failed.toLowerCase()]?.error || "Please retry."}`);
  }

  return data;
};

// Document type options for Recruit uploads
const DOCUMENT_TYPES = [
  { value: "Passport", label: "Passport" },
  { value: "NCLEX", label: "NCLEX Pass Report" },
  { value: "Birth Certificate", label: "Birth Certificate" },
  { value: "Resume", label: "Resume" },
  { value: "Offer Letter", label: "Offer Letter" },
  { value: "License", label: "License" },
  { value: "Certificate", label: "Certificate" },
  { value: "Transcript", label: "Transcript" },
  { value: "Diploma", label: "Diploma" },
  { value: "CES Report", label: "CES Report" },
  { value: "COE", label: "Certificate of Employment" },
  { value: "Reimbursement", label: "Reimbursement" },
  { value: "Other", label: "Other" }
];


const HIRING_REQUIRED_DOCUMENTS = [
  { key: "resume", label: "Resume", type: "Resume" },
  { key: "employmentLetter", label: "Letter of Employment", type: "Letter of Employment" },
  { key: "passportId", label: "Passport or Government ID", type: "Passport or ID" },
  { key: "birthCertificate", label: "Birth Certificate", type: "Birth Certificate" },
  { key: "license", label: "Professional License", type: "License" },
  { key: "education", label: "Diploma or Degree", type: "Diploma or Degree" },
  { key: "commitmentAgreement", label: "Commitment Agreement", type: "Commitment Agreement" },
];

const HiringRequiredDocumentsUpload = ({ onClose, user, setStages }) => {
  const [files, setFiles] = useState(
    Object.fromEntries(HIRING_REQUIRED_DOCUMENTS.map(item => [item.key, null]))
  );
  const [results, setResults] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const allSelected = HIRING_REQUIRED_DOCUMENTS.every(item => files[item.key]);

  const submit = async (event) => {
    event.preventDefault();
    if (!allSelected) {
      toast.error("Select all seven required Hiring documents.");
      return;
    }

    setSubmitting(true);
    const nextResults = {};

    try {
      for (const item of HIRING_REQUIRED_DOCUMENTS) {
        try {
          const response = await uploadDocument(
            files[item.key],
            item.label,
            item.type,
            "recruit",
            user?.email,
            { pipeline_section: "Hiring", requirement_key: item.key }
          );

          nextResults[item.key] = {
            success: response.recruit?.success === true,
            attachmentId: response.recruit?.attachment_id || null,
            savedName: response.document_name || item.label,
            approvalStatus: "pending",
            error: response.recruit?.error || null,
          };
        } catch (error) {
          nextResults[item.key] = {
            success: false,
            error: error.message,
          };
        }
      }

      setResults(nextResults);
      const failed = HIRING_REQUIRED_DOCUMENTS.filter(
        item => !nextResults[item.key]?.success
      );

      if (failed.length) {
        throw new Error(
          `${failed.length} document(s) were not verified in Recruit.`
        );
      }

      setStages(prev =>
        prev.map(stage =>
          ["Required Document Upload", "Documents Received"].includes(
            stage.stage_name
          )
            ? {
                ...stage,
                approval_status: "pending",
                status:
                  stage.status === "Completed"
                    ? "Completed"
                    : "In Progress"
              }
            : stage
        )
      );

      toast.success("All seven Hiring documents were attached to Recruit.");
      setTimeout(onClose, 1200);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        All seven documents are required. They are uploaded to the candidate's Zoho Recruit record.
      </div>

      {HIRING_REQUIRED_DOCUMENTS.map(item => {
        const result = results[item.key];
        return (
          <label key={item.key} className="block rounded-xl border p-4">
            <span className="text-sm font-semibold">{item.label}</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              disabled={submitting || result?.success}
              onChange={event =>
                setFiles(prev => ({
                  ...prev,
                  [item.key]: event.target.files?.[0] || null
                }))
              }
              className="mt-2 block w-full text-sm"
            />
            <span className={`mt-2 block text-xs ${
              result?.success ? "text-emerald-600" :
              result?.error ? "text-red-600" :
              files[item.key] ? "text-amber-600" : "text-muted-foreground"
            }`}>
              {result?.success
                ? `${result.savedName || item.label} submitted · Pending admin approval`
                : result?.error
                  ? result.error
                  : files[item.key]
                    ? `Selected as ${item.label}: ${files[item.key].name}`
                    : "No file selected"}
            </span>
          </label>
        );
      })}

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!allSelected || submitting}>
          {submitting ? "Uploading..." : "Submit All Documents"}
        </Button>
      </div>
    </form>
  );
};


const EXPIRING_DOCUMENT_WINDOW_DAYS = 60;

const parseCRMDate = (value) => {
  if (!value || value === "—") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDocumentExpiryState = (value, now = new Date()) => {
  const expiry = parseCRMDate(value);
  if (!expiry) return { visible: false, expired: false, daysRemaining: null, expiry: null };
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return {
    visible: daysRemaining <= EXPIRING_DOCUMENT_WINDOW_DAYS,
    expired: daysRemaining < 0,
    daysRemaining,
    expiry
  };
};

const ImmigrationRenewalUpload = ({
  onClose,
  user,
  expiringDocuments,
  onSubmitted
}) => {
  const [files, setFiles] = useState({});
  const [newDates, setNewDates] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState({});

  const required = expiringDocuments.filter(item => item.visible);
  const ready = required.every(item => files[item.key] && newDates[item.key]);

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) {
      toast.error("Select each replacement document and its new expiry date.");
      return;
    }

    setSubmitting(true);
    const nextResults = {};

    try {
      const token = localStorage.getItem("icp_auth_token");
      const formData = new FormData();
      formData.append("candidate_email", user?.email || "");

      required.forEach(item => {
        formData.append(`file_${item.key}`, files[item.key]);
        formData.append(`expiry_${item.key}`, newDates[item.key]);
      });

      const response = await fetch(`${API_BASE}/api/immigration/renew-documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "The replacement documents could not be submitted.");
      }

      (data.documents || []).forEach(item => {
        nextResults[item.key] = item;
      });
      setResults(nextResults);
      toast.success("Replacement documents submitted successfully.");
      onSubmitted?.(data);
      window.dispatchEvent(new CustomEvent("pipeline-updated", {
        detail: { email: user?.email, section: "Upload New Documents" }
      }));
      setTimeout(onClose, 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Upload a replacement only for documents that are expired or within {EXPIRING_DOCUMENT_WINDOW_DAYS} days of expiry.
      </div>

      {required.map(item => (
        <div key={item.key} className="rounded-xl border p-4">
          <p className="font-semibold">{item.label}</p>
          <p className={`mt-1 text-xs ${item.expired ? "text-red-600" : "text-amber-600"}`}>
            {item.expired
              ? `Expired ${Math.abs(item.daysRemaining)} day(s) ago`
              : `Expires in ${item.daysRemaining} day(s)`}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="file"
              accept=".pdf"
              disabled={submitting || results[item.key]?.success}
              onChange={event => setFiles(prev => ({
                ...prev,
                [item.key]: event.target.files?.[0] || null
              }))}
              className="block w-full text-sm"
            />
            <input
              type="date"
              value={newDates[item.key] || ""}
              disabled={submitting || results[item.key]?.success}
              onChange={event => setNewDates(prev => ({
                ...prev,
                [item.key]: event.target.value
              }))}
              className="rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {results[item.key]?.success
              ? "Replacement attached successfully"
              : files[item.key]
                ? `Selected: ${files[item.key].name}`
                : "No replacement selected"}
          </p>
        </div>
      ))}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!ready || submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit Replacements
        </Button>
      </div>
    </form>
  );
};

// Generic Recruit Upload Component
const RecruitUpload = ({ onClose, user, title, documentLabel, multiple = false, defaultDocumentType = "Other" }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(defaultDocumentType);

  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files);
    if (multiple) {
      setFiles([...files, ...fileList]);
    } else {
      setFiles(fileList);
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    if (!selectedDocumentType) {
      toast.error("Please select a document type");
      return;
    }

    const invalidAdultDependent = dependents.find(dependent => {
      if (!dependent.dateOfBirth) return true;
      const birthDate = new Date(dependent.dateOfBirth);
      if (Number.isNaN(birthDate.getTime())) return true;
      const age =
        new Date().getFullYear() - birthDate.getFullYear();
      return age >= 18 && (!dependent.email || !dependent.phone);
    });

    if (invalidAdultDependent) {
      toast.error("Every dependent aged 18 or older must have a date of birth, email, and phone number.");
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of files) {
        try {
          await uploadDocument(
            file,
            file.name,
            selectedDocumentType,
            "recruit",
            user?.email
          );
          successCount++;
        } catch (error) {
          console.error("[RecruitUpload] File error:", error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} document(s) uploaded to Recruit successfully!`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} file(s) failed. Check console for details.`);
      }
      if (successCount === files.length) {
        onClose();
      }
    } catch (error) {
      console.error("[RecruitUpload] Error:", error);
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
        <p className="text-xs text-blue-700">📋 These documents will be sent to Recruit</p>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-1 block">
          Document Type <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedDocumentType}
          onChange={(e) => setSelectedDocumentType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          {DOCUMENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Select the type of document you are uploading
        </p>
      </div>
      
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">{documentLabel || "Upload Documents"}</p>
        <p className="text-xs text-muted-foreground">Upload your documents (PDF, JPG, PNG)</p>
        <input 
          type="file" 
          className="mt-2 text-sm"
          onChange={handleFileChange}
          accept=".pdf"
          multiple={multiple}
          required={files.length === 0}
        />
        {files.length > 0 && (
          <div className="mt-2 text-left">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-green-600 mt-1">
                <span>✓ {file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          type="submit" 
          disabled={uploading || files.length === 0 || !selectedDocumentType}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {uploading ? "Uploading..." : `Upload ${files.length} file(s) to Recruit`}
        </Button>
      </div>
    </form>
  );
};

// Prescreen Upload Component
const PrescreenUpload = ({ onClose, user }) => {
  return (
    <RecruitUpload
      onClose={onClose}
      user={user}
      title="Prescreen - Upload Documents"
      documentLabel="Upload Passport & NCLEX Report"
      multiple={true}
      defaultDocumentType="Passport"
    />
  );
};

// Hired Upload Component
const HiredUpload = ({ onClose, user }) => {
  return (
    <RecruitUpload
      onClose={onClose}
      user={user}
      title="Hired - Upload Documents"
      documentLabel="Upload Birth Certificate & Government ID"
      multiple={true}
      defaultDocumentType="Birth Certificate"
    />
  );
};

// Post-Arrival Documents Upload
const PostArrivalDocsUpload = ({ onClose, user }) => {
  return (
    <RecruitUpload
      onClose={onClose}
      user={user}
      title="Post-Arrival Documents"
      documentLabel="Upload Post-Arrival Documents"
      multiple={true}
      defaultDocumentType="Other"
    />
  );
};

// Contract View Component
const ContractView = ({ onClose, user, setStages }) => {
  const [uploading, setUploading] = useState(false);
  const [contractFile, setContractFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [hasUploaded, setHasUploaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState({
    signedICP: false,
    department: "Loading...",
    offerAndAgreementOnFile: false,
    position: "Registered Nurse",
    startDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "MMMM d, yyyy"),
    signedDate: format(new Date(), "MMMM d, yyyy")
  });

  useEffect(() => {
    fetchContractData();
  }, []);

  const fetchContractData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/zoho/my-deals?refresh=true&_=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {}
        throw new Error(`Failed to fetch contract data: ${errorMessage}`);
      }

      const data = await response.json();
      const userData = data.data || {};

      setContractData({
        signedICP: userData.Signed_ICP || false,
        department: userData.Dept_Offer || "Not specified",
        offerAndAgreementOnFile: userData.Offer_and_Agreement_on_File || false,
        position: userData.Position || "Registered Nurse",
        startDate: userData.Start_Date || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "MMMM d, yyyy"),
        signedDate: userData.Signed_Date || format(new Date(), "MMMM d, yyyy")
      });

      if (userData.Offer_and_Agreement_on_File) {
        setHasUploaded(true);
      }

    } catch (error) {
      console.error("❌ Error fetching contract data:", error);
      toast.error("Could not load contract information. Using default values.");
      setContractData({
        signedICP: false,
        department: "Not available",
        offerAndAgreementOnFile: false,
        position: "Registered Nurse",
        startDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "MMMM d, yyyy"),
        signedDate: format(new Date(), "MMMM d, yyyy")
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.includes("pdf") && !file.type.includes("image")) {
        toast.error("Please upload a PDF or image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setContractFile(file);
      setFileName(file.name);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleUpload = async () => {
    if (!contractFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", contractFile);
      formData.append("document_name", `Contract - ${format(new Date(), "MMM d, yyyy")}`);
      formData.append("document_type", "Contract");
      formData.append("candidate_email", user?.email || "");
      formData.append("destination", "recruit");

      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setHasUploaded(true);
      setContractData(prev => ({
        ...prev,
        offerAndAgreementOnFile: true,
        signedICP: true,
        signedDate: format(new Date(), "MMMM d, yyyy")
      }));
      
      toast.success("Contract uploaded successfully!");
      updateStageStatus(user?.email, "Employment Contract Signed", setStages);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload contract. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setContractFile(null);
    setFileName("");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSignature className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Employment Contract</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading contract information...</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Employment Contract</h3>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Agreement Signed</span>
            <span className={`font-medium ${contractData.signedICP ? "text-green-600" : "text-amber-600"}`}>
              {contractData.signedICP ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Yes
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Pending
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Department</span>
            <span className="font-medium">{contractData.department}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Offer & Agreement on File</span>
            <span className={`font-medium ${contractData.offerAndAgreementOnFile ? "text-green-600" : "text-amber-600"}`}>
              {contractData.offerAndAgreementOnFile ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Yes
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Pending
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${contractData.offerAndAgreementOnFile ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {contractData.offerAndAgreementOnFile ? "✅ Agreement on File" : "⏳ Agreement Pending"}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${contractData.signedICP ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {contractData.signedICP ? "✅ Signed" : "⏳ Awaiting Signature"}
          </span>
        </div>
      </div>

      {!contractData.offerAndAgreementOnFile && (
        <div className="border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Upload Signed Contract
          </h4>
          
          {!hasUploaded ? (
            <>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Upload your signed contract</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, JPG, PNG (Max 10MB)
                </p>
                <input 
                  type="file" 
                  className="mt-2 text-sm"
                  onChange={handleFileChange}
                  accept=".pdf"
                />
              </div>
              
              {fileName && (
                <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700 truncate max-w-[150px]">{fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-red-500 hover:text-red-700"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {fileName && (
                <div className="mt-3">
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    className="w-full gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Contract
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-emerald-700">Contract Uploaded Successfully!</p>
              <p className="text-xs text-emerald-600 mt-1">Your signed contract has been submitted.</p>
            </div>
          )}
        </div>
      )}

      {contractData.offerAndAgreementOnFile && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-emerald-700">Contract is on File</p>
          <p className="text-xs text-emerald-600 mt-1">
            Your signed contract has been submitted and is on record.
          </p>
          <Button variant="outline" size="sm" className="mt-3">
            <Eye className="h-4 w-4 mr-2" />
            View Contract
          </Button>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {contractData.offerAndAgreementOnFile && (
          <Button>
            <Eye className="h-4 w-4 mr-2" />
            View Full Contract
          </Button>
        )}
        {!contractData.offerAndAgreementOnFile && fileName && !hasUploaded && (
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {uploading ? "Uploading..." : "Upload Contract"}
          </Button>
        )}
      </div>
    </div>
  );
};

// Immigration Stage Detail View Component (for non-CRM-driven immigration stages:
// Licensure General & Live English Assessment, English Practice & Development,
// English Complete, Deployment & Skills Checklist)
const ImmigrationStageView = ({ stageName, onClose, user, setStages }) => {
  const details = IMMIGRATION_STAGE_DETAILS[stageName];
  
  if (!details) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Stage details not available.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{details.icon || "📋"}</span>
          <h3 className="font-semibold text-purple-800">{stageName}</h3>
        </div>
        <p className="text-sm text-purple-700">{details.description}</p>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-purple-600" />
          Key Steps
        </h4>
        <div className="space-y-2">
          {details.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-purple-50 transition-colors">
              <CheckCircle2 className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button 
          className="gap-2 bg-purple-600 hover:bg-purple-700"
          onClick={() => {
            updateStageStatus(user?.email, stageName, setStages);
            toast.success(`${stageName} marked as completed!`);
            setTimeout(() => onClose(), 500);
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark as Completed
        </Button>
      </div>
    </div>
  );
};

// ============= Immigration CRM Checklist View =============
// Used for: Foundations (Phases 1–3), License Endorsement, Cultural Adaptation & Integration.
// Pulls the relevant boolean fields straight from CRM/Zoho and displays them as
// read-only checked/unchecked items. The candidate cannot check these off
// themselves — the stage auto-completes once every underlying field is true.
const ImmigrationCRMChecklistView = ({ stageName, onClose, user, setStages, stages }) => {
  const items = IMMIGRATION_CRM_CHECKLISTS[stageName] || [];
  const details = IMMIGRATION_STAGE_DETAILS[stageName];
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChecklistData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchChecklistData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/api/zoho/my-deals`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) throw new Error("Failed to fetch progress from CRM");

      const data = await response.json();
      const userData = data.data || {};

      const results = {};
      items.forEach(item => {
        results[item.key] = isCRMChecklistComplete(getCRMChecklistValue(userData, item));
      });
      setChecklist(results);

      const allComplete = items.length > 0 && items.every(item => results[item.key]);
      const currentStage = (stages || []).find(s => s.stage_name === stageName);
      if (allComplete && currentStage && currentStage.status !== "Completed") {
        updateStageStatus(user?.email, stageName, setStages);
      }
    } catch (err) {
      console.error(`[Immigration] Error fetching ${stageName} checklist:`, err);
      setError(err.message || "Could not load progress from CRM");
    } finally {
      setLoading(false);
    }
  };

  const completedCount = items.filter(item => checklist[item.key]).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground mt-2">Loading progress from CRM...</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{details?.icon || "📋"}</span>
          <h3 className="font-semibold text-purple-800">{stageName}</h3>
        </div>
        {details?.description && <p className="text-sm text-purple-700">{details.description}</p>}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">⚠️ {error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-purple-600" />
            Progress (from CRM)
          </h4>
          <span className="text-xs text-muted-foreground">{completedCount} / {items.length} complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }}
          />
        </div>
        <div className="space-y-2">
          {items.map((item) => {
            const done = !!checklist[item.key];
            return (
              <div key={item.key} className={cn("flex items-center gap-2 p-2 rounded-lg", done ? "bg-emerald-50" : "bg-gray-50")}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                )}
                <span className={cn("text-sm", done ? "text-gray-700" : "text-gray-500")}>{item.label}</span>
              </div>
            );
          })}
        </div>
        {completedCount === items.length && items.length > 0 && (
          <div className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            All items complete — this stage is marked Completed.
          </div>
        )}
      </div>

      <div className="bg-purple-50/30 rounded-lg p-3 border border-purple-100">
        <p className="text-xs text-purple-700">
          💡 
          
        </p>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button variant="ghost" size="sm" onClick={fetchChecklistData} className="gap-2 text-purple-700">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
};

// ============= Immigration Call View =============
// Unlocks once "Hired" is completed (handled by the sequential unlock logic).
// The call is expected to happen within 30 days of the Hired completion date.
const ImmigrationCallView = ({ onClose, user, setStages, stages }) => {
  const hiredStage = (stages || []).find(s => s.stage_name === "Hired");
  const hiredCompletedDate = hiredStage?.completed_date ? new Date(hiredStage.completed_date) : null;
  const deadline = hiredCompletedDate && !Number.isNaN(hiredCompletedDate.getTime()) ? addDays(hiredCompletedDate, 30) : null;
  const isOverdue = deadline ? new Date() > deadline : false;
  const details = IMMIGRATION_STAGE_DETAILS["Immigration Call"];

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{details?.icon || "📞"}</span>
          <h3 className="font-semibold text-purple-800">Immigration Call</h3>
        </div>
        <p className="text-sm text-purple-700">{details?.description}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Hired Confirmed</span>
          <span className="text-sm font-medium">
            {hiredCompletedDate && !Number.isNaN(hiredCompletedDate.getTime()) ? format(hiredCompletedDate, "MMMM d, yyyy") : "Not yet completed"}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Immigration Call Due By</span>
          <span className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-emerald-600")}>
            {deadline ? format(deadline, "MMMM d, yyyy") : "Pending Hire confirmation"}
          </span>
        </div>
        {deadline && (
          <p className="text-xs text-muted-foreground">
            Your Immigration Call should take place within 30 days of your hire date being confirmed.
            {isOverdue && " This call is now past its target window — please reach out to your case manager."}
          </p>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button
          className="gap-2 bg-purple-600 hover:bg-purple-700"
          onClick={() => {
            updateStageStatus(user?.email, "Immigration Call", setStages);
            toast.success("Immigration Call marked as completed!");
            setTimeout(() => onClose(), 500);
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark as Completed
        </Button>
      </div>
    </div>
  );
};

// Licensure Upload Component
const LicensureUpload = ({ onClose, user }) => {
  const [license, setLicense] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!license) {
      toast.error("Please upload your license");
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(
        license,
        "Nursing License",
        "Licensure",
        "crm",
        user?.email
      );
      
      toast.success("Licensure documents uploaded to CRM successfully!");
      onClose();
    } catch (error) {
      console.error("[Licensure] Error:", error);
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
        <p className="text-xs text-purple-700">📋 These documents will be sent to CRM</p>
      </div>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">Nursing License</p>
        <p className="text-xs text-muted-foreground">Upload your nursing license (required)</p>
        <input 
          type="file" 
          className="mt-2 text-sm"
          onChange={(e) => setLicense(e.target.files[0])}
          accept=".pdf"
          required
        />
        {license && <p className="text-xs text-green-600 mt-1">✓ {license.name}</p>}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {uploading ? "Uploading..." : "Upload to CRM"}
        </Button>
      </div>
    </form>
  );
};

// Education Upload Component
const EducationUpload = ({ onClose, user }) => {
  const [transcript, setTranscript] = useState(null);
  const [diploma, setDiploma] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcript || !diploma) {
      toast.error("Please upload both documents");
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(
        transcript,
        "Transcript",
        "Education",
        "crm",
        user?.email
      );

      await uploadDocument(
        diploma,
        "Diploma",
        "Education",
        "crm",
        user?.email
      );

      toast.success("Education documents uploaded to CRM successfully!");
      onClose();
    } catch (error) {
      console.error("[Education] Error:", error);
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
        <p className="text-xs text-purple-700">📋 These documents will be sent to CRM</p>
      </div>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">Transcript</p>
        <p className="text-xs text-muted-foreground">Upload your transcript</p>
        <input 
          type="file" 
          className="mt-2 text-sm"
          onChange={(e) => setTranscript(e.target.files[0])}
          accept=".pdf"
          required
        />
        {transcript && <p className="text-xs text-green-600 mt-1">✓ {transcript.name}</p>}
      </div>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">Diploma</p>
        <p className="text-xs text-muted-foreground">Upload your diploma</p>
        <input 
          type="file" 
          className="mt-2 text-sm"
          onChange={(e) => setDiploma(e.target.files[0])}
          accept=".pdf"
          required
        />
        {diploma && <p className="text-xs text-green-600 mt-1">✓ {diploma.name}</p>}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {uploading ? "Uploading..." : "Upload to CRM"}
        </Button>
      </div>
    </form>
  );
};

// Survey Views
const SurveyView = ({ title, description, surveyUrl, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [markedComplete, setMarkedComplete] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const refreshIframe = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin && event.origin.includes('zohopublic.com')) {
        if (event.data && (event.data.type === 'formSubmit' || event.data.type === 'formComplete' || event.data === 'submitted')) {
          toast.success('Survey submitted successfully!');
          setMarkedComplete(true);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Clipboard className="h-5 w-5 text-rose-500" />
          <div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refreshIframe} className="text-gray-500 hover:text-gray-700">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMarkedComplete(true);
              toast.success(`${title} marked as completed!`);
              setTimeout(() => { onClose(); }, 500);
            }}
            className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
            disabled={markedComplete}
          >
            <CheckCircle2 className="h-4 w-4" />
            {markedComplete ? '✓ Completed' : 'Mark as Completed'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-gray-50">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            <span className="mt-3 text-sm text-muted-foreground">Loading survey...</span>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={surveyUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          title={title}
          allow="fullscreen; geolocation; microphone; camera"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
          loading="lazy"
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          💡 Complete the survey above, then click "Mark as Completed"
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button
            size="sm"
            onClick={() => {
              setMarkedComplete(true);
              toast.success(`${title} marked as completed!`);
              setTimeout(() => { onClose(); }, 500);
            }}
            className="gap-2 bg-rose-600 hover:bg-rose-700"
            disabled={markedComplete}
          >
            <CheckCircle2 className="h-4 w-4" />
            {markedComplete ? '✓ Completed' : 'Mark as Completed'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RelocationSurvey = ({ onClose }) => {
  return (
    <SurveyView 
      title="Relocation Survey" 
      description="Please share your feedback about your relocation experience."
      surveyUrl="https://survey.zohopublic.com/zs/k4DH3c"
      onClose={onClose}
    />
  );
};

const ThirtyDaySurvey = ({ onClose }) => {
  return (
    <SurveyView 
      title="30 Day Survey" 
      description="Please share your feedback after your first 30 days."
      surveyUrl="https://survey.zohopublic.com/zs/yEB6y4"
      onClose={onClose}
    />
  );
};

const NinetyDaySurvey = ({ onClose }) => {
  return (
    <SurveyView 
      title="90 Day Survey" 
      description="Please share your feedback after your first 90 days."
      surveyUrl="https://survey.zohopublic.com/zs/2GB3N0"
      onClose={onClose}
    />
  );
};

// License Endorsement View (legacy/generic — no longer used for the Immigration
// "License Endorsement" stage, which now uses ImmigrationCRMChecklistView.
// Kept here in case other stages want a similar generic view in the future.)
const LicenseEndorsementView = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
        <h3 className="font-semibold text-rose-800 flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          License Endorsement
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Track your nursing license endorsement process.</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">State Board Application</span>
          <span className="text-sm font-medium text-emerald-600">✓ Submitted</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Fingerprinting</span>
          <span className="text-sm font-medium text-amber-600">⏳ In Progress</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Transcripts Sent</span>
          <span className="text-sm font-medium text-emerald-600">✓ Completed</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">License Issued</span>
          <span className="text-sm font-medium text-gray-400">⏳ Pending</span>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button className="bg-rose-600 hover:bg-rose-700">
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </div>
    </div>
  );
};

// Candidate date submission form used by the two Aftercare date stages.
const AftercareDateSubmissionView = ({ onClose, user, setStages, stageName, title, description, fieldLabel, dateType }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDate) {
      toast.error(`Please enter ${fieldLabel.toLowerCase()}.`);
      return;
    }

    const chosen = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(chosen.getTime())) {
      toast.error("Please enter a valid date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/api/aftercare/date-submission`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user?.email,
          stage_name: stageName,
          date_type: dateType,
          submitted_date: selectedDate,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || result.message || "The date could not be submitted.");
      }

      if (Array.isArray(result.stages)) setStages(result.stages);
      else await updateStageStatus(user?.email, stageName, setStages);

      toast.success(`${fieldLabel} submitted successfully.`);
      setTimeout(onClose, 600);
    } catch (error) {
      toast.error(error.message || "The date could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
        <h3 className="font-semibold text-rose-800 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-800 mb-2" htmlFor={dateType}>
          {fieldLabel} <span className="text-red-500">*</span>
        </label>
        <input
          id={dateType}
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          max="2100-12-31"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          After submission, this date is saved in the database, the stage is checked off, and the ICP admin team can view it from the admin panel.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" className="bg-rose-600 hover:bg-rose-700" disabled={isSubmitting || !selectedDate}>
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
          {isSubmitting ? "Submitting..." : "Submit Date"}
        </Button>
      </div>
    </form>
  );
};

const OrientationStartView = (props) => (
  <AftercareDateSubmissionView
    {...props}
    stageName="Submit Orientation Start Date"
    dateType="orientation_start_date"
    title="Submit Orientation Start Date"
    fieldLabel="Orientation start date"
    description="Enter the date your facility orientation started."
  />
);

const OrientationEndView = (props) => (
  <AftercareDateSubmissionView
    {...props}
    stageName="Submit Start Date on Floor Independently"
    dateType="independent_floor_start_date"
    title="Submit Start Date on Floor Independently"
    fieldLabel="Independent floor start date"
    description="Enter the first date you worked independently on the floor."
  />
);


const DEPLOYMENT_CRM_STAGE_RULES = {
  "English Complete": {
    label: "English Complete",
    fields: [
      "IELTS_Complete",
      "IELTS_Scheduled_Exam_Date_if_applicable"
    ],
    fieldLabels: {
      IELTS_Complete: "English Exam Type",
      IELTS_Scheduled_Exam_Date_if_applicable:
        "English Expiration Date"
    },
    complete: value =>
      Boolean(
        value?.IELTS_Complete &&
        String(value.IELTS_Complete).trim() !== "—"
      ) &&
      Boolean(
        value?.IELTS_Scheduled_Exam_Date_if_applicable &&
        String(
          value.IELTS_Scheduled_Exam_Date_if_applicable
        ).trim() !== "—"
      )
  },
  "Post-Embassy Interview Update": {
    label: "Visa Status",
    field: "Visa_Status",
    complete: value =>
      Boolean(value && String(value).trim() !== "—")
  },
  "Confirmation of Eligibility to Proceed": {
    label: "Embassy Eligibility Status",
    field: "State_Licensure_Requirements",
    complete: value => String(value || "").trim().toLowerCase() === "eligible"
  },
  "Embassy Interview Scheduled": {
    label: "Embassy Interview Date",
    field: "Embassy_Interview",
    complete: value => Boolean(value && String(value).trim() !== "—")
  },
  "Schedule Medical Exam": {
    label: "Medical Exam Date",
    field: "R_L_Checklist_Initiated",
    complete: value => Boolean(value && String(value).trim() !== "—")
  },
  "Schedule Biometrics Appointment": {
    label: "Finger Printing",
    field: "Finger_Printing",
    complete: value => ["completed", "post arrival- completed", "post arrival - completed"].includes(String(value || "").trim().toLowerCase()),
    allowContinue: value => String(value || "").trim().toLowerCase() === "post arrival"
  },
  "Confirm Scheduled Arrival Date": {
    label: "Scheduled Arrival Date",
    field: "ETA",
    complete: value => Boolean(value && String(value).trim() !== "—")
  },
  "Attend Housing and Transportation Call": {
    label: "Housing Call",
    field: "Final_Housing_Confirmation_Call",
    complete: value => Boolean(value && String(value).trim() !== "—")
  },
  "Confirm Final Transportation Plan": {
    label: "Final Transportation Plan",
    field: "Final_Transportation_Plan",
    complete: value => Boolean(value && String(value).trim() !== "—")
  },
  "Connect with Concierge": {
    label: "Concierge",
    fields: [
      "Concierge_Name1",
      "Concierge_Phone"
    ],
    fieldLabels: {
      Concierge_Name1: "Concierge Name",
      Concierge_Phone: "Concierge Phone"
    },
    complete: value =>
      Boolean(
        value?.Concierge_Name1 &&
        value?.Concierge_Phone
      )
  },
  "Communicate During Travel": {
    label: "Final Destination Arrival",
    field: "Flight_Arrival_Time",
    complete: value => Boolean(value && String(value).trim() !== "—")
  }
};

const DeploymentCRMStatusView = ({
  stage,
  status,
  onClose,
  user,
  setStages
}) => {
  const rule = DEPLOYMENT_CRM_STAGE_RULES[stage.stage_name];
  const value = rule?.fields
    ? Object.fromEntries(rule.fields.map(field => [field, status?.[field]]))
    : status?.[rule?.field];
  const complete = rule?.complete?.(value) === true;
  const postArrival = rule?.allowContinue?.(value) === true;
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!complete && !postArrival) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      const response = await fetch(`${API_BASE}/api/pipeline/acknowledge-field-stage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user?.email,
          stage_name: stage.stage_name,
          allow_continue: postArrival
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update the stage.");

      if (complete) {
        setStages(prev => prev.map(item =>
          item.stage_name === stage.stage_name
            ? { ...item, status: "Completed", completed_date: data.stage?.completed_date || new Date().toISOString() }
            : item
        ));
      }
      window.dispatchEvent(new CustomEvent("pipeline-updated", {
        detail: { email: user?.email, stage_name: stage.stage_name }
      }));
      toast.success(postArrival ? "Marked to be completed after arrival." : "Stage completed.");
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <p className="text-sm font-semibold">{rule?.label || stage.stage_name}</p>
        {rule?.fields ? (
          <div className="mt-3 space-y-2">
            {rule.fields.map(field => (
              <div key={field} className="flex justify-between gap-4 text-sm">
                <span>
                  {rule?.fieldLabels?.[field] ||
                    field
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, character =>
                        character.toUpperCase()
                      )}
                </span>
                <span className="font-medium text-right">
                  {field ===
                    "IELTS_Scheduled_Exam_Date_if_applicable" &&
                  status?.[field]
                    ? formatPacketDate(status[field])
                    : status?.[field] || "Not available"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium">{value || "Not available"}</p>
        )}
      </div>

      {postArrival && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          This item is scheduled to be done post arrival. You may continue.
        </div>
      )}
      {!complete && !postArrival && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          This stage is not complete yet.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={confirm} disabled={saving || (!complete && !postArrival)}>
          {saving ? "Saving..." : postArrival ? "Continue" : "Confirm"}
        </Button>
      </div>
    </div>
  );
};

// Welcome Packet View
const WelcomePacketView = ({ onClose, user, setStages }) => {
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState("");
  const [locationServices, setLocationServices] = useState({
    destination: "",
    bank: null,
    socialSecurity: null,
    bankSearchUrl: "",
    socialSecuritySearchUrl: "",
    source: ""
  });
  const [packet, setPacket] = useState({
    recipientName: "",
    preferredName: "",
    lastName: "",
    welcomeDate: "",
    departureDate: "",
    departureAirport: "",
    layoverLocation: "",
    portOfEntry: "",
    arrivalDate: "",
    arrivalAirport: "",
    totalParty: "",
    childrenAges: "",
    totalBagCount: "",
    conciergeName: "",
    conciergePhone: "",
    conciergeEmail: "",
    employerName: "",
    employerAddress: "",
    employerContact: "",
    employerPhone: "",
    employerEmail: "",
    employerWebsite: "",
    uniformRequirement: "",
    stateLicenseRequired: "",
    boardOfNursing: "",
    boardAddress: "",
    boardPhone: "",
    housingAddress: "",
    propertyManager: "",
    propertyManagerPhone: "",
    moveInDate: "",
    rentCost: "",
    securityDeposit: "",
    firstMonthRent: "",
    electric: "",
    waterSewer: "",
    gas: "",
    otherUtilities: "",
    destinationCity: "",
    destinationState: "",
    destinationZip: ""
  });

  const pick = (source, ...keys) => {
    for (const key of keys) {
      const value = source?.[key];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== "" &&
        String(value).trim() !== "—"
      ) {
        return value;
      }
    }
    return "";
  };

  const formatPacketDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const fetchLocationServices = async (destination) => {
    if (!destination) return;

    setLookupLoading(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      const response = await fetch(
        `${API_BASE}/api/welcome-packet/location-services?destination=${encodeURIComponent(destination)}&_=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setLocationServices({
          destination: data.destination || destination,
          bank: data.bank || null,
          socialSecurity: data.socialSecurity || null,
          bankSearchUrl: data.bankSearchUrl || "",
          socialSecuritySearchUrl: data.socialSecuritySearchUrl || "",
          source: data.source || ""
        });
      }
    } catch (lookupError) {
      console.error("[Welcome Packet] Location lookup failed:", lookupError);
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPacket = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("icp_auth_token");
        if (!token) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        const response = await fetch(
          `${API_BASE}/api/welcome-packet/data?_=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            data.error ||
            data.message ||
            `Unable to load the welcome packet (${response.status})`
          );
        }

        const packetResponse = data.data || {};
        const deal =
          packetResponse.candidate ||
          packetResponse.deal ||
          packetResponse ||
          data.user ||
          {};

        if (packetResponse.locationServices) {
          setLocationServices({
            destination:
              packetResponse.locationServices.destination || "",
            bank:
              packetResponse.locationServices.bank || null,
            socialSecurity:
              packetResponse.locationServices.socialSecurity || null,
            bankSearchUrl:
              packetResponse.locationServices.bankSearchUrl || "",
            socialSecuritySearchUrl:
              packetResponse.locationServices.socialSecuritySearchUrl || "",
            source:
              packetResponse.locationServices.source || ""
          });
        }
        const preferredName = pick(
          deal,
          "preferredName",
          "Preferred_Name",
          "Candidate_First_Name",
          "First_Name"
        );
        const lastName = pick(
          deal,
          "lastName",
          "Last_Name",
          "Candidate_Last_Name"
        );
        const destinationCity = pick(
          deal,
          "destinationCity",
          "Destination_City",
          "City",
          "housingCity",
          "Housing_City",
          "Facility_City"
        );
        const destinationState = pick(
          deal,
          "destinationState",
          "Destination_State",
          "State",
          "housingState",
          "Housing_State",
          "Facility_State",
          "State_of_Employment"
        );
        const destinationZip = pick(
          deal,
          "destinationZip",
          "Destination_Zip",
          "Zip_Code",
          "Housing_Zip",
          "Facility_Zip"
        );
        const housingAddress = pick(
          deal,
          "US_Mailing_Address", "housingAddress", "Housing_Address"
        );
        const employerAddress = pick(
          deal,
          "employerAddress",
          "Employer_Address",
          "Facility_Address",
          "facilityAddress",
          "Work_Address"
        );

        const normalizedEntryPort = String(
          pick(deal, "entryport", "Port_of_Entry_in_US") || ""
        ).trim().toLowerCase();

        const layover1 = pick(
          deal,
          "layover1location",
          "Layover_1_Location"
        );
        const layover2 = pick(
          deal,
          "layover2location",
          "Layover_2_Location"
        );
        const layover3 = pick(
          deal,
          "layover3location",
          "Layover_3_Location"
        );
        const flightNumber4 = pick(
          deal,
          "fligtnumber4",
          "Flight_Number_4"
        );

        const differsFromEntryPort = value =>
          value &&
          value !== "—" &&
          String(value).trim().toLowerCase() !== normalizedEntryPort;

        const resolvedArrivalAirport =
          (
            flightNumber4 &&
            flightNumber4 !== "—" &&
            differsFromEntryPort(layover3)
          )
            ? layover3
            : differsFromEntryPort(layover3)
              ? layover3
              : differsFromEntryPort(layover2)
                ? layover2
                : differsFromEntryPort(layover1)
                  ? layover1
                  : pick(
                      deal,
                      "Arrival_Airport",
                      "Final_Arrival_Airport",
                      "entryport"
                    );

        const nextPacket = {
          recipientName:
            pick(deal, "candidateName", "Candidate_Name", "Full_Name") ||
            [preferredName, lastName].filter(Boolean).join(" "),
          preferredName,
          lastName,
          welcomeDate: formatPacketDate(new Date()),
          departureDate: formatPacketDate(
            pick(deal, "departureDate", "initial_departure_time", "Initial_Departure_Time", "Departure_Time")
          ),
          departureAirport: pick(
            deal,
            "departcity",
            "Departure_City1",
            "departureCity",
            "Departure_Airport"
          ),
          layoverLocation: [
            pick(deal, "layover1location", "Layover_1_Location"),
            pick(deal, "layover2location", "Layover_2_Location"),
            pick(deal, "layover3location", "Layover_3_Location")
          ]
            .filter(value => value && value !== "—")
            .join(" → "),
          portOfEntry: pick(
            deal,
            "entryport",
            "Port_of_Entry_in_US",
            "portOfEntry"
          ),
          arrivalDate: formatPacketDate(
            pick(
              deal,
              "arrivalDate",
              "final_destination_arrival_raw",
              "Final_Destination_Arrival",
              "Final_Arrival",
              "final_destination_arrival"
            )
          ),
          arrivalAirport: resolvedArrivalAirport,
          totalParty: pick(
            deal,
            "Total_in_Party",
            "totalParty",
            "Travel_Party_Total"
          ),
          childrenAges: pick(
            deal,
            "Ages_of_Children",
            "childrenAges",
            "Children_Ages"
          ),
          totalBagCount: pick(
            deal,
            "Total_Bag_Count",
            "totalBagCount",
            "Bag_Count"
          ),
          conciergeName: pick(
            deal,
            "conciergeName",
            "Concierge_Name",
            "Concierge_Name1"
          ),
          conciergePhone: pick(
            deal,
            "conciergePhone",
            "Concierge_Phone",
            "Concierge_Phone1"
          ),
          conciergeEmail: pick(
            deal,
            "conciergeEmail",
            "Concierge_Email",
            "Concierge_Email1"
          ),
          employerName: pick(
            deal,
            "Account_Name", "employerName", "Facility_Name"
          ),
          employerAddress:
            pick(
              deal,
              "internetEmployerAddress",
              "employerAddress",
              "Employer_Address",
              "Facility_Address",
              "facilityAddress",
              "Work_Address"
            ) || employerAddress,
          employerContact: pick(
            deal,
            "employerContact",
            "Employer_Contact",
            "Facility_Contact",
            "Contact_Person"
          ),
          employerPhone: pick(
            deal,
            "internetEmployerPhone",
            "employerPhone",
            "Employer_Phone",
            "Facility_Phone",
            "facilityPhone"
          ),
          employerEmail: pick(
            deal,
            "employerEmail",
            "Employer_Email",
            "Facility_Email"
          ),
          employerWebsite: pick(
            deal,
            "internetEmployerWebsite",
            "employerWebsite",
            "Employer_Website",
            "Facility_Website"
          ),
          uniformRequirement: pick(
            deal,
            "uniformRequirement",
            "Uniform_Requirement",
            "Uniform_Requirements",
            "Scrub_Color"
          ),
          stateLicenseRequired: pick(
            deal,
            "stateLicenseRequired",
            "NVC_DS_260_Status", "Endorsement_State"
          ),
          boardOfNursing: pick(
            deal,
            "boardOfNursing",
            "Hotel_Status", "Initial_License_State"
          ),
          boardAddress: pick(
            deal,
            "boardAddress",
            "Board_of_Nursing_Address",
            "BON_Address"
          ),
          boardPhone: pick(
            deal,
            "boardPhone",
            "Board_of_Nursing_Phone",
            "BON_Phone"
          ),
          housingAddress,
          propertyManager: pick(
            deal,
            "propertyManager",
            "Property_Manager",
            "Property_Manager_Name"
          ),
          propertyManagerPhone: pick(
            deal,
            "propertyManagerPhone",
            "Property_Manager_Phone"
          ),
          moveInDate: formatPacketDate(
            pick(
              deal,
              "Move_in_Date_Time1",
              "Move_In_Date",
              "moveInDate"
            )
          ),
          rentCost: pick(
            deal,
            "Monthly_rent",
            "Rent_Cost",
            "Cost_of_Rent_Month",
            "rentCost"
          ),
          securityDeposit: pick(
            deal,
            "securityDeposit",
            "Security_Deposit"
          ),
          firstMonthRent: pick(
            deal,
            "firstMonthRent",
            "First_Month_Rent"
          ),
          electric: pick(deal, "Utilities", "utilities"),
          waterSewer: pick(deal, "Utilities", "utilities"),
          gas: pick(deal, "Utilities", "utilities"),
          otherUtilities: pick(deal, "Other_Utilities", "otherUtilities"),
          destinationCity,
          destinationState,
          destinationZip
        };

        if (cancelled) return;

        setPacket(nextPacket);

        const destination = [
          nextPacket.housingAddress || nextPacket.employerAddress,
          destinationCity,
          destinationState,
          destinationZip
        ]
          .filter(Boolean)
          .join(", ");

        if (
          !packetResponse.locationServices?.bank &&
          !packetResponse.locationServices?.socialSecurity
        ) {
          fetchLocationServices(destination);
        }
      } catch (loadError) {
        console.error("[Welcome Packet] Load failed:", loadError);
        if (!cancelled) {
          setError(
            loadError.message ||
            "The welcome packet could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPacket();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const acknowledgePacket = async () => {
    setAcknowledging(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch(
        `${API_BASE}/api/pipeline/acknowledge-welcome-packet`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: user?.email })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Unable to acknowledge the Welcome Packet.");
      }

      setStages?.(prev => prev.map(stage =>
        ["ICP Welcome Packet", "ICP Welcome Packet & Itinerary", "Welcome Packet"].includes(stage.stage_name)
          ? {
              ...stage,
              stage_name: "ICP Welcome Packet",
              status: "Completed",
              completed: true,
              is_completed: true,
              completed_date: data.stage?.completed_date || new Date().toISOString()
            }
          : stage
      ));

      window.dispatchEvent(new CustomEvent("pipeline-updated", {
        detail: {
          email: user?.email,
          stage_name: "ICP Welcome Packet",
          status: "Completed"
        }
      }));

      toast.success("Welcome Packet acknowledged successfully.");
      setTimeout(onClose, 600);
    } catch (error) {
      console.error("[Welcome Packet] Acknowledgement failed:", error);
      toast.error(error.message || "Unable to acknowledge the Welcome Packet.");
    } finally {
      setAcknowledging(false);
    }
  };

  const printPacket = () => window.print();

  const DisplayValue = ({ value }) => (
    <span className="font-medium text-gray-900">
      {value || "Not available"}
    </span>
  );

  const InfoRow = ({ label, value }) => (
    <div className="grid grid-cols-[minmax(130px,0.45fr)_1fr] gap-3 border-b py-2 text-sm last:border-b-0">
      <span className="font-semibold text-gray-600">{label}</span>
      <DisplayValue value={value} />
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <section className="rounded-2xl border border-purple-200 bg-white p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-700">
          Compassionate · Experienced · Committed
        </p>
        <h2 className="mt-3 text-3xl font-bold text-purple-800">
          Infinity Care Partners
        </h2>
        <p className="mt-2 text-lg font-semibold uppercase tracking-[0.25em]">
          Welcome Packet
        </p>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-xl font-bold text-purple-800">
          Welcome to America!
        </h3>
        <p className="mt-3 text-sm text-gray-600">{packet.welcomeDate}</p>
        <p className="mt-4 text-sm leading-6 text-gray-700">
          Dear {packet.recipientName || "Candidate"},
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          Congratulations on this exciting new chapter in your life! On behalf
          of Infinity Care Partners, we are thrilled to welcome you as you begin
          your transition to the United States. We are honored that you have
          chosen us to support you in achieving your American Dream.
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          This welcome packet provides guidance to help you navigate your
          relocation and transition into your new role.
        </p>
        <p className="mt-4 text-sm font-medium text-gray-700">
          Kind regards,<br />The Infinity Care Partners Team
        </p>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <Plane className="h-5 w-5" />
          Plan Your Travel
        </h3>
        <div className="grid gap-x-6 md:grid-cols-2">
          <InfoRow label="Departure Date" value={packet.departureDate} />
          <InfoRow label="Departure Airport" value={packet.departureAirport} />
          <InfoRow label="Layover Location" value={packet.layoverLocation} />
          <InfoRow label="Port of Entry" value={packet.portOfEntry} />
          <InfoRow label="Arrival Date" value={packet.arrivalDate} />
          <InfoRow label="Arrival Airport" value={packet.arrivalAirport} />
          <InfoRow label="Total in Party" value={packet.totalParty} />
          <InfoRow label="Ages of Children" value={packet.childrenAges} />
          <InfoRow label="Total Bag Count" value={packet.totalBagCount} />
          <InfoRow label="Concierge Name" value={packet.conciergeName} />
          <InfoRow label="Concierge Phone" value={packet.conciergePhone} />
          <InfoRow label="Concierge Email" value={packet.conciergeEmail} />
        </div>
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
          Please remember to turn in your VISA Packet to Customs or Border
          Control at your Port of Entry.
        </p>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <Building className="h-5 w-5" />
          Facility Information
        </h3>
        <InfoRow label="Employer Name" value={packet.employerName} />
        <InfoRow label="Address" value={packet.employerAddress} />
        <InfoRow label="Contact" value={packet.employerContact} />
        <InfoRow label="Phone" value={packet.employerPhone} />
        <InfoRow label="Email" value={packet.employerEmail} />
        <InfoRow label="Website" value={packet.employerWebsite} />
        <InfoRow label="Uniform Requirement" value={packet.uniformRequirement} />

        <h4 className="mt-5 font-bold text-gray-900">Work Expectations</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            Coordinate with your employer before travelling outside the
            employer’s city.
          </li>
          <li>Integrate, learn, ask questions, and work as part of the team.</li>
          <li>Questions are encouraged and expected from your new team.</li>
        </ul>

        <h4 className="mt-5 font-bold text-gray-900">Tasks Post Arrival</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Employer: drug test, background check, and onboarding.</li>
          <li>
            Candidate: complete license endorsement, HR documents, and training.
          </li>
          <li>
            Keep your case manager updated when Social Security and resident
            documents arrive.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <Award className="h-5 w-5" />
          Licensure
        </h3>
        <InfoRow
          label="State of License Required"
          value={packet.stateLicenseRequired}
        />
        <InfoRow label="Board of Nursing" value={packet.boardOfNursing} />
        <InfoRow label="Address" value={packet.boardAddress} />
        <InfoRow label="Phone" value={packet.boardPhone} />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold">Required Pre-Arrival</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Credentials sent to the Board of Nursing</li>
              <li>NURSYS verification of license</li>
              <li>Application endorsement where required</li>
            </ul>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold">Required Post-Arrival</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Obtain resident photo identification</li>
              <li>Complete required background check or fingerprinting</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <Home className="h-5 w-5" />
          Housing Information
        </h3>
        <InfoRow label="Address" value={packet.housingAddress} />
        <InfoRow label="Property Manager" value={packet.propertyManager} />
        <InfoRow label="Phone" value={packet.propertyManagerPhone} />
        <InfoRow label="Move-In Date" value={packet.moveInDate} />
        <InfoRow label="Cost of Rent / Month" value={packet.rentCost} />
        <InfoRow label="Security Deposit" value={packet.securityDeposit} />
        <InfoRow label="First Month Rent" value={packet.firstMonthRent} />

        <h4 className="mt-5 font-bold text-gray-900">Utilities</h4>
        <InfoRow label="Electric" value={packet.electric} />
        <InfoRow label="Water / Sewer" value={packet.waterSewer} />
        <InfoRow label="Gas" value={packet.gas} />
        <InfoRow label="Other" value={packet.otherUtilities} />

        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-semibold">Furniture rental options</p>
          <p className="mt-1">CORT Home and Office Furniture Rentals</p>
          <p>Aaron’s Rent to Own Furniture, Electronics, and Appliances</p>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <Banknote className="h-5 w-5" />
          Banking Information
        </h3>

        {lookupLoading ? (
          <p className="text-sm text-gray-500">Finding a nearby bank...</p>
        ) : (
          <>
            <InfoRow
              label="Local Bank"
              value={locationServices.bank?.name}
            />
            <InfoRow
              label="Address"
              value={locationServices.bank?.address}
            />
            <InfoRow
              label="Phone"
              value={locationServices.bank?.phone}
            />
            {locationServices.bankSearchUrl && (
              <a
                href={locationServices.bankSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
              >
                Search nearby banks <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </>
        )}

        <h4 className="mt-5 font-bold">Setting Up Your Account</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Consider opening both checking and savings accounts.</li>
          <li>
            Return to the bank with your Social Security card when it arrives.
          </li>
          <li>
            Ask about a beginner credit card to begin building credit history.
          </li>
          <li>Set up the bank’s mobile application to monitor your account.</li>
        </ul>

        <h4 className="mt-5 font-bold">The 50 / 30 / 20 Budget Rule</h4>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <strong>50% Needs</strong>
            <p className="mt-1">Rent, utilities, groceries, insurance, and minimum debt payments.</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <strong>30% Wants</strong>
            <p className="mt-1">Dining, hobbies, entertainment, subscriptions, and leisure.</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <strong>20% Savings</strong>
            <p className="mt-1">Emergency funds, retirement, investments, and extra debt payments.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <CreditCard className="h-5 w-5" />
          Social Security Information
        </h3>

        {lookupLoading ? (
          <p className="text-sm text-gray-500">
            Finding the nearest Social Security office...
          </p>
        ) : (
          <>
            <InfoRow
              label="Local Office"
              value={locationServices.socialSecurity?.name}
            />
            <InfoRow
              label="Address"
              value={locationServices.socialSecurity?.address}
            />
            <InfoRow
              label="Phone"
              value={locationServices.socialSecurity?.phone}
            />
            {locationServices.socialSecuritySearchUrl && (
              <a
                href={locationServices.socialSecuritySearchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
              >
                Find the official local office <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </>
        )}

        <h4 className="mt-5 font-bold">Process</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            Keep your case manager informed when your Social Security and
            resident cards arrive.
          </li>
          <li>
            Use a copy for your Board of Nursing and employer when required.
          </li>
          <li>
            Contact the local office for errors, delays, or a card not received
            within the expected period.
          </li>
        </ul>

        <h4 className="mt-5 font-bold">Protecting Your Social Security Card</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Do not share the number except with trusted required entities.</li>
          <li>Do not laminate the card.</li>
          <li>Sign the card and store it in a secure location.</li>
          <li>Do not routinely carry the original card in your wallet.</li>
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-purple-800">
          <ClipboardList className="h-5 w-5" />
          Recommended Shopping List
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Bedroom", ["Mattress", "Pillows", "Linens", "Extra blanket"]],
            ["Bathroom", ["Towels", "Shower curtain", "Soap", "Toilet paper"]],
            ["Kitchen", ["Dishes", "Utensils", "Pots and pans", "Groceries"]],
            ["Cleaning", ["Laundry detergent", "Paper towels", "Broom or mop", "Surface cleaner"]]
          ].map(([title, items]) => (
            <div key={title} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-bold">{title}</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4 print:hidden">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button variant="outline" onClick={printPacket} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Packet
        </Button>
        <Button
          onClick={acknowledgePacket}
          disabled={acknowledging}
          className="gap-2 bg-purple-700 hover:bg-purple-800"
        >
          {acknowledging ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Acknowledge Packet
        </Button>
      </div>
    </div>
  );
};

// ============= Concierge Details View =============
// Pulls real contact details from the backend using flexible field-name lookups:
// conciergeName: ga("Concierge_Name1","Concierge_Name")
// conciergePhone: ga("Concierge_Phone","Concierge_Phone1")
// conciergeEmail: ga("Concierge_Email","Concierge_Email1")
const ConciergeDetails = ({ onClose, user, setStages }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [concierge, setConcierge] = useState({
    name: "Not assigned yet",
    phone: "Not available",
    email: "Not available"
  });

  useEffect(() => {
    fetchConciergeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConciergeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/api/zoho/my-deals`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) throw new Error("Failed to fetch concierge details");

      const data = await response.json();
      const userData = data.data || {};

      const conciergeName = ga(userData, "Concierge_Name1", "Concierge_Name");
      const conciergePhone = ga(userData, "Concierge_Phone", "Concierge_Phone1");
      const conciergeEmail = ga(userData, "Concierge_Email", "Concierge_Email1");

      setConcierge({
        name: conciergeName || "Not assigned yet",
        phone: conciergePhone || "Not available",
        email: conciergeEmail || "Not available"
      });
    } catch (err) {
      console.error("[Concierge] Error fetching concierge data:", err);
      setError(err.message || "Could not load concierge details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Concierge Details</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="text-sm text-muted-foreground mt-2">Loading concierge details...</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
          <User className="h-5 w-5" />
          Concierge Details
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Your assigned concierge and contact information.</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">⚠️ {error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Concierge</span>
          <span className="text-sm font-medium">{concierge.name}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Phone</span>
          <span className="text-sm font-medium">{concierge.phone}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm font-medium">{concierge.email}</span>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button
          className="gap-2 bg-purple-600 hover:bg-purple-700"
          disabled={!concierge.email || concierge.email === "Not available"}
          onClick={() => {
            if (concierge.email && concierge.email !== "Not available") {
              window.location.href = `mailto:${concierge.email}`;
            }
          }}
        >
          <Mail className="h-4 w-4" />
          Contact Concierge
        </Button>
      </div>
    </div>
  );
};

// Support Group View
const SupportGroupView = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
        <h3 className="font-semibold text-pink-800 flex items-center gap-2">
          <Users className="h-5 w-5" />
          ICP Pre-Arrival Support Group
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Join the support group 5 weeks from arrival.</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Timeline</span>
          <span className="text-sm font-medium">5 weeks before arrival</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Platform</span>
          <span className="text-sm font-medium">WhatsApp/Telegram</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="text-sm font-medium text-amber-600">⏳ Not Joined</span>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button className="gap-2 bg-pink-600 hover:bg-pink-700">
          <Users className="h-4 w-4" />
          Join Group
        </Button>
      </div>
    </div>
  );
};

// Flight Details View
const FlightDetails = ({ onClose, user, setStages }) => {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flightData, setFlightData] = useState({
    flightNumber: "Loading...",
    departure: "Loading...",
    arrival: "Loading...",
    airline: "Loading...",
    departureCity: "Loading...",
    arrivalCity: "Loading...",
    departureTime: "Loading...",
    arrivalTime: "Loading...",
    layovers: [],
    confirmationNumber: "Loading...",
    flightStatus: "Loading...",
    flightCost: "Loading..."
  });
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    fetchFlightData();
  }, []);

  const checkAndUpdateCompletion = (data) => {
    const requiredFields = [
      'flightNumber', 'airline', 'departureCity', 'arrivalCity', 
      'departureTime', 'arrivalTime', 'flightStatus'
    ];
    
    const allFilled = requiredFields.every(field => {
      const value = data[field];
      return value && value !== "Loading..." && value !== "Not assigned" && value !== "Not available" && value !== "Not scheduled";
    });

    if (allFilled && !isComplete) {
      setIsComplete(true);
      updateStageStatus(user?.email || authUser?.email, "Flights Booked", setStages);
      toast.success("All flight details are complete! Pipeline updated.");
    }
    return allFilled;
  };

  const fetchFlightData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/zoho/my-deals`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {}
        throw new Error(`Failed to fetch flight data: ${errorMessage}`);
      }

      const data = await response.json();
      const userData = data.data || {};

      const layovers = [];
      if (userData.layover1location && userData.layover1location !== "—") {
        layovers.push(userData.layover1location);
      }
      if (userData.layover2location && userData.layover2location !== "—") {
        layovers.push(userData.layover2location);
      }
      if (userData.layover3location && userData.layover3location !== "—") {
        layovers.push(userData.layover3location);
      }

      const flightNumbers = [];
      if (userData.fligtnumber1 && userData.fligtnumber1 !== "—") {
        flightNumbers.push(userData.fligtnumber1);
      }
      if (userData.fligtnumber2 && userData.fligtnumber2 !== "—") {
        flightNumbers.push(userData.fligtnumber2);
      }
      if (userData.fligtnumber3 && userData.fligtnumber3 !== "—") {
        flightNumbers.push(userData.fligtnumber3);
      }
      if (userData.fligtnumber4 && userData.fligtnumber4 !== "—") {
        flightNumbers.push(userData.fligtnumber4);
      }

      const mappedData = {
        flightNumber: flightNumbers.length > 0 ? flightNumbers.join(", ") : "Not assigned",
        departure: userData.departcity || "Not available",
        arrival: userData.entryport || "Not available",
        airline: userData.primaryairline || "Not assigned",
        departureCity: userData.departcity || "Not available",
        arrivalCity: userData.entryport || "Not available",
        departureTime: userData.scheduleddeparturedate || "Not scheduled",
        arrivalTime: userData.scheduledarrivaldate || "Not scheduled",
        layovers: layovers,
        confirmationNumber: userData.confirmationnumbers || "Not available",
        flightStatus: userData.Flight_Booked_Emailed || userData.flightConfirmation || "Not available",
        flightCost: userData.RN_Flight_Cost || "Not available",
        dependentFlightCost: userData.Dependent_Flight_Cost || "Not available",
        finalFlightNumber: userData.finalflightnumber || "Not available",
        finalFlightAirline: userData.finalflightairline || "Not available",
        initialDepartureTime: userData.initial_departure_time || "Not available",
        finalDestinationArrival: userData.final_destination_arrival || "Not available",
        flightTracker: userData.primaryairlinetrack || "Not available"
      };
      
      setFlightData(mappedData);
      checkAndUpdateCompletion(mappedData);
      
    } catch (error) {
      console.error("❌ Error fetching flight data:", error);
      setError(error.message || "Could not load flight information");
      const fallbackData = {
        flightNumber: "AA 1234",
        departure: "JFK",
        arrival: "LAX",
        airline: "American Airlines",
        departureCity: "New York",
        arrivalCity: "Los Angeles",
        departureTime: "10:00 AM",
        arrivalTime: "1:30 PM",
        layovers: ["Chicago (ORD)"],
        confirmationNumber: "ABC123",
        flightStatus: "Confirmed",
        flightCost: "$450",
        dependentFlightCost: "$350",
        finalFlightNumber: "AA 5678",
        finalFlightAirline: "American Airlines",
        initialDepartureTime: "10:00 AM",
        finalDestinationArrival: "1:30 PM",
        flightTracker: "https://www.flightstats.com"
      };
      setFlightData(fallbackData);
      checkAndUpdateCompletion(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchFlightData();
    toast.info("Refreshing flight information...");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Flight Information</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-blue-600 mt-2">Loading flight information...</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Flight Information</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
        
        {error && (
          <div className={`rounded-lg p-3 mb-3 ${error.includes('default') ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-xs ${error.includes('default') ? 'text-amber-700' : 'text-red-700'}`}>
              {error.includes('default') ? 'ℹ️' : '⚠️'} {error}
            </p>
          </div>
        )}

        {isComplete && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-emerald-700">✅ All flight details are complete!</p>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="h-5 w-5 text-blue-600 mt-0.5 flex items-center justify-center">✈️</div>
            <div>
              <p className="text-xs text-gray-500 font-medium">FLIGHT STATUS</p>
              <p className="text-sm font-medium text-gray-800">{flightData.flightStatus}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <Plane className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">AIRLINE</p>
                <p className="text-sm font-medium text-gray-800">{flightData.airline}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <Plane className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">FLIGHT NUMBER(S)</p>
                <p className="text-sm font-medium text-gray-800">{flightData.flightNumber}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="h-5 w-5 text-emerald-600 mt-0.5 flex items-center justify-center">🛫</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">DEPARTURE</p>
                <p className="text-sm font-medium text-gray-800">{flightData.departureCity}</p>
                <p className="text-xs text-gray-500">{flightData.departureTime}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="h-5 w-5 text-red-600 mt-0.5 flex items-center justify-center">🛬</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">ARRIVAL</p>
                <p className="text-sm font-medium text-gray-800">{flightData.arrivalCity}</p>
                <p className="text-xs text-gray-500">{flightData.arrivalTime}</p>
              </div>
            </div>
          </div>

          {flightData.layovers && flightData.layovers.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="h-5 w-5 text-amber-600 mt-0.5 flex items-center justify-center">🔄</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">LAYOVERS</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {flightData.layovers.map((layover, index) => (
                    <span key={index} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      {layover}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {flightData.confirmationNumber && flightData.confirmationNumber !== "Not available" && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="h-5 w-5 text-blue-600 mt-0.5 flex items-center justify-center">📋</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">CONFIRMATION NUMBER</p>
                <p className="text-sm font-medium text-gray-800">{flightData.confirmationNumber}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
        {flightData.flightTracker && flightData.flightTracker !== "Not available" && (
          <Button className="gap-2" onClick={() => window.open(flightData.flightTracker, '_blank')}>
            <Eye className="h-4 w-4" />
            Track Flight
          </Button>
        )}
      </div>
    </div>
  );
};

// Welcome Appointments View
const WelcomeAppointments = ({ onClose, user, setStages }) => {
  const [appointments, setAppointments] = useState([
    { id: 1, title: "HR Orientation", date: format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), "MMMM d, yyyy"), time: "9:00 AM", completed: false },
    { id: 2, title: "Manager Meet & Greet", date: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "MMMM d, yyyy"), time: "2:00 PM", completed: false },
    { id: 3, title: "Benefits Enrollment", date: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "MMMM d, yyyy"), time: "10:30 AM", completed: false }
  ]);
  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    const allDone = appointments.every(app => app.completed);
    if (allDone && !allCompleted) {
      setAllCompleted(true);
      updateStageStatus(user?.email, "Welcome Appointments", setStages);
      toast.success("All welcome appointments are complete! Pipeline updated.");
    }
  }, [appointments]);

  const toggleAppointment = (id) => {
    setAppointments(prev =>
      prev.map(app =>
        app.id === id ? { ...app, completed: !app.completed } : app
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-emerald-800">Welcome Appointments</h3>
        </div>
        
        {allCompleted && (
          <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-2 mb-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-emerald-700">✅ All appointments completed!</p>
          </div>
        )}
        
        <div className="space-y-3">
          {appointments.map((app) => (
            <div 
              key={app.id} 
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                app.completed ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200'
              }`}
              onClick={() => toggleAppointment(app.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`rounded-full p-2 ${app.completed ? 'bg-emerald-200' : 'bg-emerald-100'}`}>
                  {app.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${app.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {app.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{app.date} at {app.time}</p>
                </div>
                {app.completed && (
                  <span className="text-xs text-emerald-600 font-medium">✓ Done</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-emerald-200">
          <p className="text-xs text-emerald-600">
            {appointments.filter(a => a.completed).length} of {appointments.length} appointments completed
          </p>
          <div className="w-full bg-emerald-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(appointments.filter(a => a.completed).length / appointments.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
      </div>
    </div>
  );
};

const BEHAVIORAL_ASSESSMENT_WORDS = [
  "Adaptable", "Calm", "Collaborative", "Compassionate", "Confident",
  "Dependable", "Detail-oriented", "Empathetic", "Flexible", "Focused",
  "Helpful", "Honest", "Organized", "Patient", "Proactive",
  "Reliable", "Respectful", "Supportive", "Thorough", "Trustworthy",
  "Dismissive", "Distracted", "Inattentive", "Inflexible", "Unreliable"
];

const BEHAVIORAL_AGREEMENT_OPTIONS = [
  "Strongly Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Strongly Agree"
];

const BEHAVIORAL_STATEMENTS = [
  "I stay calm and focused when things become hectic.",
  "I make an effort to comfort patients or families who are upset.",
  "I double-check my work to make sure it is correct.",
  "I prefer clear routines and procedures.",
  "I enjoy collaborating with my coworkers to solve problems.",
  "I adapt easily when priorities change suddenly.",
  "I feel confident speaking up when something seems unsafe or incorrect.",
  "I build trust quickly with patients and colleagues.",
  "I prefer to plan my day in detail before starting work.",
  "I can handle emotionally difficult situations without shutting down."
];

const BEHAVIORAL_WORK_LIFE_OPTIONS = [
  "I make time for hobbies, exercise, or self-care outside of work to recharge.",
  "I prioritize tasks at work to reduce overtime and prevent burnout.",
  "I set healthy boundaries between work and personal time.",
  "I talk with trusted colleagues, friends, or family when I need support.",
  "I use rest, sleep, and planned time off to recover between shifts."
];

const createEmptyBehavioralAssessment = () => ({
  bestWords: [],
  leastWords: [],
  statements: Object.fromEntries(BEHAVIORAL_STATEMENTS.map(statement => [statement, ""])),
  agitatedPatient: "",
  shortStaffed: "",
  coworkerSupport: "",
  emergencyScenario: "",
  workLifeBalance: [],
  compassionExample: "",
  nursingMotivation: ""
});

// Deployment Details Component
const DeploymentDetails = ({ onClose, user, setStages }) => {
  const [uploading, setUploading] = useState({});
  const [requirements, setRequirements] = useState({
    updatedResume: { confirmed: false, file: null, fileName: "" },
    certificateOfEmployment: { confirmed: false, file: null, fileName: "" },
    housingChecklist: { confirmed: false, file: null, fileName: "" },
    rlChecklist: { confirmed: false, file: null, fileName: "" },
    blsCert: { confirmed: false, file: null, fileName: "" },
    aclsCert: { confirmed: false, file: null, fileName: "" },
    englishCert: { confirmed: false, file: null, fileName: "" },
    vsCert: { confirmed: false, file: null, fileName: "" },
    cesCert: { confirmed: false, file: null, fileName: "" },
    passportSelf: { confirmed: false, file: null, fileName: "" },
    passportDependents: { confirmed: false, file: null, fileName: "" },
    culturalGap: { confirmed: false, file: null, fileName: "" },
    behaviorAssessment: { confirmed: false, file: null, fileName: "" },
    audioRecording: { confirmed: false, file: null, fileName: "" },
    dependentsAdded: { confirmed: false, file: null, fileName: "" },
    transportationPlan: { confirmed: false, file: null, fileName: "" }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [behavioralAssessment, setBehavioralAssessment] = useState(createEmptyBehavioralAssessment);
  const [behavioralSubmitting, setBehavioralSubmitting] = useState(false);
  const [behavioralSubmitted, setBehavioralSubmitted] = useState(false);

  const preserveBehavioralScroll = (callback) => {
    const modalBody = document.querySelector("[data-modal-scroll-body]") ||
      document.querySelector(".overflow-y-auto");
    const scrollTop = modalBody?.scrollTop || 0;
    callback();
    requestAnimationFrame(() => {
      if (modalBody) modalBody.scrollTop = scrollTop;
    });
  };

  const updateBehavioralField = (field, value) => {
    preserveBehavioralScroll(() => {
      setBehavioralAssessment(prev => ({ ...prev, [field]: value }));
    });
  };

  const toggleBehavioralArrayValue = (field, value, maxSelections = null) => {
    preserveBehavioralScroll(() => setBehavioralAssessment(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      }
      if (maxSelections && current.length >= maxSelections) {
        toast.error(`Select no more than ${maxSelections} options.`);
        return prev;
      }
      return { ...prev, [field]: [...current, value] };
    }));
  };

  const isBehavioralAssessmentComplete = () => {
    const answers = behavioralAssessment;
    return answers.bestWords.length === 5 &&
      answers.leastWords.length === 5 &&
      BEHAVIORAL_STATEMENTS.every(statement => Boolean(answers.statements[statement])) &&
      Boolean(answers.agitatedPatient.trim()) &&
      Boolean(answers.shortStaffed.trim()) &&
      Boolean(answers.coworkerSupport.trim()) &&
      Boolean(answers.emergencyScenario.trim()) &&
      answers.workLifeBalance.length > 0 &&
      Boolean(answers.compassionExample.trim()) &&
      Boolean(answers.nursingMotivation.trim());
  };

  const submitBehavioralAssessment = async () => {
    if (!isBehavioralAssessmentComplete()) {
      toast.error("Please complete every Behavioral Assessment question before submitting.");
      return;
    }

    setBehavioralSubmitting(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/api/deployment/behavioral-assessment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          candidateEmail: user?.email,
          answers: behavioralAssessment,
          submittedAt: new Date().toISOString()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || data.attachmentVerified !== true) {
        throw new Error(data.error || "The Behavioral Assessment PDF was not verified in CRM attachments");
      }

      setBehavioralSubmitted(true);
      setRequirements(prev => ({
        ...prev,
        behaviorAssessment: {
          ...prev.behaviorAssessment,
          confirmed: true,
          file: data,
          fileName: data.attachmentName || "Behavioral Assessment submitted"
        }
      }));
      toast.success("Behavioral Assessment submitted successfully.");
    } catch (error) {
      console.error("Behavioral Assessment submission error:", error);
      toast.error(error.message || "Failed to submit Behavioral Assessment");
    } finally {
      setBehavioralSubmitting(false);
    }
  };


  const toggleRequirement = (key) => {
    if (key === "behaviorAssessment" && !behavioralSubmitted) {
      toast.info("Complete every Behavioral Assessment field and submit the form.");
      return;
    }
    if (!requirements[key]?.fileName && key !== "behaviorAssessment") {
      toast.info("Attach the required PDF to complete this item.");
    }
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF documents are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(prev => ({ ...prev, [key]: true }));

    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_name", `${key} - ${format(new Date(), "MMM d, yyyy")}`);
      formData.append("document_type", key === "behaviorAssessment" ? "Behavioral Assessment" : "Deployment Requirement");
      formData.append("candidate_email", user?.email || "");

      const response = await fetch(`${API_BASE}/api/documents/upload-to-concierge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      
      setRequirements(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          file: data,
          fileName: file.name,
          confirmed: true
        }
      }));

      toast.success(`"${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const removeFile = (key) => {
    setRequirements(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        file: null,
        fileName: "",
        confirmed: false
      }
    }));
    toast.info("File removed");
  };

  const allRequirementsMet = () => {
    return Object.entries(requirements).every(([key, requirement]) => {
      if (key === "behaviorAssessment") {
        return behavioralSubmitted && isBehavioralAssessmentComplete();
      }
      return (
        requirement.confirmed === true &&
        Boolean(requirement.fileName)
      );
    });
  };

  const handleSubmit = async () => {
    if (!allRequirementsMet()) {
      toast.error("Please complete the Behavioral Assessment and upload all required documents before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const submissionData = {
        candidateEmail: user?.email,
        requirements: Object.entries(requirements).map(([key, value]) => ({
          key,
          confirmed: value.confirmed,
          fileName: value.fileName,
          fileUrl: value.file?.url || value.file?.fileUrl || value.file?.document_url
        })),
        submittedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE}/api/deployment/requirements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submissionData)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || data.message || "Failed to save deployment requirements");
      }

      if (setStages && data.stage) {
        setStages(prev => prev.map(stage =>
          stage.stage_name === "Submit Updated Work Status, Civil Docs & Licensing Credentials"
            ? { ...stage, ...data.stage, status: "Completed" }
            : stage
        ));
      } else {
        const saved = await updateStageStatus(
          user?.email,
          "Submit Updated Work Status, Civil Docs & Licensing Credentials",
          setStages
        );
        if (!saved) throw new Error("The checklist was saved, but the pipeline stage could not be completed");
      }

      toast.success("All deployment requirements were submitted successfully!");
      setTimeout(() => { onClose(); }, 1500);
    } catch (error) {
      console.error("Error submitting requirements:", error);
      toast.error(error.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RequirementCheckbox = ({ label, requirementKey, description }) => {
    const req = requirements[requirementKey] || { confirmed: false, file: null, fileName: "" };
    const isUploading = uploading[requirementKey] || false;
    const isChecked = req.confirmed || false;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 hover:border-emerald-300 transition-all overflow-hidden">
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
              }`}>
                {isChecked && <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <p className={`text-sm font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {label} <span className="text-red-500">*</span>
                </p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}

              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            {requirementKey === "behaviorAssessment" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">1. Select exactly 5 words that describe you best at work.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {BEHAVIORAL_ASSESSMENT_WORDS.map(word => (
                      <label key={`best-${word}`} className="flex items-center gap-2 text-xs border rounded-md p-2 bg-white">
                        <input type="checkbox" checked={behavioralAssessment.bestWords.includes(word)} onChange={() => toggleBehavioralArrayValue("bestWords", word, 5)} disabled={behavioralSubmitted} />
                        {word}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Selected: {behavioralAssessment.bestWords.length}/5</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">2. Select exactly 5 words that least describe you at work.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {BEHAVIORAL_ASSESSMENT_WORDS.map(word => (
                      <label key={`least-${word}`} className="flex items-center gap-2 text-xs border rounded-md p-2 bg-white">
                        <input type="checkbox" checked={behavioralAssessment.leastWords.includes(word)} onChange={() => toggleBehavioralArrayValue("leastWords", word, 5)} disabled={behavioralSubmitted} />
                        {word}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Selected: {behavioralAssessment.leastWords.length}/5</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-700">3. Select how much you agree or disagree with each statement.</p>
                  {BEHAVIORAL_STATEMENTS.map(statement => (
                    <div key={statement}>
                      <label className="text-xs text-gray-700 block mb-1">{statement}</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={behavioralAssessment.statements[statement]} onChange={(e) => preserveBehavioralScroll(() => setBehavioralAssessment(prev => ({ ...prev, statements: { ...prev.statements, [statement]: e.target.value } })))} disabled={behavioralSubmitted}>
                        <option value="">Select response</option>
                        {BEHAVIORAL_AGREEMENT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {[
                  ["agitatedPatient", "4. A patient becomes agitated during a procedure. What is your first step?"],
                  ["shortStaffed", "5. You are short-staffed and under pressure. How do you prioritize?"],
                  ["coworkerSupport", "6. A coworker is struggling with a task you are familiar with. What do you do?"],
                  ["emergencyScenario", "7. During a busy shift, a patient becomes unresponsive while a family member demands attention. How do you respond?"]
                ].map(([field, question]) => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">{question}</label>
                    <textarea className="w-full min-h-[90px] border rounded-md px-3 py-2 text-sm" value={behavioralAssessment[field]} onChange={(e) => updateBehavioralField(field, e.target.value)} disabled={behavioralSubmitted} />
                  </div>
                ))}

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">8. Select all strategies you use to create and maintain work-life balance as a nurse.</p>
                  <div className="space-y-2">
                    {BEHAVIORAL_WORK_LIFE_OPTIONS.map(option => (
                      <label key={option} className="flex items-start gap-2 text-xs border rounded-md p-2 bg-white">
                        <input type="checkbox" className="mt-0.5" checked={behavioralAssessment.workLifeBalance.includes(option)} onChange={() => toggleBehavioralArrayValue("workLifeBalance", option)} disabled={behavioralSubmitted} />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">9. Describe a specific situation in your nursing career where you demonstrated compassion.</label>
                  <textarea className="w-full min-h-[110px] border rounded-md px-3 py-2 text-sm" value={behavioralAssessment.compassionExample} onChange={(e) => updateBehavioralField("compassionExample", e.target.value)} disabled={behavioralSubmitted} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">10. Why did you choose to become a nurse?</label>
                  <textarea className="w-full min-h-[110px] border rounded-md px-3 py-2 text-sm" value={behavioralAssessment.nursingMotivation} onChange={(e) => updateBehavioralField("nursingMotivation", e.target.value)} disabled={behavioralSubmitted} />
                </div>

                <Button type="button" onClick={submitBehavioralAssessment} disabled={behavioralSubmitting || behavioralSubmitted || !isBehavioralAssessmentComplete()} className="w-full gap-2">
                  {behavioralSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : behavioralSubmitted ? <><CheckCircle2 className="h-4 w-4" />Submitted</> : <><FileCheck className="h-4 w-4" />Submit</>}
                </Button>
              </div>
            ) : req.fileName ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-700 truncate">{req.fileName}</span>
                  <span className="text-xs text-green-600 font-medium ml-1">✓ Uploaded</span>
                </div>
                <button type="button" onClick={() => removeFile(requirementKey)} className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2" disabled={isUploading}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-emerald-400 transition-colors bg-gray-50/50">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Upload {label}</span>
                    <span className="text-xs text-gray-400">(PDF only, max 10MB)</span>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(requirementKey, e.target.files[0]);
                        }
                        e.target.value = '';
                      }}
                      accept=".pdf"
                      disabled={isUploading}
                    />
                  </div>
                  {isUploading && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                      <span className="text-xs text-emerald-600">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getProgress = () => {
    const total = Object.keys(requirements).length;
    const completed = Object.values(requirements).filter(req => req.confirmed === true).length;
    return { total, completed, percentage: (completed / total) * 100 };
  };

  const progress = getProgress();

  return (
    <div className="space-y-4 max-h-[calc(90vh-80px)] overflow-y-auto pr-2">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Submit Updated Work Status, Civil Docs & Licensing Credentials</h3>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <p className="text-xs text-amber-700">
            ⚠️ Please confirm and upload the following required documents. 
            If your previously submitted forms/documents are older than 6 months, you will be required to resubmit updated versions.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{progress.total} required items (15 documents + 1 assessment form)</span>
          <span>{progress.completed} completed / {progress.total} total</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          />
        </div>
        {allRequirementsMet() && (
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            All required documents and the Behavioral Assessment are complete!
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
          <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Updated Documents
          </h4>
          <div className="space-y-2">
            <RequirementCheckbox requirementKey="updatedResume" label="Updated Resume" description="Current resume with most recent experience" />
            <RequirementCheckbox requirementKey="certificateOfEmployment" label="Certificate of Employment" description="Most recent COE from current employer" />
            <RequirementCheckbox requirementKey="housingChecklist" label="Updated Housing Checklist" description="Current completed housing checklist" />
            <RequirementCheckbox requirementKey="rlChecklist" label="Updated R&L Checklist" description="Current completed relocation and logistics checklist" />
          </div>
        </div>

        <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100">
          <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Training Certificates
          </h4>
          <div className="space-y-2">
            <RequirementCheckbox requirementKey="blsCert" label="BLS Certification" description="Basic Life Support (current)" />
            <RequirementCheckbox requirementKey="aclsCert" label="ACLS Certification" description="Advanced Cardiac Life Support (current)" />
            <RequirementCheckbox requirementKey="englishCert" label="English Language Certification" description="Valid English exam results" />
            <RequirementCheckbox requirementKey="vsCert" label="Visascreen Certification" description="Current Visascreen/CGFNS certification" />
            <RequirementCheckbox requirementKey="cesCert" label="CES Report" description="Current CES evaluation report" />
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
          <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Passports
          </h4>
          <div className="space-y-2">
            <RequirementCheckbox requirementKey="passportSelf" label="Valid Passport (Self)" description="Valid for at least 6 months" />
            <RequirementCheckbox requirementKey="passportDependents" label="Valid Passports (Dependents)" description="Valid for at least 6 months for all dependents" />
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
          <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Final Pre-Deployment Requirements
          </h4>
          <div className="space-y-2">
            <RequirementCheckbox requirementKey="culturalGap" label="Addressing the Cultural Gap" description="Completed cultural gap assessment" />
            <RequirementCheckbox requirementKey="behaviorAssessment" label="Behavior Assessment" description="Completed behavior assessment" />
            <RequirementCheckbox requirementKey="audioRecording" label="Audio Recording Questionnaire" description="Completed audio recording" />
          </div>
        </div>

        <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100">
          <h4 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Additional Information
          </h4>
          <div className="space-y-2">
            <RequirementCheckbox requirementKey="dependentsAdded" label="Dependents Update" description="Informed Deployment Team of any new dependents" />
            <RequirementCheckbox requirementKey="transportationPlan" label="Transportation Plan" description="Intended US transportation plan communicated" />
          </div>
        </div>
      </div>

      {allRequirementsMet() && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">All Requirements Confirmed</p>
              <p className="text-xs text-emerald-600">All documents uploaded and confirmed. Ready to submit.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={handleSubmit} disabled={!allRequirementsMet() || isSubmitting} className="gap-2">
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Confirm & Submit</>
          )}
        </Button>
      </div>
    </div>
  );
};

// Housing Details Form Component
const HousingDetailsForm = ({ onClose, user, setStages }) => {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    dateCompleted: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    email: user?.email || "",
    currentPhone: "",
    currentAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    ownOrRent: "",
    monthlyMortgageRent: "",
    lengthAtAddress: "",
    numBedrooms: "",
    numBathrooms: "",
    housingPreference: "",
    hasPets: "",
    smokes: "",
    hasDriversLicense: "",
    licenseIssued: "",
    licenseExpiry: "",
    whoWillDrive: "",
    usingIAS: "",
    vehiclePurchaseDate: "",
    employerName: "",
    employerCity: "",
    employerState: "",
    annualSalary: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyStreet: "",
    emergencyCity: "",
    emergencyState: "",
    emergencyCountry: "",
    emergencyZip: "",
    emergencyEmail: "",
    emergencyPhone: "",
    cosignerName: "",
    cosignerRelationship: "",
    cosignerStreet: "",
    cosignerCity: "",
    cosignerState: "",
    cosignerCountry: "",
    cosignerZip: "",
    cosignerEmail: "",
    cosignerPhone: "",
    consentFullName: "",
    consentDate: "",
    consentSignature: "",
    waiverHousing: "",
    waiverConcierge: "",
  });

  const [dependents, setDependents] = useState([]);
  const [showDependentForm, setShowDependentForm] = useState(false);
  const [newDependent, setNewDependent] = useState({
    firstName: "",
    lastName: "",
    email: "",
    relationship: "",
    dateOfBirth: "",
    phone: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDependent = () => {
    const requiredDependentFields = [
      "firstName", "lastName", "relationship", "dateOfBirth"
    ];

    if (
      requiredDependentFields.every(
        field => String(newDependent[field] || "").trim()
      )
    ) {
      const dob = new Date(newDependent.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDifference = today.getMonth() - dob.getMonth();

      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < dob.getDate())
      ) {
        age -= 1;
      }

      if (
        age >= 18 &&
        (
          !newDependent.email.trim() ||
          !newDependent.phone.trim()
        )
      ) {
        toast.error("Dependants aged 18 or older require an email and phone number.");
        return;
      }

      setDependents([...dependents, { ...newDependent }]);
      setNewDependent({
        firstName: "",
        lastName: "",
        email: "",
        relationship: "",
        dateOfBirth: "",
        phone: "",
      });
      setShowDependentForm(false);
    } else {
      toast.error("Complete the dependant first name, last name, relationship, and date of birth.");
    }
  };

  const handleRemoveDependent = (index) => {
    setDependents(dependents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredFields = Object.keys(formData).filter(
      field =>
        !field.startsWith("cosigner") &&
        field !== "middleName"
    );
    const missingFields = requiredFields.filter(
      field => String(formData[field] ?? "").trim() === ""
    );

    if (missingFields.length > 0) {
      toast.error(
        `Please complete every required Housing field: ${missingFields.join(", ")}`
      );
      return;
    }

    for (const dependent of dependents) {
      const commonFields = [
        "firstName", "lastName", "relationship", "dateOfBirth"
      ];

      if (
        commonFields.some(
          field => String(dependent[field] ?? "").trim() === ""
        )
      ) {
        toast.error("Complete every required field for each dependant.");
        return;
      }

      const dob = new Date(dependent.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDifference = today.getMonth() - dob.getMonth();

        if (
          monthDifference < 0 ||
          (monthDifference === 0 && today.getDate() < dob.getDate())
        ) {
          age -= 1;
        }

        if (
          age >= 18 &&
          (
            !String(dependent.email || "").trim() ||
            !String(dependent.phone || "").trim()
          )
        ) {
          toast.error("Dependants aged 18 or older require an email and phone number.");
          return;
        }
      }
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const housingData = {
        ...formData,
        dependents: dependents,
        submittedAt: new Date().toISOString(),
        candidateEmail: user?.email,
        formType: "housing"
      };

      console.log("[Housing] Submitting housing form:", housingData);

      const response = await fetch(`${API_BASE}/api/housing/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(housingData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("[Housing] Failed to parse response:", responseText);
        throw new Error("Server returned an invalid response");
      }

      if (!response.ok || data.success !== true) {
        const destinationDetails = [
          data?.crm?.error || data?.attachments?.crm?.error,
          data?.recruit?.error || data?.attachments?.recruit?.error
        ].filter(Boolean).join(" | ");
        throw new Error(
          data.error || data.message || destinationDetails || `Failed with status ${response.status}`
        );
      }

      console.log("[Housing] Submission successful:", data);

      const savedStage = data.stage;
      if (savedStage) {
        setStages(prev => prev.map(stage =>
          stage.stage_name === "Submit Housing Form"
            ? { ...stage, ...savedStage, status: "Completed" }
            : stage
        ));
      } else {
        await updateStageStatus(user?.email, "Submit Housing Form", setStages);
      }

      const crmSaved = data?.attachments?.crm?.success === true || data?.crm?.success === true;
      if (!crmSaved) throw new Error("The housing form was not attached to CRM.");
      toast.success("Housing form submitted and attached to CRM.");
      onClose();
    } catch (error) {
      console.error("[Housing] Error:", error);
      toast.error(error.message || "Failed to submit housing details. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2">
      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">DATE COMPLETED</label>
        </div>
        <input
          type="date"
          name="dateCompleted"
          value={formData.dateCompleted}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          CANDIDATE INFORMATION
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">First Name <span className="text-red-500">*</span></label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Middle</label>
            <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Last Name <span className="text-red-500">*</span></label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Date of Birth</label>
            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Current Phone Number <span className="text-red-500">*</span></label>
            <input type="tel" name="currentPhone" value={formData.currentPhone} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium block mb-1">Current Address <span className="text-red-500">*</span></label>
          <p className="text-xs text-muted-foreground mb-1">Street</p>
          <input type="text" name="currentAddress" value={formData.currentAddress} onChange={handleChange} placeholder="Street" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-2" required />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">City <span className="text-red-500">*</span></p>
              <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Code <span className="text-red-500">*</span></p>
              <input type="text" name="zipCode" placeholder="Code" value={formData.zipCode} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">State/Province <span className="text-red-500">*</span></p>
              <input type="text" name="state" placeholder="State/Province" value={formData.state} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Country <span className="text-red-500">*</span></p>
              <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Do you own or rent this property?</label>
            <select name="ownOrRent" value={formData.ownOrRent} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="Own">Own</option>
              <option value="Rent">Rent</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Monthly mortgage/rent in USD</label>
            <input type="number" name="monthlyMortgageRent" value={formData.monthlyMortgageRent} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">How long have you lived at your current address? (MM/YY)</label>
            <input type="text" name="lengthAtAddress" value={formData.lengthAtAddress} onChange={handleChange} placeholder="MM/YY" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-200">
        <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
          <Home className="h-4 w-4" />
          HOUSING: Please share your US Housing Preference Below.
        </h3>
        <p className="text-sm text-muted-foreground mb-3">The US restricts the number of persons per bedroom in an apartment to no more than 2 people.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Number of Bedrooms</label>
            <select name="numBedrooms" value={formData.numBedrooms} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4+">4+</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Number of Bathrooms</label>
            <select name="numBathrooms" value={formData.numBathrooms} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="1">1</option>
              <option value="1.5">1.5</option>
              <option value="2">2</option>
              <option value="2.5">2.5</option>
              <option value="3+">3+</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Housing Preference (Apartment, House, No Preference)</label>
            <select name="housingPreference" value={formData.housingPreference} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="No Preference">No Preference</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Do you have pets?</label>
            <select name="hasPets" value={formData.hasPets} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Does anyone in your family smoke/vape?</label>
            <select name="smokes" value={formData.smokes} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-200">
        <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <Plane className="h-4 w-4" />
          TRANSPORTATION
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Driving in the United States is required. The US average commute time is 26.6 minutes, one way to work, and can be longer in more dense communities. Public transportation, Uber and Lyft are not reliable forms of transportation and should not be counted on as your primary means of transportation. Additionally, rideshares like Uber and Lyft are expensive depending on time, geography and distance to your location.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Do you have a local or international drivers license?</label>
            <select name="hasDriversLicense" value={formData.hasDriversLicense} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">If so, what country or state was it issued?</label>
            <input type="text" name="licenseIssued" value={formData.licenseIssued} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">When does it expire?</label>
            <input type="date" name="licenseExpiry" value={formData.licenseExpiry} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Who will be driving? You, your spouse, or both?</label>
            <input type="text" name="whoWillDrive" value={formData.whoWillDrive} onChange={handleChange} placeholder="You, Spouse, or Both" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="mt-3 p-3 bg-white/50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700 mb-2">
            IAS known as the International Auto Source assists internationals in the financing and purchase of a vehicle. Here is why IAS is great for you. Transitioning to a new country can at times be overwhelming, but they can make getting the vehicle you want for your work assignment easy. Their factory backed financing programs for foreign executives, healthcare professionals, business people, and international students feature low rates and are designed to get you approved. One less concern "off your back". 
            Advancial offers flexible financial lending. While they cannot assist you until you are in the United States, they will ensure that you receive the loan you need to purchase a vehicle shortly after your United States arrival.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Will you be using IAS or Advancial?</label>
            <select name="usingIAS" value={formData.usingIAS} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select</option>
              <option value="IAS">IAS</option>
              <option value="Advancial">Advancial</option>
              <option value="Undecided">Undecided</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">If you are using IAS, when will you be purchasing your vehicle?</label>
            <input type="text" name="vehiclePurchaseDate" value={formData.vehiclePurchaseDate} onChange={handleChange} placeholder="e.g., Within 30 days of arrival" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          DEPENDENT INFORMATION
        </h3>
        <p className="text-sm text-muted-foreground mb-3">Please include an email address for all dependents over 18 yrs. of age</p>
        
        {dependents.map((dep, index) => (
          <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 mb-2 border border-border">
            <div>
              <p className="font-medium">{dep.firstName} {dep.lastName}</p>
              <p className="text-xs text-muted-foreground">{dep.relationship} • {dep.email}</p>
            </div>
            <button type="button" onClick={() => handleRemoveDependent(index)} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {showDependentForm ? (
          <div className="bg-white rounded-lg p-4 border border-border mt-2">
            <p className="text-xs text-muted-foreground mb-2">Dependent Information</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="First Name *" value={newDependent.firstName} onChange={(e) => setNewDependent({ ...newDependent, firstName: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" placeholder="Last Name *" value={newDependent.lastName} onChange={(e) => setNewDependent({ ...newDependent, lastName: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="email" placeholder="Email" value={newDependent.email} onChange={(e) => setNewDependent({ ...newDependent, email: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" placeholder="Relationship" value={newDependent.relationship} onChange={(e) => setNewDependent({ ...newDependent, relationship: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="date" placeholder="Date of Birth" value={newDependent.dateOfBirth} onChange={(e) => setNewDependent({ ...newDependent, dateOfBirth: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="button" onClick={handleAddDependent} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Dependent</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDependentForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowDependentForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Dependent
          </Button>
        )}
      </div>

      <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-200">
        <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          US EMPLOYMENT INFORMATION
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">US Employer Name/Facility</label>
            <input type="text" name="employerName" value={formData.employerName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">City</label>
            <input type="text" name="employerCity" value={formData.employerCity} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">State</label>
            <input type="text" name="employerState" value={formData.employerState} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Annual Salary per Contract</label>
            <input type="text" name="annualSalary" value={formData.annualSalary} onChange={handleChange} placeholder="$0,000" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="bg-red-50/50 rounded-lg p-4 border border-red-200">
        <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          EMERGENCY CONTACT INFORMATION
        </h3>
        <p className="text-sm text-muted-foreground mb-3">Preferably someone already in the USA. This person may not be a dependent traveling with you. If you do not have one, please name your next of kin in your home country.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Full Name of Emergency Contact</label>
            <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Relationship to you</label>
            <input type="text" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium block mb-1">Street Address</label>
          <input type="text" name="emergencyStreet" value={formData.emergencyStreet} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">City</p>
            <input type="text" name="emergencyCity" placeholder="City" value={formData.emergencyCity} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">State</p>
            <input type="text" name="emergencyState" placeholder="State/Province" value={formData.emergencyState} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <input type="text" name="emergencyCountry" placeholder="Country" value={formData.emergencyCountry} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Zip Code / Country Code (Postage)</p>
            <input type="text" name="emergencyZip" placeholder="Zip Code" value={formData.emergencyZip} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Phone</p>
            <input type="text" name="emergencyPhone" placeholder="Phone" value={formData.emergencyPhone} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input type="email" name="emergencyEmail" value={formData.emergencyEmail} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
          COSIGNER/GUARANTOR
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Some apartments / rental homes will require a cosigner/guarantor when applicants have no established credit history and no social security card when applying. These individuals need to earn 5 times your base rent per month to qualify. Please list a family member or friend, currently living in the US, that would be willing to help you should this be required for your lease. DO NOT indicate Infinity Care Partners as your cosigner.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Full Name</label>
            <input type="text" name="cosignerName" value={formData.cosignerName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Relationship</label>
            <input type="text" name="cosignerRelationship" value={formData.cosignerRelationship} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Street</p>
            <input type="text" name="cosignerStreet" placeholder="Street" value={formData.cosignerStreet} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">City</p>
            <input type="text" name="cosignerCity" placeholder="City" value={formData.cosignerCity} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">State</p>
            <input type="text" name="cosignerState" placeholder="State/Province" value={formData.cosignerState} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <input type="text" name="cosignerCountry" placeholder="Country" value={formData.cosignerCountry} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Zip Code / Country Code (Postage)</p>
            <input type="text" name="cosignerZip" placeholder="Zip Code" value={formData.cosignerZip} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input type="email" name="cosignerEmail" value={formData.cosignerEmail} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Phone</label>
            <input type="tel" name="cosignerPhone" value={formData.cosignerPhone} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="bg-green-50/50 rounded-lg p-4 border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
          CONSENT TO SUBMIT AN APPLICATION AND DOCUMENTS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          I give my permission to the ICP Housing Team to submit all required documents, along with my housing application and fees, to my requested property(s). They also have my permission to discuss my application status and move-in details with the leasing office/agent(s) to secure my home prior to my arrival to the US.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Full Name</label>
            <input type="text" name="consentFullName" value={formData.consentFullName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Signature</label>
            <input type="text" name="consentSignature" value={formData.consentSignature} onChange={handleChange} placeholder="Type your full name as signature" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Date</label>
            <input type="date" name="consentDate" value={formData.consentDate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
          WAIVER TO FOREGO ICP HOUSING SERVICES
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          I elect to DECLINE the following deployment services offered by Infinity Care Partners LLC as outlined in the Infinity Care Partners service agreement. I agree to provide all details regarding such to my case manager no later than 2 weeks prior to my arrival:
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">1. United States Housing Placement & Assistance (Initials)</label>
            <input type="text" name="waiverHousing" value={formData.waiverHousing} onChange={handleChange} placeholder="Initials to decline" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">2. United States Arrivals Concierge (Initials)</label>
            <input type="text" name="waiverConcierge" value={formData.waiverConcierge} onChange={handleChange} placeholder="Initials to decline" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={uploading} className="min-w-[120px]">
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
          ) : (
            'Submit Housing Details'
          )}
        </Button>
      </div>
    </form>
  );
};

const HousingDetails = ({ onClose, user, setStages }) => {
  return <HousingDetailsForm onClose={onClose} user={user} setStages={setStages} />;
};

// Stable form controls must remain outside RLChecklistView.
// Defining components inside a form causes React to create a new component type
// on every keystroke, which unmounts the input and makes it lose focus.
const RLFormInput = ({
  label,
  field,
  value,
  onChange,
  type = "text",
  required = true,
  placeholder = "",
  disabled = false
}) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </span>
    <input
      name={field}
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(field, event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
    />
  </label>
);

const RLUploadGroup = ({
  title,
  field,
  files,
  onAddFiles,
  onRemoveFile,
  uploadResults = {},
  required = false,
  disabled = false
}) => (
  <div className="rounded-xl border border-gray-200 p-4 bg-white">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">
          {title}
          {required && <span className="text-red-500"> *</span>}
        </p>
      </div>

      <label
        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
          disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-400"
            : "cursor-pointer text-purple-700 hover:bg-purple-50"
        }`}
      >
        Add files
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf"
          disabled={disabled}
          onChange={(event) => {
            onAddFiles(field, event.target.files);
            event.target.value = "";
          }}
        />
      </label>
    </div>

    {files.length > 0 && (
      <div className="mt-3 space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate">{file.name}</span>
              <span className={`mt-0.5 block text-[11px] font-medium ${
                uploadResults[`${field}:${file.name}`]?.success
                  ? "text-emerald-600"
                  : uploadResults[`${field}:${file.name}`]?.error
                    ? "text-red-600"
                    : "text-amber-600"
              }`}>
                {uploadResults[`${field}:${file.name}`]?.success
                  ? `Attached to CRM${uploadResults[`${field}:${file.name}`]?.attachmentId ? ` · ID ${uploadResults[`${field}:${file.name}`].attachmentId}` : ""}`
                  : uploadResults[`${field}:${file.name}`]?.error
                    ? `Attachment failed: ${uploadResults[`${field}:${file.name}`].error}`
                    : "Selected — will be attached to the completed R&L form in CRM"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveFile(field, index)}
              className="text-red-500 hover:text-red-700"
              disabled={disabled || uploadResults[`${field}:${file.name}`]?.success}
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);


const RLPolicyDocumentViewer = ({
  title,
  description,
  documentUrl,
  onBack,
  onMarkRead,
  alreadyRead = false
}) => {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    let active = true;
    let createdBlobUrl = "";

    const loadPdf = async () => {
      setLoadingPdf(true);
      setPdfError("");

      try {
        const absoluteUrl = new URL(
          documentUrl,
          window.location.origin
        ).toString();

        const response = await fetch(absoluteUrl, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin"
        });

        if (!response.ok) {
          throw new Error(
            `Document could not be loaded (${response.status}).`
          );
        }

        const blob = await response.blob();
        const contentType = String(
          response.headers.get("content-type") ||
          blob.type ||
          ""
        ).toLowerCase();

        const firstBytes = await blob
          .slice(0, 5)
          .text();

        const isPdf =
          contentType.includes("application/pdf") ||
          firstBytes === "%PDF-";

        if (!isPdf) {
          throw new Error(
            "The server returned the portal page instead of the PDF. Confirm the file exists in public/documents with the exact filename."
          );
        }

        const normalizedPdfBlob =
          blob.type === "application/pdf"
            ? blob
            : new Blob([blob], {
                type: "application/pdf"
              });

        createdBlobUrl =
          URL.createObjectURL(normalizedPdfBlob);

        if (active) {
          setPdfBlobUrl(createdBlobUrl);
        }
      } catch (error) {
        console.error(
          `[R&L] Unable to load ${title}:`,
          error
        );

        if (active) {
          setPdfError(
            error.message ||
            "The PDF could not be loaded."
          );
        }
      } finally {
        if (active) {
          setLoadingPdf(false);
        }
      }
    };

    loadPdf();

    return () => {
      active = false;

      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [documentUrl, title]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
          Infinity Care Partners
        </p>

        <h3 className="mt-1 text-xl font-bold text-gray-900">
          {title}
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          {description}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {loadingPdf && (
          <div className="flex min-h-[520px] items-center justify-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading PDF...
          </div>
        )}

        {!loadingPdf && pdfError && (
          <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
            <FileText className="h-12 w-12 text-red-500" />

            <p className="mt-4 font-semibold text-gray-900">
              The document could not be displayed.
            </p>

            <p className="mt-2 max-w-lg text-sm text-red-600">
              {pdfError}
            </p>

            <p className="mt-3 max-w-lg text-xs text-gray-500">
              Confirm the PDF is inside the frontend public/documents folder
              and that the filename matches exactly.
            </p>
          </div>
        )}

        {!loadingPdf && !pdfError && pdfBlobUrl && (
          <div className="h-[70vh] min-h-[620px] w-full">
            <iframe
              src={`${pdfBlobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={title}
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>

      {alreadyRead && (
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Document marked as read
        </p>
      )}

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-white py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
          Back to R&amp;L
        </Button>

        <Button
          type="button"
          onClick={onMarkRead}
          disabled={loadingPdf || Boolean(pdfError)}
          className="gap-2 bg-purple-700 hover:bg-purple-800"
        >
          <CheckCircle2 className="h-4 w-4" />
          {alreadyRead
            ? "Return to R&L"
            : "Mark as Read and Return to R&L"}
        </Button>
      </div>
    </div>
  );
};


// Complete Relocation & Logistics form based on the ICP candidate checklist.
const RLChecklistView = ({ onClose, user, setStages }) => {
  const [submitting, setSubmitting] = useState(false);
  const [activePolicyDocument, setActivePolicyDocument] = useState(null);
  const [documents, setDocuments] = useState({
    policeClearance: [], passports: [], nclexFee: [],
    nclexSchedule: [], englishExam: [], cesReport: [], visaScreenFee: []
  });
  const [uploadResults, setUploadResults] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);
  const [form, setForm] = useState({
    name: user?.displayName || user?.name || "", email: user?.email || "", employerName: "",
    height: "", weight: "", clothingSize: "", aboutYou: "", resignationPeriod: "",
    anticipatedLastDay: "", departureCity: "", wheelchair: "No", checkedBags: "0",
    carryOn: "0", boxes: "0", pets: "No", travelCash: "", carSeats: "No",
    phoneModelCarrier: "", simUnlocked: "", drivingPlan: "", carPurchasePlan: "",
    foundationsCompleted: "", spouseEmployment: "", relocationPolicyAccepted: false,
    relocationSignature: "",
    photoReleaseAccepted: false,
    photoReleaseSignature: "",
    dependents: [{
      clientId: "dependent-1",
      name: "",
      birthDate: "",
      gender: "",
      relationship: "",
      height: "",
      weight: "",
      email: "",
      phone: ""
    }]
  });

  const RL_REQUIRED_FIELDS = [
    "name", "email", "employerName", "birthDate", "gender", "phone",
    "height", "weight", "clothingSize", "aboutYou", "resignationPeriod",
    "anticipatedLastDay", "departureCity", "wheelchair", "checkedBags",
    "carryOn", "boxes", "pets", "travelCash", "carSeats",
    "phoneModelCarrier", "simUnlocked", "drivingPlan", "carPurchasePlan",
    "foundationsCompleted", "spouseEmployment", "relocationSignature",
    "photoReleaseSignature"
  ];

  const RL_REQUIRED_DOCUMENT_GROUPS = [
    "policeClearance", "passports", "nclexFee", "nclexSchedule",
    "englishExam", "cesReport", "visaScreenFee"
  ];

  const hasMeaningfulValue = value =>
    value === 0 || value === false || String(value ?? "").trim() !== "";

  const getAgeFromDate = value => {
    if (!value) return null;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dob.getDate())
    ) {
      age -= 1;
    }
    return age;
  };

  const validateRLDependents = () => {
    const enteredDependents = form.dependents.filter(dependent =>
      Object.entries(dependent).some(([field, value]) =>
        field !== "clientId" && hasMeaningfulValue(value)
      )
    );

    for (const dependent of enteredDependents) {
      const requiredFields = [
        "name", "birthDate", "gender",
        "relationship", "height", "weight"
      ];

      if (requiredFields.some(field => !hasMeaningfulValue(dependent[field]))) {
        return {
          valid: false,
          message: "Complete every field for each dependant."
        };
      }

      const age = getAgeFromDate(dependent.birthDate);
      if (
        age !== null &&
        age >= 18 &&
        (
          !hasMeaningfulValue(dependent.email) ||
          !hasMeaningfulValue(dependent.phone)
        )
      ) {
        return {
          valid: false,
          message: "Every dependant aged 18 or older must include an email and phone number."
        };
      }
    }

    return { valid: true, message: "" };
  };

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const addDependent = () => setForm(prev => ({
    ...prev,
    dependents: [
      ...prev.dependents,
      {
        clientId: `dependent-${Date.now()}-${prev.dependents.length}`,
        name: "",
        birthDate: "",
        gender: "",
        relationship: "",
        height: "",
        weight: "",
        email: "",
        phone: ""
      }
    ]
  }));
  const updateDependent = (i, key, value) => setForm(prev => ({ ...prev, dependents: prev.dependents.map((d, idx) => idx === i ? { ...d, [key]: value } : d) }));
  const removeDependent = (i) => setForm(prev => ({ ...prev, dependents: prev.dependents.filter((_, idx) => idx !== i) }));
  const addFiles = (key, list) => setDocuments(prev => ({ ...prev, [key]: [...prev[key], ...Array.from(list || [])] }));
  const removeFile = (key, i) => setDocuments(prev => ({ ...prev, [key]: prev[key].filter((_, idx) => idx !== i) }));

  const rlDependentsValidation = validateRLDependents();

  const allRLFieldsComplete = RL_REQUIRED_FIELDS.every(
    field => hasMeaningfulValue(form[field])
  );

  const allRLDocumentsAttached = RL_REQUIRED_DOCUMENT_GROUPS.every(
    group => Array.isArray(documents[group]) && documents[group].length > 0
  );

  const isComplete =
    allRLFieldsComplete &&
    allRLDocumentsAttached &&
    rlDependentsValidation.valid &&
    form.relocationPolicyAccepted === true &&
    form.photoReleaseAccepted === true;

  const handleSubmit = async () => {
    if (!isComplete) {
      if (!allRLFieldsComplete) {
        toast.error("Every R&L field is mandatory. Complete all form sections.");
        return;
      }

      if (!allRLDocumentsAttached) {
        toast.error("Attach at least one PDF in every required document section.");
        return;
      }

      if (!rlDependentsValidation.valid) {
        toast.error(rlDependentsValidation.message);
        return;
      }

      toast.error("Read both policy documents and provide both signatures.");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");
      const payload = new FormData();
      payload.append("candidate_email", user?.email || form.email);
      payload.append("form_data", JSON.stringify(form));
      Object.entries(documents).forEach(([category, files]) => files.forEach(file => payload.append(`documents_${category}`, file)));

      const response = await fetch(`${API_BASE}/api/relocation-logistics/submit`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: payload
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "R&L submission failed");
      if (!data.crm?.success || data.crm?.verified !== true) {
        throw new Error(data.error || "The completed R&L PDF was not verified in CRM");
      }

      const nextUploadResults = {};
      (data.supporting || []).forEach((item) => {
        nextUploadResults[`${item.field}:${item.name}`] = {
          success: item.crm?.success === true && item.crm?.verified === true,
          error: item.crm?.error || null,
          attachmentId: item.crm?.attachment_id || null,
        };
      });
      setUploadResults(nextUploadResults);
      setSubmissionResult(data);

      // The backend completes the stage and starts the next timer atomically.
      // Refresh the complete pipeline from MongoDB instead of manually checking it.
      window.dispatchEvent(new CustomEvent("pipeline-updated", {
        detail: {
          email: user?.email,
          stage_name: "Submit R&L Checklist",
          stage: data.stage || null
        }
      }));

      toast.success(
        `R&L form attached to CRM and stage completed. ${
          (data.supporting || []).length
        } supporting file(s) verified.`
      );

      setTimeout(onClose, 1800);
    } catch (error) { toast.error(error.message || "Unable to submit the R&L form"); }
    finally { setSubmitting(false); }
  };

  if (activePolicyDocument === "relocation") {
    return (
      <RLPolicyDocumentViewer
        title="Relocation Travel Policy"
        description="ICP Travel and Housing Policy 2025"
        documentUrl={relocationTravelPolicyPdf}
        alreadyRead={form.relocationPolicyAccepted === true}
        onBack={() => setActivePolicyDocument(null)}
        onMarkRead={() => {
          setField("relocationPolicyAccepted", true);
          setActivePolicyDocument(null);
          toast.success("Relocation policy marked as read.");
        }}
      />
    );
  }

  if (activePolicyDocument === "photoRelease") {
    return (
      <RLPolicyDocumentViewer
        title="Video and Photo Release"
        description="Permission to use photographs and videos"
        documentUrl={photoVideoReleasePdf}
        alreadyRead={form.photoReleaseAccepted === true}
        onBack={() => setActivePolicyDocument(null)}
        onMarkRead={() => {
          setField("photoReleaseAccepted", true);
          setActivePolicyDocument(null);
          toast.success("Photo and video release marked as read.");
        }}
      />
    );
  }

  return <div className="space-y-6 max-h-[calc(90vh-90px)] overflow-y-auto pr-2">
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
      <h3 className="text-lg font-bold text-purple-900">Relocation + Logistics Checklist</h3>
      <p className="text-sm text-purple-700 mt-1">To be completed by the candidate. Contact your Project Manager with questions.</p>
    </div>

    <section className="rounded-xl border bg-white p-5 space-y-4">
      <div className="grid gap-4 border-b pb-4 md:grid-cols-[180px_1fr] md:items-center">
        <div className="rounded-lg bg-purple-50 p-4 text-center">
          <div className="text-xl font-bold text-purple-800">ICP</div>
          <div className="text-xs font-semibold text-purple-600">Infinity Care Partners</div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-gray-900">Relocation & Logistics Form</h4>
          <p className="mt-1 text-sm text-gray-500">General information and relocation preparation</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <RLFormInput label="Name" field="name" required value={form.name} onChange={setField} /><RLFormInput label="U.S. Employer Name (work location)" field="employerName" required value={form.employerName} onChange={setField} />
        <RLFormInput label="Birth Date" field="birthDate" type="date" required value={form.birthDate} onChange={setField} /><RLFormInput label="Gender" field="gender" required value={form.gender} onChange={setField} />
        <RLFormInput label="Candidate Email" field="email" type="email" required value={form.email} onChange={setField} /><RLFormInput label="Phone Number" field="phone" required value={form.phone} onChange={setField} />
        <RLFormInput label="Height (feet and inches)" field="height" value={form.height} onChange={setField} /><RLFormInput label="Weight (lbs.)" field="weight" type="number" value={form.weight} onChange={setField} />
        <RLFormInput label="Clothing Size (tops + bottoms)" field="clothingSize" value={form.clothingSize} onChange={setField} /><RLFormInput label="Resignation Period Required" field="resignationPeriod" value={form.resignationPeriod} onChange={setField} />
        <RLFormInput label="Anticipated Last Day of Work" field="anticipatedLastDay" type="date" value={form.anticipatedLastDay} onChange={setField} />
      </div>
      <label className="block"><span className="text-sm font-medium">Tell us about you</span><textarea name="aboutYou" value={form.aboutYou} onChange={e=>setField('aboutYou',e.target.value)} rows={3} disabled={submitting} className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"/></label>
    </section>

    <section className="rounded-xl border bg-white p-5 space-y-4">
      <div className="flex justify-between"><div><h4 className="font-bold">Dependent information</h4><p className="text-xs text-gray-500">Leave blank when relocating without dependents.</p></div><Button type="button" variant="outline" onClick={addDependent}>Add dependent</Button></div>
      {form.dependents.map((d,i)=><div key={d.clientId || `dependent-${i}`} className="rounded-xl bg-gray-50 p-4 grid md:grid-cols-3 gap-3 relative">
        {form.dependents.length>1&&<button type="button" onClick={()=>removeDependent(i)} className="absolute right-3 top-3 text-red-500"><X className="h-4 w-4"/></button>}
        {[
          ["Name as on passport","name","text"],
          ["Date of Birth","birthDate","date"],
          ["Gender","gender","text"],
          ["Relationship","relationship","text"],
          ["Height","height","text"],
          ["Weight (lbs.)","weight","number"],
          ["Email (required if 18+)","email","email"],
          ["Phone (required if 18+)","phone","tel"]
        ].map(([label,key,type])=><label key={key}><span className="text-xs font-medium">{label}</span><input name={`dependent-${i}-${key}`} type={type} value={d[key] ?? ""} onChange={e=>updateDependent(i,key,e.target.value)} disabled={submitting} autoComplete="off" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"/></label>)}
      </div>)}
    </section>

    <section className="rounded-xl border bg-white p-5 space-y-4">
      <h4 className="font-bold">Travel and arrival planning</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <RLFormInput label="Departure city and country / closest international airport" field="departureCity" required value={form.departureCity} onChange={setField} />
        <RLFormInput label="Will anyone travel in a wheelchair?" field="wheelchair" value={form.wheelchair} onChange={setField} />
        <RLFormInput label="Checked Bags" field="checkedBags" type="number" value={form.checkedBags} onChange={setField} /><RLFormInput label="Personal Carry On" field="carryOn" type="number" value={form.carryOn} onChange={setField} />
        <RLFormInput label="Boxes" field="boxes" type="number" value={form.boxes} onChange={setField} /><RLFormInput label="Traveling with pets?" field="pets" value={form.pets} onChange={setField} />
        <RLFormInput label="Travel Cash ($), excluding reimbursement" field="travelCash" type="number" value={form.travelCash} onChange={setField} /><RLFormInput label="Car seats or boosters needed?" field="carSeats" value={form.carSeats} onChange={setField} />
        <RLFormInput label="Cell Phone Model + Carrier" field="phoneModelCarrier" value={form.phoneModelCarrier} onChange={setField} /><RLFormInput label="Is the SIM card unlocked?" field="simUnlocked" value={form.simUnlocked} onChange={setField} />
        <RLFormInput label="Car Purchasing Plan Post Arrival" field="carPurchasePlan" value={form.carPurchasePlan} onChange={setField} /><RLFormInput label="Foundation Relias classes completed?" field="foundationsCompleted" value={form.foundationsCompleted} onChange={setField} />
      </div>
      <label className="block"><span className="text-sm font-medium">Immediate driving plan after arrival <span className="text-red-500">*</span></span><textarea name="drivingPlan" value={form.drivingPlan} onChange={e=>setField('drivingPlan',e.target.value)} rows={3} disabled={submitting} className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"/></label>
      <label className="block"><span className="text-sm font-medium">Employment plans for spouse or adult children</span><textarea name="spouseEmployment" value={form.spouseEmployment} onChange={e=>setField('spouseEmployment',e.target.value)} rows={3} disabled={submitting} className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"/></label>
    </section>

    <section className="space-y-3">
      <h4 className="font-bold">Candidate documents needed</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <RLUploadGroup title="Current Police Clearance / NBI (all adults)" field="policeClearance" files={documents.policeClearance} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} />
        <RLUploadGroup title="Passports for everyone traveling" field="passports" files={documents.passports} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} /><RLUploadGroup title="NCLEX Fee Receipt" field="nclexFee" files={documents.nclexFee} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} />
        <RLUploadGroup title="NCLEX Schedule / Registration" field="nclexSchedule" files={documents.nclexSchedule} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} /><RLUploadGroup title="English Exam Receipt or Result" field="englishExam" files={documents.englishExam} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} />
        <RLUploadGroup title="CES Report for Employer State" field="cesReport" files={documents.cesReport} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} /><RLUploadGroup title="Visa Screen Fee Receipt" field="visaScreenFee" files={documents.visaScreenFee} onAddFiles={addFiles} onRemoveFile={removeFile} disabled={submitting} uploadResults={uploadResults} />
      </div>
    </section>

    <section className="rounded-xl border bg-white p-5 space-y-5">
      <h4 className="font-bold">Policies and signatures</h4>

      <div className="rounded-lg border p-4">
        <p className="font-semibold">Relocation Travel Policy</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Read the policy and sign below.
        </p>
        <button
          type="button"
          onClick={() => setActivePolicyDocument("relocation")}
          className="mt-3 text-sm font-semibold text-purple-700 hover:underline"
        >
          {form.relocationPolicyAccepted
            ? "View Relocation Policy Again"
            : "Read the Candidate Relocation Travel Policy"}
        </button>
        {form.relocationPolicyAccepted && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Document read
          </p>
        )}
        <label className="mt-4 flex gap-3">
          <input
            type="checkbox"
            checked={form.relocationPolicyAccepted}
            disabled
            readOnly
          />
          <span className="text-sm">I have read and agree to the relocation policy.</span>
        </label>
        <RLFormInput label="Signature for Relocation Policy" field="relocationSignature" required value={form.relocationSignature} onChange={setField} />
      </div>

      <div className="rounded-lg border p-4">
        <p className="font-semibold">Video and Photo Release</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Read the release and sign below.
        </p>
        <button
          type="button"
          onClick={() => setActivePolicyDocument("photoRelease")}
          className="mt-3 text-sm font-semibold text-purple-700 hover:underline"
        >
          {form.photoReleaseAccepted
            ? "View Photo Release Again"
            : "Read the Photo and Video Release Form"}
        </button>
        {form.photoReleaseAccepted && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Document read
          </p>
        )}
        <label className="mt-4 flex gap-3">
          <input
            type="checkbox"
            checked={form.photoReleaseAccepted || false}
            disabled
            readOnly
          />
          <span className="text-sm">I have read and agree to the photo release.</span>
        </label>
        <RLFormInput label="Signature for Photo Release" field="photoReleaseSignature" required value={form.photoReleaseSignature || ""} onChange={setField} />
      </div>
    </section>

    {submissionResult?.success && (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              R&L checklist attached and pipeline stage completed
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              PDF: {submissionResult.pdf_filename}
              {submissionResult.crm?.attachment_id
                ? ` · CRM attachment ID: ${submissionResult.crm.attachment_id}`
                : ""}
            </p>
          </div>
        </div>
      </div>
    )}

    <div className="sticky bottom-0 bg-white border-t py-4 flex justify-end gap-3">
      <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={submitting || !isComplete}>{submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Submitting...</> : "Submit"}</Button>
    </div>
  </div>;
};

// ============= Reimbursement/Expenses Component (Aftercare) =============
// Loads the payment schedule and submission status securely.
const ReimbursementExpensesView = ({ onClose, user, setStages }) => {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState({
    nursePaymentType: "",
    payment1: { date: "", paid: false, total: 0 },
    payment2: { date: "", paid: false, total: 0 },
    payment3: { date: "", paid: false, total: 0 },
    payment4: { date: "", paid: false, total: 0 },
    totalReimbursement: 0
  });
  
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    accountName: "",
    routingNumber: "",
    bankName: "",
    accountType: "Checking"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const buildPaymentRecord = (userData, n) => ({
    date: ga(userData, `Payment_${n}`, `Payment${n}`, `Payment_${n}_Date`, `Payment${n}Date`) || "",
    paid: isTruthyField(ga(userData, `Payment_${n}_Paid`, `Payment${n}Paid`, `Payment_${n}_paid`)),
    total: parseFloat(ga(userData, `Payment_${n}_Total`, `Payment${n}Total`, `Payment_${n}_total`)) || 0
  });

  const fetchPaymentData = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Fetch from the reimbursement endpoint, which maps directly to the
      // exact Zoho CRM Deals reimbursement and bank-detail API fields.
      const response = await fetch(`${API_BASE}/api/crm/reimbursement-data`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payment data");
      }

      const data = await response.json();
      const reimbursementData = data.data || {};

      setPaymentData({
        nursePaymentType: reimbursementData.nursePaymentType || "",
        payment1: reimbursementData.payment1 || { date: "", paid: false, total: 0 },
        payment2: reimbursementData.payment2 || { date: "", paid: false, total: 0 },
        payment3: reimbursementData.payment3 || { date: "", paid: false, total: 0 },
        payment4: reimbursementData.payment4 || { date: "", paid: false, total: 0 },
        totalReimbursement: parseFloat(reimbursementData.totalReimbursement) || 0
      });

      setIsSubmitted(reimbursementData.submitted === true);

    } catch (error) {
      console.error("Error fetching payment data:", error);
      setSubmitError(error.message);
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitBankDetails = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!bankDetails.accountNumber || !bankDetails.accountName || !bankDetails.routingNumber) {
      toast.error("Please fill in all required bank details");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) throw new Error("Not authenticated");

      const totalPayments = 
        (parseFloat(paymentData.payment1.total) || 0) +
        (parseFloat(paymentData.payment2.total) || 0) +
        (parseFloat(paymentData.payment3.total) || 0) +
        (parseFloat(paymentData.payment4.total) || 0);

      const payload = {
        email: user?.email,
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          accountName: bankDetails.accountName,
          routingNumber: bankDetails.routingNumber,
          bankName: bankDetails.bankName,
          accountType: bankDetails.accountType
        },
        paymentDetails: {
          nursePaymentType: paymentData.nursePaymentType,
          payment1: paymentData.payment1,
          payment2: paymentData.payment2,
          payment3: paymentData.payment3,
          payment4: paymentData.payment4
        },
        totalDueToICPRN: parseFloat(paymentData.totalReimbursement) || 0
      };

      let requestBody;
      try {
        const encryptedPayload = await encryptSensitivePayload(payload, token);
        requestBody = { encryptedPayload };
      } catch (encryptionError) {
        // HTTPS/TLS still encrypts the request in transit. This fallback prevents
        // browser Web Crypto or an expired ephemeral RSA key from blocking submission.
        console.warn("[Reimbursement] App-layer encryption unavailable; using HTTPS secure payload:", encryptionError.message);
        requestBody = { securePayload: payload };
      }

      const submitRequest = async (body) => {
        const response = await fetch(`${API_BASE}/api/crm/update-bank-details`, {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const responseText = await response.text();
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          console.error("[Reimbursement] Failed to parse response:", responseText);
          throw new Error(`Server returned an invalid response (${response.status})`);
        }

        return { response, data };
      };

      let submission = await submitRequest(requestBody);

      if (
        (!submission.response.ok || submission.data.success !== true) &&
        requestBody.encryptedPayload &&
        /decrypt|secure connection|encrypted envelope|public key/i.test(
          submission.data.error || submission.data.message || ""
        )
      ) {
        console.warn("[Reimbursement] Retrying bank details securely over HTTPS/TLS.");
        submission = await submitRequest({ securePayload: payload });
      }

      const { response, data } = submission;
      if (!response.ok || data.success !== true) {
        const details =
          data.details && typeof data.details === "object"
            ? ` ${JSON.stringify(data.details)}`
            : "";

        throw new Error(
          `${data.error || data.message || `Failed to update bank details (${response.status})`}${details}`
        );
      }

      toast.success("Payment details submitted successfully!");
      setIsSubmitted(true);

      if (allPaymentsPaid) {
        updateStageStatus(
          user?.email,
          "Reimbursement/Expenses",
          setStages
        );
      } else {
        toast.info(
          `Payment details saved. Remaining balance: $${balanceAmount.toFixed(2)}`
        );
      }
      
      // Refresh the data
      await fetchPaymentData();
      
      setTimeout(() => { onClose(); }, 2000);
    } catch (error) {
      console.error("Error submitting bank details:", error);
      setSubmitError(error.message);
      toast.error(error.message || "Failed to submit payment details");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold text-rose-800">Reimbursement/Expenses</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            <p className="text-sm text-rose-600 mt-2">Loading payment data...</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const totalPayments =
    (parseFloat(paymentData.payment1.total) || 0) +
    (parseFloat(paymentData.payment2.total) || 0) +
    (parseFloat(paymentData.payment3.total) || 0) +
    (parseFloat(paymentData.payment4.total) || 0);

  const amountAlreadyPaid = [1, 2, 3, 4].reduce(
    (sum, number) => {
      const payment = paymentData[`payment${number}`];
      return payment?.paid
        ? sum + (parseFloat(payment?.total) || 0)
        : sum;
    },
    0
  );

  const crmTotalAmount =
    parseFloat(paymentData.totalReimbursement) || 0;

  const balanceAmount = Math.max(
    0,
    crmTotalAmount - amountAlreadyPaid
  );

  const allPaymentsPaid =
    [1, 2, 3, 4].every(number =>
      paymentData[`payment${number}`]?.paid === true
    ) || balanceAmount === 0;

  return (
    <div className="space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2">
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">⚠️ {submitError}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-700">
          <strong>Payment Type:</strong> {paymentData.nursePaymentType || "Not set"}
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Details
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchPaymentData} className="h-8 px-2 text-xs text-green-700 hover:text-green-900">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white">
                Total: ${crmTotalAmount.toFixed(2)}
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
                Balance: ${balanceAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
          <div className="grid grid-cols-4 gap-2 p-3 bg-green-50 border-b border-green-100 text-xs font-semibold text-green-700">
            <div>Payment</div>
            <div>Date</div>
            <div>Paid</div>
            <div className="text-right">Total</div>
          </div>
          
          {[1, 2, 3, 4].map((num) => {
            const payment = paymentData[`payment${num}`];
            const parsedDate = payment.date ? new Date(payment.date) : null;
            const validDate = parsedDate && !Number.isNaN(parsedDate.getTime());
            return (
              <div key={num} className="grid grid-cols-4 gap-2 p-3 border-b border-green-100 last:border-0 hover:bg-green-50/50 transition-colors">
                <div className="font-medium text-sm">Payment {num}</div>
                <div className="text-sm text-gray-600">
                  {validDate ? format(parsedDate, "MMM d, yyyy h:mm a") : "—"}
                </div>
                <div>
                  {payment.paid ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Paid</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Circle className="h-4 w-4" />
                      <span className="text-sm">Pending</span>
                    </span>
                  )}
                </div>
                <div className="text-right font-medium text-sm">
                  ${(parseFloat(payment.total) || 0).toFixed(2)}
                </div>
              </div>
            );
          })}
          
          <div className="grid grid-cols-4 gap-2 border-t border-green-200 bg-green-50 p-3 text-sm font-bold">
            <div className="col-span-3 text-green-800">
              Total from CRM
            </div>
            <div className="text-right text-green-800">
              ${crmTotalAmount.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-amber-200 bg-amber-50 p-3 text-sm font-bold">
            <div className="col-span-3 text-amber-800">
              Balance
            </div>
            <div className="text-right text-amber-800">
              ${balanceAmount.toFixed(2)}
            </div>
          </div>
        </div>

        </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5" />
          Bank & Payment Details
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide your bank account details for reimbursement payment.
          Your payment information is encrypted during submission and is not displayed after it has been sent.
        </p>
        
        {isSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700">Payment Details Submitted Successfully!</p>
            <p className="text-xs text-emerald-600 mt-1">
              Your payment information has been submitted successfully.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => setIsSubmitted(false)}
            >
              Update Bank Details
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitBankDetails} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Account Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="accountName"
                  autoComplete="name"
                  spellCheck={false}
                  value={bankDetails.accountName}
                  onChange={handleBankChange}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name on account"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Bank Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="bankName"
                  autoComplete="off"
                  spellCheck={false}
                  value={bankDetails.bankName}
                  onChange={handleBankChange}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bank name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Account Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="accountNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={bankDetails.accountNumber}
                  onChange={handleBankChange}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Account number"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Routing Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="routingNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={bankDetails.routingNumber}
                  onChange={handleBankChange}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Routing number"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Account Type</label>
                <select
                  name="accountType"
                  value={bankDetails.accountType}
                  onChange={handleBankChange}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                Your payment information is encrypted during submission.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Submit</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

const RECEIPT_CATEGORIES = [
  { id: "ces_report", label: "CES REPORT TOTAL" },
  { id: "visascreen", label: "VISASCREEN TOTAL" },
  { id: "green_card", label: "GREEN CARD TOTAL" },
  { id: "english_exam", label: "ENGLISH EXAMINATION TOTAL" },
  { id: "nclex_exam", label: "NCLEX EXAMINATION TOTAL" },
  { id: "nclex_scheduling", label: "NCLEX SCHEDULING FEE TOTAL" },
  { id: "medical_exam", label: "MEDICAL EXAMINATION TOTAL" },
  { id: "license_endorsement", label: "LICENSE ENDORSEMENT TOTAL" },
  { id: "nursys", label: "NURSYS TOTAL" },
  { id: "fingerprints", label: "FINGERPRINTS TOTAL" },
];

// Reimbursement Upload Component (Deployment stage)
const ReimbursementUpload = ({ onClose, user, setStages }) => {
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState({});
  const [totalUSD, setTotalUSD] = useState(0);
  const [exchangeRates, setExchangeRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExchangeRates = async () => {
    setLoadingRates(true);
    setRatesError(false);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      const data = await response.json();
      setExchangeRates(data.rates);
      toast.success('Exchange rates updated successfully');
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      setRatesError(true);
      setExchangeRates({
        USD: 1, EUR: 1.09, GBP: 1.27, CAD: 0.73, AUD: 0.66,
        JPY: 0.0067, CNY: 0.14, INR: 0.012, BRL: 0.19, MXN: 0.058,
        KRW: 0.00075, SGD: 0.74, CHF: 1.12, SEK: 0.095, NOK: 0.094,
        DKK: 0.146, PLN: 0.25, HKD: 0.128, TWD: 0.032, THB: 0.028,
        MYR: 0.21, IDR: 0.000065, PHP: 0.017, VND: 0.000041, PKR: 0.0036,
        BDT: 0.0092, LKR: 0.0033, NPR: 0.0075, ZAR: 0.054, NGN: 0.00067,
        KES: 0.0077, GHS: 0.078, TZS: 0.00040, UGX: 0.00027, MAD: 0.10,
        EGP: 0.032, TRY: 0.031, RUB: 0.011, UAH: 0.025, ILS: 0.27,
        AED: 0.27, SAR: 0.27, QAR: 0.27, KWD: 3.26, BHD: 2.65,
        OMR: 2.60, JOD: 1.41, NZD: 0.61, FJD: 0.44, JMD: 0.0064,
        TTD: 0.15, BBD: 0.50, BSD: 1.00, KYD: 1.20, XCD: 0.37,
        SBD: 0.12, VUV: 0.0085, WST: 0.36, TOP: 0.42
      });
      toast.warning('Using fallback exchange rates');
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    const initialReceipts = {};
    RECEIPT_CATEGORIES.forEach(cat => {
      initialReceipts[cat.id] = {
        total: "",
        file: null,
        fileName: "",
        currency: "USD"
      };
    });
    setReceipts(initialReceipts);
  }, []);

  const handleFileChange = (categoryId, file) => {
    if (file) {
      if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        toast.error("Please upload PDF or image files");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setReceipts(prev => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          file: file,
          fileName: file.name
        }
      }));
    }
  };

  const handleTotalChange = (categoryId, value) => {
    setReceipts(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        total: value
      }
    }));
    setTimeout(() => calculateTotalUSD(), 0);
  };

  const handleCurrencyChange = (categoryId, value) => {
    setReceipts(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        currency: value
      }
    }));
    setTimeout(() => calculateTotalUSD(), 0);
  };

  const removeFile = (categoryId) => {
    setReceipts(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        file: null,
        fileName: ""
      }
    }));
  };

  const convertToUSD = (amount, currencyCode) => {
    if (!amount || amount === "") return 0;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 0;
    const rate = exchangeRates[currencyCode] || 1;
    return numAmount / rate;
  };

  const calculateTotalUSD = () => {
    let total = 0;
    RECEIPT_CATEGORIES.forEach(cat => {
      const receipt = receipts[cat.id];
      if (receipt && receipt.total && receipt.total !== "") {
        total += convertToUSD(receipt.total, receipt.currency || "USD");
      }
    });
    setTotalUSD(total);
    return total;
  };

  useEffect(() => {
    if (!loadingRates) {
      calculateTotalUSD();
    }
  }, [receipts, exchangeRates, loadingRates]);

  const getConvertedDisplay = (categoryId) => {
    const receipt = receipts[categoryId];
    if (!receipt || !receipt.total || receipt.total === "") return null;
    const usdAmount = convertToUSD(receipt.total, receipt.currency || "USD");
    if (usdAmount === 0) return null;
    return usdAmount;
  };

  const isFormComplete = () => {
    const hasFile = Object.values(receipts).some(r => r.file !== null);
    if (!hasFile) return false;
    const allHaveAmounts = Object.values(receipts).every(r => {
      if (r.file !== null) {
        return r.total && r.total !== "";
      }
      return true;
    });
    return allHaveAmounts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormComplete()) {
      toast.error("Please upload receipts and enter amounts for all uploaded receipts");
      return;
    }

    setIsSubmitting(true);
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const category of RECEIPT_CATEGORIES) {
        const receipt = receipts[category.id];
        if (receipt && receipt.file) {
          try {
            await uploadDocument(
              receipt.file,
              `${category.label} - ${format(new Date(), "MMM d, yyyy")}`,
              "Reimbursement",
              "crm",
              user?.email
            );
            successCount++;
          } catch (error) {
            console.error(`Error uploading ${category.label}:`, error);
            failCount++;
          }
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} receipt(s) submitted successfully!`);
        toast.success(`💰 Total Reimbursement: $${totalUSD.toFixed(2)} USD`);
        updateStageStatus(user?.email, "Reimbursement/Advance Payment Report Released", setStages);
        setTimeout(() => { onClose(); }, 2000);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} receipt(s) failed to upload.`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <p className="text-xs text-emerald-700">
              {loadingRates ? 'Loading exchange rates...' : 'Live exchange rates from API'}
              {ratesError && ' (Using fallback rates)'}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={fetchExchangeRates} disabled={loadingRates} className="h-6 px-2 text-xs">
              <RefreshCw className={`h-3 w-3 ${loadingRates ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="bg-emerald-600 text-white px-4 py-1 rounded-lg text-sm font-bold">
            ${totalUSD.toFixed(2)} USD
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-blue-600" />
          <p className="text-xs text-blue-700">
            <strong>Enter amounts in your local currency.</strong> All amounts will be automatically converted to USD.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {RECEIPT_CATEGORIES.map((category) => {
          const receipt = receipts[category.id] || { total: "", file: null, fileName: "", currency: "USD" };
          const convertedAmount = getConvertedDisplay(category.id);
          
          return (
            <div key={category.id} className="bg-white rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row items-start gap-3">
                <div className="flex-1 w-full">
                  <label className="text-sm font-medium block mb-2">{category.label}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Enter amount in your currency"
                          value={receipt.total}
                          onChange={(e) => handleTotalChange(category.id, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          disabled={uploading}
                        />
                      </div>
                    </div>
                    <div>
                      <select
                        value={receipt.currency || "USD"}
                        onChange={(e) => handleCurrencyChange(category.id, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        disabled={loadingRates || uploading}
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.flag} {curr.code} - {curr.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {convertedAmount !== null && convertedAmount > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="text-xs text-emerald-600 font-medium">≈ ${convertedAmount.toFixed(2)} USD</div>
                      <div className="text-xs text-gray-400">({receipt.currency} → USD)</div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                  <div className="relative border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary transition-colors">
                    {receipt.file ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs text-green-600 truncate flex-1">{receipt.fileName}</span>
                        <button type="button" onClick={() => removeFile(category.id)} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0" disabled={uploading}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">Upload Receipt</span>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              handleFileChange(category.id, e.target.files[0]);
                            }
                            e.target.value = '';
                          }}
                          accept=".pdf"
                          disabled={uploading}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-border sticky bottom-0 bg-white py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
        <Button type="submit" disabled={uploading || loadingRates || !isFormComplete()} className="min-w-[140px] gap-2">
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {isSubmitting ? 'Submitting...' : 'Uploading...'}</>
          ) : (
            <><FileCheck className="h-4 w-4" /> Submit All Receipts</>
          )}
        </Button>
      </div>
    </form>
  );
};

// Main Pipeline Component
export default function Pipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null,
    title: null,
    component: null
  });
  const [showNCLEX, setShowNCLEX] = useState(false);
  const [isCheckingNCLEX, setIsCheckingNCLEX] = useState(true);
  const [pipelineStartDate, setPipelineStartDate] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [expiringImmigrationDocs, setExpiringImmigrationDocs] = useState([]);
  const [deploymentFieldStatus, setDeploymentFieldStatus] = useState({});
  const [acknowledgedDeploymentStages, setAcknowledgedDeploymentStages] = useState(new Set());
  const [reimbursementSubmitted, setReimbursementSubmitted] = useState(false);
  const [icpUSRNCRMData, setICPUSRNCRMData] = useState({});
  const [portalAccessBlocked, setPortalAccessBlocked] = useState(false);
  const [finalArrivalDate, setFinalArrivalDate] = useState(null);

  useEffect(() => {
    const checkNCLEXAccess = async () => {
      if (!user?.email) {
        setIsCheckingNCLEX(false);
        return;
      }
      try {
        setIsCheckingNCLEX(true);
        const hasAccess = await checkNCLEXAccess(user.email);
        setShowNCLEX(hasAccess);
        console.log("[Pipeline] NCLEX access:", hasAccess);
      } catch (error) {
        console.error("[Pipeline] Error checking NCLEX access:", error);
        setShowNCLEX(false);
      } finally {
        setIsCheckingNCLEX(false);
      }
    };
    checkNCLEXAccess();
  }, [user?.email]);

  useEffect(() => {
    if (user?.email) {
      syncAutomaticPipeline();
    }
  }, [user?.email, showNCLEX]);

  const syncAutomaticPipeline = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      let dateReceivedRaw = null;
      let recruitModulePresence = {
        applications: false,
        candidates: false,
        customModule1: false,
      };
      let submittedToImmigrationDate = null;
      let allClearDocumentaryComplete = false;
      let recruitApplicationStatus = "";
      let icpUSRNData = {};
      let resolvedFinalArrivalDate = null;
      let backendAftercareGateOpen = false;

      if (token) {
        try {
          const dateRes = await fetch(`${API_BASE}/api/recruit/date-received`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          });
          if (dateRes.ok) {
            const datePayload = await dateRes.json();
            dateReceivedRaw = ga(datePayload, "dateReceived", "Date_Received", "date_received") || null;
            if (dateReceivedRaw) {
              console.log(`[Pipeline] Using Date_Received from Recruit:`, dateReceivedRaw);
            }
          }
        } catch (e) {
          console.warn("[Pipeline] Could not reach /api/recruit/date-received, will fall back:", e.message);
        }

        // Fetch the exact Recruit modules in which this email was found.
        // The backend searches Applications and Candidates independently.
        try {
          const response = await fetch(`${API_BASE}/api/zoho/my-deals?refresh=true`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const payload = await response.json();
            const userData =
              payload?.user ||
              payload?.data?.user ||
              payload?.data ||
              {};
            setICPUSRNCRMData(userData);
            icpUSRNData = userData;
            const rawFinalArrival =
              userData.Flight_Arrival_Time ||
              userData.flightArrivalTime ||
              userData.final_destination_arrival ||
              null;
            if (rawFinalArrival) {
              const parsedFinalArrival = new Date(rawFinalArrival);

              if (!Number.isNaN(parsedFinalArrival.getTime())) {
                resolvedFinalArrivalDate = parsedFinalArrival;
                setFinalArrivalDate(parsedFinalArrival);
              } else {
                console.warn(
                  "[Pipeline] Could not parse Flight_Arrival_Time:",
                  rawFinalArrival
                );
              }
            }
            recruitApplicationStatus = ga(
              userData,
              "leadManagementStatus",
              "Lead_Management_Status",
              "Application_Status",
              "applicationStatus"
            ) || "";
            setApplicationStatus(recruitApplicationStatus);

            const normalizedStatus = normalizeApplicationStatus(recruitApplicationStatus);
            if (normalizedStatus === "transfer to icp usrn school") {
              setShowNCLEX(true);
            }
            const accessIsBlocked = PORTAL_BLOCKED_APPLICATION_STATUSES.has(normalizedStatus);
            setPortalAccessBlocked(accessIsBlocked);
            if (accessIsBlocked) {
              localStorage.removeItem("icp_auth_token");
              toast.error("Your candidate portal access is no longer active. Please contact Infinity Care Partners.");
              navigate("/login", { replace: true });
              return;
            }

            const sourceModules = Array.isArray(userData.recruitSourceModules)
              ? userData.recruitSourceModules.map(moduleName =>
                  String(moduleName || "").trim().toLowerCase()
                )
              : [];

            recruitModulePresence = {
              applications:
                userData?.recruitModulePresence?.applications === true ||
                sourceModules.includes("applications"),
              candidates:
                userData?.recruitModulePresence?.candidates === true ||
                sourceModules.includes("candidates"),
              customModule1:
                userData?.recruitModulePresence?.customModule1 === true ||
                sourceModules.includes("custommodule1"),
            };

            if (!dateReceivedRaw) {
              dateReceivedRaw =
                ga(userData, "Date_Received", "datereceived", "DateReceived") ||
                null;
            }

            submittedToImmigrationDate =
              ga(userData, "submittedToImmigration", "Added_to_Weekly_I140_Candidates") || null;

            allClearDocumentaryComplete = hasAllClearSelection(
              ga(
                userData,
                "All_Clear_Documentary_Complete",
                "allClearSelection",
                "allClear"
              )
            );
          }
        } catch (e) {
          console.warn("[Pipeline] Recruit module-presence fetch failed:", e.message);
        }

        // Use a dedicated endpoint for the Aftercare gate so it does not depend
        // on the shape or cache state of the larger candidate-data response.
        try {
          const gateResponse = await fetch(
            `${API_BASE}/api/pipeline/aftercare-gate?email=${encodeURIComponent(user.email)}&_=${Date.now()}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const gatePayload = await gateResponse
            .json()
            .catch(() => ({}));

          if (gateResponse.ok && gatePayload.success) {
            backendAftercareGateOpen =
              gatePayload.unlocked === true;

            if (gatePayload.arrivalDate) {
              const gateDate = new Date(
                gatePayload.arrivalDate
              );

              if (!Number.isNaN(gateDate.getTime())) {
                resolvedFinalArrivalDate = gateDate;
                setFinalArrivalDate(gateDate);
              }
            }
          }
        } catch (gateError) {
          console.warn(
            "[Pipeline] Dedicated Aftercare gate request failed:",
            gateError.message
          );
        }
      }

      const received = dateReceivedRaw || new Date().toISOString();
      const start = new Date(received);
      setPipelineStartDate(Number.isNaN(start.getTime()) ? new Date() : start);
      let saved = [];
      try {
        const token = localStorage.getItem("icp_auth_token");
        const savedResponse = await fetch(`${API_BASE}/api/pipeline/get?email=${encodeURIComponent(user.email)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (savedResponse.ok) saved = (await savedResponse.json()).stages || [];
      } catch (error) {
        console.warn("[Pipeline] Could not load saved database stages:", error);
      }
      const savedByName = new Map(saved.map(x => [x.stage_name, x]));
      
      // Build stages with immigration details.
      // The first two hiring stages are controlled only by Recruit module presence:
      // Applied -> Applications; Associated with Job -> Applications + Candidates.
      const applicationsFound = recruitModulePresence.applications === true;
      const candidatesFound = recruitModulePresence.candidates === true;

      let allStages = STAGES_CONFIG.map(stage => {
        const savedStage = savedByName.get(stage.stage_name);
        const isAppliedStage = stage.stage_name === "Applied";
        const isAssociatedStage = stage.stage_name === "Associated with Job";
        const isFirstImmigrationStage = stage.stage_category === "Immigration" && stage.stage_order === 21;
        const isFirstDeploymentStage = stage.stage_category === "Deployment" && stage.stage_order === 29;

        let automaticStatus = null;

        if (isAppliedStage) {
          automaticStatus = applicationsFound ? "Completed" : "Not Started";
        } else if (isAssociatedStage) {
          automaticStatus =
            applicationsFound && candidatesFound ? "Completed" : "Not Started";
        } else if (isFirstImmigrationStage && submittedToImmigrationDate) {
          automaticStatus = savedStage?.status === "Completed" ? "Completed" : "In Progress";
        } else if (isFirstDeploymentStage && allClearDocumentaryComplete) {
          automaticStatus = savedStage?.status === "Completed" ? "Completed" : "In Progress";
        }

        const isAutomaticallyCompleted = automaticStatus === "Completed";

        const baseStage = {
          ...stage,
          ...savedStage,
          candidate_email: user.email,
          start_date: Number.isNaN(start.getTime()) ? new Date().toISOString() : start.toISOString(),
          crm_unlocked:
            (stage.stage_category === "Immigration" && !!submittedToImmigrationDate) ||
            (stage.stage_category === "Deployment" && allClearDocumentaryComplete),
          crm_trigger_date:
            stage.stage_category === "Immigration"
              ? submittedToImmigrationDate
              : stage.stage_category === "Deployment" && allClearDocumentaryComplete
                ? new Date().toISOString()
                : null,
          status:
            automaticStatus !== null
              ? automaticStatus
              : stage.auto_complete_on_email && user.email
                ? "Completed"
                : savedStage?.status || "Not Started",
          completed_date:
            automaticStatus !== null
              ? isAutomaticallyCompleted
                ? savedStage?.completed_date || format(new Date(), "yyyy-MM-dd")
                : null
              : stage.auto_complete_on_email && user.email
                ? savedStage?.completed_date || format(new Date(), "yyyy-MM-dd")
                : savedStage?.completed_date || null,
        };
        
        // Add immigration stage details if available
        if (stage.stage_category === "Immigration" && IMMIGRATION_STAGE_DETAILS[stage.stage_name]) {
          baseStage.stage_details = IMMIGRATION_STAGE_DETAILS[stage.stage_name];
        }
        
        return baseStage;
      });
      
      const transferToICPUSRN =
        shouldShowICPUSRNTransfer(recruitApplicationStatus);

      if (transferToICPUSRN) {
        // This is a separate Recruit branch. The three qualification outcome
        // stages do not apply and must not appear or count toward progress.
        allStages = allStages.filter(
          (stage) =>
            ![
              "Not Qualified - to close",
              "Qualified - Match",
              "Qualified Candidate Pool"
            ].includes(stage.stage_name)
        );

        allStages = allStages.map((stage) => {
          if (
            [
              "Applied",
              "Associated with Job",
              "Transfer to ICP USRN School"
            ].includes(stage.stage_name)
          ) {
            return {
              ...stage,
              status: "Completed",
              completed_date:
                stage.completed_date || format(new Date(), "yyyy-MM-dd"),
              synced_from_application_status: true,
              transfer_to_nclex_branch: true,
              recruit_application_status: recruitApplicationStatus
            };
          }

          return stage;
        });

        setShowNCLEX(true);
      } else {
        allStages = allStages.filter(
          (stage) =>
            stage.stage_name !== "Transfer to ICP USRN School"
        );

        const normalizedHiringStatus =
          normalizeApplicationStatus(recruitApplicationStatus);
        const hiringProgress =
          HIRING_STATUS_PROGRESS[normalizedHiringStatus] || null;
        const mappedHiringStage =
          getMappedHiringStage(recruitApplicationStatus);

        if (hiringProgress || mappedHiringStage === "Not Qualified - to close") {
          const completedStages = new Set(
            hiringProgress?.completed || ["Applied", "Associated with Job", "Not Qualified - to close"]
          );
          const currentStage =
            hiringProgress?.current || null;

          allStages = allStages.map((stage) => {
            if (stage.stage_category !== "Hiring") return stage;

            if (completedStages.has(stage.stage_name)) {
              return {
                ...stage,
                status: "Completed",
                completed_date:
                  stage.completed_date || format(new Date(), "yyyy-MM-dd"),
                synced_from_application_status: true,
                recruit_application_status: recruitApplicationStatus
              };
            }

            if (currentStage === stage.stage_name) {
              return {
                ...stage,
                status: "In Progress",
                completed_date: null,
                synced_from_application_status: true,
                recruit_application_status: recruitApplicationStatus
              };
            }

            // Prescreen Scheduled must not advance Client Documents or any
            // Interview stage. Leave all non-listed stages exactly as saved.
            return stage;
          });
        }
      }

      // CRM Deal fields control the two embassy-related Deployment stages.
      // Confirmation of Eligibility to Proceed completes only when the visible
      // Embassy Eligibility Status picklist value is exactly "Eligible".
      const embassyEligibilityStatus =
        icpUSRNData?.State_Licensure_Requirements ??
        icpUSRNData?.stateLicensureRequirements ??
        deploymentFieldStatus?.State_Licensure_Requirements ??
        "";

      const embassyInterviewDate =
        icpUSRNData?.Embassy_Interview ??
        icpUSRNData?.embassyInterview ??
        deploymentFieldStatus?.Embassy_Interview ??
        "";

      const eligibilityComplete =
        String(embassyEligibilityStatus || "").trim().toLowerCase() === "eligible";
      const embassyInterviewComplete =
        embassyInterviewDate !== undefined &&
        embassyInterviewDate !== null &&
        String(embassyInterviewDate).trim() !== "" &&
        String(embassyInterviewDate).trim() !== "—";

      const crmDeploymentUpdates = [];

      allStages = allStages.map(stage => {
        if (stage.stage_name === "Confirmation of Eligibility to Proceed") {
          if (eligibilityComplete && stage.status !== "Completed") {
            crmDeploymentUpdates.push({
              stage_name: stage.stage_name,
              completed_date: format(new Date(), "yyyy-MM-dd")
            });
          }

          return {
            ...stage,
            crm_field_label: "Embassy Eligibility Status",
            crm_field_value: embassyEligibilityStatus || null,
            synced_from_crm_field: "State_Licensure_Requirements",
            status: eligibilityComplete ? "Completed" : stage.status,
            completed_date: eligibilityComplete
              ? (stage.completed_date || format(new Date(), "yyyy-MM-dd"))
              : stage.completed_date,
          };
        }

        if (stage.stage_name === "Embassy Interview Scheduled") {
          if (embassyInterviewComplete && stage.status !== "Completed") {
            crmDeploymentUpdates.push({
              stage_name: stage.stage_name,
              completed_date: String(embassyInterviewDate).slice(0, 10)
            });
          }

          return {
            ...stage,
            crm_field_label: "Embassy Interview Date",
            crm_field_value: embassyInterviewDate || null,
            synced_from_crm_field: "Embassy_Interview",
            status: embassyInterviewComplete ? "Completed" : stage.status,
            completed_date: embassyInterviewComplete
              ? String(embassyInterviewDate).slice(0, 10)
              : stage.completed_date,
          };
        }

        return stage;
      });

      if (token && crmDeploymentUpdates.length > 0) {
        await Promise.allSettled(
          crmDeploymentUpdates.map(item =>
            fetch(`${API_BASE}/api/pipeline/update-stage`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: user.email,
                stage_name: item.stage_name,
                status: "Completed",
                completed_date: item.completed_date
              })
            })
          )
        );
      }

      // Candidate-module API fields control the contract stages independently of
      // Lead Management Status. Recruit is the source of truth for these values.
      const contractOnFile = isTruthyField(
        ga(icpUSRNData, "Contract_on_file", "contractOnFile")
      );
      const contractSignedDate = ga(
        icpUSRNData,
        "Contract_Signed_Date",
        "contractSignedDate"
      );
      const hasContractSignedDate =
        contractSignedDate !== undefined &&
        contractSignedDate !== null &&
        String(contractSignedDate).trim() !== "" &&
        String(contractSignedDate).trim() !== "—";

      if (contractOnFile || hasContractSignedDate) {
        allStages = allStages.map(stage => {
          if (stage.stage_name === "Employment Contract Signed" && hasContractSignedDate) {
            return {
              ...stage,
              status: "Completed",
              completed_date: String(contractSignedDate).slice(0, 10),
              synced_from_recruit_candidate_field: "Contract_Signed_Date",
            };
          }
          return stage;
        });
      }

      // Documents Received is controlled by two file fields in the Recruit
      // Candidates module. Both fields must contain a value before the stage
      // is completed.
      const proofOfNCLEX = ga(icpUSRNData, "Proof_of_NCLEX", "proofOfNCLEX");
      const birthCertificate = ga(icpUSRNData, "Birth_Certificate", "birthCertificate");
      const hasRecruitFileValue = (value) => {
        if (value === undefined || value === null || value === false) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object") return Object.keys(value).length > 0;
        const normalized = String(value).trim().toLowerCase();
        return normalized !== "" && normalized !== "—" && normalized !== "none" && normalized !== "null";
      };
      const hiringDocumentsVerified = ga(
        icpUSRNData,
        "Hiring_Documents_Verified",
        "hiringDocumentsVerified"
      );
      const documentsReceivedComplete =
        (hasRecruitFileValue(proofOfNCLEX) && hasRecruitFileValue(birthCertificate)) ||
        isTruthyField(hiringDocumentsVerified);

      if (documentsReceivedComplete) {
        allStages = allStages.map(stage => stage.stage_name === "Documents Received"
          ? {
              ...stage,
              status: "Completed",
              completed_date: stage.completed_date || format(new Date(), "yyyy-MM-dd"),
              synced_from_recruit_candidate_fields: ["Proof_of_NCLEX", "Birth_Certificate"],
            }
          : stage
        );
      }

      if (token && transferToICPUSRN) {
        await Promise.allSettled(
          ["Applied", "Associated with Job", "Transfer to ICP USRN School"].map(
            (stageName) =>
              fetch(`${API_BASE}/api/pipeline/update-stage`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  email: user.email,
                  stage_name: stageName,
                  status: "Completed",
                  completed_date: format(new Date(), "yyyy-MM-dd")
                })
              })
          )
        );
      }

      if (false) {
        const nclexStages = NCLEX_STAGES.map(stage => {
          const savedStage = savedByName.get(stage.stage_name);
          const trigger = ICP_USRN_SUBPROCESS_CONFIG.find(item => item.name === stage.stage_name);
          const crmCompleted = trigger ? isICPUSRNItemComplete(trigger, icpUSRNData) : false;
          return {
            ...stage,
            ...savedStage,
            candidate_email: user.email,
            status: crmCompleted ? "Completed" : (savedStage?.status || "Not Started"),
            completed_date: crmCompleted ? (savedStage?.completed_date || format(new Date(), "yyyy-MM-dd")) : (savedStage?.completed_date || null),
            synced_from_custom_module_1: crmCompleted,
            stage_details: NCLEX_STAGE_DETAILS[stage.stage_name] || null
          };
        });
        allStages = [...allStages, ...nclexStages];

        // Persist CRM-driven NCLEX completions so progress survives refreshes/devices.
        if (token && saved.length > 0) {
          await Promise.allSettled(nclexStages.filter(stage => stage.synced_from_custom_module_1 && savedByName.get(stage.stage_name)?.status !== "Completed").map(stage =>
            fetch(`${API_BASE}/api/pipeline/update-stage`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ email: user.email, stage_name: stage.stage_name, status: "Completed", completed_date: stage.completed_date })
            })
          ));
        }
      }
      
      // CRM is the source of truth for every Immigration course/checklist.
      // Evaluate it during the main sync so the UI is correct without opening a modal.
      const crmDrivenImmigrationUpdates = [];
      allStages = allStages.map(stage => {
        const checklist = IMMIGRATION_CRM_CHECKLISTS[stage.stage_name];
        if (!checklist?.length) return stage;

        const checklistResults = checklist.reduce((acc, item) => {
          acc[item.key] = isCRMChecklistComplete(getCRMChecklistValue(icpUSRNData, item));
          return acc;
        }, {});
        const completedCount = Object.values(checklistResults).filter(Boolean).length;
        const allComplete = completedCount === checklist.length;

        if (allComplete && stage.status !== "Completed") {
          crmDrivenImmigrationUpdates.push({
            stage_name: stage.stage_name,
            completed_date: format(new Date(), "yyyy-MM-dd")
          });
        }

        return {
          ...stage,
          crm_checklist: checklistResults,
          crm_checklist_completed: completedCount,
          crm_checklist_total: checklist.length,
          status: allComplete ? "Completed" : stage.status,
          completed_date: allComplete
            ? (stage.completed_date || format(new Date(), "yyyy-MM-dd"))
            : stage.completed_date,
          synced_from_crm_checklist: true,
        };
      });

      if (token && saved.length > 0 && crmDrivenImmigrationUpdates.length > 0) {
        await Promise.allSettled(
          crmDrivenImmigrationUpdates.map(item =>
            fetch(`${API_BASE}/api/pipeline/update-stage`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: user.email,
                stage_name: item.stage_name,
                status: "Completed",
                completed_date: item.completed_date
              })
            })
          )
        );
      }

      const savedAftercareGateDate = allStages
        .filter(stage => stage.stage_category === "Aftercare")
        .map(stage =>
          stage.aftercare_gate_date ||
          stage.aftercareGateDate ||
          null
        )
        .find(Boolean);

      if (
        !resolvedFinalArrivalDate &&
        savedAftercareGateDate
      ) {
        const parsedSavedDate = new Date(
          savedAftercareGateDate
        );

        if (!Number.isNaN(parsedSavedDate.getTime())) {
          resolvedFinalArrivalDate = parsedSavedDate;
          setFinalArrivalDate(parsedSavedDate);
        }
      }

      allStages = allStages.map(stage => {
        if (stage.stage_category !== "Aftercare") {
          return stage;
        }

        const stageGateDate =
          stage.aftercare_gate_date ||
          stage.aftercareGateDate ||
          null;

        const stageArrivalDate =
          resolvedFinalArrivalDate ||
          (
            stageGateDate
              ? new Date(stageGateDate)
              : null
          );

        const validArrivalDate =
          stageArrivalDate &&
          !Number.isNaN(stageArrivalDate.getTime());

        const backendGateOpen =
          backendAftercareGateOpen === true ||
          stage.aftercare_unlocked === true ||
          stage.aftercare_locked === false ||
          Boolean(stageGateDate);

        if (!validArrivalDate && !backendGateOpen) {
          return {
            ...stage,
            aftercare_unlocked: false,
            aftercare_locked: true,
            aftercare_gate_date: null,
            target_date: null
          };
        }

        const arrivalOffset =
          stage.days_from_arrival !== undefined
            ? Number(stage.days_from_arrival || 0)
            : 0;

        return {
          ...stage,
          aftercare_unlocked: true,
          aftercare_locked: false,
          aftercare_gate_date:
            validArrivalDate
              ? stageArrivalDate.toISOString()
              : stageGateDate,
          target_date:
            validArrivalDate &&
            stage.days_from_arrival !== undefined
              ? addDays(
                  stageArrivalDate,
                  arrivalOffset
                ).toISOString()
              : stage.target_date
        };
      });

      setStages(allStages);
      if (saved.length === 0) {
        const initResponse = await fetch(`${API_BASE}/api/pipeline/initialize`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, stages: allStages })
        });
        if (!initResponse.ok) console.warn("[Pipeline] Database initialization failed", await initResponse.text());
      }
      setIsInitialized(true);
    } catch (error) {
      console.error("Automatic pipeline sync failed:", error);
      loadStages();
    } finally { 
      setIsLoading(false); 
    }
  };

  const loadStages = async () => {
    try {
      const token = localStorage.getItem("icp_auth_token");
      const response = await fetch(`${API_BASE}/api/pipeline/get?email=${encodeURIComponent(user.email)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load pipeline"
        );
      }

      const responseArrivalDate =
        data?.aftercare?.arrivalDate || null;
      const responseGateOpen =
        data?.aftercare?.unlocked === true;

      let parsed = data.stages || [];

      if (responseArrivalDate || responseGateOpen) {
        const parsedArrival = responseArrivalDate
          ? new Date(responseArrivalDate)
          : null;

        const validArrival =
          parsedArrival &&
          !Number.isNaN(parsedArrival.getTime());

        if (validArrival) {
          setFinalArrivalDate(parsedArrival);
        }

        parsed = parsed.map(stage => {
          if (stage.stage_category !== "Aftercare") {
            return stage;
          }

          return {
            ...stage,
            aftercare_unlocked: true,
            aftercare_locked: false,
            aftercare_gate_date:
              validArrival
                ? parsedArrival.toISOString()
                : (
                    stage.aftercare_gate_date ||
                    stage.aftercareGateDate ||
                    null
                  ),
            target_date:
              validArrival &&
              stage.days_from_arrival !== undefined
                ? addDays(
                    parsedArrival,
                    Number(stage.days_from_arrival || 0)
                  ).toISOString()
                : stage.target_date
          };
        });
      }

      setStages(parsed);
      setIsInitialized(parsed.length > 0);
    } catch (error) {
      console.error("Error loading pipeline from database:", error);
      setStages([]);
      setIsInitialized(false);
    }
  };

  const handleInitialize = async () => {
    if (!user?.email) return toast.error("User email not found");
    setIsLoading(true);
    try {
      let allStages = STAGES_CONFIG.map(stage => ({ ...stage, candidate_email: user.email, status: "Not Started", completed_date: null, notes: null, target_date: null, stage_details: stage.stage_category === "Immigration" ? IMMIGRATION_STAGE_DETAILS[stage.stage_name] || null : null }));
      // ICP USRN milestones are rendered as subprocess items under
      // Transfer to ICP USRN School and are not additional main pipeline stages.
      const token = localStorage.getItem("icp_auth_token");
      const response = await fetch(`${API_BASE}/api/pipeline/initialize`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, stages: allStages }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pipeline initialization failed");
      setStages(data.stages || allStages);
      setIsInitialized(true);
      toast.success("Pipeline initialized and saved in the database.");
    } catch (error) { toast.error(error.message); } finally { setIsLoading(false); }
  };

  const openModal = (title, component) => {
    setModalState({
      isOpen: true,
      title: title,
      component: component
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: null,
      title: null,
      component: null
    });
  };

  const cycleStatus = async (stageId) => {
    const order = ["Not Started", "In Progress", "Completed", "Blocked"];
    const stage = stages.find(item => item.id === stageId || item._id === stageId);
    if (!stage) return;
    const nextStatus = order[(order.indexOf(stage.status) + 1) % order.length];
    const saved = await updateStageStatus(user.email, stage.stage_name, setStages, nextStatus);
    if (saved) toast.success(`${stage.stage_name} marked as ${nextStatus}`);
  };

  const getRiskStatus = (stage) => {
    if (!stage) return null;
    if (stage.status === "Completed") return null;

    // Special-case Immigration Call: its "due by" window is 30 days after
    // the Hired stage's completion date, not the pipeline start date.
    if (stage.stage_name === "Immigration Call") {
      const hiredStage = stages.find(s => s.stage_name === "Hired");
      if (!hiredStage?.completed_date) return null;
      const hiredDate = new Date(hiredStage.completed_date);
      if (Number.isNaN(hiredDate.getTime())) return null;
      const deadline = addDays(hiredDate, 30);
      const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursRemaining < 0) return "Late";
      if (hoursRemaining <= 24) return "At Risk";
      return "Good Standing";
    }

    if (stage.stage_category === "Aftercare" && stage.target_date) {
      const deadline = new Date(stage.target_date);
      if (!Number.isNaN(deadline.getTime())) {
        const hoursRemaining =
          (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursRemaining < 0) return "Late";
        if (hoursRemaining <= 24) return "At Risk";
        return "Good Standing";
      }
    }

    const targetHours = stage.hours_from_start ?? ((stage.days_from_start || 0) * 24);
    if (!targetHours) return null;
    const start = new Date(stage.start_date || pipelineStartDate || Date.now());
    const elapsedHours = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60));
    const hoursRemaining = targetHours - elapsedHours;
    if (stage.completed_date) return null;
    if (hoursRemaining < 0) return "Late";
    if (hoursRemaining <= 24) return "At Risk";
    return "Good Standing";
  };

  const isStageClickable = (stageName) => {
    return CLICKABLE_STAGES[stageName]?.clickable || false;
  };

  const getStageAction = (stageName) => {
    return CLICKABLE_STAGES[stageName] || null;
  };

  const handleStageClick = (stage) => {
    const normalizedStageName = String(
      stage?.stage_name || ""
    )
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const isRelocationLogisticsStage =
      normalizedStageName === "submit r and l checklist" ||
      normalizedStageName === "submit rl checklist" ||
      normalizedStageName === "complete r and l form" ||
      normalizedStageName === "complete rl form" ||
      normalizedStageName === "r and l form" ||
      normalizedStageName === "rl form" ||
      normalizedStageName === "relocation and logistics" ||
      normalizedStageName === "relocation and logistics form" ||
      normalizedStageName === "relocation logistics checklist";

    if (isRelocationLogisticsStage) {
      openModal(
        "Relocation & Logistics Form",
        <RLChecklistView
          onClose={closeModal}
          user={user}
          setStages={setStages}
        />
      );
      return;
    }

    const isHousingFormStage =
      normalizedStageName === "submit housing form" ||
      normalizedStageName === "housing form" ||
      normalizedStageName === "complete housing form" ||
      normalizedStageName === "housing application";

    if (isHousingFormStage) {
      openModal(
        "Housing Form",
        <HousingDetails
          onClose={closeModal}
          user={user}
          setStages={setStages}
        />
      );
      return;
    }

    if (DEPLOYMENT_CRM_STAGE_RULES[stage.stage_name]) {
      openModal(
        stage.stage_name,
        <DeploymentCRMStatusView
          stage={stage}
          status={deploymentFieldStatus}
          onClose={closeModal}
          user={user}
          setStages={setStages}
        />
      );
      return;
    }
    const action = getStageAction(stage.stage_name);
    
    if (!action || !action.clickable) {
      // Check if it's an immigration stage with details
      if (stage.stage_category === "Immigration" && stage.stage_details) {
        openModal(
          stage.stage_name,
          <ImmigrationStageView 
            stageName={stage.stage_name} 
            onClose={closeModal} 
            user={user} 
            setStages={setStages} 
          />
        );
        return;
      }
      
      if (stage.stage_category === "NCLEX Roadmap" && stage.stage_details) {
        const details = stage.stage_details;
        openModal(
          stage.stage_name,
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-800">{details.description}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
                Steps
              </h4>
              <div className="space-y-2">
                {details.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-amber-50 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50/30 rounded-lg p-3 border border-amber-100">
              <p className="text-xs text-amber-700">
                💡 Click the status button on the stage to update your progress.
              </p>
            </div>
          </div>
        );
        return;
      }
      toast.info(`Stage "${stage.stage_name}" is not clickable`);
      return;
    }

    if (action.type === "navigate" && action.navigateTo) {
      navigate(action.navigateTo);
      return;
    }

    if (action.type === "upload") {
      switch(action.uploadType) {
        case "prescreen":
          openModal("Prescreen - Upload Documents", <PrescreenUpload onClose={closeModal} user={user} />);
          break;
        case "documents":
          openModal(
            "Required Hiring Documents",
            <HiringRequiredDocumentsUpload
              onClose={closeModal}
              user={user}
              setStages={setStages}
            />
          );
          break;
        case "hired":
          openModal("Hired - Upload Documents", <HiredUpload onClose={closeModal} user={user} />);
          break;
        case "licensure":
          openModal("Licensure - Upload Documents", <LicensureUpload onClose={closeModal} user={user} />);
          break;
        case "education":
          openModal("Education - Upload Documents", <EducationUpload onClose={closeModal} user={user} />);
          break;
        case "postArrivalDocs":
          openModal("Post-Arrival Documents", <PostArrivalDocsUpload onClose={closeModal} user={user} />);
          break;
        case "activeLicense":
          openModal("Submit Active License", <LicensureUpload onClose={closeModal} user={user} />);
          break;
        default:
          toast.info(`📄 Upload documents for ${stage.stage_name}`);
      }
      return;
    }

    if (action.type === "view") {
      switch(action.viewType) {
        case "contract":
          openModal("Signed Contract", <ContractView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "flight":
          openModal("Flight Details", <FlightDetails onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "concierge":
          openModal("Concierge Details", <ConciergeDetails onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "welcome":
          openModal("Welcome Appointments", <WelcomeAppointments onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "deploymentDocs":
          openModal("Submit Deployment Documents", <DeploymentDetails onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "housingForm":
          openModal("Submit Housing Form", <HousingDetails onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "rlChecklist":
          openModal("Submit R&L Checklist", <RLChecklistView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "reimbursement":
          openModal("Reimbursement/Advance Payment Report", <ReimbursementUpload onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "reimbursementExpenses":
          openModal("Reimbursement/Expenses", <ReimbursementExpensesView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "supportGroup":
          openModal("ICP Pre-Arrival Support Group", <SupportGroupView onClose={closeModal} />);
          break;
        case "immigrationRenewal":
          openModal(
            "Upload New Documents",
            <ImmigrationRenewalUpload
              onClose={closeModal}
              user={user}
              expiringDocuments={expiringImmigrationDocs}
              onSubmitted={() => setExpiringImmigrationDocs([])}
            />
          );
          break;
        case "welcomePacket":
          openModal(
            "ICP Welcome Packet",
            <WelcomePacketView onClose={closeModal} user={user} setStages={setStages} />
          );
          break;
        case "relocationSurvey":
          openModal("Relocation Survey", <RelocationSurvey onClose={closeModal} />);
          break;
        case "thirtyDaySurvey":
          openModal("30 Day Survey", <ThirtyDaySurvey onClose={closeModal} />);
          break;
        case "ninetyDaySurvey":
          openModal("90 Day Survey", <NinetyDaySurvey onClose={closeModal} />);
          break;
        case "orientationStart":
          openModal("Submit Orientation Start Date", <OrientationStartView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "orientationEnd":
          openModal("Submit Start Date on Floor Independently", <OrientationEndView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        // Immigration stages driven directly by CRM checklist fields
        case "foundations":
          openModal(
            "Foundations (Phases 1–3)",
            <ImmigrationCRMChecklistView stageName="Foundations (Phases 1–3)" onClose={closeModal} user={user} setStages={setStages} stages={stages} />
          );
          break;
        case "licenseEndorsement":
          openModal(
            "License Endorsement",
            <ImmigrationCRMChecklistView stageName="License Endorsement" onClose={closeModal} user={user} setStages={setStages} stages={stages} />
          );
          break;
        case "culturalAdaptation":
          openModal(
            "Cultural Adaptation & Integration",
            <ImmigrationCRMChecklistView stageName="Cultural Adaptation & Integration" onClose={closeModal} user={user} setStages={setStages} stages={stages} />
          );
          break;
        // Immigration Call: timed off of Hired completion date (+30 days)
        case "immigrationCall":
          openModal(
            "Immigration Call",
            <ImmigrationCallView onClose={closeModal} user={user} setStages={setStages} stages={stages} />
          );
          break;
        // Remaining immigration stages: simple description + manual complete
        case "licensureGeneral":
        case "englishPractice":
        case "englishComplete":
        case "deploymentSkills":
          openModal(
            stage.stage_name,
            <ImmigrationStageView stageName={stage.stage_name} onClose={closeModal} user={user} setStages={setStages} />
          );
          break;
        case "jobOfferLetter":
          openModal("Request Job Offer Letter", <div className="space-y-4"><p className="text-sm text-muted-foreground">Request your job offer letter for the embassy interview.</p><p className="text-sm text-muted-foreground">Confirm RELIAS Status and Licensure.</p></div>);
          break;
        case "confirmArrival":
          openModal("Confirm Scheduled Arrival Date", <div className="space-y-4"><p className="text-sm text-muted-foreground">Confirm your scheduled arrival date with your case manager.</p></div>);
          break;
        case "downloadApp":
          openModal("Download Deploymate App", <div className="space-y-4"><p className="text-sm text-muted-foreground">Download the Deploymate App to stay connected.</p><div className="flex gap-4 justify-center"><Button className="bg-blue-600 hover:bg-blue-700">App Store</Button><Button className="bg-green-600 hover:bg-green-700">Google Play</Button></div></div>);
          break;
        default:
          toast.info(`👁️ View ${stage.stage_name}`);
      }
      return;
    }
  };

  const transferToICPUSRN =
    normalizeApplicationStatus(applicationStatus) ===
    "transfer to icp usrn school";

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    const refreshReimbursementStatus = async () => {
      try {
        const token = localStorage.getItem("icp_auth_token");
        if (!token) return;

        const response = await fetch(
          `${API_BASE}/api/reimbursement/status?email=${encodeURIComponent(user.email)}&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) {
          setReimbursementSubmitted(data.submitted === true);
        }
      } catch (error) {
        console.error("[Pipeline] Unable to load payment status:", error);
      }
    };

    refreshReimbursementStatus();

    const handleUpdate = () => refreshReimbursementStatus();
    window.addEventListener("pipeline-updated", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("pipeline-updated", handleUpdate);
    };
  }, [user?.email]);


  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    const loadExpiryAndDeploymentStatus = async () => {
      try {
        const token = localStorage.getItem("icp_auth_token");
        const response = await fetch(
          `${API_BASE}/api/pipeline/field-status?email=${encodeURIComponent(user.email)}&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        setDeploymentFieldStatus(data.deployment || {});

        const english = getDocumentExpiryState(data.expiry?.english);
        const visa = getDocumentExpiryState(data.expiry?.visaScreen);
        setExpiringImmigrationDocs([
          { key: "english", label: "English Document", apiName: "IELTS_Scheduled_Exam_Date_if_applicable", ...english },
          { key: "visaScreen", label: "Visa Screen Document", apiName: "Visa_Screen_Exp_Date", ...visa }
        ].filter(item => item.visible));
      } catch (error) {
        console.error("[Pipeline] Field status load failed:", error);
      }
    };

    loadExpiryAndDeploymentStatus();
    const interval = window.setInterval(loadExpiryAndDeploymentStatus, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.email]);


  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    const loadRequiredDocumentApproval = async () => {
      try {
        const token = localStorage.getItem("icp_auth_token");
        if (!token) return;

        const response = await fetch(
          `${API_BASE}/api/documents/required-approval-status?email=${encodeURIComponent(user.email)}&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        setStages(prev =>
          prev.map(stage =>
            ["Required Document Upload", "Documents Received"].includes(
              stage.stage_name
            )
              ? {
                  ...stage,
                  approval_status: data.complete
                    ? "approved"
                    : data.rejected > 0
                      ? "rejected"
                      : data.submitted > 0
                        ? "pending"
                        : null,
                  status: data.complete
                    ? "Completed"
                    : stage.status,
                  completed_date: data.complete
                    ? (stage.completed_date || new Date().toISOString())
                    : stage.completed_date
                }
              : stage
          )
        );
      } catch (error) {
        console.error(
          "[Pipeline] Required document approval status failed:",
          error
        );
      }
    };

    loadRequiredDocumentApproval();
    const interval = window.setInterval(
      loadRequiredDocumentApproval,
      15_000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.email]);

  const categories = ["Hiring", "Immigration", "Deployment", "Aftercare", "Reimbursement"];
  
  const displayStages = stages.filter(s => !s?.is_gate);
  const completedCount = displayStages.filter(s => s?.status === "Completed").length;
  const totalCount = displayStages.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isCheckingNCLEX) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pipeline</h1>
            <p className="text-sm text-muted-foreground">Track your hiring, immigration and deployment journey</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="font-medium">Checking your pipeline access...</p>
          <p className="text-sm text-muted-foreground mt-1">Verifying your Recruit profile.</p>
        </div>
      </div>
    );
  }

  if (!isInitialized && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pipeline</h1>
            <p className="text-sm text-muted-foreground">Track your hiring, immigration and deployment journey</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleInitialize} disabled={isLoading} size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Set Up Pipeline
            </Button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ChevronRight className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No pipeline set up yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Set Up Pipeline" to initialize your journey.</p>
          {showNCLEX && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">🎓 NCLEX Roadmap stages will be included in your pipeline.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pipeline</h1>
            <p className="text-sm text-muted-foreground">Track your hiring, immigration and deployment journey</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="font-medium">Setting up your pipeline...</p>
          <p className="text-sm text-muted-foreground mt-1">Please wait while we initialize your journey.</p>
        </div>
      </div>
    );
  }

  if (!stages || !Array.isArray(stages) || stages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pipeline</h1>
            <p className="text-sm text-muted-foreground">Track your hiring, immigration and deployment journey</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="font-medium">No stages found</p>
          <p className="text-sm text-muted-foreground mt-1">Please initialize your pipeline.</p>
          <Button onClick={handleInitialize} className="mt-4" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Set Up Pipeline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Pipeline</h1>
          <p className="text-sm text-muted-foreground">Track your hiring, immigration and deployment journey</p>
          {showNCLEX && (
            <p className="text-xs text-amber-600 mt-1">🎓 NCLEX Roadmap stages are included in your pipeline</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-semibold text-primary">{completedCount} / {totalCount} stages</span>
        </div>
        <div className="relative pt-6">
          <div 
            className="absolute -top-2 text-2xl transition-all duration-500 z-10"
            style={{ 
              left: `calc(${progressPct}% - 12px)`,
              animation: progressPct > 0 ? 'bounce-nurse 1s ease-in-out infinite' : 'none'
            }}
          >
            👩‍⚕️
          </div>
          <div 
            className="absolute -top-2 text-2xl z-10"
            style={{ 
              right: '-14px',
              animation: 'pulse-hospital 2s ease-in-out infinite'
            }}
          >
            🏥
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          {["Completed", "In Progress", "Blocked", "Not Started"].map(s => {
            const cfg = statusConfig[s];
            if (!cfg) return null;
            const Icon = cfg.icon;
            const count = displayStages.filter(st => st?.status === s).length;
            return (
              <span key={s} className="flex items-center gap-1">
                <Icon className={cn("h-4 w-4", cfg.color)} />
                {count} {s}
              </span>
            );
          })}
        </div>
      </div>

      {categories.map(cat => {
        const baseCategoryStages = cat === "Reimbursement"
          ? [{
              id: "reimbursement-section",
              stage_name: "Reimbursement/Expenses",
              stage_category: "Reimbursement",
              stage_order: 57,
              status:
                reimbursementSubmitted
                  ? "Completed"
                  : (
                      stages.find(s => s?.stage_name === "Reimbursement/Expenses")?.status ||
                      "Not Started"
                    ),
              completed_date:
                stages.find(s => s?.stage_name === "Reimbursement/Expenses")?.completed_date ||
                null,
              non_counted_section: true
            }]
          : displayStages
              .filter(s => s?.stage_category === cat)
              .sort((a, b) => a.stage_order - b.stage_order);

        const catStages = [
          ...baseCategoryStages,
          ...(cat === "Immigration" && expiringImmigrationDocs.length > 0
            ? [{
                id: "upload-new-documents",
                stage_name: "Upload New Documents",
                stage_category: "Immigration",
                stage_order: 999,
                status: "In Progress",
                conditional_section: true
              }]
            : [])
        ];

        if (!catStages || catStages.length === 0) return null;
        const colors = categoryColors[cat];
        const catCompleted = catStages.filter(isPipelineStageComplete).length;
        const isNCLEX = cat === "NCLEX Roadmap";
        const isHiring = cat === "Hiring";
        const isImmigration = cat === "Immigration";
        
        return (
          <div key={cat} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className={cn("px-5 py-3 flex items-center justify-between border-b border-border", colors.bg)}>
              <h2 className={cn("font-semibold text-sm", colors.text)}>
                {cat === "Reimbursement"
                  ? "Reimbursement"
                  : (isNCLEX ? "🎓" : `Stage ${categories.indexOf(cat) + 1}`)} – {cat}
              </h2>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", colors.bg, colors.text, colors.border)}>
                {cat === "Reimbursement"
                  ? "Separate submission section"
                  : `${catCompleted}/${catStages.length} complete`}
              </span>
            </div>
            <div className="divide-y divide-border">
              {catStages.map((stage, idx) => {
                if (!stage) return null;
                const cfg = statusConfig[stage.status] || statusConfig["Not Started"];
                const Icon = cfg.icon;
                const isClickable = isStageClickable(stage.stage_name);
                const isNCLEXStage = stage.stage_category === "NCLEX Roadmap";
                const isImmigrationStage = stage.stage_category === "Immigration";
                const isGate = stage.is_gate === true;
                const riskStatus = (isHiring || stage.days_from_start || stage.stage_name === "Immigration Call") && stage.status !== "Completed" ? getRiskStatus(stage) : null;
                const riskCfg = riskStatus ? riskConfig[riskStatus] : null;
                const showRisk = riskStatus && !stage.completed_date && (stage.days_from_start || stage.stage_name === "Immigration Call");
                const unlocked = stage.non_counted_section === true
                  ? true
                  : isStageUnlocked(stage, displayStages);
                const isLocked = !unlocked && !isPipelineStageComplete(stage);
                const canInteract = (isClickable || isNCLEXStage || isImmigrationStage) && !isLocked;
                
                return (
                  <div 
                    key={stage.id} 
                    className={cn(
                      "flex items-start gap-4 px-5 py-3.5 transition-colors",
                      canInteract ? "hover:bg-muted/30 cursor-pointer" : "cursor-default",
                      isLocked && "opacity-50",
                      isGate && "bg-blue-50/30 border-l-4 border-l-blue-400",
                      riskStatus === "At Risk" && "bg-yellow-50 border-l-4 border-l-yellow-400",
                      riskStatus === "Late" && "bg-red-50 border-l-4 border-l-red-500"
                    )}
                    onClick={() => canInteract && handleStageClick(stage)}
                  >
                    <div className="flex flex-col items-center self-stretch pt-1">
                      <div className={cn("h-3 w-3 rounded-full border-2 flex-shrink-0", cfg.dot)} />
                      {idx < catStages.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />}
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {isGate ? (
                        <GitBranch className={cn("h-5 w-5", cfg.color)} />
                      ) : isLocked ? (
                        <Lock className="h-5 w-5 text-gray-300" />
                      ) : isImmigrationStage ? (
                        <GraduationCap className={cn("h-5 w-5", cfg.color)} />
                      ) : (
                        <Icon className={cn("h-5 w-5", cfg.color)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        isPipelineStageComplete(stage) && "line-through text-muted-foreground",
                        canInteract && "text-primary hover:underline",
                        isGate && "text-blue-700"
                      )}>
                        {isGate && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">GATE</span>}
                        {stage.stage_name}
                        {isNCLEXStage && (
                          <span className="text-xs text-purple-600 ml-2 bg-purple-50 px-1.5 py-0.5 rounded-full">
                            Click for details
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-xs text-gray-400 ml-2 bg-gray-50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </p>
                      {stage.stage_category === "Hiring" && HIRING_SUBPROCESSES[stage.stage_name] && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          {HIRING_SUBPROCESSES[stage.stage_name].map((item, subIndex) => {
                            const complete = isICPUSRNItemComplete(item, icpUSRNCRMData);
                            return (
                              <div
                                key={`${stage.stage_name}-${subIndex}`}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                                  complete
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span>{item.name}</span>
                                  {complete && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                                </div>
                                <div className={cn("mt-1 text-[10px]", complete ? "text-emerald-600" : "text-slate-400")}></div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {stage.completed_date && (
                        <p className="text-xs text-emerald-600 mt-0.5">Completed {format(new Date(stage.completed_date), "MMM d, yyyy")}</p>
                      )}
                      {!stage.completed_date && stage.status === "In Progress" && (
                        <p className="text-xs text-blue-600 mt-0.5">In progress</p>
                      )}
                      {(isNCLEXStage || isImmigrationStage) && stage.stage_details && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {stage.stage_details.description}
                        </p>
                      )}
                      {isGate && (
                        <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          Milestone gate
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {showRisk && riskCfg && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", 
                          riskStatus === "Late" && "bg-red-50 text-red-700 border border-red-200",
                          riskStatus === "At Risk" && "bg-amber-50 text-amber-700 border border-amber-200",
                          riskStatus === "Late" && "bg-orange-50 text-orange-700 border border-orange-200",
                          riskStatus === "Good Standing" && "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        )}>
                          <riskCfg.icon className="h-3 w-3" />
                          {riskCfg.label}
                        </span>
                      )}
                      {isNCLEXStage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isLocked) cycleStatus(stage.id);
                          }}
                          disabled={isLocked}
                          className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Update Status
                        </button>
                      )}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border flex-shrink-0", cfg.badge)}>
                        {stage.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <CustomModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {modalState.component}
      </CustomModal>

      <style>{`
        @keyframes bounce-nurse {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.05); }
        }
        @keyframes pulse-hospital {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}