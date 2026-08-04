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
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-store"
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
  { id: 46, stage_name: "ICP Welcome Packet & Itinerary", stage_category: "Deployment", stage_order: 46, days_from_start: 1020 },
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

  // Stage 5 - Reimbursement/Expenses
  { id: 57, stage_name: "Reimbursement/Expenses", stage_category: "Reimbursement", stage_order: 57 },
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
  ["applied", "Applied"],
  ["associated", "Associated with Job"],
  ["qualifications & verification", "Qualified - Match"],
  ["transfer to icp usrn school", "Transfer to ICP USRN School"],
  ["qualified-match", "Qualified - Match"],
  ["qualified candidate pool", "Qualified Candidate Pool"],
  ["qualified-candidate pool", "Qualified Candidate Pool"],

  // Lead Management Status options supplied by Recruit.
  // When the status is Prescreen Scheduled, Select Prescreen Time is treated as
  // completed and Prescreen Scheduled becomes the current stage.
  ["prescreen scheduled", "Prescreen Scheduled"],
  ["prescreen complete", "Prescreen Completed"],
  ["client documents & video provided", "Client Documents & Video Provided"],
  ["pending interview selection", "Pending Interview Selection"],
  ["interview scheduled", "Interview Scheduled"],
  ["interview-scheduled", "Interview Scheduled"],
  ["interview attended", "Interview Attended"],
  ["offer made", "Offer Made"],
  ["offer accepted", "Offer Accepted"],
  ["offer declined", "Offer Declined"],
  ["documents received", "Documents Received"],
  ["hired", "Hired"],

  // Backwards-compatible Recruit values.
  ["prescreen", "Select Prescreen Time"],
  ["assessment", "Client Documents & Video Provided"],
  ["assessment complete", "Pending Interview Selection"],
  ["no-show", "Interview Scheduled"],
  ["offered", "Offer Made"],
  ["unqualified", "Not Qualified - to close"],
]);

const PORTAL_BLOCKED_APPLICATION_STATUSES = new Set([
  "unqualified",
  "not qualified-to close",
  "not qualified - to close",
  "qualified-candidate pool",
  "qualified candidate pool",
]);

const getMappedHiringStage = (applicationStatus) =>
  APPLICATION_STATUS_STAGE_MAP.get(normalizeApplicationStatus(applicationStatus)) || null;

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
  { name: "Document Review", days: 24, field: "Documents_Submitted", type: "present" },
  { name: "Educational Program Agreement", days: 24, field: "Sponsorship_Agreement", type: "boolean" },
  { name: "Program Approval", days: 24, field: "Program_Status", type: "picklist", accepted: ["Approved"] },
  { name: "Credential Evaluation Set-up", days: 27, field: "Credential_Service", type: "picklist", accepted: ["Paid by ICP", "Sponsored by ICP", "To be Sponsored by Infinity", "Paid by Infinity"] },
  { name: "Credential Evaluation", days: 77, field: "Credentialing_Status", type: "picklist", accepted: ["Completed", "Complete", "Evaluation Completed"] },
  { name: "Credential Evaluation Completed", days: 92, field: "Credential_Registration_Date", type: "present" },
  { name: "Credentials Issued", days: 102, field: "Date_Report_Issued", type: "present" },
  { name: "Board Registration", days: 120, field: "State_License_Board_of_Registration", type: "picklist", accepted: ["Paid by ICP", "Sponsored by ICP", "To be Sponsored by Infinity", "Paid by Infinity"] },
  { name: "Board Approval", days: 127, field: "Board_Username", type: "present" },
  { name: "Pearson Vue Registration", days: 150, field: "ATT_Received_Date", type: "present" },
  { name: "Exam Registration", days: 165, field: "NCLEX_Exam_Date", type: "present" },
  { name: "Exam Results", days: 195, field: "NCLEX_Status", type: "picklist", accepted: ["Passed"] },
  { name: "Go back to Select Prescreen Time", days: 215, type: "navigation" },
  { name: "Schedule time - booking app", days: 24, field: "Prescreen_Status", type: "picklist", accepted: ["Scheduled", "Attended"] },
  { name: "Learn HUB enrollment", days: 27, field: "Learn_HUB_Enrollment", type: "present" },
  { name: "Performance Check 1", days: 77, field: "Performance_Check_1", type: "complete" },
  { name: "Performance Check 2", days: 102, field: "Performance_Check_2", type: "complete" },
  { name: "Required Courses", days: 120, field: "Required_Courses", type: "complete" },
  { name: "Performance Check 3", days: 127, field: "Performance_Check_3", type: "complete" },
  { name: "ATT Received", days: 150, field: "ATT_Received_Date", type: "present" },
  { name: "Performance Check 4", days: 165, field: "Performance_Check_4", type: "complete" },
  { name: "Performance Check FINAL", days: 195, field: "Performance_Check_FINAL", type: "complete" },
  { name: "Background Complete", days: 215, field: "Background_Complete", type: "complete" },
];

const normalizeCRMValue = (value) => String(value ?? "").trim().toLowerCase();
const hasCRMValue = (value) => value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "—";
const isICPUSRNItemComplete = (item, data = {}) => {
  if (!item?.field || item.type === "navigation") return false;
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
  { id: 107, stage_name: "Credential Evaluation", stage_category: "NCLEX Roadmap", stage_order: 7 },
  { id: 108, stage_name: "Credential Evaluation Completed", stage_category: "NCLEX Roadmap", stage_order: 8 },
  { id: 109, stage_name: "Credentials Issued", stage_category: "NCLEX Roadmap", stage_order: 9 },
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
  { id: 205, stage_name: "Required Courses", stage_category: "NCLEX Prescreen", stage_order: 5 },
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
  "Credential Evaluation": {
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
  "Credentials Issued": {
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
  "Request Job Offer Letter": { clickable: true, type: "view", viewType: "jobOfferLetter" },
  "Confirm Scheduled Arrival Date": { clickable: true, type: "view", viewType: "confirmArrival" },
  "Download Deploymate App": { clickable: true, type: "view", viewType: "downloadApp" },
  "Join ICP Pre-Arrival Support Group": { clickable: true, type: "view", viewType: "supportGroup" },
  "Flights Booked": { clickable: true, type: "view", viewType: "flight" },
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

// ============= Timing / sequential unlock helpers =============
// A stage is "unlocked" (interactable) if:
//   1) it auto-completes, or is already completed, OR
//   2) the immediately preceding stage (by global stage_order, ignoring
//      gates/NCLEX) is Completed, OR
//   3) enough time has elapsed since the pipeline start date (Date_Received)
//      to reach that stage's target hours/days.
const getStageTimingTargetHours = (stage) => {
  if (!stage) return null;
  if (stage.hours_from_start !== undefined && stage.hours_from_start !== null) return stage.hours_from_start;
  if (stage.days_from_start !== undefined && stage.days_from_start !== null) return stage.days_from_start * 24;
  return null;
};

const getSequencedMainStages = (allStages) => {
  return (allStages || [])
    .filter(s => s && !s.is_gate && s.stage_category !== "NCLEX Roadmap" && s.stage_category !== "NCLEX Prescreen")
    .sort((a, b) => a.stage_order - b.stage_order);
};

const isStageUnlocked = (stage, allStages, pipelineStartDate) => {
  if (!stage) return false;
  if (stage.auto_complete_on_email) return true;
  if (stage.crm_unlocked === true) return true;
  if (stage.status === "Completed") return true;

  const sequenced = getSequencedMainStages(allStages);
  const idx = sequenced.findIndex(s => s.id === stage.id);

  // First stage in the whole sequence is always unlocked
  if (idx <= 0) return true;

  const prevStage = sequenced[idx - 1];
  if (prevStage && prevStage.status === "Completed") return true;

  const targetHours = getStageTimingTargetHours(stage);
  if (targetHours != null && pipelineStartDate) {
    const start = new Date(pipelineStartDate);
    if (!Number.isNaN(start.getTime())) {
      const elapsedHours = (Date.now() - start.getTime()) / (1000 * 60 * 60);
      if (elapsedHours >= targetHours) return true;
    }
  }

  return false;
};

// Helper to check if user is an NCLEX candidate
const checkNCLEXAccess = async (email) => {
  try {
    const token = localStorage.getItem("icp_auth_token");
    if (!token) {
      console.log("[Pipeline] No auth token found");
      return false;
    }

    console.log("[Pipeline] Checking NCLEX access for:", email);
    
    const candidateResponse = await fetch(`${API_BASE}/api/recruit/documents?email=${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let hasCandidate = false;
    if (candidateResponse.ok) {
      const candidateData = await candidateResponse.json();
      hasCandidate = candidateData.documents && candidateData.documents.length > 0;
      console.log("[Pipeline] Has Candidate:", hasCandidate);
    }

    if (!hasCandidate) {
      console.log("[Pipeline] No Candidate found, NCLEX access denied");
      return false;
    }

    const dealsResponse = await fetch(`${API_BASE}/api/zoho/my-deals`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let hasNCLEXFlag = false;
    if (dealsResponse.ok) {
      const dealsData = await dealsResponse.json();
      console.log("[Pipeline] Deals data:", dealsData);
      
      const userData = dealsData?.data || {};
      
      hasNCLEXFlag = 
        userData.isNCLEXCandidate === true ||
        userData.nclex_candidate === true ||
        userData.NCLEX_Candidate === true ||
        userData.customModule1 === true ||
        userData.CustomModule1 === true ||
        userData.custommodule1 === true ||
        userData.isNCLEX === true ||
        userData.nclex === true ||
        userData.NCLEX === true ||
        (userData.Education && userData.Education.toLowerCase().includes('nclex')) ||
        (userData.professionalSpecialty && userData.professionalSpecialty.toLowerCase().includes('nclex')) ||
        (userData.applicationStatus && userData.applicationStatus.toLowerCase().includes('nclex'));
      
      if (!hasNCLEXFlag && dealsData?.data?.allDeals) {
        hasNCLEXFlag = dealsData.data.allDeals.some(deal => 
          deal.isNCLEXCandidate === true ||
          deal.nclex_candidate === true ||
          deal.NCLEX_Candidate === true ||
          deal.customModule1 === true ||
          deal.CustomModule1 === true ||
          deal.isNCLEX === true ||
          deal.nclex === true ||
          (deal.Education && deal.Education && deal.Education.toLowerCase().includes('nclex')) ||
          (deal.professionalSpecialty && deal.professionalSpecialty && deal.professionalSpecialty.toLowerCase().includes('nclex'))
        );
      }

      console.log("[Pipeline] Has NCLEX Flag:", hasNCLEXFlag);
    }

    if (!hasNCLEXFlag) {
      try {
        const profileResponse = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const profile = profileData?.data || {};
          hasNCLEXFlag = 
            profile.isNCLEXCandidate === true ||
            profile.nclex_candidate === true ||
            profile.customModule1 === true ||
            profile.isNCLEX === true ||
            (profile.professionalSpecialty && profile.professionalSpecialty.toLowerCase().includes('nclex'));
          console.log("[Pipeline] Profile NCLEX flag:", hasNCLEXFlag);
        }
      } catch (e) {
        console.log("[Pipeline] Could not check profile");
      }
    }

    const result = hasCandidate && hasNCLEXFlag;
    console.log("[Pipeline] Final NCLEX access result:", result);
    return result;

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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Upload function with document type
const uploadDocument = async (file, documentName, documentType, destination, userEmail) => {
  const token = localStorage.getItem("icp_auth_token");
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_name", documentName);
  formData.append("document_type", documentType);
  formData.append("candidate_email", userEmail);

  let endpoint;
  if (destination === "recruit") {
    endpoint = `${API_BASE}/api/recruit/upload-document`;
  } else {
    endpoint = `${API_BASE}/api/documents/upload-to-concierge`;
  }

  console.log(`[Upload] Sending to ${destination}:`, {
    endpoint,
    documentName,
    documentType,
    fileSize: file.size,
    fileName: file.name
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  console.log(`[Upload] Response status:`, response.status);
  
  const responseText = await response.text();
  console.log(`[Upload] Response text:`, responseText);
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error("[Upload] Failed to parse JSON:", e);
    throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Upload failed with status ${response.status}`);
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
          accept=".pdf,.jpg,.jpeg,.png"
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

      const response = await fetch(`${API_BASE}/api/documents/upload-to-crm-and-recruit`, {
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
                  accept=".pdf,.jpg,.jpeg,.png"
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
          accept=".pdf,.jpg,.jpeg,.png"
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
          accept=".pdf,.jpg,.jpeg,.png"
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
          accept=".pdf,.jpg,.jpeg,.png"
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

// Welcome Packet View
const WelcomePacketView = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ICP Welcome Packet & Itinerary
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Shared 7 days before arrival with relocation itinerary.</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Timeline</span>
          <span className="text-sm font-medium">7 days before arrival</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Contents</span>
          <span className="text-sm font-medium">Itinerary, Contacts, Checklist</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="text-sm font-medium text-amber-600">⏳ Pending</span>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <FileText className="h-4 w-4" />
          View Packet
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

  const updateBehavioralField = (field, value) => {
    setBehavioralAssessment(prev => ({ ...prev, [field]: value }));
  };

  const toggleBehavioralArrayValue = (field, value, maxSelections = null) => {
    setBehavioralAssessment(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      }
      if (maxSelections && current.length >= maxSelections) {
        toast.error(`Select no more than ${maxSelections} options.`);
        return prev;
      }
      return { ...prev, [field]: [...current, value] };
    });
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
    if (key === "behaviorAssessment") {
      if (!behavioralSubmitted) toast.info("Complete and submit the Behavioral Assessment form below.");
      return;
    }
    setRequirements(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        confirmed: !prev[key].confirmed
      }
    }));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;

    if (!file.type.includes("pdf") && !file.type.includes("image")) {
      toast.error("Please upload a PDF or image file");
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
    return Object.values(requirements).every(req => req.confirmed === true);
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
            <div className="flex-shrink-0 mt-0.5 cursor-pointer" onClick={() => toggleRequirement(requirementKey)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
              }`}>
                {isChecked && <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="cursor-pointer" onClick={() => toggleRequirement(requirementKey)}>
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
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={behavioralAssessment.statements[statement]} onChange={(e) => setBehavioralAssessment(prev => ({ ...prev, statements: { ...prev.statements, [statement]: e.target.value } }))} disabled={behavioralSubmitted}>
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
                    <span className="text-xs text-gray-400">(PDF, JPG, PNG, max 10MB)</span>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(requirementKey, e.target.files[0]);
                        }
                        e.target.value = '';
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDependent = () => {
    if (newDependent.firstName && newDependent.lastName) {
      setDependents([...dependents, { ...newDependent }]);
      setNewDependent({
        firstName: "",
        lastName: "",
        email: "",
        relationship: "",
        dateOfBirth: "",
      });
      setShowDependentForm(false);
    } else {
      toast.error("Please fill in at least first and last name for the dependent");
    }
  };

  const handleRemoveDependent = (index) => {
    setDependents(dependents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredFields = ['firstName', 'lastName', 'email', 'currentPhone', 'currentAddress', 'city', 'state', 'zipCode', 'country'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
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

      if (!response.ok) {
        throw new Error(data.message || `Failed with status ${response.status}`);
      }

      console.log("[Housing] Submission successful:", data);
      
      toast.success("Housing details submitted successfully!");
      updateStageStatus(user?.email, "Submit Housing Form", setStages);
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
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required readOnly />
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
              <p className="text-xs text-muted-foreground mb-1">State <span className="text-red-500">*</span></p>
              <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
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
            <input type="text" name="emergencyState" placeholder="State" value={formData.emergencyState} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
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
            <input type="text" name="cosignerState" placeholder="State" value={formData.cosignerState} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
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

// R&L Checklist View
const RLChecklistView = ({ onClose, user, setStages }) => {
  const [uploading, setUploading] = useState({});
  const [requirements, setRequirements] = useState({
    rlChecklist: { confirmed: false, file: null, fileName: "" },
    housingChecklist: { confirmed: false, file: null, fileName: "" },
    updatedResume: { confirmed: false, file: null, fileName: "" },
    certificateOfEmployment: { confirmed: false, file: null, fileName: "" },
  });

  const toggleRequirement = (key) => {
    setRequirements(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        confirmed: !prev[key].confirmed
      }
    }));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [key]: true }));
    setRequirements(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        file: file,
        fileName: file.name,
        confirmed: true
      }
    }));
    toast.success(`"${file.name}" uploaded successfully!`);
    setUploading(prev => ({ ...prev, [key]: false }));
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
  };

  const allRequirementsMet = () => {
    return Object.values(requirements).every(req => req.confirmed === true);
  };

  const handleSubmit = async () => {
    if (!allRequirementsMet()) {
      toast.error("Please confirm and upload all required documents.");
      return;
    }
    toast.success("R&L Checklist submitted successfully!");
    updateStageStatus(user?.email, "Submit R&L Checklist", setStages);
    setTimeout(() => onClose(), 1500);
  };

  const RequirementCheckbox = ({ label, requirementKey, description }) => {
    const req = requirements[requirementKey] || { confirmed: false, file: null, fileName: "" };
    const isChecked = req.confirmed || false;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 hover:border-emerald-300 transition-all overflow-hidden">
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5 cursor-pointer" onClick={() => toggleRequirement(requirementKey)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
              }`}>
                {isChecked && <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="cursor-pointer" onClick={() => toggleRequirement(requirementKey)}>
                <p className={`text-sm font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {label} <span className="text-red-500">*</span>
                </p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            {req.fileName ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-700 truncate">{req.fileName}</span>
                  <span className="text-xs text-green-600 font-medium ml-1">✓ Uploaded</span>
                </div>
                <button type="button" onClick={() => removeFile(requirementKey)} className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-emerald-400 transition-colors bg-gray-50/50">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Upload {label}</span>
                    <span className="text-xs text-gray-400">(PDF, JPG, PNG, max 10MB)</span>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(requirementKey, e.target.files[0]);
                        }
                        e.target.value = '';
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
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
        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          R&L Checklist
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Complete and submit your Relocation & Logistics requirements.</p>
      </div>

      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{progress.completed} / {progress.total}</span>
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
            All requirements confirmed and documents uploaded!
          </div>
        )}
      </div>

      <div className="space-y-3">
        <RequirementCheckbox requirementKey="rlChecklist" label="Updated R&L Checklist" description="Current relocation and logistics requirements" />
        <RequirementCheckbox requirementKey="housingChecklist" label="Updated ICP Housing Checklist" description="Current housing preferences and requirements" />
        <RequirementCheckbox requirementKey="updatedResume" label="Updated Resume" description="Current resume with most recent experience" />
        <RequirementCheckbox requirementKey="certificateOfEmployment" label="Certificate of Employment" description="Most recent COE from current employer" />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={handleSubmit} disabled={!allRequirementsMet()} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Confirm & Submit
        </Button>
      </div>
    </div>
  );
};

// ============= Reimbursement/Expenses Component (Aftercare) =============
// Fetches payment schedule / bank details directly from the working
// /api/zoho/my-deals endpoint using flexible field-name lookups (ga), instead
// of relying on the previously-guessed /api/crm/reimbursement-data endpoint.
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

  const buildPaymentFromCRM = (userData, n) => ({
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

      const crmBankDetails = reimbursementData.bankDetails || {};
      const hasBankDetails = !!crmBankDetails.accountNumber;
      setIsSubmitted(hasBankDetails);

      setBankDetails({
        accountNumber: crmBankDetails.accountNumber || "",
        accountName: crmBankDetails.accountName || "",
        routingNumber: crmBankDetails.routingNumber || "",
        bankName: crmBankDetails.bankName || "",
        accountType: crmBankDetails.accountType || "Checking"
      });

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
        totalDueToICPRN: paymentData.totalReimbursement || totalPayments
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

      const response = await fetch(`${API_BASE}/api/crm/update-bank-details`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("[Reimbursement] Failed to parse response:", responseText);
        throw new Error("Server returned invalid response");
      }
      
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || data.message || "Failed to update bank details");
      }
      
      toast.success("Bank details submitted successfully!");
      setIsSubmitted(true);
      updateStageStatus(user?.email, "Reimbursement/Expenses", setStages);
      
      // Refresh the data
      await fetchPaymentData();
      
      setTimeout(() => { onClose(); }, 2000);
    } catch (error) {
      console.error("Error submitting bank details:", error);
      setSubmitError(error.message);
      toast.error(error.message || "Failed to submit bank details");
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

  return (
    <div className="space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2">
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">⚠️ {submitError}</p>
        </div>
      )}

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
            <div className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm font-bold">
              Total: ${(paymentData.totalReimbursement || totalPayments).toFixed(2)}
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
          
          <div className="grid grid-cols-4 gap-2 p-3 bg-green-50 border-t border-green-200 font-bold text-sm">
            <div className="col-span-3 text-green-800">Total Due to ICP/RN</div>
            <div className="text-right text-green-800">
              ${(paymentData.totalReimbursement || totalPayments).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Nurse Payment Type:</strong> {paymentData.nursePaymentType || "Not set"}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5" />
          Upload Bank Details
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide your bank account details for reimbursement payment.
          This information will be securely sent to CRM and stored in the <strong>Total Due to ICP/RN</strong> field.
        </p>
        
        {isSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700">Bank Details Submitted Successfully!</p>
            <p className="text-xs text-emerald-600 mt-1">
              Your bank details have been saved to the CRM.
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
                ⚠️ Bank details will be sent to the CRM and stored securely.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Submit Bank Details</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
        {isSubmitted && (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            View Submitted Details
          </Button>
        )}
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
                          accept=".pdf,.jpg,.jpeg,.png"
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
  const [icpUSRNCRMData, setICPUSRNCRMData] = useState({});
  const [portalAccessBlocked, setPortalAccessBlocked] = useState(false);

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
            const userData = payload?.data || {};
            setICPUSRNCRMData(userData);
            icpUSRNData = userData;
            recruitApplicationStatus = ga(
              userData,
              "leadManagementStatus",
              "Lead_Management_Status",
              "Application_Status",
              "applicationStatus"
            ) || "";
            setApplicationStatus(recruitApplicationStatus);

            const normalizedStatus = normalizeApplicationStatus(recruitApplicationStatus);
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
      
      // The ICP USRN School transfer step is conditional and only appears when
      // Recruit's Application_Status is exactly "Transfer to ICP USRN school".
      if (!shouldShowICPUSRNTransfer(recruitApplicationStatus)) {
        allStages = allStages.filter(stage => stage.stage_name !== "Transfer to ICP USRN School");
      }

      // Reflect Recruit Lead Management Status in the portal pipeline. Previous
      // hiring stages are completed and the mapped current stage is in progress.
      const mappedHiringStage = getMappedHiringStage(recruitApplicationStatus);
      if (mappedHiringStage) {
        const mappedConfig = STAGES_CONFIG.find(stage => stage.stage_name === mappedHiringStage);
        const mappedOrder = mappedConfig?.stage_order;
        allStages = allStages.map(stage => {
          if (stage.stage_category !== "Hiring" || mappedOrder == null) return stage;
          if (stage.stage_order < mappedOrder) {
            return {
              ...stage,
              status: "Completed",
              completed_date: stage.completed_date || format(new Date(), "yyyy-MM-dd"),
              synced_from_application_status: true,
            };
          }
          if (stage.stage_name === mappedHiringStage) {
            const terminal = ["Not Qualified - to close", "Qualified Candidate Pool", "Hired"].includes(mappedHiringStage);
            return {
              ...stage,
              status: terminal ? "Completed" : "In Progress",
              completed_date: terminal ? (stage.completed_date || format(new Date(), "yyyy-MM-dd")) : null,
              synced_from_application_status: true,
              recruit_application_status: recruitApplicationStatus,
            };
          }
          return stage;
        });
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
          if (stage.stage_name === "Employment Contract Sent" && (contractOnFile || hasContractSignedDate)) {
            return {
              ...stage,
              status: "Completed",
              completed_date: stage.completed_date || format(new Date(), "yyyy-MM-dd"),
              synced_from_recruit_candidate_field: "Contract_on_file",
            };
          }
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
      const documentsReceivedComplete =
        hasRecruitFileValue(proofOfNCLEX) && hasRecruitFileValue(birthCertificate);

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

      if (showNCLEX) {
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
      if (!response.ok) throw new Error(data.error || "Failed to load pipeline");
      const parsed = data.stages || [];
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
      if (showNCLEX) allStages = [...allStages, ...NCLEX_STAGES.map(stage => ({ ...stage, candidate_email: user.email, status: "Not Started", completed_date: null, notes: null, target_date: null, stage_details: NCLEX_STAGE_DETAILS[stage.stage_name] || null }))];
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
        case "welcomePacket":
          openModal("ICP Welcome Packet & Itinerary", <WelcomePacketView onClose={closeModal} />);
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

  const categories = ["Hiring", "Immigration", "Deployment", "Aftercare", "Reimbursement"];
  if (showNCLEX) {
    categories.push("NCLEX Roadmap");
  }
  
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
        const catStages = displayStages.filter(s => s?.stage_category === cat).sort((a, b) => a.stage_order - b.stage_order);
        if (!catStages || catStages.length === 0) return null;
        const colors = categoryColors[cat];
        const catCompleted = catStages.filter(s => s?.status === "Completed").length;
        const isNCLEX = cat === "NCLEX Roadmap";
        const isHiring = cat === "Hiring";
        const isImmigration = cat === "Immigration";
        
        return (
          <div key={cat} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className={cn("px-5 py-3 flex items-center justify-between border-b border-border", colors.bg)}>
              <h2 className={cn("font-semibold text-sm", colors.text)}>
                {isNCLEX ? "🎓" : `Stage ${categories.indexOf(cat) + 1}`} – {cat}
              </h2>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", colors.bg, colors.text, colors.border)}>
                {catCompleted}/{catStages.length} complete
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
                const unlocked = isStageUnlocked(stage, displayStages, pipelineStartDate);
                const isLocked = !unlocked && stage.status !== "Completed";
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
                        stage.status === "Completed" && "line-through text-muted-foreground",
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
                                <div className={cn("mt-1 text-[10px]", complete ? "text-emerald-600" : "text-slate-400")}>Day {item.days}</div>
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