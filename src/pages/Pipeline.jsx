// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
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
import { format, differenceInDays, differenceInHours, addDays, addMonths } from "date-fns";
import { toast } from "sonner";
import {
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { candidate } from "@/api/icpClient";
import { getEnabledPipelineStages } from "@/config/releaseConfig";
import { BehavioralAssessmentForm } from "./BehavioralAssessmentForm";

const relocationTravelPolicyPdf =
  "/documents/2025_RL_Travel_and_Housing_Policies.pdf";

const photoVideoReleasePdf =
  "/documents/Photo_Release.pdf";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4000";

const PRESCREEN_BOOKING_URL =
  "https://outlook.office.com/book/Prescreen@Infinitycarepartners.com/?ismsaljsauthenabled";


const SELECT_PRESCREEN_STAGE =
  "Select Prescreen Time";

const getSelectPrescreenCompletionKey = email =>
  `icp_select_prescreen_completed:${String(
    email ||
    ""
  )
    .trim()
    .toLowerCase()}`;

const hasPermanentSelectPrescreenCompletion = email => {
  if (
    typeof window ===
      "undefined" ||
    !email
  ) {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(
        getSelectPrescreenCompletionKey(
          email
        )
      ) ===
      "completed"
    );
  } catch {
    return false;
  }
};

const persistPermanentSelectPrescreenCompletion = email => {
  if (
    typeof window ===
      "undefined" ||
    !email
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      getSelectPrescreenCompletionKey(
        email
      ),
      "completed"
    );
  } catch {
    // Backend save remains authoritative.
  }
};

const preservePermanentSelectPrescreenStage = (
  stage,
  email
) => {
  if (
    !stage ||
    stage.stage_name !==
      SELECT_PRESCREEN_STAGE ||
    !hasPermanentSelectPrescreenCompletion(
      email ||
      stage.candidate_email
    )
  ) {
    return stage;
  }

  const completedAt =
    stage.completed_date ||
    stage.completed_at ||
    new Date()
      .toISOString();

  return {
    ...stage,
    status:
      "Completed",
    completed:
      true,
    is_completed:
      true,
    completed_date:
      completedAt,
    completed_at:
      stage.completed_at ||
      completedAt,
    candidate_click_completed:
      true,
    completion_source:
      "candidate_click",
    unlocked:
      true,
    is_unlocked:
      true,
    is_locked:
      false,
    access_locked:
      false,
    source_trigger_unlocked:
      true,
    trigger_unlocked:
      true
  };
};

const preservePermanentSelectPrescreenInStages = (
  stages,
  email
) =>
  (Array.isArray(stages)
    ? stages
    : []
  ).map(stage =>
    preservePermanentSelectPrescreenStage(
      stage,
      email
    )
  );

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

const ga = (data, ...fieldNames) => {
  if (!data) return null;
  for (const name of fieldNames) {
    const val = data[name];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
};



const normalizePortalDateInput = value => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 6);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 6)}`;
};

const normalizePortalFullDateInput = value => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

const formatPortalFullDate = (date = new Date()) => {
  const pad = value => String(value).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
};

const parsePortalFullDate = value => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  const parsed = new Date(
    year,
    month - 1,
    day
  );

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const isValidPortalFullDate = value =>
  parsePortalFullDate(value) instanceof Date;


const parsePortalDate = value => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);

  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = 2000 + Number(match[3]);

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const isValidPortalDate = value =>
  parsePortalDate(value) instanceof Date;

const getLocalDateKey = (
  date = new Date()
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isArrivalCalendarDateTodayOrPast =
  value => {
    if (!value) {
      return false;
    }

    const raw =
      String(value)
        .trim();

    const rawDatePart =
      raw.match(
        /^(\d{4}-\d{2}-\d{2})/
      )?.[1];

    // The Aftercare gate is calendar-date based: a Flight_Arrival_Time whose
    // date is today unlocks immediately even if its clock time is later today.
    if (rawDatePart) {
      return (
        rawDatePart <=
        getLocalDateKey()
      );
    }

    const parsed =
      new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return false;
    }

    return (
      getLocalDateKey(
        parsed
      ) <=
      getLocalDateKey()
    );
  };

const isCRMChecklistComplete = (value) => {
  value = unwrapPipelineFieldValue(value);
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "1", "checked", "complete", "completed", "pass", "passed", "approved", "done"].includes(normalized);
};

// Backwards-compatible helper used by existing checklist and NCLEX code.
// Keep one truth-value interpretation across every CRM-driven checkbox.
const isTruthyField = isCRMChecklistComplete;

const hasRecruitCandidateFieldValue = value => {
  if (
    value === undefined ||
    value === null ||
    value === false
  ) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(item =>
      hasRecruitCandidateFieldValue(item)
    );
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  return ![
    "",
    "—",
    "none",
    "null",
    "undefined",
    "not available"
  ].includes(normalized);
};

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
  if (val === null || val === undefined) return false;
  const raw = typeof val === "object" ? (val.value ?? val.name ?? val.label ?? val.display_value ?? "") : val;
  return String(raw).trim().toLowerCase() === "yes";
};

const getArrivalDate = async () => {
  try {
    const token = localStorage.getItem("icp_auth_token");
    if (!token) return null;

    const response = await fetch(`${API_BASE}/api/zoho/my-deals?_=${Date.now()}`, {
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
const AFTERCARE_DAY_OFFSETS = Object.freeze({
  "Welcome Call": 1,
  "Relocation Follow up": 2,
  "First week in US Check-in": 7,
  "Second week in US Check-in": 14,
  "US Integration Check-in": 30,
  "Placement Stability Check-in": 90,
  "Year One Anniversary Check-in": 365
});

const STAGES_CONFIG = [
  // Hiring — existing visible hiring flow. Transfer is conditional and only
  // appears while Lead Management Status is exactly "Transfer to ICP USRN School".
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
  { id: "11b", stage_name: "Mandatory Pre-Interview Coaching Call", stage_category: "Hiring", stage_order: 11.5, hours_from_start: 96, candidate_notice: "Mandatory coaching call must be completed 24–36 hours before the interview." },
  { id: 12, stage_name: "Interview Scheduled", stage_category: "Hiring", stage_order: 12, hours_from_start: 96 },
  { id: 13, stage_name: "Interview Attended", stage_category: "Hiring", stage_order: 13, days_from_start: 7 },
  { id: 14, stage_name: "Offer Made", stage_category: "Hiring", stage_order: 14, days_from_start: 8 },
  { id: 15, stage_name: "Offer Accepted", stage_category: "Hiring", stage_order: 15, days_from_start: 10 },
  { id: 16, stage_name: "Offer Declined", stage_category: "Hiring", stage_order: 16, days_from_start: 10 },
  { id: 17, stage_name: "Employment Contract Sent", stage_category: "Hiring", stage_order: 17, days_from_start: 10 },
  { id: 18, stage_name: "Employment Contract Signed", stage_category: "Hiring", stage_order: 18, days_from_start: 13 },
  { id: 19, stage_name: "Documents Received", stage_category: "Hiring", stage_order: 19, days_from_start: 15 },
  { id: 20, stage_name: "Hired", stage_category: "Hiring", stage_order: 20, days_from_start: 15 },

  // Stage 2 — Immigration. Timing is calculated from the actual CRM milestone dates below.
  { id: 21, stage_name: "Immigration forms submitted", stage_category: "Immigration", stage_order: 21 },
  { id: 22, stage_name: "Foundations: Pillars", stage_category: "Immigration", stage_order: 22 },
  { id: 23, stage_name: "Foundations: Endorsement Discovery", stage_category: "Immigration", stage_order: 23 },
  { id: 24, stage_name: "Immigration approved", stage_category: "Immigration", stage_order: 24 },
  { id: 25, stage_name: "Visa bill issued", stage_category: "Immigration", stage_order: 25 },
  { id: 26, stage_name: "Visa bill paid", stage_category: "Immigration", stage_order: 26 },
  { id: 27, stage_name: "DS-260 / Civil Document Submission", stage_category: "Immigration", stage_order: 27 },
  { id: 28, stage_name: "Foundations: Cultural Readiness", stage_category: "Immigration", stage_order: 28 },
  { id: 28.5, stage_name: "Documentarily Qualified", stage_category: "Immigration", stage_order: 28.5 },
  {
    id: 29,
    stage_name: "Immigration to Deployment Transition Call",
    stage_category: "Immigration",
    stage_order: 29,
    candidate_notice:
      "Before this transition call, ICP must confirm active bedside employment, current licensure status, academic course status, and other deployment-readiness requirements."
  },

  // Stage 3 — Deployment. Deadlines are calculated from All Clear / scheduled arrival.
  { id: 29.5, stage_name: "Introduction to Deployment Call", stage_category: "Deployment", stage_order: 29.5 },
  { id: 30, stage_name: "Speciality Classes", stage_category: "Deployment", stage_order: 30 },
  { id: 31, stage_name: "Final Self Assessment", stage_category: "Deployment", stage_order: 31 },
  { id: 32, stage_name: "Speciality with Trainer Skills Check", stage_category: "Deployment", stage_order: 32 },
  { id: 33, stage_name: "Housing / Transportation Call", stage_category: "Deployment", stage_order: 33 },
  { id: 34, stage_name: "Deployment Pre-Arrival Call", stage_category: "Deployment", stage_order: 34 },
  { id: 35, stage_name: "Pre-Arrival Banking Call", stage_category: "Deployment", stage_order: 35 },
  { id: 36, stage_name: "Employer Pre-Arrival Call", stage_category: "Deployment", stage_order: 36 },
  { id: 37, stage_name: "deployMate Ready", stage_category: "Deployment", stage_order: 37 },
  { id: 38, stage_name: "Welcome Packet", stage_category: "Deployment", stage_order: 38 },
  { id: 39, stage_name: "Receipt Submission", display_name: "Expense Report", stage_category: "Deployment", stage_order: 39 },
  { id: 40, stage_name: "Arrived", stage_category: "Deployment", stage_order: 40 },

  // Stage 4 — Aftercare: EXACTLY 7 candidate-facing stages.
  { id: 41, stage_name: "Welcome Call", stage_category: "Aftercare", stage_order: 41, days_from_arrival: AFTERCARE_DAY_OFFSETS["Welcome Call"] },
  { id: 42, stage_name: "Relocation Follow up", stage_category: "Aftercare", stage_order: 42, days_from_arrival: AFTERCARE_DAY_OFFSETS["Relocation Follow up"] },
  { id: 43, stage_name: "First week in US Check-in", stage_category: "Aftercare", stage_order: 43, days_from_arrival: AFTERCARE_DAY_OFFSETS["First week in US Check-in"] },
  { id: 44, stage_name: "Second week in US Check-in", stage_category: "Aftercare", stage_order: 44, days_from_arrival: AFTERCARE_DAY_OFFSETS["Second week in US Check-in"] },
  { id: 45, stage_name: "US Integration Check-in", stage_category: "Aftercare", stage_order: 45, days_from_arrival: AFTERCARE_DAY_OFFSETS["US Integration Check-in"] },
  { id: 46, stage_name: "Placement Stability Check-in", stage_category: "Aftercare", stage_order: 46, days_from_arrival: AFTERCARE_DAY_OFFSETS["Placement Stability Check-in"] },
  { id: 47, stage_name: "Year One Anniversary Check-in", stage_category: "Aftercare", stage_order: 47, days_from_arrival: AFTERCARE_DAY_OFFSETS["Year One Anniversary Check-in"] }
];

const getFixedDayOneStageTarget = (
  stage,
  pipelineStart
) => {
  if (
    !stage ||
    !pipelineStart
  ) {
    return null;
  }

  const start =
    pipelineStart instanceof Date
      ? pipelineStart
      : new Date(
          pipelineStart
        );

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return null;
  }

  const stageName =
    String(
      stage.stage_name ||
      ""
    ).trim();

  if (
    stageName ===
      "Select Prescreen Time" &&
    stage.timing_source ===
      "nclex_return_to_hiring"
  ) {
    return addDays(
      start,
      215
    );
  }

  const config =
    STAGES_CONFIG.find(
      item =>
        item.stage_name ===
        stageName
    );

  if (
    config?.hours_from_start !==
      undefined &&
    config?.hours_from_start !==
      null
  ) {
    return new Date(
      start.getTime() +
      Number(
        config.hours_from_start
      ) *
        60 *
        60 *
        1000
    );
  }

  if (
    config?.days_from_start !==
      undefined &&
    config?.days_from_start !==
      null
  ) {
    return addDays(
      start,
      Number(
        config.days_from_start
      )
    );
  }

  const nclexConfig =
    ICP_USRN_SUBPROCESS_CONFIG.find(
      item =>
        item.name ===
        stageName
    );

  if (
    nclexConfig &&
    Number.isFinite(
      Number(
        nclexConfig.days
      )
    )
  ) {
    return addDays(
      start,
      Number(
        nclexConfig.days
      )
    );
  }

  return null;
};

const DEPLOYMENT_TIMING_REQUIREMENTS = Object.freeze({
  "Introduction to Deployment Call": {
    anchor: "immigration-deployment-transition",
    offsetDays: 60,
    timingRule: "Attend 60 days after the Immigration to Deployment Transition Call is completed."
  },
  "Speciality Classes": {
    anchor: "arrival",
    offsetDays: -90,
    timingRule: "Complete no later than 90 days before the scheduled arrival date."
  },
  "Speciality with Trainer Skills Check": {
    anchor: "arrival",
    offsetDays: -75,
    timingRule: "Complete 75–90 days before the scheduled arrival date; countdown target is 75 days before arrival."
  },
  "Final Self Assessment": {
    anchor: "arrival",
    offsetDays: -60,
    timingRule: "Complete 60–90 days before the scheduled arrival date; countdown target is 60 days before arrival."
  },
  "Housing / Transportation Call": {
    anchor: "arrival",
    offsetDays: -60,
    timingRule: "Attend no later than 60 days before the scheduled arrival date."
  },
  "Deployment Pre-Arrival Call": {
    anchor: "arrival",
    offsetDays: -45,
    timingRule: "Attend 30–45 days before the scheduled arrival date; countdown target is 45 days before arrival."
  },
  "Pre-Arrival Banking Call": {
    anchor: "arrival",
    offsetDays: -60,
    timingRule: "Attend 60 days before the scheduled arrival date."
  },
  "Employer Pre-Arrival Call": {
    anchor: "arrival",
    offsetDays: -30,
    timingRule: "Attend 15–30 days before the scheduled arrival date; countdown target is 30 days before arrival."
  },
  "deployMate Ready": {
    anchor: "arrival",
    offsetDays: -30,
    timingRule: "Complete deployMate readiness 30 days before the scheduled arrival date."
  },
  "Welcome Packet": {
    anchor: "arrival",
    offsetDays: -30,
    timingRule: "Review and acknowledge the Welcome Packet 30 days before the scheduled arrival date."
  },
  "Receipt Submission": {
    anchor: "arrival",
    offsetDays: -7,
    timingRule: "Complete the Expense Report 7–10 days before the scheduled arrival date; countdown target is 7 days before arrival."
  },
  "Arrived": {
    anchor: "arrival",
    offsetDays: 0,
    timingRule: "Arrival is due on the scheduled arrival date."
  }
});

const parsePipelineTimingDate = value => {
  const raw =
    unwrapPipelineFieldValue(
      value
    );

  if (!raw) {
    return null;
  }

  if (raw instanceof Date) {
    return Number.isNaN(
      raw.getTime()
    )
      ? null
      : new Date(
          raw.getTime()
        );
  }

  const textValue =
    String(
      raw
    ).trim();

  const dateOnly =
    textValue.match(
      /^(\\d{4})-(\\d{2})-(\\d{2})$/
    );

  if (dateOnly) {
    const parsed =
      new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        12,
        0,
        0,
        0
      );

    return Number.isNaN(
      parsed.getTime()
    )
      ? null
      : parsed;
  }

  const parsed =
    new Date(
      textValue
    );

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
};

const getDeploymentStageTiming = ({
  stageName,
  liveFields = {},
  sourceStages = [],
  finalArrivalDate = null
}) => {
  const requirement =
    DEPLOYMENT_TIMING_REQUIREMENTS[
      stageName
    ];

  if (!requirement) {
    return null;
  }

  const allClearStage =
    (Array.isArray(sourceStages)
      ? sourceStages
      : []
    ).find(
      stage =>
        stage?.stage_name ===
        "Documentarily Qualified"
    );

  const allClearStageStatus =
    liveFields
      ?.__stageStatus
      ?.[
        "Documentarily Qualified"
      ] ||
    {};

  const allClearAnchor =
    parsePipelineTimingDate(
      getLivePipelineFieldValue(
        liveFields,
        [
          "All_Clear_Date",
          "All_Clear_Date_Time",
          "allClearDate",
          "all_clear_date"
        ]
      ) ||
      allClearStageStatus
        ?.completed_date ||
      allClearStageStatus
        ?.completed_at ||
      allClearStage
        ?.completed_date ||
      allClearStage
        ?.completed_at
    );

  const transitionStage =
    (Array.isArray(sourceStages)
      ? sourceStages
      : []
    ).find(
      stage =>
        stage?.stage_name ===
        "Immigration to Deployment Transition Call"
    );

  const transitionStageStatus =
    liveFields
      ?.__stageStatus
      ?.[
        "Immigration to Deployment Transition Call"
      ] ||
    {};

  const transitionAnchor =
    parsePipelineTimingDate(
      transitionStageStatus
        ?.completed_date ||
      transitionStageStatus
        ?.completed_at ||
      transitionStage
        ?.completed_date ||
      transitionStage
        ?.completed_at ||
      getLivePipelineFieldValue(
        liveFields,
        [
          "Immigration_to_Deployment_Transition_Call_Date",
          "Immigration_to_Deployment_Transition_call_Date",
          "Deployment_Transition_Call_Date",
          "deploymentTransitionCallDate"
        ]
      )
    );

  const arrivalAnchor =
    parsePipelineTimingDate(
      finalArrivalDate ||
      getLivePipelineFieldValue(
        liveFields,
        [
          "Flight_Arrival_Time",
          "flightArrivalTime",
          "Final_Destination_Arrival",
          "Final_Arrival",
          "final_destination_arrival",
          "scheduledarrivaldate",
          "ScheduledArrivalDate",
          "arrival_date",
          "ArrivalDate",
          "ETA"
        ]
      )
    );

  const timingAnchor =
    requirement.anchor ===
      "all-clear"
      ? allClearAnchor
      : requirement.anchor ===
          "immigration-deployment-transition"
        ? transitionAnchor
        : arrivalAnchor;

  if (!timingAnchor) {
    return {
      targetDate:
        null,
      timingRule:
        requirement.timingRule,
      anchorType:
        requirement.anchor
    };
  }

  return {
    targetDate:
      addDays(
        timingAnchor,
        Number(
          requirement.offsetDays ||
          0
        )
      ),
    timingRule:
      requirement.timingRule,
    anchorType:
      requirement.anchor,
    anchorDate:
      timingAnchor
  };
};

const REQUIRED_STAGE_NOTICES = {
  "Mandatory Pre-Interview Coaching Call": "Complete the mandatory coaching call 24–36 hours before your interview.",
  "Speciality Classes": "Complete your assigned speciality classes.",
  "Final Self Assessment": "Complete your final self assessment.",
  "Speciality w/Trainer Skills Check": "Complete the speciality skills check with your trainer.",
  "Deployment Pre-Arrival Call": "Attend your deployment pre-arrival call.",
  "Housing / Transportation Call": "Attend the housing and transportation call and confirm your arrangements.",
  "Pre-Arrival Banking Call": "Attend the pre-arrival banking call.",
  "deployMate Ready": "Complete the deployMate readiness requirements.",
  "Welcome Packet": "Review and acknowledge your Welcome Packet 30 days before your scheduled arrival.",
  "Receipt Submission": "Upload reimbursement receipts, review the Expense Report, and acknowledge it to complete this stage.",
  "Arrived": "Arrival confirmed. Continue to Aftercare.",
};

// Use the CURRENT pipeline configuration as the authoritative visible order.
// Older saved pipelinestages rows can contain obsolete stage_order values.
const CURRENT_STAGE_ORDER_BY_NAME =
  new Map(
    STAGES_CONFIG.map(
      stage => [
        stage.stage_name,
        Number(
          stage.stage_order ??
          0
        )
      ]
    )
  );

const getCanonicalStageOrder =
  stage => {
    const configuredOrder =
      CURRENT_STAGE_ORDER_BY_NAME.get(
        stage?.stage_name
      );

    if (
      Number.isFinite(
        configuredOrder
      )
    ) {
      return configuredOrder;
    }

    const fallbackOrder =
      Number(
        stage?.stage_order ??
        stage?.order ??
        0
      );

    return Number.isFinite(
      fallbackOrder
    )
      ? fallbackOrder
      : 0;
  };

const sortStagesByConfiguredOrder =
  stageList =>
    [...stageList].sort(
      (first, second) => {
        const orderDifference =
          getCanonicalStageOrder(
            first
          ) -
          getCanonicalStageOrder(
            second
          );

        if (
          orderDifference !==
          0
        ) {
          return orderDifference;
        }

        return String(
          first?.stage_name ||
          ""
        ).localeCompare(
          String(
            second?.stage_name ||
            ""
          )
        );
      }
    );


const FLOW_STAGE_ALIASES = {
  "Immigration to Deployment Transition Call": {
    sources: [
      "Deployment Department Transition Call"
    ],
    mode: "last"
  },
  "Welcome Call": {
    sources: [
      "Welcome Call/24 Hour Call"
    ],
    mode: "last"
  },
  "Relocation Follow up": {
    sources: [
      "Relocation Survey"
    ],
    mode: "last"
  },
  "First week in US Check-in": {
    sources: [
      "7 Day Call"
    ],
    mode: "last"
  },
  "Second week in US Check-in": {
    sources: [
      "2 Week Call"
    ],
    mode: "last"
  },
  "US Integration Check-in": {
    sources: [
      "U.S. Integration Call (30 Day Call / Survey)"
    ],
    mode: "last"
  },
  "Placement Stability Check-in": {
    sources: [
      "Placement Stability Check-in (90 Day Call)"
    ],
    mode: "last"
  },
  "Year One Anniversary Check-in": {
    sources: [
      "1 Year Survey"
    ],
    mode: "last"
  }
};

const getStrongestFlowSource = sources => {
  const rank = stage => {
    if (isPipelineStageComplete(stage)) return 3;
    const status = String(stage?.status || "").trim().toLowerCase();
    return status === "in progress" || status === "in-progress" ? 2 : 1;
  };
  return [...sources].sort((a, b) => {
    const diff = rank(b) - rank(a);
    if (diff) return diff;
    return new Date(b?.completed_date || b?.updated_at || 0).getTime() -
      new Date(a?.completed_date || a?.updated_at || 0).getTime();
  })[0] || null;
};

const applyVisibleFlowAliases = stagesToSync => {
  const byName = new Map(stagesToSync.map(stage => [stage.stage_name, stage]));
  return stagesToSync.map(stage => {
    const alias = FLOW_STAGE_ALIASES[stage.stage_name];
    if (!alias) return stage;
    const sources = alias.sources.map(name => byName.get(name)).filter(Boolean);
    if (!sources.length || isPipelineStageComplete(stage)) return stage;
    const completeCount = sources.filter(isPipelineStageComplete).length;
    const anyInProgress = sources.some(source => ["in progress", "in-progress"].includes(String(source.status || "").trim().toLowerCase()));
    const complete = alias.mode === "all"
      ? sources.length === alias.sources.length && completeCount === sources.length
      : alias.mode === "last"
        ? isPipelineStageComplete(sources[sources.length - 1])
        : completeCount > 0;
    const strongest = getStrongestFlowSource(sources);
    if (!complete && !anyInProgress && !isPipelineStageComplete(stage)) return stage;
    return {
      ...stage,
      status: complete ? "Completed" : anyInProgress ? "In Progress" : stage.status,
      completed: complete,
      is_completed: complete,
      completed_date: complete
        ? (stage.completed_date || strongest?.completed_date || strongest?.completed_at || new Date().toISOString())
        : null,
      legacy_source_stages: alias.sources,
      restored_from_legacy_flow: true
    };
  });
};

// Zoho Recruit Applications.Application_Status is the ONLY authoritative
// Lead Management Status driving the Hiring pipeline. Candidates supplies
// candidate/profile fields; CustomModule1 supplies NCLEX only.
// Zoho Recruit Lead Management Status (API: Application_Status) -> portal stage.
// The normalized map accepts spacing/hyphen variations from Recruit while keeping
// the portal stage names aligned with the existing hiring pipeline.
const normalizeApplicationStatus = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[–—]/g, "-")
  .replace(/\s*-\s*/g, "-")
  .replace(/\s+/g, " ");

const isTransferToICPUSRNStatus =
  value => {
    const rawValue =
      value &&
      typeof value ===
        "object"
        ? (
            value.value ??
            value.name ??
            value.display_value ??
            value.displayValue ??
            value.label ??
            ""
          )
        : value;

    const normalized =
      normalizeApplicationStatus(
        rawValue
      );

    return (
      [
        "transfer to icp usrn school",
        "transfer to ivp usrn school"
      ].includes(
        normalized
      ) ||
      (
        normalized.includes(
          "transfer"
        ) &&
        (
          normalized.includes(
            "icp"
          ) ||
          normalized.includes(
            "ivp"
          )
        ) &&
        normalized.includes(
          "usrn"
        ) &&
        normalized.includes(
          "school"
        )
      )
    );
  };

const APPLICATION_STATUS_STAGE_MAP = new Map([
  ["new candidate", "Applied"],
  ["applied", "Applied"],
  ["associated", "Associated with Job"],
  ["qualifications & verification", "Associated with Job"],
  ["qualifications and verification", "Associated with Job"],
  ["transfer to icp usrn school", "Transfer to ICP USRN School"],
  ["transfer to ivp usrn school", "Transfer to ICP USRN School"],
  ["qualified-match", "Qualified - Match"],
  ["qualified- match", "Qualified - Match"],
  ["qualified match", "Qualified - Match"],
  ["qualified-candidate pool", "Qualified Candidate Pool"],
  ["qualified- candidate pool", "Qualified Candidate Pool"],
  ["qualified candidate pool", "Qualified Candidate Pool"],
  ["not qualified-to close", "Not Qualified - to close"],
  ["not qualified - to close", "Not Qualified - to close"],
  ["not qualified to close", "Not Qualified - to close"],
  ["unqualified", "Not Qualified - to close"],
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
  ["location selected", "Client Documents & Video Provided"],
  ["no-show", "Interview Scheduled"],
  ["offered", "Offer Made"],
  ["offer made", "Offer Made"],
  ["offer accepted", "Offer Accepted"],
  ["offer declined", "Offer Declined"],
  ["hired", "Hired"],
  ["contract sent", "Employment Contract Sent"],
  ["employer offer sent", "Offer Made"],
  ["offer sent", "Offer Made"],
  ["contract signed", "Employment Contract Signed"],
  ["documents received", "Documents Received"],
  ["unqualified", "Not Qualified - to close"],
  ["not qualified-to close", "Not Qualified - to close"],
  ["not qualified - to close", "Not Qualified - to close"]
]);

const PORTAL_BLOCKED_APPLICATION_STATUSES = new Set();

const getMappedHiringStage = (applicationStatus) =>
  APPLICATION_STATUS_STAGE_MAP.get(
    normalizeApplicationStatus(applicationStatus)
  ) || null;

const getEffectiveQualificationOutcome = applicationStatus => {
  const normalized =
    normalizeApplicationStatus(
      applicationStatus
    );

  if (
    [
      "qualified-candidate pool",
      "qualified candidate pool"
    ].includes(normalized)
  ) {
    return "Qualified Candidate Pool";
  }

  if (
    [
      "not qualified-to close",
      "not qualified - to close",
      "not qualified to close",
      "unqualified"
    ].includes(normalized)
  ) {
    return "Not Qualified - to close";
  }

  if (
    [
      "transfer to icp usrn school",
      "qualified- match",
      "location selected",
      "prescreen",
      "prescreen scheduled",
      "prescreen complete",
      "assessment",
      "assessment complete",
      "interview",
      "pending interview selection",
      "interview-scheduled",
      "interview scheduled",
      "interview attended",
      "offered",
      "offer made",
      "offer accepted",
      "hired",
      "contract sent",
      "employer offer sent",
      "contract signed"
    ].includes(normalized)
  ) {
    return "Qualified - Match";
  }

  const mapped =
    getMappedHiringStage(
      applicationStatus
    );

  return [
    "Qualified - Match",
    "Qualified Candidate Pool",
    "Not Qualified - to close"
  ].includes(mapped)
    ? mapped
    : null;
};

// Explicit progression for each Lead Management Status. Only stages named here
// are changed. This prevents Prescreen Scheduled, Assessment, or Interview from
// completing unrelated Client Interview stages.
const HIRING_STATUS_PROGRESS = {
  "new candidate": {
    completed: [],
    current: "Applied"
  },
  "applied": {
    completed: ["Applied"],
    current: null
  },
  "associated": {
    completed: ["Applied", "Associated with Job"],
    current: null
  },
  "qualifications & verification": {
    completed: ["Applied", "Associated with Job"],
    current: null
  },
  "qualifications and verification": {
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
  "qualified- match": {
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
  "qualified- candidate pool": {
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
  "not qualified-to close": {
    completed: [
      "Applied",
      "Associated with Job",
      "Not Qualified - to close"
    ],
    current: null
  },
  "not qualified - to close": {
    completed: [
      "Applied",
      "Associated with Job",
      "Not Qualified - to close"
    ],
    current: null
  },
  "not qualified to close": {
    completed: [
      "Applied",
      "Associated with Job",
      "Not Qualified - to close"
    ],
    current: null
  },
  "unqualified": {
    completed: [
      "Applied",
      "Associated with Job",
      "Not Qualified - to close"
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
      "Select Prescreen Time",
      "Prescreen Scheduled"
    ],
    current: null
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
  "location selected": {
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
      "Pending Interview Selection",
      "Interview Scheduled"
    ],
    current: null
  },
  "interview scheduled": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled"
    ],
    current: null
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
  "no-show": {
    completed: [
      "Applied",
      "Associated with Job",
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled"
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
      "Select Prescreen Time",
      "Prescreen Scheduled",
      "Prescreen Completed",
      "Client Documents & Video Provided",
      "Pending Interview Selection",
      "Interview Scheduled",
      "Interview Attended",
      "Offer Made",
      "Offer Declined"
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
      "Hired"
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
  "employer offer sent": {
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
  "offer sent": {
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
  "contract signed": {
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
      "Employment Contract Signed"
    ],
    current: null
  }
};

const shouldShowICPUSRNTransfer = (applicationStatus) =>
  normalizeApplicationStatus(applicationStatus) === "transfer to icp usrn school";

// ============= Hiring section field mappings to Recruit =============
// These map pipeline stages to Recruit field names
const HIRING_FIELD_MAPPINGS = {
  "Mandatory Pre-Interview Coaching Call": {
    field: "Attended_Pre_Interview_Call",
    section: "pre interview coaching call",
    module: "Candidates",
    type: "boolean"
  },
  "Documents Received": {
    field: "All_docs_on_file",
    section: "documents received",
    module: "Candidates",
    type: "boolean"
  },
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
  {
    name: "Complete Pre-assessment",
    days: 5,
    field: "NCLEX_Pre_Exam",
    type: "picklist",
    accepted: [
      "1st Attempt Pass",
      "2nd Attempt Pass"
    ]
  },
  {
    name: "Program Prescreen",
    days: 10,
    field: "Prescreen_Status",
    type: "picklist",
    accepted: ["Attended"]
  },
  {
    name: "Document Review",
    days: 24,
    field: "Documents_Submitted",
    type: "present"
  },
  {
    name: "Educational Program Agreement",
    days: 24,
    field: "Sponsorship_Agreement",
    type: "boolean"
  },
  {
    name: "Program Approval",
    days: 24,
    field: "Program_Status",
    type: "picklist",
    accepted: ["Approved"]
  },
  {
    name: "Credential Evaluation Set-up",
    days: 27,
    field: "Credential_Service",
    type: "picklist",
    accepted: [
      "Paid by ICP",
      "Sponsored by ICP",
      "To be Sponsored by Infinity",
      "Paid by Infinity"
    ]
  },
  {
    name: "Credential Evaluation Completed",
    days: 92,
    field: "Credential_Registration_Date",
    type: "present"
  },
  {
    name: "CES Report Issued",
    days: 102,
    field: "Date_Report_Issued",
    type: "present"
  },
  {
    name: "Performance Check 1",
    days: 77,
    type: "performance",
    performanceGate: { assessmentsRequired: 2, assignmentsRequired: 6, ratingRequired: true }
  },
  {
    name: "Board Registration",
    days: 120,
    field: "State_License_Board_of_Registration",
    type: "picklist",
    // CustomModule1 → Payment Resp, for BON.
    // This stage completes ONLY for the two approved payment outcomes.
    accepted: ["Paid and Completed by Candidate", "Paid by Infinity"],
    module: "CustomModule1"
  },
  {
    name: "Select Meeting Time",
    days: 120,
    type: "booking",
    nonCounted: true,
    bookingType: "prescreen"
  },
  {
    name: "Performance Check 2",
    days: 102,
    type: "performance",
    performanceGate: { assessmentsRequired: 4, assignmentsRequired: 15, ratingRequired: true }
  },
  {
    name: "Board Approval",
    days: 127,
    field: "Completed_BON_Requirements",
    type: "picklist",
    // CustomModule1 → Completed BON Requirements.
    // This stage completes ONLY when BON Approval is selected.
    accepted: ["BON Approval"],
    module: "CustomModule1"
  },
  {
    name: "Pearson Vue Registration",
    days: 150,
    field: "Pearson_Vue_Status",
    type: "picklist",
    accepted: ["Complete"]
  },
  {
    name: "Performance Check 3",
    days: 127,
    type: "performance",
    performanceGate: { assessmentsRequired: 5, assignmentsRequired: 0, ratingRequired: true }
  },
  {
    name: "ATT Received",
    days: 150,
    field: "ATT_Received_Date",
    type: "present"
  },
  {
    name: "Performance Check 4",
    days: 150,
    type: "performance",
    performanceGate: { assessmentsRequired: 6, assignmentsRequired: 0, ratingRequired: true }
  },
  {
    name: "Exam Scheduled",
    days: 165,
    field: "NCLEX_Exam_Date",
    type: "present"
  },
  {
    name: "Exam Results",
    days: 195,
    field: "NCLEX_Status",
    type: "picklist",
    accepted: ["Passed"]
  }
];

const normalizeCRMValue = (value) => String(value ?? "").trim().toLowerCase();
const hasCRMValue = (value) => value !== undefined && value !== null && String(value).trim() !== "" && String(value).trim() !== "—";

const parseNCLEXCompletedCount = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "—") return 0;
  const numeric = Number.parseInt(normalized.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getNCLEXPerformanceSnapshot = (data = {}) => ({
  assessmentsCompleted: parseNCLEXCompletedCount(
    ga(data, "Assessments_Completed", "assessmentsCompleted")
  ),
  assignmentsCompleted: parseNCLEXCompletedCount(
    ga(data, "Assignments_Completed", "assignmentsCompleted")
  ),
  rating: normalizeCRMValue(
    ga(data, "Performance_Rating", "performanceRating")
  )
});

const isNCLEXPerformanceGateSatisfied = (gate, data = {}) => {
  if (!gate) return true;
  const snapshot = getNCLEXPerformanceSnapshot(data);
  return (
    snapshot.assessmentsCompleted >= Number(gate.assessmentsRequired || 0) &&
    snapshot.assignmentsCompleted >= Number(gate.assignmentsRequired || 0) &&
    (
      !gate.ratingRequired ||
      ["high", "very high"].includes(snapshot.rating)
    )
  );
};

const isICPUSRNItemComplete = (item, data = {}) => {
  if (!item || item.type === "navigation") return false;
  if (item.type === "booking" && item.nonCounted === true) return false;
  if (item.type === "performance") {
    return isNCLEXPerformanceGateSatisfied(item.performanceGate, data);
  }
  if (!item.field) return false;

  const value = ga(
    data,
    item.field,
    item.field.replace(/_/g, ""),
    item.field.charAt(0).toLowerCase() + item.field.slice(1)
  );

  if (item.type === "present") return hasCRMValue(value);
  if (item.type === "boolean") return isTruthyField(value);
  if (item.type === "complete") {
    if (isTruthyField(value)) return true;
    return ["complete", "completed", "passed", "done", "yes"].includes(
      normalizeCRMValue(value)
    );
  }
  if (item.type === "picklist") {
    const normalized = normalizeCRMValue(value);
    return (item.accepted || []).some(
      option => normalizeCRMValue(option) === normalized
    );
  }
  return false;
};

const isICPUSRNItemUnlocked = (item, index, data = {}) => {
  if (!item) return false;
  if (index <= 0) return true;

  let furthestSourceReachedIndex = 0;

  ICP_USRN_SUBPROCESS_CONFIG.forEach((candidateItem, candidateIndex) => {
    const gateSatisfied = candidateItem?.performanceGate
      ? isNCLEXPerformanceGateSatisfied(candidateItem.performanceGate, data)
      : false;

    const sourceComplete = isICPUSRNItemComplete(candidateItem, data);

    if (gateSatisfied || sourceComplete) {
      furthestSourceReachedIndex = Math.max(
        furthestSourceReachedIndex,
        candidateIndex
      );
    }
  });

  // A satisfied middle gate cascades backwards: all earlier stages unlock.
  if (index <= furthestSourceReachedIndex) {
    return true;
  }

  // The current stage's own live performance gate remains authoritative and
  // reversible. If values later drop below the threshold this stage can lock
  // again unless a still-later source-backed milestone proves the candidate has
  // already progressed beyond it.
  if (item.performanceGate) {
    return isNCLEXPerformanceGateSatisfied(item.performanceGate, data);
  }


  if (isICPUSRNItemComplete(item, data)) {
    return true;
  }


  const previousItem = ICP_USRN_SUBPROCESS_CONFIG[index - 1];

  if (
    previousItem?.type === "booking" &&
    previousItem?.nonCounted === true
  ) {
    const beforeBooking =
      ICP_USRN_SUBPROCESS_CONFIG[Math.max(0, index - 2)];

    return (
      !beforeBooking ||
      isICPUSRNItemComplete(beforeBooking, data)
    );
  }

  return isICPUSRNItemComplete(previousItem, data);
};

const HIRING_SUBPROCESSES = {
  "Transfer to ICP USRN School": ICP_USRN_SUBPROCESS_CONFIG,
};

// NCLEX Roadmap Stages
const NCLEX_STAGES = ICP_USRN_SUBPROCESS_CONFIG.map(
  (item, index) => ({
    id: 101 + index,
    stage_name: item.name,
    stage_category: "Hiring",
    stage_order: 6 + ((index + 1) / 100),
    days_from_start: item.days,
    timing_rule: `Due by day ${item.days} from Day 1.`,
    timing_source: "nclex_day_1_fixed",
    nclex_stage: true,
    nclex_sequence_index: index
  })
);

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
  "Exam Scheduled": {
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
  "Foundations: Pillars": FOUNDATIONS_PILLARS,
  "Foundations: Pillars 1–5": FOUNDATIONS_PILLARS,
  "Licensure (General) & Live English Assessment": LICENSURE_GENERAL_ITEMS,
  "License Endorsement": LICENSE_ENDORSEMENT_ITEMS,
  "Foundations: Endorsement Discovery": LICENSE_ENDORSEMENT_ITEMS,
  "Cultural Adaptation & Integration": CULTURAL_ADAPTATION_ITEMS,
  "Foundations: Cultural Readiness": CULTURAL_ADAPTATION_ITEMS,
};

const PIPELINE_STAGE_COMMENTS = {
  "Applied": "Thank you for your interest! Our recruitment department has received your application and will connect with you within 24 hours of your submission.",
  "Associated with Job": "You have selected an employer. The recruitment department will review your resume and credentials to determine you are the right fit for the selected employer.",
  "Prescreen Scheduled": "Schedule your prescreen with an ICP recruiter to move your application forward. Dress professionally and come ready to demonstrate your knowledge as a nurse.",
  "Prescreen Completed": "Thank you for joining! Your recruiter is matching you to an employer(s) and will share their information with you shortly.",
  "Client Documents & Video Provided": "Explore employers who are actively hiring and seeking candidates with your qualifications and interests.",
  "Pending Interview Selection": "Now that you’ve familiarized yourself with the clients interested in your skill set, select and notify your recruiter which employer you would like to interview with.",
  "Mandatory Pre-Interview Coaching Call": "Meet with your recruiter to review your employers’ standards and expectations for the interview. Also, review useful tips and tricks for communicating your strengths. Go into your interview confident and prepared!",
  "Interview Scheduled": "You have your official interview date!",
  "Interview Attended": "You have successfully completed the interview with your potential employer. Your Hiring manager will connect with you within 24 hours of the interview with the employer’s decision.",
  "Offer Made": "Congratulations! Your employer believes you would be a great fit for their team. ICP has submitted the employer’s offer and it is pending your review.",
  "Offer Accepted": "You’ve accepted your job offer from the employer! You will receive your employer’s employment agreement by the end of the week.",
  "Employment Contract Sent": "Your employer’s employment agreement is ready for your review and signature!",
  "Employment Contract Signed": "Congratulations! You and your employer have officially entered into an employment agreement.",
  "Documents Received": "Required documentation for your case to be transferred to our immigration department and submitted to the attorneys.",
  "Hired": "Your employment contract has been signed and you have submitted your documents for immigration. It’s time to transition you to the Immigration department, meet your attorney and receive access to your Envoy Global profile!",
  "Immigration forms submitted": "Your case has been submitted to the attorneys to be filed with USCIS. When the attorney has reviewed your case you’ll receive access to your Envoy Global profile with instructions.",
  "Foundations: Pillars": "Foundations courses are a blend of policy, procedural, academic and cultural courses.",
  "Foundations: Endorsement Discovery": "These foundations courses are specific to the U.S. license endorsement process.",
  "Immigration approved": "USCIS has approved your I-140 application.",
  "Visa bill issued": "Infinity Care Partners will pay for your fee bill when your filing date is current and required preparation is complete.",
  "DS-260 / Civil Document Submission": "Complete your DS-260 and submit any remaining civil documents through the required process.",
  "Foundations: Cultural Readiness": "These foundations courses provide critical cultural insight that will prepare you in your transition to the United States.",
  "Immigration to Deployment Transition Call": "Scheduled 60 days after your All Clear date. Before the call, ICP confirms active bedside employment, licensure status, academic course status, and other deployment-readiness requirements.",
  "Documentarily Qualified": "The NVC has determined and marked your case complete and ready for embassy interview scheduling.",
  "Introduction to Deployment Call": "Your Stage 3 introduction call starts the Deployment phase.",
  "Final Self Assessment": "The final skills assessment is a personal assessment of your nursing skills.",
  "Speciality with Trainer Skills Check": "Department-specific academic preparation courses designed to assess and equip you with the knowledge and expectations of your future clinical role in the United States. These courses will be tailored to your nursing specialty. At the conclusion, a member of the ICP academic team will evaluate your knowledge in a one-on-one oral assessment.",
  "Deployment Pre-Arrival Call": "The Deployment Call covers all things pre and post arrival.",
  "Housing / Transportation Call": "Work with the ICP Housing Coordinator to review your housing information, begin your housing search and confirm your transportation plans.",
  "Pre-Arrival Banking Call": "Our partners at Advancial offer pre-arrival banking services. On this call you will review Advancial’s pre-arrival banking offer and all of your U.S. banking options.",
  "Employer Pre-Arrival Call": "You likely have not spoken with your employer since your original interview date. On this call, you will reconnect with your employer with ICP facilitating the discussion and ask questions specific to your transition to the facility.",
  "deployMate Ready": "Our all-in-one mobile platform is designed to support you throughout your journey to living and working in the United States. From travel coordination, flight details, housing information, personalized itineraries, and airport pickup services, DeployMate provides a seamless experience before, during, and after arrival.",
  "Welcome Packet": "A comprehensive pre-arrival packet with flight details, arrival and onboarding information, housing information, banking resources, employer information and other relocation guidance.",
  "Arrived": "You have officially arrived in the United States!",
  "Welcome Call": "The deployment team will connect with you via your new U.S. phone number within 24 hours of your U.S. arrival.",
  "Relocation Follow up": "This is your relocation experience tell all! Let us know how we did and what we can do to improve the experience of those arriving after you.",
  "US Integration Check-in": "Our aftercare department will contact you 30 days after your arrival. Be ready to share your orientation start date, end date and how and what you have been doing professionally and personally to integrate into your new communities. This is an open line of communication so feel free to discuss whatever you would like to discuss; we want to know how you are doing!",
  "Placement Stability Check-in": "This call serves as a 90-day placement milestone check-in to confirm that you have successfully transitioned into independent practice at your facility. As a staffing partner, not the employer, we use this conversation to verify completion of the initial integration period, ensure you feel stable and supported in your role, and document that contractual readiness requirements have been met ensuring long-term success."
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
  "Documents Received": { clickable: false, type: "field", field: "All_docs_on_file" },
  "Hired": { clickable: true, type: "upload", uploadType: "hired", destination: "recruit" },

  // Current Immigration flow
  "Immigration forms submitted": { clickable: false, type: "field" },
  "Request for further evidence": { clickable: true, type: "view", viewType: "immigrationFlowInfo" },
  "Foundations: Pillars": {
    label: "Foundations: Pillars",
    fields: [
      "Pillar_1_Clinical_Readiness",
      "Pillar_2_Communication_Cultural_Integration",
      "Pillar_3_Personal_Transition_Success",
      "Pillar_4_Career_Success_Pathway",
      "Pillar_5_Patient_Centered_Care"
    ],
    complete: value =>
      String(unwrapPipelineFieldValue(value) || "").trim().toLowerCase() === "completed"
  },
  "Foundations: Endorsement Discovery": {
    label: "Foundations: Endorsement Discovery",
    fields: [
      "CES_Report_Discovery_Class",
      "Fingerprints_Discovery_Class",
      "Jurisprudence_Discovery_Class",
      "Nursys_Discovery_Class",
      "Visascreen_Discovery_Class"
    ],
    complete: value =>
      Object.keys(value || {}).length === 5 &&
      Object.values(value || {}).every(isCRMChecklistComplete)
  },
  "Foundations: Cultural Readiness": {
    label: "Foundations: Cultural Readiness",
    fields: [
      "Introduction_License_Endorsement_Discovery_Class",
      "Introduction_U_S_Finances_Discovery_Class",
      "Introduction_U_S_Healthcare_Discovery_Class",
      "Introduction_U_S_Housing_Market_Discovery_Class",
      "Introduction_U_S_Transportation_Discovery_Class"
    ],
    complete: value =>
      Object.keys(value || {}).length === 5 &&
      Object.values(value || {}).every(isCRMChecklistComplete)
  },
  "Immigration approved": { clickable: false, type: "field" },
  "Visa bill issued": { clickable: false, type: "field" },
  "Visa bill paid": { clickable: false, type: "field" },
  "DS-260 / Civil Document Submission": { clickable: false, type: "field" },
  "Foundations: Cultural Readiness": { clickable: true, type: "view", viewType: "culturalReadiness" },
  "Immigration to Deployment Transition Call": { clickable: false, type: "field" },
  "Documentarily Qualified": { clickable: false, type: "field" },
  "Add/Remove Dependents": { clickable: true, type: "navigate", navigateTo: "/profile" },
  "Change Embassy Location": { clickable: true, type: "view", viewType: "immigrationFlowInfo" },

  // Current Deployment flow
  "Introduction to Deployment Call": { clickable: true, type: "view", viewType: "introductionDeployment" },
  "Introduction to Deployment Call": { clickable: false, type: "field" },
  "Speciality Classes": { clickable: false, type: "field" },
  "Final Self Assessment": { clickable: false, type: "field" },
  "Speciality w/Trainer Skills Check": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Deployment Eligible / Not Eligible": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Deployment Pre-Arrival Call": { clickable: false, type: "field" },
  "Housing / Transportation Call": { clickable: false, type: "field" },
  "Pre-Arrival Banking Call": { clickable: false, type: "field" },
  "Mandatory Petitioner / Employer Call": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "deployMate Ready": { clickable: false, type: "field" },
  "Welcome Packet": { clickable: true, type: "view", viewType: "welcomePacket" },
  "Receipt Submission": { clickable: true, type: "view", viewType: "reimbursementExpenses" },
  "Arrived": { clickable: false, type: "field" },

  // Current Aftercare links
  "Year One Anniversary Check-in": { clickable: true, type: "view", viewType: "oneYearSurvey" },

  // Visible Immigration / Deployment flow
  "Immigration forms submitted": { clickable: false, type: "field" },
  "Request for further evidence": { clickable: true, type: "view", viewType: "immigrationFlowInfo" },
  "Immigration approved": { clickable: false, type: "field" },
  "Visa bill issued": { clickable: false, type: "field" },
  "Visa bill paid": { clickable: false, type: "field" },
  "Visa application & Civil docs submitted": { clickable: true, type: "navigate", navigateTo: "/documents" },
  "Documentarily qualified": { clickable: true, type: "view", viewType: "immigrationFlowInfo" },
  "Introduction to Deployment": { clickable: true, type: "view", viewType: "introductionDeployment" },
  "Embassy Eligibility Status": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Medical Exam": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Embassy Interview": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Schedule Arrival Date": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Housing & Transportation Call": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Deployment Call": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Flights": { clickable: true, type: "view", viewType: "flight" },
  "Client Pre-Arrival Call": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },
  "Concierge Introduction": { clickable: true, type: "view", viewType: "concierge" },
  "Arrival": { clickable: true, type: "view", viewType: "deploymentFlowInfo" },

  // Immigration/Licensure stages - Clickable for details
  "Immigration Call": {
    clickable: true,
    type: "crmChecklist",
    fields: [
      "Immigration_Pathway_Discovery_Call"
    ]
  },
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
  "Gate 15 - Final Deployment": { clickable: true, type: "view", viewType: "deployment" },

  // Deployment stages - Clickable
  "Submit Updated Work Status, Civil Docs & Licensing Credentials": { clickable: true, type: "view", viewType: "deploymentDocs" },
  "Submit Housing Form": { clickable: true, type: "view", viewType: "housingForm" },
  "Request Job Offer Letter": { clickable: true, type: "view", viewType: "jobOfferLetter" },
  "Confirm Scheduled Arrival Date": { clickable: true, type: "view", viewType: "confirmArrival" },
  "Download Deploymate App": { clickable: true, type: "view", viewType: "downloadApp" },
  "Join ICP Pre-Arrival Support Group": { clickable: true, type: "crmField" },
  "Flights Booked": { clickable: true, type: "view", viewType: "flight" },
  "ICP Welcome Packet": { clickable: true, type: "view", viewType: "welcomePacket" },
  "ICP Welcome Packet & Itinerary": { clickable: true, type: "view", viewType: "welcomePacket" },
  "Connect with Concierge": { clickable: true, type: "view", viewType: "concierge" },
  "Reimbursement/Advance Payment Report Released": { clickable: true, type: "view", viewType: "reimbursement" },
  "Submit Post-Arrival Documents": { clickable: true, type: "upload", uploadType: "postArrivalDocs" },

  // Aftercare stages
  "Welcome Call": { clickable: false, type: "field" },
  "Relocation Follow up": { clickable: true, type: "view", viewType: "relocationSurvey" },
  "First week in US Check-in": { clickable: false, type: "field" },
  "Second week in US Check-in": { clickable: false, type: "field" },
  "US Integration Check-in": { clickable: true, type: "view", viewType: "thirtyDaySurvey" },
  // No survey/link for Placement Stability Check-in; CRM field controls completion.
  "Placement Stability Check-in": { clickable: false, type: "field" },
  "Year One Anniversary Check-in": { clickable: true, type: "view", viewType: "oneYearSurvey" },

  // Legacy action alias retained only for old saved routes.
  "24 Hour Call": { clickable: true, type: "view", viewType: "aftercareCall" },

  // Reimbursement is merged into Deployment -> Receipt Submission.
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
  "Good Standing": {
    icon: CheckCircle2,
    color: "text-emerald-500",
    label: "Good Standing"
  },
  "At Risk": {
    icon: AlertTriangle,
    color: "text-amber-500",
    label: "At Risk"
  },
  "Late": {
    icon: Timer,
    color: "text-red-600",
    label: "Late"
  }
};

export const PIPELINE_STAGES = getEnabledPipelineStages(STAGES_CONFIG);

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

const deployMateCompletionKey = email =>
  `icp_deploymate_completed:${String(email || "")
    .trim()
    .toLowerCase()}`;

const hasDeployMateStickyCompletion = email => {
  try {
    return (
      localStorage.getItem(
        deployMateCompletionKey(email)
      ) === "1"
    );
  } catch {
    return false;
  }
};

const setDeployMateStickyCompletion = email => {
  try {
    localStorage.setItem(
      deployMateCompletionKey(email),
      "1"
    );
  } catch {}
};

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
const HIRING_FORWARD_ORDER = [
  "Applied",
  "Associated with Job",
  "Qualified - Match",
  "Select Prescreen Time",
  "Prescreen Scheduled",
  "Prescreen Completed",
  "Client Documents & Video Provided",
  "Pending Interview Selection",
  "Interview Scheduled",
  "Interview Attended",
  "Offer Made",
  "Offer Accepted",
  "Hired",
  "Employment Contract Sent",
  "Employment Contract Signed",
  "Documents Received"
];

const ADAPTIVE_TRIGGER_STAGE_NAMES = new Set([
  "Documents Received",
  "Mandatory Pre-Interview Coaching Call",
  "Immigration Call",
  "Foundations (Phases 1–3)",
  "License Endorsement",
  "Cultural Adaptation & Integration",
  "English Complete",
  "Post-Embassy Interview Update",
  "Schedule Medical Exam",
  "Schedule Biometrics Appointment",
  "Confirmation of Eligibility to Proceed",
  "Embassy Interview Scheduled",
  "Confirm Scheduled Arrival Date",
  "Attend Housing and Transportation Call",
  "Join ICP Pre-Arrival Support Group",
  "Attend Deployment Call",
  "Confirm Final Transportation Plan",
  "Attend Facility/RN Pre-Arrival Call",
  "Connect with Concierge",
  "Communicate During Travel"
]);

const isStrictSavedCompleted = stage => {
  if (!stage) return false;

  return (
    String(
      stage.status || ""
    )
      .trim()
      .toLowerCase() ===
      "completed" &&
    Boolean(
      stage.completed_date ||
      stage.completed_at
    )
  );
};

const isStrictSavedInProgress = stage => {
  if (!stage) return false;

  const status =
    String(stage.status || "")
      .trim()
      .toLowerCase();

  return (
    status === "in progress" ||
    status === "in-progress"
  );
};

const restoreForwardOnlyHiringStages = ({
  stages,
  savedByName,
  applicationStatus
}) => {
  const completedNames = new Set();

  stages.forEach(stage => {
    const saved =
      savedByName.get(stage.stage_name);

    if (
      isPipelineStageComplete(stage) ||
      isPipelineStageComplete(saved)
    ) {
      completedNames.add(stage.stage_name);
    }
  });

  const normalized =
    normalizeApplicationStatus(
      applicationStatus
    );

  const progress =
    HIRING_STATUS_PROGRESS[normalized];

  for (
    const name of
    progress?.completed || []
  ) {
    completedNames.add(name);
  }

  const mapped =
    getMappedHiringStage(
      applicationStatus
    );

  if (mapped) {
    completedNames.add(mapped);
  }

  let furthestIndex = -1;

  completedNames.forEach(name => {
    const index =
      HIRING_FORWARD_ORDER.indexOf(name);

    if (index > furthestIndex) {
      furthestIndex = index;
    }
  });

  for (
    let index = 0;
    index <= furthestIndex;
    index += 1
  ) {
    const name =
      HIRING_FORWARD_ORDER[index];

    if (name !== "Documents Received") {
      completedNames.add(name);
    }
  }

  return stages.map(stage => {
    if (
      stage.stage_category !== "Hiring"
    ) {
      return stage;
    }

    if (
      stage.stage_name ===
      "Documents Received"
    ) {
      return stage;
    }

    const saved =
      savedByName.get(stage.stage_name);

    if (
      completedNames.has(stage.stage_name)
    ) {
      return {
        ...stage,
        ...saved,
        status: "Completed",
        completed: true,
        is_completed: true,
        completed_date:
          saved?.completed_date ||
          saved?.completed_at ||
          stage.completed_date ||
          stage.completed_at ||
          new Date().toISOString(),
        unlocked: true,
        is_locked: false,
        restored_from_history: true
      };
    }

    if (
      progress?.current ===
      stage.stage_name
    ) {
      return {
        ...stage,
        status: "In Progress",
        unlocked: true,
        is_locked: false
      };
    }

    const orderIndex =
      HIRING_FORWARD_ORDER.indexOf(
        stage.stage_name
      );

    if (
      orderIndex >= 0 &&
      orderIndex <= furthestIndex + 1
    ) {
      return {
        ...stage,
        unlocked: true,
        is_locked: false
      };
    }

    return stage;
  });
};



const getSequencedMainStages = (allStages) => {
  // One continuous visible pipeline sequence across Hiring, NCLEX, Immigration,
  // Deployment and Aftercare. Hidden compatibility rows and pure gate rows are
  // excluded, but visible NCLEX rows stay in the sequence so cascade unlocking
  // works consistently across every pipeline section.
  return (allStages || [])
    .filter(stage =>
      stage &&
      stage.is_gate !== true &&
      stage.hidden !== true &&
      stage.is_hidden !== true &&
      stage.hidden_from_main_flow !== true
    )
    .sort((first, second) => {
  
      const firstOrder = getCanonicalStageOrder(first);
      const secondOrder = getCanonicalStageOrder(second);

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

const isAuthoritativePipelineGateSatisfied = stage => {
  if (!stage) return false;

  return (
    isPipelineStageComplete(stage) ||
    stage.source_trigger_unlocked === true ||
    stage.trigger_unlocked === true ||
    stage.crm_unlocked === true ||
    stage.recruit_unlocked === true ||
    stage.portal_unlocked === true ||
    stage.nclex_unlocked === true ||
    stage.aftercare_unlocked === true ||
    stage.gate_satisfied === true
  );
};

const isStageUnlocked = (
  targetStage,
  allStages
) => {
  if (!targetStage) return false;

  if (
    targetStage.stage_category === "Aftercare"
  ) {
    const target =
      targetStage.target_date ||
      targetStage.targetDate ||
      null;

    if (target) {
      const targetTime = new Date(target).getTime();

      if (
        Number.isFinite(targetTime) &&
        Date.now() < targetTime
      ) {
        return false;
      }
    }
  }

  if (targetStage.access_locked === true) {
    return false;
  }

  // A completed stage must always remain accessible.
  if (
    isPipelineStageComplete(
      targetStage
    )
  ) {
    return true;
  }

  const sequence =
    getSequencedMainStages(
      allStages
    );

  if (!sequence.length) {
    return true;
  }

  const targetIndex =
    sequence.findIndex(stage =>
      isSamePipelineStage(
        stage,
        targetStage
      )
    );

  // Compatibility rows that are not part of the current visible sequence
  // should not accidentally become permanently inaccessible.
  if (targetIndex < 0) {
    return (
      isAuthoritativePipelineGateSatisfied(
        targetStage
      ) ||
      targetStage.is_locked !== true
    );
  }

  // The first visible stage is always available.
  if (targetIndex === 0) {
    return true;
  }

  // Rule 1: a stage whose OWN CRM / Recruit / portal gate is already met
  // must open immediately, even when the candidate entered in the middle.
  if (
    isAuthoritativePipelineGateSatisfied(
      sequence[targetIndex]
    )
  ) {
    return true;
  }

  // Rule 2: normal forward flow — completing the immediately previous stage
  // unlocks the next stage.
  const previousStage =
    sequence[targetIndex - 1];

  if (
    isPipelineStageComplete(
      previousStage
    )
  ) {
    return true;
  }

  // Rule 3: deep entry. If an authoritative gate is satisfied farther down
  // the pipeline, unlock the PATH up to that point. Earlier rows become
  // accessible, but they DO NOT become Completed unless their own trigger
  // is actually satisfied.
  let furthestSatisfiedIndex =
    -1;

  sequence.forEach(
    (stage, index) => {
      if (
        isAuthoritativePipelineGateSatisfied(
          stage
        )
      ) {
        furthestSatisfiedIndex =
          Math.max(
            furthestSatisfiedIndex,
            index
          );
      }
    }
  );

  if (
    furthestSatisfiedIndex >=
      targetIndex
  ) {
    return true;
  }

  return false;
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
          {submitting ? "Uploading..." : "Submit and close"}
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
              accept=".pdf,image/*"
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
          Submit and close
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
          accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
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

      const response = await fetch(`${API_BASE}/api/zoho/my-deals?_=${Date.now()}`, {
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

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
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

      const response = await fetch(
        `${API_BASE}/api/pipeline/field-status?email=${encodeURIComponent(
          user?.email || ""
        )}&refresh=false&_=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache"
          }
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          "Failed to fetch progress from CRM"
        );
      }

      const userData = {
        ...(data.immigration || {})
      };

      const backendChecklist =
        data.immigrationChecklists?.[stageName] || {};

      const results = {};

      items.forEach(item => {
        const backendItem =
          backendChecklist?.[item.key];

        results[item.key] =
          typeof backendItem?.complete === "boolean"
            ? backendItem.complete
            : isCRMChecklistComplete(
                getCRMChecklistValue(
                  userData,
                  item
                )
              );
      });
      setChecklist(results);

      const backendStatus =
        data.stageStatus?.[
          stageName
        ];

      const allComplete =
        items.length > 0 &&
        items.every(
          item =>
            results[item.key] === true
        );

      const completedAt =
        allComplete
          ? (
              backendStatus?.completed_date ||
              new Date().toISOString()
            )
          : null;

      setStages(previous =>
        previous.map(stage =>
          stage.stage_name === stageName
            ? {
                ...stage,
                status: allComplete ? "Completed" : "Not Started",
                completed: allComplete,
                is_completed: allComplete,
                completed_date: completedAt,
                source_trigger_unlocked: allComplete,
                trigger_unlocked: allComplete,
                crm_unlocked: allComplete,
                source_trigger_synced: true,
                crm_checklist: results,
                crm_checklist_completed:
                  Object.values(results).filter(Boolean).length,
                crm_checklist_total: items.length
              }
            : stage
        )
      );
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
                <input
                  type="checkbox"
                  checked={done}
                  readOnly
                  disabled
                  aria-label={`${item.label}: ${done ? "complete" : "not complete"}`}
                  className="h-4 w-4 flex-shrink-0 accent-emerald-600 disabled:opacity-100"
                />
                <span className={cn("text-sm", done ? "text-gray-700" : "text-gray-500")}>
                  {item.label}
                </span>
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

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
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
          {uploading ? "Uploading..." : "Submit and close"}
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
          {uploading ? "Uploading..." : "Submit and close"}
        </Button>
      </div>
    </form>
  );
};

// Survey Views
const SurveyView = ({
  title,
  description,
  surveyUrl,
  onClose,
  user,
  setStages,
  stageName
}) => {
  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    submitted,
    setSubmitted
  ] = useState(false);

  const [
    isSavingSubmission,
    setIsSavingSubmission
  ] = useState(false);

  const [
    crmSurveyVisible,
    setCrmSurveyVisible
  ] = useState(false);

  const [
    crmSurveyCount,
    setCrmSurveyCount
  ] = useState(0);

  const [
    surveyContext,
    setSurveyContext
  ] = useState({
    crmDealId:
      "",
    dealName:
      "",
    crmAssociatedUrl:
      "",
    associationReady:
      false,
    crmRegistered:
      false,
    crmMessageId:
      "",
    reusedExistingInvite:
      false
  });

  const [
    surveyContextLoading,
    setSurveyContextLoading
  ] = useState(true);

  const [
    surveyContextError,
    setSurveyContextError
  ] = useState("");

  const [
    iframeKey,
    setIframeKey
  ] = useState(0);

  const refreshIframe = async () => {
    setIsLoading(true);

    await loadSurveyContext();

    setIframeKey(
      previous =>
        previous + 1
    );
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const fetchWithTimeout =
    async (
      url,
      options = {},
      timeoutMs = 12000
    ) => {
      const controller =
        new AbortController();

      const timeout =
        window.setTimeout(
          () =>
            controller.abort(),
          timeoutMs
        );

      try {
        return await fetch(
          url,
          {
            ...options,
            signal:
              controller.signal
          }
        );
      } finally {
        window.clearTimeout(
          timeout
        );
      }
    };

  const loadSurveyContext =
    async () => {
      if (
        !stageName ||
        !user?.email
      ) {
        setSurveyContextLoading(
          false
        );
        return;
      }

      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        setSurveyContextLoading(
          false
        );
        setSurveyContextError(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      setSurveyContextLoading(
        true
      );
      setSurveyContextError(
        ""
      );

      try {
        const response =
          await fetchWithTimeout(
            `${API_BASE}/api/pipeline/aftercare-survey/open-native`,
            {
              method:
                "POST",
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                "Cache-Control":
                  "no-cache",
                Pragma:
                  "no-cache"
              },
              body:
                JSON.stringify({
                  stage_name:
                    stageName
                })
            },
            45000
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          data.success !==
            true ||
          data.crm_registered !==
            true ||
          !data.crm_deal_id ||
          !data.crm_generated_survey_url
        ) {
          throw new Error(
            data.error ||
            "Zoho CRM did not confirm the native survey registration."
          );
        }

        let verifiedUrl =
          "";

        try {
          const parsed =
            new URL(
              data.crm_generated_survey_url
            );

          const fromService =
            String(
              parsed.searchParams.get(
                "fromservice"
              ) ||
              ""
            ).toUpperCase();

          const crmAssociation =
            String(
              parsed.searchParams.get(
                "zs_potentials"
              ) ||
              ""
            ).trim();

          if (
            parsed.hostname ===
              "survey.zohopublic.com" &&
            fromService ===
              "ZCRM" &&
            crmAssociation &&
            !crmAssociation.includes(
              "${"
            )
          ) {
            verifiedUrl =
              parsed.toString();
          }
        } catch {
          verifiedUrl =
            "";
        }

        if (!verifiedUrl) {
          throw new Error(
            "Zoho CRM returned an invalid or unmerged survey link."
          );
        }

        setSurveyContext({
          crmDealId:
            String(
              data.crm_deal_id
            ),
          dealName:
            data.deal_name ||
            "",
          crmAssociatedUrl:
            verifiedUrl,
          associationReady:
            true,
          crmRegistered:
            true,
          crmMessageId:
            data.crm_message_id ||
            "",
          reusedExistingInvite:
            data.reused_existing_invite ===
            true
        });

        setCrmSurveyVisible(
          true
        );

        setCrmSurveyCount(
          Number(
            data.crm_survey_count_after ||
            0
          )
        );
      } catch (error) {
        setSurveyContext({
          crmDealId:
            "",
          dealName:
            "",
          crmAssociatedUrl:
            "",
          associationReady:
            false,
          crmRegistered:
            false,
          crmMessageId:
            "",
          reusedExistingInvite:
            false
        });

        if (
          error?.name ===
          "AbortError"
        ) {
          setSurveyContextError(
            "Zoho CRM registration timed out. Retry this screen; the backend will reuse any survey email it already created."
          );
        } else {
          setSurveyContextError(
            error.message ||
            "Unable to register this survey with Zoho CRM."
          );

          console.warn(
            "[Aftercare Survey] Native CRM registration unavailable:",
            error
          );
        }
      } finally {
        setSurveyContextLoading(
          false
        );
      }
    };

  // IMPORTANT: the portal no longer manufactures a public survey URL.
  // It only opens the rendered link returned from a Zoho CRM email template
  // after the backend has verified a new native Zoho Survey related-list row.
  const resolvedSurveyUrl =
    surveyContext.crmRegistered ===
      true &&
    surveyContext.associationReady ===
      true
      ? surveyContext.crmAssociatedUrl
      : "";

  const surveyAssociationReady =
    Boolean(
      surveyContext.crmRegistered ===
        true &&
      surveyContext.associationReady ===
        true &&
      surveyContext.crmDealId &&
      resolvedSurveyUrl
    );

  const checkCrmSurveyStatus =
    async ({
      silent = true
    } = {}) => {
      if (
        !stageName ||
        !user?.email
      ) {
        return false;
      }

      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        return false;
      }

      try {
        const response =
          await fetchWithTimeout(
            `${API_BASE}/api/pipeline/aftercare-survey-status?stage_name=${encodeURIComponent(stageName)}&_=${Date.now()}`,
            {
              method:
                "GET",
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Cache-Control":
                  "no-cache",
                Pragma:
                  "no-cache"
              }
            },
            10000
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          data.success !==
            true
        ) {
          if (!silent) {
            throw new Error(
              data.error ||
              "Unable to check the CRM Zoho Survey section."
            );
          }

          return false;
        }

        if (
          data.submitted ===
          true
        ) {
          setSubmitted(
            true
          );
        }

        const visible =
          data.crm_survey_visible ===
          true;

        setCrmSurveyVisible(
          visible
        );

        setCrmSurveyCount(
          Number(
            data.crm_survey_count ||
            0
          )
        );

        if (
          data.crm_deal_id ||
          data.deal_name
        ) {
          setSurveyContext(
            previous => ({
              ...previous,
              crmDealId:
                data.crm_deal_id ||
                previous.crmDealId,
              dealName:
                data.deal_name ||
                previous.dealName
            })
          );
        }

        return visible;
      } catch (error) {
        if (
          error?.name !==
            "AbortError" &&
          !silent
        ) {
          toast.error(
            error.message ||
            "Unable to check the CRM Zoho Survey section."
          );
        }

        return false;
      }
    };

  const persistSurveySubmission =
    async () => {
      if (
        submitted ||
        isSavingSubmission ||
        !stageName ||
        !user?.email
      ) {
        return;
      }

      if (
        !surveyAssociationReady
      ) {
        toast.error(
          surveyContextError ||
          "This survey is not yet linked to your CRM record. Retry the CRM link before submitting."
        );
        return;
      }

      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        toast.error(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      // Optimistic submission: the candidate sees "Submitted" immediately.
      // If the save fails, we roll this back and show the error.
      setSubmitted(
        true
      );

      setIsSavingSubmission(
        true
      );

      try {
        const response =
          await fetchWithTimeout(
            `${API_BASE}/api/pipeline/aftercare-survey-submitted`,
            {
              method:
                "POST",
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                "Cache-Control":
                  "no-cache",
                Pragma:
                  "no-cache"
              },
              body:
                JSON.stringify({
                  stage_name:
                    stageName
                })
            },
            12000
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          data.success !==
            true
        ) {
          throw new Error(
            data.error ||
            "Unable to save the survey submission."
          );
        }

        setSubmitted(
          true
        );

        // CRM Survey sync continues independently in the background.
        // Confirmation success must never wait for or depend on CRM visibility.


        if (
          data.completed ===
          true
        ) {
          setStages?.(
            previous =>
              previous.map(
                stage =>
                  stage.stage_name ===
                    stageName
                    ? {
                        ...stage,
                        completed:
                          true,
                        is_completed:
                          true,
                        status:
                          "Completed",
                        completed_date:
                          data.completed_date ||
                          new Date()
                            .toISOString()
                      }
                    : stage
              )
          );
        }

        toast.success(
          data.message ||
          `${title} submitted successfully.`
        );

        window.dispatchEvent(
          new CustomEvent(
            "pipeline-updated",
            {
              detail: {
                stageName,
                source:
                  "survey-submit",
                completed:
                  data.completed ===
                  true
              }
            }
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            "survey-updated",
            {
              detail: {
                stageName,
                crmRelatedList:
                  "Zoho_Survey",
                submitted:
                  true
              }
            }
          )
        );
      } catch (error) {
        setSubmitted(
          false
        );

        if (
          error?.name ===
          "AbortError"
        ) {
          toast.error(
            "Survey confirmation timed out. The page is still usable; please try again."
          );
        } else {
          console.error(
            `[Aftercare Survey] Could not persist ${stageName}:`,
            error
          );

          toast.error(
            error.message ||
            "The survey submission could not be saved."
          );
        }
      } finally {
        setIsSavingSubmission(
          false
        );
      }
    };

  useEffect(() => {
    loadSurveyContext();
  }, [
    stageName,
    user?.email
  ]);

  useEffect(() => {
    checkCrmSurveyStatus();

    const timer =
      window.setInterval(
        () => {
          checkCrmSurveyStatus();
        },
        10000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    stageName,
    user?.email
  ]);

  useEffect(() => {
    const handleMessage =
      event => {
        if (
          !String(
            event.origin ||
            ""
          ).includes(
            "zohopublic.com"
          )
        ) {
          return;
        }

        const messageType =
          event.data?.type ||
          event.data?.event ||
          event.data;

        if (
          [
            "formSubmit",
            "formComplete",
            "submitted",
            "submit",
            "success"
          ].includes(
            messageType
          )
        ) {
          persistSurveySubmission();
        }
      };

    window.addEventListener(
      "message",
      handleMessage
    );

    return () =>
      window.removeEventListener(
        "message",
        handleMessage
      );
  }, [
    submitted,
    isSavingSubmission,
    stageName,
    user?.email
  ]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Clipboard className="h-5 w-5 text-rose-500" />
          <div>
            <h3 className="font-semibold text-gray-800">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={
              refreshIframe
            }
            disabled={
              surveyContextLoading
            }
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
              submitted
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            {submitted
              ? (
                  <CheckCircle2 className="h-3 w-3" />
                )
              : isSavingSubmission
                ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )
                : (
                    <Clock className="h-3 w-3" />
                  )}

            {submitted
              ? (
                  crmSurveyVisible
                    ? "Submitted • In CRM"
                    : "Submitted"
                )
              : isSavingSubmission
                ? "Submitting..."
                : "Submit survey"}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={
              onClose
            }
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-gray-50">
        {surveyContextLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            <span className="mt-3 text-sm font-medium text-gray-700">
              Registering survey with Zoho CRM...
            </span>
            <span className="mt-1 max-w-md text-xs text-muted-foreground">
              The portal is asking Zoho CRM to send the survey template, register it in the native Zoho Survey related list, and return the CRM-generated link.
            </span>
          </div>
        ) : !surveyAssociationReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm font-semibold text-red-700">
              Survey was not registered in CRM
            </p>
            <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">
              {surveyContextError ||
                "Zoho CRM did not confirm a native Zoho Survey record. The survey was intentionally not opened."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={
                loadSurveyContext
              }
            >
              Retry CRM Registration
            </Button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
                <span className="mt-3 text-sm text-muted-foreground">
                  Loading CRM-registered survey...
                </span>
              </div>
            )}

            <iframe
              key={
                iframeKey
              }
              src={
                resolvedSurveyUrl
              }
              className="w-full h-full border-0"
              onLoad={
                handleIframeLoad
              }
              title={
                title
              }
              allow="fullscreen; geolocation; microphone; camera"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
              loading="lazy"
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">
            Zoho CRM registers this survey first using the configured CRM email template with <span className="font-medium">Insert Survey Link</span>. The portal then opens the exact CRM-generated survey link here.
          </p>

          {surveyAssociationReady && (
            <p className="mt-1 text-xs font-medium text-blue-700">
              CRM survey registered and ready
              {surveyContext.dealName
                ? ` for ${surveyContext.dealName}`
                : ""}
              {surveyContext.reusedExistingInvite
                ? " • existing CRM invite reused"
                : ""}
              .
            </p>
          )}

          {crmSurveyVisible && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              Zoho Survey is visible in CRM
              {crmSurveyCount > 0
                ? ` (${crmSurveyCount} related survey record${crmSurveyCount === 1 ? "" : "s"}).`
                : "."}
            </p>
          )}

          {submitted &&
            !crmSurveyVisible && (
              <p className="mt-1 text-xs font-medium text-emerald-700">
                Survey submitted successfully. Zoho CRM will expose View Response when the native Survey integration finishes recording the response.
              </p>
            )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              submitted ||
              isSavingSubmission ||
              !surveyAssociationReady
            }
            onClick={
              persistSurveySubmission
            }
          >
            {submitted
              ? "Submitted"
              : isSavingSubmission
                ? "Submitting..."
                : "Confirm Survey Submitted"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              checkCrmSurveyStatus({
                silent:
                  false
              })
            }
          >
            Verify CRM Survey
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={
              onClose
            }
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

const RelocationSurvey = ({ onClose, user, setStages }) => (
  <SurveyView
    title="Relocation Follow up"
    description="Please share your feedback about your relocation experience."
    surveyUrl="https://survey.zohopublic.com/zs/k4DH3c"
    onClose={onClose}
    user={user}
    setStages={setStages}
    stageName="Relocation Follow up"
  />
);

const ThirtyDaySurvey = ({ onClose, user, setStages }) => (
  <SurveyView
    title="US Integration Check-in"
    description="Please share your U.S. integration update."
    surveyUrl="https://survey.zohopublic.com/zs/yEB6y4"
    onClose={onClose}
    user={user}
    setStages={setStages}
    stageName="US Integration Check-in"
  />
);


const OneYearSurvey = ({ onClose, user, setStages }) => (
  <SurveyView
    title="Year One Anniversary Check-in"
    description="Please share your year-one anniversary feedback."
    surveyUrl="https://survey.zohopublic.com/zs/kJCsR0"
    onClose={onClose}
    user={user}
    setStages={setStages}
    stageName="Year One Anniversary Check-in"
  />
);


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
          {isSubmitting ? "Submitting..." : "Submit and close"}
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



function unwrapPipelineFieldValue(value) {
  if (value === undefined || value === null) return value;

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.length === 1) return unwrapPipelineFieldValue(value[0]);
    return value.map(unwrapPipelineFieldValue);
  }

  if (typeof value === "object") {
    const preferred =
      value.value ??
      value.display_value ??
      value.displayValue ??
      value.name ??
      value.label ??
      value.selected ??
      value.checked ??
      value.date ??
      value.datetime ??
      value.Date ??
      value.DateTime;

    if (preferred !== undefined) {
      return unwrapPipelineFieldValue(preferred);
    }
  }

  return value;
}

const hasFlowValue = value => {
  if (value === undefined || value === null || value === false) return false;
  if (Array.isArray(value)) return value.some(hasFlowValue);
  if (typeof value === "object") {
    const preferred = value.display_value ?? value.value ?? value.name ?? value.file_name ?? value.File_Name ?? value.id;
    return preferred !== undefined ? hasFlowValue(preferred) : Object.keys(value).length > 0;
  }
  const normalized = String(value).trim().toLowerCase();
  return !["", "—", "-", "none", "null", "undefined", "not available", "n/a"].includes(normalized);
};

const isCurrentOrPastDate = value =>
  isArrivalCalendarDateTodayOrPast(
    unwrapPipelineFieldValue(value)
  );

const selectedValues = value => {
  if (Array.isArray(value)) return value.map(item => String(item?.value ?? item?.name ?? item).trim().toLowerCase());
  if (value && typeof value === "object") {
    const v = value.value ?? value.name ?? value.display_value;
    return v === undefined ? [] : [String(v).trim().toLowerCase()];
  }
  return String(value ?? "").split(/[;,|]/).map(item => item.trim().toLowerCase()).filter(Boolean);
};

// Resolve CRM/Recruit values defensively. Backend responses may expose the
// same API field under its exact Zoho API name, a camelCase alias, or a
// display-shaped key. Match normalized keys as a last resort so a populated
// CRM field cannot fail to cross off its corresponding visible pipeline row.
const normalizePipelineFieldKey = value =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getLivePipelineFieldValue = (source, fieldNames) => {
  const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  for (const name of names) {
    if (!name) continue;
    const direct = source?.[name];
    if (direct !== undefined && direct !== null && direct !== "") return direct;
  }

  const normalizedWanted = new Set(
    names.filter(Boolean).map(normalizePipelineFieldKey)
  );

  for (const [key, value] of Object.entries(source || {})) {
    if (normalizedWanted.has(normalizePipelineFieldKey(key)) &&
        value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const AFTERCARE_SURVEY_STAGE_NAMES = new Set([
  "Relocation Follow up",
  "US Integration Check-in",
  "Year One Anniversary Check-in"
]);

const DEPLOYMENT_CRM_STAGE_RULES = {
  "Immigration forms submitted": {
    label: "Submitted to Immigration",
    field: "Added_to_Weekly_I140_Candidates",
    complete: isCurrentOrPastDate
  },
  "Request for further evidence": {
    label: "Immigration Stage",
    field: "i140",
    complete: value => String(value || "").trim().toLowerCase() === "approved",
    inProgress: value => [
      "rfe",
      "rfe (request for evidence)",
      "request for evidence",
      "request for further evidence"
    ].includes(String(value || "").trim().toLowerCase())
  },
  "Foundations: Pillars": {
    label: "Foundations: Pillars",
    fields: [
      "Pillar_1_Clinical_Readiness",
      "Pillar_2_Communication_Cultural_Integration",
      "Pillar_3_Personal_Transition_Success",
      "Pillar_4_Career_Success_Pathway",
      "Pillar_5_Patient_Centered_Care"
    ],
    complete: value =>
      Object.keys(value || {}).length === 5 &&
      Object.values(value || {}).every(isCRMChecklistComplete)
  },
  "Foundations: Endorsement Discovery": {
    label: "Foundations: Endorsement Discovery",
    fields: [
      "CES_Report_Discovery_Class",
      "Fingerprints_Discovery_Class",
      "Jurisprudence_Discovery_Class",
      "Nursys_Discovery_Class",
      "Visascreen_Discovery_Class"
    ],
    complete: value =>
      Object.keys(value || {}).length === 5 &&
      Object.values(value || {}).every(isCRMChecklistComplete)
  },
  "Foundations: Cultural Readiness": {
    label: "Foundations: Cultural Readiness",
    fields: [
      "Introduction_License_Endorsement_Discovery_Class",
      "Introduction_U_S_Finances_Discovery_Class",
      "Introduction_U_S_Healthcare_Discovery_Class",
      "Introduction_U_S_Housing_Market_Discovery_Class",
      "Introduction_U_S_Transportation_Discovery_Class"
    ],
    complete: value =>
      Object.keys(value || {}).length === 5 &&
      Object.values(value || {}).every(isCRMChecklistComplete)
  },
  "Immigration approved": {
    label: "Immigration Approved",
    fields: [
      "i140",
      "Approval_Date"
    ],
    complete: value =>
      String(
        unwrapPipelineFieldValue(
          value?.i140
        ) || ""
      ).trim().toLowerCase() ===
        "approved" &&
      hasFlowValue(
        value?.Approval_Date
      )
  },
  "Visa bill issued": {
    label: "Visa Fee Bill Stage",
    field: "Visa_Fee_Bill",
    complete: value => {
      const normalized = String(
        unwrapPipelineFieldValue(value) || ""
      ).trim().toLowerCase();

      return [
        "received - ready to be paid",
        "paid"
      ].includes(normalized);
    }
  },
  "Visa bill paid": {
    label: "Visa Fee Bill Stage",
    field: "Visa_Fee_Bill",
    complete: value =>
      String(
        unwrapPipelineFieldValue(value) || ""
      ).trim().toLowerCase() === "paid"
  },
  "DS-260 / Civil Document Submission": {
    label: "DS260 Stage",
    field: "DS260_STATUS",
    complete: value =>
      String(
        unwrapPipelineFieldValue(value) || ""
      ).trim().toLowerCase() === "submitted to nvc"
  },
  "Immigration to Deployment Transition Call": {
    label: "Immigration to Deployment Transition call",
    field: "Immigration_to_Deployment_Transition_call",
    complete: value =>
      hasFlowValue(
        unwrapPipelineFieldValue(
          value
        )
      )
  },
  "Documentarily Qualified": {
    label: "All Clear",
    fieldsAny: ["All_Clear_Documentary_Complete", "allClearSelection", "allClear"],
    complete: value => {
      const raw = unwrapPipelineFieldValue(value);
      const normalized = String(raw || "").trim().toLowerCase();
      return normalized === "yes" || raw === true;
    }
  },
  "Introduction to Deployment Call": {
    label: "Stage 3 Intro Call",
    field: "Stage_3_Intro_Call",
    complete: value => {
      const raw = unwrapPipelineFieldValue(value);
      if (
        raw === true ||
        ["yes", "complete", "completed", "done", "attended", "pass"]
          .includes(String(raw || "").trim().toLowerCase())
      ) {
        return true;
      }

      if (!raw) return false;

      const parsed = new Date(raw);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.getTime() <= Date.now()
      );
    }
  },
  "Speciality Classes": {
    label: "Relias Skills",
    field: "Hours_Recent_Bedside_Experience",
    complete: value =>
      String(
        unwrapPipelineFieldValue(value) || ""
      ).trim().toLowerCase() === "pass"
  },
  "Final Self Assessment": {
    label: "Final ICP Self Assessment",
    field: "Self_Assessment_2_Complete",
    complete: isCurrentOrPastDate
  },
  "Speciality with Trainer Skills Check": {
    label: "Speciality w/Trainer Skills Check",
    field: "Speciality_with_Trainer_Skills_Check",
    complete: value => isCRMChecklistComplete(value)
  },
  "Deployment Eligible / Not Eligible": {
    label: "Deployment Eligibility",
    fieldsAny: ["State_Licensure_Requirements", "stateLicensureRequirements", "Deployment_Eligibility"],
    complete: value => selectedValues(value).some(item =>
      item === "eligible" ||
      item.startsWith("eligible -") ||
      item.startsWith("eligible:")
    )
  },
  "Deployment Pre-Arrival Call": {
    label: "Nurse Deployment Call",
    field: "Deployment_Call",
    complete: isCurrentOrPastDate
  },
  "Housing / Transportation Call": {
    label: "Housing Call",
    field: "Final_Housing_Confirmation_Call",
    complete: isCurrentOrPastDate
  },
  "Pre-Arrival Banking Call": {
    label: "Pre-Arrival Banking Call",
    field: "Pre_Arrival_Banking_Call",
    complete: isCurrentOrPastDate
  },
  "Employer Pre-Arrival Call": {
    label: "Client Arrival Call",
    field: "Client_Arrival_Call",
    complete: isCurrentOrPastDate
  },
  "deployMate Ready": {
    label: "deployMate Ready",
    fields: [
      "initial_departure_time",
      "final_destination_arrival",
      "departcity",
      "entryport",
      "layover1location",
      "layover2location",
      "layover3location",
      "fligtnumber1",
      "fligtnumber2",
      "fligtnumber3",
      "fligtnumber4",
      "primaryairlinetrack",
      "flighttracker",
      "finalflightnumber",
      "finalflightairline",
      "primaryairline",
      "confirmationnumbers",
      "flightConfirmation",
      "welcomeAppointments",
      "welcomeAppointmentsAttachmentId",
      "conciergeBiographyAttachmentId"
    ],
    complete: value => {
      const source =
        value || {};

      const requiredFields = [
        "initial_departure_time",
        "final_destination_arrival",
        "departcity",
        "entryport",
        "welcomeAppointments",
        "welcomeAppointmentsAttachmentId",
        "conciergeBiographyAttachmentId"
      ];

      const layoverFields = [
        "layover1location",
        "layover2location",
        "layover3location"
      ];

      const flightFields = [
        "fligtnumber1",
        "fligtnumber2",
        "fligtnumber3",
        "fligtnumber4",
        "primaryairlinetrack",
        "flighttracker",
        "finalflightnumber",
        "finalflightairline",
        "primaryairline",
        "confirmationnumbers",
        "flightConfirmation"
      ];

      const hasValue =
        field =>
          hasFlowValue(
            unwrapPipelineFieldValue(
              source[field]
            )
          );

      return (
        requiredFields.every(
          hasValue
        ) &&
        layoverFields.some(
          hasValue
        ) &&
        flightFields.some(
          hasValue
        )
      );
    }
  },
  "Arrived": {
    label: "Final Destination Arrival",
    field: "Flight_Arrival_Time",
    complete: isCurrentOrPastDate
  },
  "Welcome Call": {
    label: "Candidate U.S. Welcome Text/Call",
    field: "Candidate_U_S_Welcome_Text_Call",
    complete: value =>
      isCurrentOrPastDate(value) ||
      isCRMChecklistComplete(value) ||
      hasFlowValue(value)
  },
  "Relocation Follow up": {
    label: "Date Relocation Follow up Submitted",
    field: "Date_Relocation_Submitted",
    complete: value => hasFlowValue(value)
  },
  "US Integration Check-in": {
    label: "New 30 Day Completed Date",
    field: "FY25_30_Day_Survey",
    complete: value => hasFlowValue(value)
  },
  "First week in US Check-in": {
    label: "First week in US Check-in",
    field: "Day_Call",
    complete: isCurrentOrPastDate
  },
  "Second week in US Check-in": {
    label: "2 Week Survey",
    field: "Client_Post_Arrival_Survey_Due_90_Days",
    complete: isCurrentOrPastDate
  },
  "Placement Stability Check-in": {
    label: "New 90 Day Exit Call",
    field: "FY25_90_Day_Exit_Call",
    complete: value => hasFlowValue(value)
  },
  "Year One Anniversary Check-in": {
    label: "1 yr Survey",
    field: "Employment_Status_Date",
    complete: value => hasFlowValue(value)
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

  const [liveStatus, setLiveStatus] = useState(status || {});
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadLiveCRM = async () => {
      try {
        setLoadingLive(true);
        setLoadError("");

        const token = localStorage.getItem("icp_auth_token");
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(
          `${API_BASE}/api/pipeline/field-status?email=${encodeURIComponent(
            user?.email || ""
          )}&refresh=false&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache"
            }
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error ||
            data?.message ||
            "Unable to fetch CRM field."
          );
        }

        if (cancelled) return;

        const merged = {
          ...(data.deployment || {}),
          ...(data.immigration || {}),
          ...(data.recruit || {})
        };

        setLiveStatus(merged);

        const liveStage = data.stageStatus?.[stage.stage_name];
        if (typeof liveStage?.completed === "boolean") {
          setStages(previous =>
            previous.map(item =>
              item.stage_name === stage.stage_name
                ? {
                    ...item,
                    status: liveStage.completed
                      ? "Completed"
                      : (liveStage.status || "Not Started"),
                    completed: liveStage.completed,
                    is_completed: liveStage.completed,
                    completed_date: liveStage.completed
                      ? (
                          liveStage.completed_date ||
                          item.completed_date ||
                          new Date().toISOString()
                        )
                      : null,
                    source_trigger_unlocked:
                      liveStage.completed === true ||
                      liveStage.unlocked === true,
                    trigger_unlocked:
                      liveStage.completed === true ||
                      liveStage.unlocked === true,
                    crm_unlocked:
                      liveStage.completed === true ||
                      liveStage.unlocked === true,
                    source_trigger_synced: true,
                    crm_synced: true
                  }
                : item
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error?.message ||
            "Unable to fetch CRM field."
          );
        }
      } finally {
        if (!cancelled) setLoadingLive(false);
      }
    };

    loadLiveCRM();

    return () => {
      cancelled = true;
    };
  }, [stage.stage_name, user?.email, setStages]);

  const value = rule?.fields
    ? Object.fromEntries(
        rule.fields.map(field => [
          field,
          getLivePipelineFieldValue(liveStatus, field)
        ])
      )
    : getLivePipelineFieldValue(
        liveStatus,
        rule?.fieldsAny || rule?.field
      );

  const complete = rule?.complete?.(value) === true;
  const postArrival = rule?.allowContinue?.(value) === true;

  useEffect(() => {
    if (!complete) return;

    setStages(previous =>
      previous.map(item =>
        item.stage_name === stage.stage_name
          ? {
              ...item,
              status: "Completed",
              completed: true,
              is_completed: true,
              completed_date:
                item.completed_date ||
                new Date().toISOString(),
              source_trigger_unlocked: true,
              trigger_unlocked: true,
              crm_unlocked: true,
              source_trigger_synced: true,
              crm_synced: true
            }
          : item
      )
    );
  }, [complete, stage.stage_name, setStages]);

  const confirm = async () => {
    if (!complete && !postArrival) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      const response = await fetch(
        `${API_BASE}/api/pipeline/acknowledge-field-stage`,
        {
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
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update the stage.");
      }

      window.dispatchEvent(
        new CustomEvent("pipeline-updated", {
          detail: {
            email: user?.email,
            stage_name: stage.stage_name
          }
        })
      );

      toast.success(
        postArrival
          ? "Marked to be completed after arrival."
          : "Stage completed."
      );

      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const displayValue = field => {
    const raw = getLivePipelineFieldValue(liveStatus, field);
    if (
      raw === undefined ||
      raw === null ||
      String(raw).trim() === ""
    ) {
      return "Not available";
    }
    return String(raw);
  };

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="rounded-xl border p-4">
        <p className="text-sm font-semibold">
          {rule?.label || stage.stage_name}
        </p>

        {loadingLive ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Fetching latest CRM value...
          </p>
        ) : rule?.fields ? (
          <div className="mt-3 space-y-2">
            {rule.fields.map(field => (
              <div
                key={field}
                className="flex justify-between gap-4 text-sm"
              >
                <span>
                  {rule?.fieldLabels?.[field] ||
                    field
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="font-medium text-right">
                  {displayValue(field)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium">
            {value === undefined ||
            value === null ||
            String(value).trim() === ""
              ? "Not available"
              : String(value)}
          </p>
        )}
      </div>

      <div
        className={`rounded-lg border p-3 text-sm ${
          complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {complete
          ? "CRM criteria met. This stage is complete."
          : "This stage is not complete yet."}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {(complete || postArrival) && (
          <Button onClick={confirm} disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
};

const WelcomePacketView = ({ onClose, user, setStages, setDeploymentFieldStatus }) => {
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

        const portOfEntry = pick(
          deal,
          "entryport",
          "Port_of_Entry_in_US"
        );
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

        const hasLocation = value =>
          Boolean(value) && String(value).trim() !== "" && String(value).trim() !== "—";
        const normalizedLocation = value => String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const sameLocation = (first, second) =>
          hasLocation(first) &&
          hasLocation(second) &&
          normalizedLocation(first) === normalizedLocation(second);
        const looksLikeUSLocation = value => {
          if (!hasLocation(value)) return false;
          const raw = String(value).trim();
          return /\b(usa|u\.?s\.?a?|united states)\b/i.test(raw) ||
            /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i.test(raw) ||
            /^[A-Z]{3}$/i.test(raw);
        };

        const resolveRelocationHubCity = () => {
          const hasL2 = hasLocation(layover2);
          const hasL3 = hasLocation(layover3);

          // Layover 3 is the final city when Layover 2 is the Port of Entry.
          // If Layover 3 itself is the Port of Entry, use the Port of Entry value.
          if (hasL3) {
            if (sameLocation(layover3, portOfEntry)) return portOfEntry;
            if (sameLocation(layover2, portOfEntry)) return layover3;
          }

          // With no Layover 3: if Layover 1 is the Port of Entry and Layover 2
          // is a U.S. location, Layover 2 is the relocation city.
          if (!hasL3 && hasL2) {
            if (sameLocation(layover2, portOfEntry)) return portOfEntry;
            if (sameLocation(layover1, portOfEntry) && looksLikeUSLocation(layover2)) {
              return layover2;
            }
          }

          // With no later layovers and Layover 1 matching the Port of Entry,
          // the Port of Entry is the final city.
          if (!hasL2 && !hasL3 && sameLocation(layover1, portOfEntry)) {
            return portOfEntry || layover1;
          }

          return pick(
            deal,
            "Arrival_Airport",
            "Final_Arrival_Airport",
            "entryport",
            "Port_of_Entry_in_US"
          );
        };

        const resolvedArrivalAirport = resolveRelocationHubCity();

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
      console.log("[Housing] Parsed server response", data);

      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Unable to acknowledge the Welcome Packet.");
      }

      setStages?.(prev => prev.map(stage =>
        stage.stage_name === "Welcome Packet"
          ? {
              ...stage,
              status: "Completed",
              completed: true,
              is_completed: true,
              completed_date:
                data.stage?.completed_date ||
                data.completed_date ||
                new Date().toISOString(),
              acknowledged_at:
                data.stage?.acknowledged_at ||
                data.acknowledged_at ||
                new Date().toISOString(),
              source_trigger_unlocked: true,
              trigger_unlocked: true
            }
          : stage
      ));

      setDeploymentFieldStatus?.(previous => {
        const current = previous || {};
        return {
          ...current,
          __stageStatus: {
            ...(current.__stageStatus || {}),
            "Welcome Packet": {
              ...(current.__stageStatus?.["Welcome Packet"] || {}),
              evaluated: true,
              completed: true,
              is_completed: true,
              status: "Completed",
              completed_date:
                data.stage?.completed_date ||
                data.completed_date ||
                new Date().toISOString(),
              unlocked: true,
              source_fields: ["candidate_acknowledgement"]
            }
          },
          __completionMap: {
            ...(current.__completionMap || {}),
            "Welcome Packet": true
          }
        };
      });

      window.dispatchEvent(new CustomEvent("pipeline-updated", {
        detail: {
          email: user?.email,
          stage_name: "Welcome Packet",
          status: "Completed",
          completed: true,
          source: "candidate_acknowledgement"
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

const DeploymateDownloadView = ({
  onClose,
  user,
  setStages
}) => {
  const [saving, setSaving] = useState(false);

  const options = [
    {
      label: "Web Version",
      href: "https://secureapp-nine.vercel.app/"
    },
    {
      label: "Android",
      href: "https://play.google.com/store/apps/details?id=com.anonymous.ICPDeploymate"
    },
    {
      label: "iOS",
      href: "https://apps.apple.com/us/app/deploymate/id6766843334"
    }
  ];

  const openVersion = async href => {
    try {
            const token = localStorage.getItem("icp_auth_token");
            if (token) {
              await fetch(`${API_BASE}/api/pipeline/deploymate-complete`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              });
            }
          } catch (error) {
            console.warn("[deployMate] Persist completion failed:", error);
          }
          setDeployMateStickyCompletion(user?.email);
          setStages?.(previous =>
            previous.map(stage =>
              stage.stage_name === "deployMate Ready"
                ? {
                    ...stage,
                    status: "Completed",
                    completed: true,
                    is_completed: true,
                    completed_date:
                      stage.completed_date || new Date().toISOString(),
                    source_trigger_unlocked: true,
                    trigger_unlocked: true
                  }
                : stage
            )
          );
          window.open(
      href,
      "_blank",
      "noopener,noreferrer"
    );

    if (saving) return;

    setSaving(true);

    // Optimistic cross-off immediately on the click itself.
    setStages(previous =>
      previous.map(stage =>
        stage.stage_name === "deployMate Ready"
          ? {
              ...stage,
              status: "Completed",
              completed: true,
              is_completed: true,
              completed_date:
                stage.completed_date ||
                new Date().toISOString()
            }
          : stage
      )
    );

    try {
      await updateStageStatus(
        user?.email,
        "deployMate Ready",
        setStages,
        "Completed"
      );

      window.dispatchEvent(
        new CustomEvent("pipeline-updated", {
          detail: {
            stageName: "deployMate Ready",
            source: "deploymate-link-click"
          }
        })
      );

      toast.success("deployMate Ready completed.");
    } catch (error) {
      console.error(
        "[deployMate Ready] Could not persist click completion:",
        error
      );
      toast.error(
        "The link opened, but the completion could not be saved yet."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Open any Deploymate option below. The stage checks off as soon as you select a link.
      </p>

      <div className="grid gap-3">
        {options.map(option => (
          <Button
            key={option.href}
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => openVersion(option.href)}
            className="justify-start"
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

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
export const DeploymentDetails = ({ onClose, user, setStages, behavioralOnly = false }) => {
  const [uploading, setUploading] = useState({});
  const [requirements, setRequirements] = useState({
    nclexPassReport: { confirmed: false, file: null, fileName: "" },
    passportBiometric: { confirmed: false, file: null, fileName: "" },
    birthCertificate: { confirmed: false, file: null, fileName: "" },
    certificateOfEmployment: { confirmed: false, file: null, fileName: "" },
    nursingDiplomaTranscript: { confirmed: false, file: null, fileName: "" },
    cesReport: { confirmed: false, file: null, fileName: "" },
    homeCountryLicense: { confirmed: false, file: null, fileName: "" },
    usStateLicense: { confirmed: false, file: null, fileName: "" },
    priorApprovalNotices: { confirmed: false, file: null, fileName: "" },
    idPictures: { confirmed: false, file: null, fileName: "" },
    behaviorAssessment: { confirmed: false, file: null, fileName: "" }
  });;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [behavioralAssessment, setBehavioralAssessment] = useState(createEmptyBehavioralAssessment);
  const [behavioralSubmitting, setBehavioralSubmitting] = useState(false);
  const [behavioralSubmitted, setBehavioralSubmitted] = useState(false);
  const [behavioralSuccessNotice, setBehavioralSuccessNotice] = useState(false);

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
    setBehavioralAssessment(previous => ({
      ...previous,
      [field]: value
    }));
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

    // ⬇⬇⬇ THE BLOCK YOU ASKED ABOUT GOES HERE ⬇⬇⬇
    const submittedAt = data.submittedAt || new Date().toISOString();

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

    try {
      if (typeof window !== "undefined") {
        const storageKey = "icp_local_form_notifications";
        const existing = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
        const normalized = {
          id: String(data?.notification?.id || `local-behavioral-${Date.now()}`),
          title: "Behavioral Assessment",
          message: `Behavioral Assessment was submitted successfully on ${submittedAt}.`,
          update_type: "form-submission",
          form_type: "behavioral",
          form_title: "Behavioral Assessment",
          status: "submitted",
          submitted_at: submittedAt,
          created_date: submittedAt,
          created_at: submittedAt,
          candidate_email: String(user?.email || "").trim().toLowerCase(),
          is_read: false
        };
        const merged = [normalized, ...(Array.isArray(existing) ? existing : [])]
          .filter((item, i, arr) => i === arr.findIndex(o => String(o?.id || "") === String(item?.id || "")))
          .slice(0, 50);
        window.localStorage.setItem(storageKey, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("candidate-data-updated", { detail: { email: user?.email, section: "Behavioral Assessment", submittedAt } }));
        window.dispatchEvent(new CustomEvent("pipeline-updated", { detail: { email: user?.email, section: "Behavioral Assessment", submittedAt } }));
      }
    } catch (storageError) {
      console.warn("[Behavioral Assessment] Local notification persistence failed:", storageError);
    }

    toast.success("Behavioral Assessment submitted successfully.");

    // Close FIRST, show popup SECOND. Must be the last line of try{}.
    onClose?.({
      formTitle: "Behavioral Assessment",
      submittedAt,
      crmVerified: true,
      notificationSaved: true
    });
    // ⬆⬆⬆ END OF BLOCK ⬆⬆⬆

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
      const documentLabels = {
        nclexPassReport: "NCLEX Pass Report",
        passportBiometric: "Passport Biometric Page",
        birthCertificate: "Birth Certificate",
        certificateOfEmployment: "Certificate of Employment",
        nursingDiplomaTranscript: "Nursing Diploma and Transcript",
        cesReport: "CES Report",
        homeCountryLicense: "Home Country RN License",
        usStateLicense: "US State RN License",
        priorApprovalNotices: "USCIS Prior Approval Notices",
        idPictures: "Recent 2x2 ID Pictures"
      };

      formData.append(
        "document_type",
        documentLabels[key] ||
          "Deployment Requirement"
      );
      formData.append(
        "document_name",
        documentLabels[key] ||
          file.name
      );
      formData.append(
        "candidate_email",
        user?.email || ""
      );
      formData.append(
        "destination",
        "crm"
      );
      formData.append(
        "pipeline_section",
        "deployment"
      );

      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        data.success !== true ||
        data.crm?.success !== true ||
        data.crm?.verified !== true ||
        !data.crm?.attachment_id
      ) {
        throw new Error(
          data.error ||
          data.crm?.error ||
          "The document was not verified in the candidate's CRM Deal attachments."
        );
      }

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
      if (
        !response.ok ||
        data.success !== true ||
        data.crm?.success !== true ||
        data.crm?.verified !== true ||
        !data.crm?.attachment_id
      ) {
        throw new Error(
          data.error ||
          data.crm?.error ||
          "The deployment requirements PDF was not verified in the candidate's CRM Deal attachments."
        );
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

  const renderRequirementCheckbox = ({
    label,
    requirementKey,
    description
  }) => {
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

                {behavioralSuccessNotice && (
                  <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="inline h-4 w-4 mr-2" />Behavioral Assessment submitted successfully. Your submission has been recorded.
                  </div>
                )}
                <Button type="button" onClick={submitBehavioralAssessment} disabled={behavioralSubmitting || behavioralSubmitted || !isBehavioralAssessmentComplete()} className="w-full gap-2">
                  {behavioralSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : behavioralSubmitted ? <><CheckCircle2 className="h-4 w-4" />Submitted</> : <><FileCheck className="h-4 w-4" />Submit and close</>}
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
    const visibleRequirements = behavioralOnly
      ? { behaviorAssessment: requirements.behaviorAssessment }
      : requirements;
    const total = Object.keys(visibleRequirements).length;
    const completed = Object.values(visibleRequirements).filter(req => req.confirmed === true).length;
    return { total, completed, percentage: (completed / total) * 100 };
  };

  const progress = getProgress();

  return (
    <div className={cn(
      "space-y-4 max-h-[calc(90vh-80px)] overflow-y-auto pr-2 transition-opacity duration-150",
      behavioralSubmitting && "opacity-60 pointer-events-none"
    )}>
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            {behavioralOnly
              ? "Behavioral Assessment — 1 required assessment"
              : "11 required items (10 documents + 1 assessment form)"}
          </span>
          <span>
  {behavioralSubmitted && behavioralOnly ? 1 : progress.completed} completed / {progress.total} total
</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          />
        </div>
        {behavioralOnly ? (
  behavioralSubmitted ? (
    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Behavioral Assessment submitted successfully.
    </div>
  ) : isBehavioralAssessmentComplete() ? (
    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Behavioral Assessment is complete and ready to submit.
    </div>
  ) : null
) : (
  allRequirementsMet() && (
    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />
      All required documents and the Behavioral Assessment are complete!
    </div>
  )
)}
      </div>

      <div className="space-y-2">
        {!behavioralOnly && (
          <>
        {renderRequirementCheckbox({ requirementKey: "nclexPassReport", label: "1. NCLEX Pass Report", description: "Official NCLEX passing report" })}
        {renderRequirementCheckbox({ requirementKey: "passportBiometric", label: "2. Passport Biometric Page", description: "Clear biometric page" })}
        {renderRequirementCheckbox({ requirementKey: "birthCertificate", label: "3. Birth Certificate", description: "Official civil document" })}
        {renderRequirementCheckbox({ requirementKey: "certificateOfEmployment", label: "4. Certificate of Employment (COE)", description: "Include employer name and address, dates, title, duties, and supervisor contact" })}
        {renderRequirementCheckbox({ requirementKey: "nursingDiplomaTranscript", label: "5. College Nursing Diploma and Transcript of Records", description: "Diploma and TOR" })}
        {renderRequirementCheckbox({ requirementKey: "cesReport", label: "6. CES Report", description: "Credential evaluation report" })}
        {renderRequirementCheckbox({ requirementKey: "homeCountryLicense", label: "7. Home Country RN License Card and Certificate", description: "Current card and certificate" })}
        {renderRequirementCheckbox({ requirementKey: "usStateLicense", label: "8. US State RN License Certificate", description: "Upload when applicable" })}
        {renderRequirementCheckbox({ requirementKey: "priorApprovalNotices", label: "9. USCIS Prior Approval Notices (I-797)", description: "Upload when applicable" })}
        {renderRequirementCheckbox({ requirementKey: "idPictures", label: "10. Recent 2x2 ID Pictures", description: "Candidate, spouse, and children" })}
          </>
        )}

        <div className="mt-4">
          {renderRequirementCheckbox({
            requirementKey: "behaviorAssessment",
            label: behavioralOnly ? "Behavioral Assessment" : "Behavioral Assessment",
            description: behavioralOnly
              ? "Complete all questions and submit the assessment. Your answers will be saved to Zoho CRM and a notification will be added to Updates."
              : "Complete all questions and submit the assessment"
          })}
        </div>
      </div>

      {!behavioralOnly && allRequirementsMet() && (
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

      {!behavioralOnly && (
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSubmit} disabled={!allRequirementsMet() || isSubmitting} className="gap-2">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Submit and close</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

const INTERNATIONAL_DIALING_CODES = [
  ["🇺🇸", "United States", "+1"], ["🇨🇦", "Canada", "+1"], ["🇰🇪", "Kenya", "+254"], ["🇺🇬", "Uganda", "+256"],
  ["🇹🇿", "Tanzania", "+255"], ["🇷🇼", "Rwanda", "+250"], ["🇿🇦", "South Africa", "+27"], ["🇳🇬", "Nigeria", "+234"],
  ["🇬🇭", "Ghana", "+233"], ["🇪🇹", "Ethiopia", "+251"], ["🇿🇲", "Zambia", "+260"], ["🇿🇼", "Zimbabwe", "+263"],
  ["🇲🇼", "Malawi", "+265"], ["🇧🇼", "Botswana", "+267"], ["🇳🇦", "Namibia", "+264"], ["🇸🇿", "Eswatini", "+268"],
  ["🇨🇲", "Cameroon", "+237"], ["🇨🇩", "DR Congo", "+243"], ["🇨🇬", "Republic of the Congo", "+242"], ["🇸🇱", "Sierra Leone", "+232"],
  ["🇱🇷", "Liberia", "+231"], ["🇸🇳", "Senegal", "+221"], ["🇲🇦", "Morocco", "+212"], ["🇪🇬", "Egypt", "+20"],
  ["🇬🇧", "United Kingdom", "+44"], ["🇮🇪", "Ireland", "+353"], ["🇫🇷", "France", "+33"], ["🇩🇪", "Germany", "+49"],
  ["🇮🇹", "Italy", "+39"], ["🇪🇸", "Spain", "+34"], ["🇵🇹", "Portugal", "+351"], ["🇳🇱", "Netherlands", "+31"],
  ["🇧🇪", "Belgium", "+32"], ["🇨🇭", "Switzerland", "+41"], ["🇸🇪", "Sweden", "+46"], ["🇳🇴", "Norway", "+47"],
  ["🇩🇰", "Denmark", "+45"], ["🇫🇮", "Finland", "+358"], ["🇵🇱", "Poland", "+48"], ["🇷🇴", "Romania", "+40"],
  ["🇬🇷", "Greece", "+30"], ["🇹🇷", "Türkiye", "+90"], ["🇺🇦", "Ukraine", "+380"], ["🇮🇳", "India", "+91"],
  ["🇵🇭", "Philippines", "+63"], ["🇨🇳", "China", "+86"], ["🇯🇵", "Japan", "+81"], ["🇰🇷", "South Korea", "+82"],
  ["🇹🇭", "Thailand", "+66"], ["🇻🇳", "Vietnam", "+84"], ["🇮🇩", "Indonesia", "+62"], ["🇲🇾", "Malaysia", "+60"],
  ["🇸🇬", "Singapore", "+65"], ["🇦🇪", "United Arab Emirates", "+971"], ["🇸🇦", "Saudi Arabia", "+966"], ["🇶🇦", "Qatar", "+974"],
  ["🇦🇺", "Australia", "+61"], ["🇳🇿", "New Zealand", "+64"], ["🇲🇽", "Mexico", "+52"], ["🇧🇷", "Brazil", "+55"],
  ["🇨🇴", "Colombia", "+57"], ["🇯🇲", "Jamaica", "+1 876"], ["🇹🇹", "Trinidad and Tobago", "+1 868"]
];

const formatInternationalPhone = (countryCode, phoneNumber) =>
  [countryCode, phoneNumber].filter(Boolean).join(" ").trim();

const InternationalPhoneInput = ({ formData, setFormData, countryCodeName, phoneName, required = false }) => (
  <div className="flex gap-2">
    <select
      name={countryCodeName}
      value={formData[countryCodeName] || ""}
      onChange={(event) => setFormData(previous => ({ ...previous, [countryCodeName]: event.target.value }))}
      aria-label="Country calling code"
      className="w-40 shrink-0 rounded-lg border border-border bg-background px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      required={required}
    >
      <option value="">Country code</option>
      {INTERNATIONAL_DIALING_CODES.map(([, country, code]) => (
        <option key={`${country}-${code}`} value={code}>{country} ({code})</option>
      ))}
    </select>
    <input
      type="tel"
      inputMode="tel"
      name={phoneName}
      placeholder="Phone number"
      value={formData[phoneName]}
      onChange={(event) => setFormData(previous => ({ ...previous, [phoneName]: event.target.value }))}
      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      required={required}
    />
  </div>
);

// Housing Details Form Component
export const HousingDetailsForm = ({ onClose, user, setStages }) => {
  console.log(">>> HousingDetailsForm RENDERED"); 
  const [uploading, setUploading] = useState(false);
  const today = formatPortalFullDate();
  const [formData, setFormData] = useState({
    dateCompleted: today,
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    email: user?.email || "",
    currentPhoneCountryCode: "",
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
    petType: "",
    petWeight: "",
    petAge: "",
    petColor: "",
    petBreed: "",
    petName: "",
    petSpayedNeutered: "",
    smokes: "",
    hasDriversLicense: "",
    licenseIssued: "",
    licenseExpiry: "",
    whoWillDrive: "",
    usingIAS: "",
    vehiclePurchaseDate: "",
    employerName: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyStreet: "",
    emergencyCity: "",
    emergencyState: "",
    emergencyCountry: "",
    emergencyZip: "",
    emergencyEmail: "",
    emergencyPhoneCountryCode: "",
    emergencyPhone: "",
    cosignerName: "",
    cosignerRelationship: "",
    cosignerDateOfBirth: "",
    cosignerStreet: "",
    cosignerCity: "",
    cosignerState: "",
    cosignerCountry: "",
    cosignerZip: "",
    cosignerEmail: "",
    cosignerPhoneCountryCode: "",
    cosignerPhone: "",
    consentFullName: user?.displayName || user?.name || "",
    consentDate: today,
    consentSignature: "",
    waiverHousing: "",
    waiverConcierge: "",
  });

  const housingDraftKey =
    user?.email
      ? `icp_housing_form_draft:${String(user.email).trim().toLowerCase()}`
      : null;

  useEffect(() => {
    if (!housingDraftKey) return;

    try {
      const raw = sessionStorage.getItem(housingDraftKey);
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (saved?.formData) {
        setFormData(previous => ({
          ...previous,
          ...saved.formData,
          email:
            saved.formData.email ||
            previous.email ||
            user?.email ||
            "",
          // These dates are system-generated and must reflect the current day.
          dateCompleted: today,
          consentDate: today
        }));
      }

    } catch (error) {
      console.warn("[Housing] Could not restore form draft:", error?.message || error);
    }
  }, [housingDraftKey, today]);

  useEffect(() => {
    if (!housingDraftKey) return;

    sessionStorage.setItem(
      housingDraftKey,
      JSON.stringify({
        formData
      })
    );
  }, [housingDraftKey, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
     console.log("[Housing] >>> SUBMIT BUTTON CLICKED", {
      uploading,
      email: user?.email || formData.email || "",
      formFields: Object.keys(formData).length
    });
    e.preventDefault();

    if (uploading) {
      console.warn("[Housing] Submit ignored because a submission is already in progress.");
      return;
    }

    try {
      // Only validate fields that the Housing UI actually marks as required.
      // The previous implementation treated every key in formData as required,
      // which incorrectly blocked submission on optional housing/transport fields.
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "currentPhone",
        "currentAddress",
        "city",
        "zipCode",
        "state",
        "country",
        "emergencyName",
        "emergencyRelationship",
        "emergencyStreet",
        "emergencyCity",
        "emergencyState",
        "emergencyCountry",
        "emergencyZip",
        "emergencyEmail",
        "emergencyPhone"
      ];

      const missingFields = requiredFields.filter(
        field => String(formData[field] ?? "").trim() === ""
      );

      console.log("[Housing] Required-field validation", {
        missingFields,
        hasDriversLicense: formData.hasDriversLicense,
        hasPets: formData.hasPets
      });

      if (missingFields.length > 0) {
        const firstMissing = document.querySelector(
          `[name="${missingFields[0]}"]`
        );
        firstMissing?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        firstMissing?.focus?.();
        toast.error(
          `Please complete every required Housing field: ${missingFields.join(", ")}`
        );
        return;
      }

      // dateCompleted and consentDate are generated by the application. Do not
      // block submission on optional DOB/license/cosigner dates here.
      if (!isValidPortalFullDate(formData.dateCompleted)) {
        toast.error("The form date is invalid. Please reopen the Housing form and try again.");
        return;
      }

      const hasCosignerInformation = Object.keys(formData).some(
        field =>
          field.startsWith("cosigner") &&
          field !== "cosignerDateOfBirth" &&
          field !== "cosignerPhoneCountryCode" &&
          String(formData[field] || "").trim()
      );

      if (hasCosignerInformation && formData.cosignerDateOfBirth && !isValidPortalFullDate(formData.cosignerDateOfBirth)) {
        toast.error("Please enter the cosigner/guarantor date of birth as MM/DD/YYYY.");
        return;
      }
    } catch (validationError) {
      console.error("[Housing] Validation crashed before network request:", validationError);
      toast.error("The Housing form could not be validated. Please try again.");
      return;
    }

    const email = String(user?.email || formData.email || "").trim().toLowerCase();
    if (!email) {
      toast.error("Your candidate email could not be identified. Please sign in again.");
      return;
    }

    const token = localStorage.getItem("icp_auth_token");
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setUploading(true);

    try {
      const housingData = {
        ...formData,
        currentPhone: formatInternationalPhone(
          formData.currentPhoneCountryCode,
          formData.currentPhone
        ),
        emergencyPhone: formatInternationalPhone(
          formData.emergencyPhoneCountryCode,
          formData.emergencyPhone
        ),
        cosignerPhone: formatInternationalPhone(
          formData.cosignerPhoneCountryCode,
          formData.cosignerPhone
        ),
        email,
        candidateEmail: email,
        submittedAt: new Date().toISOString(),
        formType: "housing"
      };

      /*
       * IMPORTANT:
       * Do not upload a client-generated file here. The backend generates the
       * authoritative Housing PDF from this payload and attaches it to the
       * authenticated candidate's exact CRM Deal.
       */
      console.log("[Housing] Sending POST /api/housing/submit", {
        apiBase: API_BASE,
        email,
        payloadKeys: Object.keys(housingData)
      });

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120000);

      let response;
      try {
        response = await fetch(`${API_BASE}/api/housing/submit`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(housingData),
        signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      console.log("[Housing] Server response received", {
        status: response.status,
        ok: response.ok
      });

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("[Housing] Invalid server response:", responseText);
        throw new Error(
          `The server returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok || data.success !== true) {
        const destinationDetails = [
          data?.crm?.error,
          data?.attachments?.crm?.error,
          data?.error,
          data?.message
        ]
          .filter(Boolean)
          .join(" | ");

        throw new Error(
          destinationDetails ||
          `Housing submission failed with status ${response.status}.`
        );
      }

      const crm = data?.attachments?.crm || data?.crm || {};
      const crmVerified =
        crm.success === true &&
        (
          crm.verified === true ||
          crm.attachment_id ||
          crm.attachmentId
        );

      if (!crmVerified) {
        throw new Error(
          "The Housing form was received, but CRM did not confirm the Deal attachment."
        );
      }

      const savedStage = data.stage;

      if (typeof setStages === "function") {
        if (savedStage) {
          setStages(previous =>
            (Array.isArray(previous) ? previous : []).map(stage =>
              stage.stage_name === "Submit Housing Form"
                ? {
                    ...stage,
                    ...savedStage,
                    status: "Completed",
                    completed: true,
                    is_completed: true
                  }
                : stage
            )
          );
        } else {
          try {
            await updateStageStatus(
              email,
              "Submit Housing Form",
              setStages
            );
          } catch (stageError) {
            console.warn(
              "[Housing] CRM upload succeeded but stage refresh failed:",
              stageError?.message || stageError
            );
          }
        }
      }

      if (housingDraftKey) {
        try {
          sessionStorage.removeItem(housingDraftKey);
        } catch (_) {
          // Submission already succeeded; draft cleanup is non-critical.
        }
      }

      toast.success(
        "Housing details submitted successfully and attached to your CRM Deal."
      );

      onClose?.();
    } catch (error) {
      console.error("[Housing] Submission error:", error);
      if (error?.name === "AbortError") {
        toast.error("Housing submission timed out after 2 minutes. The server or CRM connection did not respond.");
        return;
      }

      toast.error(
        error?.message ||
        "Unable to submit Housing details. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2 transition-opacity duration-150",
        uploading && "opacity-60 pointer-events-none"
      )}
      aria-busy={uploading}
    >      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">DATE COMPLETED</label>
        </div>
        <input
          type="text"
          inputMode="numeric"
          name="dateCompleted"
          value={formData.dateCompleted}
          readOnly
          aria-readonly="true"
          className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground"
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
            <input type="text" inputMode="numeric" name="dateOfBirth" placeholder="MM/DD/YYYY" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={formData.dateOfBirth} onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: normalizePortalFullDateInput(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Current Phone Number <span className="text-red-500">*</span></label>
            <InternationalPhoneInput formData={formData} setFormData={setFormData} countryCodeName="currentPhoneCountryCode" phoneName="currentPhone" required />
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
            <label className="text-sm font-medium block mb-1">How long have you lived at your current address? (MM/DD/YYYY)</label>
            <input
              type="text"
              inputMode="numeric"
              name="lengthAtAddress"
              value={formData.lengthAtAddress}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  lengthAtAddress:
                    normalizePortalFullDateInput(
                      e.target.value
                    )
                }))
              }
              placeholder="MM/DD/YYYY"
              pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
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

        {String(formData.hasPets || "").toLowerCase() === "yes" && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-white/70 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-800">
              Pet information
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <select name="petType" value={formData.petType} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                <option value="">Type of pet</option>
                <option value="Cat">Cat</option>
                <option value="Dog">Dog</option>
              </select>
              <input type="number" min="0" step="0.1" name="petWeight" placeholder="Weight in pounds" value={formData.petWeight} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              <input type="text" name="petAge" placeholder="Age" value={formData.petAge} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              <input type="text" name="petColor" placeholder="Color" value={formData.petColor} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              <input type="text" name="petBreed" placeholder="Breed" value={formData.petBreed} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              <input type="text" name="petName" placeholder="Name" value={formData.petName} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              <select name="petSpayedNeutered" value={formData.petSpayedNeutered} onChange={handleChange} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                <option value="">Spayed or neutered?</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        )}
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
            <input type="text" inputMode="numeric" name="licenseExpiry" placeholder="MM/DD/YYYY" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={formData.licenseExpiry} onChange={(e) => setFormData(prev => ({ ...prev, licenseExpiry: normalizePortalFullDateInput(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
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
            <label className="text-sm font-medium block mb-1">If you are NOT using IAS, when will you be purchasing your vehicle?</label>
            <input type="text" name="vehiclePurchaseDate" value={formData.vehiclePurchaseDate} onChange={handleChange} placeholder="e.g., Within 30 days of arrival" className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
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
            <label className="text-sm font-medium block mb-1">Full Name of Emergency Contact <span className="text-red-500">*</span></label>
            <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Relationship to you <span className="text-red-500">*</span></label>
            <input type="text" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium block mb-1">Street Address <span className="text-red-500">*</span></label>
          <input type="text" name="emergencyStreet" value={formData.emergencyStreet} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">City <span className="text-red-500">*</span></p>
            <input type="text" name="emergencyCity" placeholder="City" value={formData.emergencyCity} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">State <span className="text-red-500">*</span></p>
            <input type="text" name="emergencyState" placeholder="State/Province" value={formData.emergencyState} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Country <span className="text-red-500">*</span></p>
            <input type="text" name="emergencyCountry" placeholder="Country" value={formData.emergencyCountry} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Zip Code / Country Code (Postage) <span className="text-red-500">*</span></p>
            <input type="text" name="emergencyZip" placeholder="Zip Code" value={formData.emergencyZip} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Phone <span className="text-red-500">*</span></p>
            <InternationalPhoneInput formData={formData} setFormData={setFormData} countryCodeName="emergencyPhoneCountryCode" phoneName="emergencyPhone" required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium block mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" name="emergencyEmail" value={formData.emergencyEmail} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" required />
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
          <div>
            <label className="text-sm font-medium block mb-1">Date of Birth</label>
            <input type="text" inputMode="numeric" name="cosignerDateOfBirth" placeholder="MM/DD/YYYY" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={formData.cosignerDateOfBirth} onChange={(e) => setFormData(prev => ({ ...prev, cosignerDateOfBirth: normalizePortalFullDateInput(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
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
            <InternationalPhoneInput formData={formData} setFormData={setFormData} countryCodeName="cosignerPhoneCountryCode" phoneName="cosignerPhone" />
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
            <input type="text" name="consentDate" value={formData.consentDate} readOnly aria-readonly="true" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground" />
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
       <Button
          type="submit"
          disabled={uploading}
          className={cn(
            "min-w-[120px] transition-colors",
            uploading && "bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed"
          )}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
          ) : (
            "Submit and close"
          )}
        </Button>
      </div>
    </form>
  );
};

const HousingDetails = ({ onClose, user, setStages }) => {
  return <HousingDetailsForm onClose={onClose} user={user} setStages={setStages} />;
};

// ============= Reimbursement/Expenses Component (Aftercare) =============
// Loads the payment schedule and submission status securely.
const ReimbursementExpensesView = ({ onClose, user, setStages }) => {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState({
    nursePaymentType: "",
    initialPayment: { date: "", paid: false, total: 1000 },
    payment1: { date: "", paid: false, total: 0 },
    payment2: { date: "", paid: false, total: 0 },
    payment3: { date: "", paid: false, total: 0 },
    payment4: { date: "", paid: false, total: 0 },
    totalReimbursement: 0,
    advanceAgreementTotal: 0
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
  const [expenseReport, setExpenseReport] = useState(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(true);
  const [advanceAgreementReviewed, setAdvanceAgreementReviewed] = useState(false);
  const [advanceAgreementAcknowledged, setAdvanceAgreementAcknowledged] = useState(false);
  const [advanceAgreementSaving, setAdvanceAgreementSaving] = useState(false);
  const [advanceAgreementPersisted, setAdvanceAgreementPersisted] = useState(false);
  const [expenseReportAcknowledged, setExpenseReportAcknowledged] = useState(false);
  const [expenseReportAcknowledging, setExpenseReportAcknowledging] = useState(false);

  useEffect(() => {
    fetchPaymentData();
    fetchExpenseReport();
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
        initialPayment: reimbursementData.initialPayment || { date: "", paid: false, total: 1000 },
        payment1: reimbursementData.payment1 || { date: "", paid: false, total: 0 },
        payment2: reimbursementData.payment2 || { date: "", paid: false, total: 0 },
        payment3: reimbursementData.payment3 || { date: "", paid: false, total: 0 },
        payment4: reimbursementData.payment4 || { date: "", paid: false, total: 0 },
        totalReimbursement:
          parseFloat(
            reimbursementData.totalReimbursement
          ) ||
          0,
        advanceAgreementTotal:
          parseFloat(
            reimbursementData.advanceAgreementTotal
          ) ||
          0
      });

      setIsSubmitted(reimbursementData.submitted === true);
      setAdvanceAgreementReviewed(
        reimbursementData.advanceAgreementReviewed === true
      );
      setAdvanceAgreementAcknowledged(
        reimbursementData.advanceAgreementAcknowledged === true
      );
      setAdvanceAgreementPersisted(
        reimbursementData.advanceAgreementAcknowledged === true
      );
      setExpenseReportAcknowledged(
        reimbursementData.expenseReportAcknowledged === true
      );

    } catch (error) {
      console.error("Error fetching payment data:", error);
      setSubmitError(error.message);
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseReport = async () => {
    setExpenseReportLoading(
      true
    );

    try {
      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        throw new Error(
          "Not authenticated"
        );
      }

      const response =
        await fetch(
          `${API_BASE}/api/reimbursement/expense-report?_=${Date.now()}`,
          {
            cache:
              "no-store",
            headers: {
              Authorization:
                `Bearer ${token}`
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
          "Unable to load Expense Report."
        );
      }

      setExpenseReport(
        data.report ||
        null
      );
    } catch (error) {
      console.warn(
        "[Reimbursement/Expenses] Expense Report load failed:",
        error
      );
    } finally {
      setExpenseReportLoading(
        false
      );
    }
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({ ...prev, [name]: value }));
  };

  const normalizedPaymentType =
    String(
      unwrapPipelineFieldValue(
        paymentData.nursePaymentType
      ) ||
      paymentData.nursePaymentType ||
      ""
    )
      .trim()
      .toLowerCase();

  const isAdvancePaymentAgreement =
    normalizedPaymentType ===
    "advanced payment agreement";

  const advancedPaymentAgreementTotal =
    isAdvancePaymentAgreement
      ? (
          parseFloat(
            paymentData.advanceAgreementTotal
          ) ||
          parseFloat(
            paymentData.totalReimbursement
          ) ||
          0
        )
      : 0;

  const handleAcknowledgeAdvanceAgreement =
    async () => {
      if (
        advancedPaymentAgreementTotal <=
        0
      ) {
        toast.error(
          "Total Due to ICP/RN is not available yet."
        );
        return;
      }

      if (
        !advanceAgreementReviewed ||
        !advanceAgreementAcknowledged
      ) {
        toast.error(
          "Please check both Advance Payment Agreement acknowledgements first."
        );
        return;
      }

      setAdvanceAgreementSaving(
        true
      );

      try {
        const token =
          localStorage.getItem(
            "icp_auth_token"
          );

        if (!token) {
          throw new Error(
            "Not authenticated"
          );
        }

        const response =
          await fetch(
            `${API_BASE}/api/reimbursement/acknowledge-advance-agreement`,
            {
              method:
                "POST",
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json"
              },
              body:
                JSON.stringify({
                  acknowledged:
                    true
                })
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
          data.success !==
            true
        ) {
          throw new Error(
            data.error ||
            "Unable to save the Advance Payment Agreement acknowledgement."
          );
        }

        setAdvanceAgreementReviewed(
          true
        );
        setAdvanceAgreementAcknowledged(
          true
        );
        setAdvanceAgreementPersisted(
          true
        );

        toast.success(
          "Advance Payment Agreement acknowledged."
        );

        window.dispatchEvent(
          new CustomEvent(
            "candidate-data-updated",
            {
              detail: {
                email:
                  user?.email,
                source:
                  "advance-payment-agreement"
              }
            }
          )
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Unable to acknowledge the Advance Payment Agreement."
        );
      } finally {
        setAdvanceAgreementSaving(
          false
        );
      }
    };

  const handleAcknowledgeExpenseReport =
    async () => {
      if (
        expenseReportAcknowledged ||
        expenseReportAcknowledging
      ) {
        return;
      }

      setExpenseReportAcknowledging(
        true
      );

      try {
        const token =
          localStorage.getItem(
            "icp_auth_token"
          );

        if (!token) {
          throw new Error(
            "Not authenticated"
          );
        }

        const response =
          await fetch(
            `${API_BASE}/api/reimbursement/acknowledge-expense-report`,
            {
              method:
                "POST",
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json"
              },
              body:
                JSON.stringify({
                  acknowledged:
                    true
                })
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
          data.success !==
            true
        ) {
          throw new Error(
            data.error ||
            "Unable to acknowledge the Expense Report."
          );
        }

        setExpenseReportAcknowledged(
          true
        );

        setStages?.(
          previous =>
            applyOrderedLocksWithDeepEntry(
              previous.map(
                stage =>
                  stage.stage_name ===
                    "Receipt Submission"
                    ? {
                        ...stage,
                        status:
                          "Completed",
                        completed:
                          true,
                        is_completed:
                          true,
                        completed_date:
                          data.acknowledgedAt ||
                          new Date()
                            .toISOString(),
                        source_trigger_unlocked:
                          true,
                        trigger_unlocked:
                          true,
                        completion_source:
                          "candidate_expense_report_total_click"
                      }
                    : stage
              )
            )
        );

        window.dispatchEvent(
          new CustomEvent(
            "pipeline-updated",
            {
              detail: {
                email:
                  user?.email,
                stage_name:
                  "Receipt Submission",
                status:
                  "Completed",
                completed:
                  true,
                source:
                  "candidate_expense_report_total_click"
              }
            }
          )
        );

        toast.success(
          "Expense Report acknowledged. This stage is complete."
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Unable to acknowledge the Expense Report."
        );
      } finally {
        setExpenseReportAcknowledging(
          false
        );
      }
    };

  const handleSubmitBankDetails = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!bankDetails.accountNumber || !bankDetails.accountName || !bankDetails.routingNumber) {
      toast.error("Please fill in all required bank details");
      return;
    }

    if (
      isAdvancePaymentAgreement &&
      !advanceAgreementPersisted &&
      (!advanceAgreementReviewed || !advanceAgreementAcknowledged)
    ) {
      toast.error("Please review and acknowledge the Advance Payment Agreement before submitting.");
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
          initialPayment: paymentData.initialPayment,
          payment1: paymentData.payment1,
          payment2: paymentData.payment2,
          payment3: paymentData.payment3,
          payment4: paymentData.payment4
        },
        totalDueToICPRN: parseFloat(paymentData.totalReimbursement) || 0,
        advanceAgreement: isAdvancePaymentAgreement
          ? {
              reviewed:
                advanceAgreementPersisted ||
                advanceAgreementReviewed,
              acknowledged:
                advanceAgreementPersisted ||
                advanceAgreementAcknowledged,
              acknowledgedAt:
                new Date().toISOString()
            }
          : null
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

  const paymentRows = isAdvancePaymentAgreement
    ? [
        {
          key: "initialPayment",
          label: "Initial Payment",
          payment: {
            ...(paymentData.initialPayment || {}),
            total: 1000
          }
        },
        { key: "payment2", label: "Payment 2", payment: paymentData.payment2 },
        { key: "payment3", label: "Payment 3", payment: paymentData.payment3 },
        { key: "payment4", label: "Payment 4", payment: paymentData.payment4 }
      ]
    : [1, 2, 3, 4].map(number => ({
        key: `payment${number}`,
        label: `Payment ${number}`,
        payment: paymentData[`payment${number}`]
      }));

  const totalPayments = paymentRows.reduce(
    (sum, row) => sum + (parseFloat(row.payment?.total) || 0),
    0
  );

  const amountAlreadyPaid = paymentRows.reduce(
    (sum, row) =>
      row.payment?.paid
        ? sum + (parseFloat(row.payment?.total) || 0)
        : sum,
    0
  );

  const crmTotalAmount =
    parseFloat(paymentData.totalReimbursement) || 0;

  const balanceAmount = Math.max(
    0,
    crmTotalAmount - amountAlreadyPaid
  );

  const allPaymentsPaid =
    paymentRows.every(row => row.payment?.paid === true) ||
    balanceAmount === 0;

  return (
    <div className={cn(
      "space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2",
      uploading && "opacity-60 pointer-events-none"
    )}>
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">⚠️ {submitError}</p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
              Expense Report
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Reimbursement Expense Report
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Amounts below are populated from receipts after ICP administration verifies the amount and marks it as a Credit or Deduction.
            </p>
          </div>
        </div>

        {expenseReportLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading Expense Report...
          </div>
        ) : expenseReport ? (
          <>
            <div className="grid gap-3 border-b py-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Candidate
                </p>
                <p className="font-semibold">
                  {expenseReport.candidate_name || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Arrival Date
                </p>
                <p className="font-semibold">
                  {expenseReport.arrival_date || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Facility
                </p>
                <p className="font-semibold">
                  {expenseReport.facility || "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border-r px-4 py-3 text-left font-semibold text-slate-700">
                      Expense / What the Amount Is For
                    </th>
                    <th className="border-r px-4 py-3 text-right font-semibold text-emerald-700">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-amber-700">
                      Deduction
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(expenseReport.rows || []).map(
                    row => (
                      <tr
                        key={row.id}
                        className="border-t bg-white"
                      >
                        <td className="border-r px-4 py-3 align-top">
                          <div className="font-semibold text-slate-900">
                            {row.label}
                          </div>


                          {row.reference && (
                            <div className="mt-1 text-xs text-slate-500">
                              Reference amount: ${Number(
                                row.reference
                              ).toFixed(2)}
                            </div>
                          )}

                          {row.note && (
                            <div className="mt-1 text-xs text-slate-500">
                              {row.note}
                            </div>
                          )}
                        </td>

                        <td className="border-r px-4 py-3 text-right align-top">
                          {row.side === "credit" ? (
                            row.reviewed ? (
                              <div>
                                <div className="font-semibold text-emerald-700">
                                  ${Number(
                                    row.amount || 0
                                  ).toFixed(2)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Credit for {row.label}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Pending review
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right align-top">
                          {row.side === "deduction" ? (
                            row.reviewed ? (
                              <div>
                                <div className="font-semibold text-amber-700">
                                  ${Number(
                                    row.amount || 0
                                  ).toFixed(2)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Deduction for {row.label}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Pending review
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

                <tfoot>
                  <tr className="border-t-2 bg-emerald-50 font-semibold">
                    <td className="border-r px-4 py-3">
                      Total Credits
                    </td>
                    <td className="border-r px-4 py-3 text-right text-emerald-700">
                      ${Number(
                        expenseReport.totals?.credits || 0
                      ).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      —
                    </td>
                  </tr>

                  <tr className="border-t bg-amber-50 font-semibold">
                    <td className="border-r px-4 py-3">
                      Total Deductions
                    </td>
                    <td className="border-r px-4 py-3 text-right text-slate-300">
                      —
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700">
                      ${Number(
                        expenseReport.totals?.deductions || 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Credits
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-800">
                  ${Number(
                    expenseReport.totals?.credits || 0
                  ).toFixed(2)}
                </p>
              </div>

              <div className="rounded-lg border bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Deductions
                </p>
                <p className="mt-1 text-lg font-bold text-amber-800">
                  ${Number(
                    expenseReport.totals?.deductions || 0
                  ).toFixed(2)}
                </p>
              </div>

              <div className="rounded-lg border bg-purple-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Reimbursement Due to {expenseReport.totals?.due_to || "Neither"}
                </p>
                <p className="mt-1 text-lg font-bold text-purple-800">
                  ${Number(
                    expenseReport.totals?.amount_due || 0
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No reviewed receipt amounts are available yet.
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Expense Report Acknowledgement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The Expense Report stage checks off when a total amount is available and you click the Expense Report section. You can also acknowledge it here.
            </p>
          </div>

          {expenseReportAcknowledged ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Acknowledged
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleAcknowledgeExpenseReport}
              disabled={
                expenseReportAcknowledging ||
                expenseReportLoading ||
                !expenseReport
              }
              className="gap-2"
            >
              {expenseReportAcknowledging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Acknowledging...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Acknowledge Expense Report
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-700">
          <strong>Payment Type:</strong> {String(unwrapPipelineFieldValue(paymentData.nursePaymentType) || paymentData.nursePaymentType || "")}
        </p>
      </div>

      {isAdvancePaymentAgreement && (
        <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div>
            <h3 className="font-semibold text-purple-950">
              Advanced Payment Agreement Acknowledgement
            </h3>
            <p className="mt-1 text-xs text-purple-800">
              Both acknowledgements are required when the CRM Payment Type is Advanced Payment Agreement.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-purple-200 bg-white p-4 text-sm leading-6 text-purple-950">
            <p>
              I acknowledge that I have reviewed the above expense/reimbursement report and understand that Infinity Care Partners has advanced a total of{" "}
              <strong>
                {advancedPaymentAgreementTotal > 0
                  ? `$${advancedPaymentAgreementTotal.toFixed(2)}`
                  : "$__________"}
              </strong>{" "}
              on my behalf, prior to my arrival in the United States, for deployment expenses including, but not limited to, License certification, dependent(s)’ visa fees, housing, and relocation costs and any other advanced expenses as noted.
            </p>




          </div>

          <label className="flex items-start gap-3 text-sm text-purple-950">
            <input
              type="checkbox"
              checked={advanceAgreementReviewed}
              onChange={event =>
                setAdvanceAgreementReviewed(
                  event.target.checked
                )
              }
              className="mt-1 h-4 w-4"
              disabled={
                advanceAgreementSaving ||
                advanceAgreementPersisted
              }
            />
            <span>
              I confirm that I have reviewed the Advance Payment Agreement above.
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-purple-950">
            <input
              type="checkbox"
              checked={advanceAgreementAcknowledged}
              onChange={event =>
                setAdvanceAgreementAcknowledged(
                  event.target.checked
                )
              }
              className="mt-1 h-4 w-4"
              disabled={
                advanceAgreementSaving ||
                advanceAgreementPersisted
              }
            />
            <span>
              I acknowledge and agree to the Advance Payment Agreement above.
            </span>
          </label>

          <div className="flex justify-end">
            {advanceAgreementPersisted ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Agreement Acknowledged
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleAcknowledgeAdvanceAgreement}
                disabled={
                  advanceAgreementSaving ||
                  advancedPaymentAgreementTotal <=
                    0 ||
                  !advanceAgreementReviewed ||
                  !advanceAgreementAcknowledged
                }
                className="gap-2"
              >
                {advanceAgreementSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Acknowledge Agreement
                  </>
                )}
              </Button>
            )}
          </div>
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
            <div>Due Date</div>
            <div>Paid</div>
            <div className="text-right">Total</div>
          </div>
          
          {paymentRows.map(({ key, label, payment }) => {
            const parsedDate = payment?.date ? new Date(payment.date) : null;
            const validDate = parsedDate && !Number.isNaN(parsedDate.getTime());
            return (
              <div key={key} className="grid grid-cols-4 gap-2 p-3 border-b border-green-100 last:border-0 hover:bg-green-50/50 transition-colors">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-sm text-gray-600">
                  {validDate ? format(parsedDate, "MMM d, yyyy h:mm a") : ""}
                </div>
                <div>
                  {payment?.paid ? (
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
                  ${(parseFloat(payment?.total) || 0).toFixed(2)}
                </div>
              </div>
            );
          })}
          
          <div className="grid grid-cols-4 gap-2 border-t border-green-200 bg-green-50 p-3 text-sm font-bold">
            <div className="col-span-3 text-green-800">
              Total 
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
        
        {isSubmitted && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">
                Payment details were submitted previously.
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                The fields remain open so you can enter or update your information and submit again if anything changes.
              </p>
            </div>
          </div>
        )}

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
                <><CheckCircle2 className="h-4 w-4" /> Submit and close</>
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

const RECEIPT_CATEGORIES = [
  { id: "visa_screen", label: "VISA Screen" },
  { id: "nclex_exam", label: "NCLEX Exam and Scheduling Fee" },
  { id: "green_card", label: "Green Card" },
  { id: "license_endorsement", label: "Licensure Application" },
  { id: "nursys", label: "NURSYS" },
  { id: "ces_report", label: "CES Report" },
  { id: "english_exam", label: "English Exam" },
  { id: "fingerprints", label: "Background / Fingerprinting" },
  { id: "medical_exam", label: "Medical Exam" },
  { id: "dependent_visa_fee", label: "Dependent VISA Fee Bill" },
  { id: "dependents_after_i140", label: "Dependents Added after I-140" },
  { id: "housing_stipend", label: "One-time Housing Stipend" },
  { id: "housing_app_admin", label: "Housing App & Admin Fees" },
  { id: "housing_deposit", label: "Housing Deposit" },
  { id: "rent_move_in", label: "Rent / Move-in fees" },
  { id: "insurance", label: "Insurance" },
  { id: "other", label: "Other" }
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
  const [expenseReport, setExpenseReport] = useState(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(true);

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

  const loadExpenseReport = async () => {
    setExpenseReportLoading(
      true
    );

    try {
      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/reimbursement/expense-report?_=${Date.now()}`,
          {
            cache:
              "no-store",
            headers: {
              Authorization:
                `Bearer ${token}`
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
        response.ok &&
        data.success === true
      ) {
        setExpenseReport(
          data.report ||
          null
        );
      }
    } catch (
      error
    ) {
      console.warn(
        "[Expense Report] Load failed:",
        error?.message ||
        error
      );
    } finally {
      setExpenseReportLoading(
        false
      );
    }
  };

  useEffect(
    () => {
      loadExpenseReport();

      const refresh =
        () =>
          loadExpenseReport();

      window.addEventListener(
        "candidate-data-updated",
        refresh
      );

      return () =>
        window.removeEventListener(
          "candidate-data-updated",
          refresh
        );
    },
    []
  );

  const downloadExpenseReport =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "icp_auth_token"
          );

        if (!token) {
          throw new Error(
            "Please sign in again."
          );
        }

        const response =
          await fetch(
            `${API_BASE}/api/reimbursement/expense-report/document`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          throw new Error(
            data.error ||
            "Unable to create Expense Report."
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          60000
        );
      } catch (
        error
      ) {
        toast.error(
          error.message ||
          "Unable to open Expense Report."
        );
      }
    };

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
      toast.error(
        "Please upload at least one receipt and enter an amount for every uploaded receipt."
      );
      return;
    }

    const selectedReceipts =
      RECEIPT_CATEGORIES
        .map(category => {
          const receipt =
            receipts[category.id];

          if (!receipt?.file) {
            return null;
          }

          return {
            category,
            receipt
          };
        })
        .filter(Boolean);

    if (!selectedReceipts.length) {
      toast.error(
        "Please select at least one receipt."
      );
      return;
    }

    setUploading(true);
    setIsSubmitting(true);

    const uploaded = [];
    const failed = [];

    try {
      for (
        const item
        of selectedReceipts
      ) {
        const {
          category,
          receipt
        } = item;

        try {
          // Use the same document route used successfully by the rest of the
          // portal. "expense-report" is the Document Library category already
          // mapped by the backend to Receipt Submission.
          const result =
            await uploadDocument(
              receipt.file,
              `${category.label} - ${receipt.file.name}`,
              "Reimbursement",
              "crm",
              user?.email,
              {
                document_category:
                  "expense-report",
                library_category:
                  "expense-report",
                document_library_upload:
                  "true",
                document_department:
                  "Deployment",
                pipeline_section:
                  "Deployment",
                receipt_category:
                  category.id,
                receipt_category_label:
                  category.label,
                receipt_amount:
                  receipt.total,
                receipt_currency:
                  receipt.currency ||
                  "USD",
                receipt_amount_usd:
                  convertToUSD(
                    receipt.total,
                    receipt.currency ||
                      "USD"
                  )
              }
            );

          uploaded.push({
            category:
              category.label,
            result
          });
        } catch (error) {
          console.error(
            `[Receipt Upload] ${category.label}:`,
            error
          );

          failed.push({
            category:
              category.label,
            error:
              error?.message ||
              "Upload failed"
          });
        }
      }

      if (failed.length) {
        throw new Error(
          failed
            .map(
              item =>
                `${item.category}: ${item.error}`
            )
            .join(" | ")
        );
      }

      if (!uploaded.length) {
        throw new Error(
          "No receipts were uploaded."
        );
      }

      // Receipt uploads populate the Expense Report, but the stage is
      // completed only when the candidate presses Acknowledge Expense Report.
      setStages?.(
        previous =>
          applyOrderedLocksWithDeepEntry(
            previous.map(
              stage =>
                stage.stage_name ===
                "Receipt Submission"
                  ? {
                      ...stage,
                      status:
                        "In Progress",
                      completed:
                        false,
                      is_completed:
                        false,
                      completed_date:
                        null,
                      source_trigger_unlocked:
                        true,
                      trigger_unlocked:
                        true,
                      completion_source:
                        "expense-report-pending-acknowledgement"
                    }
                  : stage
            )
          )
      );

      window.dispatchEvent(
        new CustomEvent(
          "pipeline-updated",
          {
            detail: {
              email:
                user?.email,
              stage_name:
                "Receipt Submission",
              status:
                "In Progress",
              completed:
                false,
              source:
                "expense-report-pending-acknowledgement"
            }
          }
        )
      );

      toast.success(
        `${uploaded.length} receipt(s) submitted successfully. Review and acknowledge the Expense Report to complete this stage.`
      );

      await loadExpenseReport();

      toast.success(
        `Total Reimbursement: $${Number(
          totalUSD || 0
        ).toFixed(2)} USD`
      );

      setTimeout(
        onClose,
        700
      );
    } catch (error) {
      console.error(
        "[Receipt Submission]",
        error
      );

      toast.error(
        error?.message ||
        "Receipt submission failed. Please try again."
      );
    } finally {
      setUploading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto pr-2">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-xl font-bold text-purple-900">
              Reimbursement Expense Report
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Verified amounts and their Credit/Deduction classification populate after ICP administration reviews each uploaded receipt.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={
              downloadExpenseReport
            }
            disabled={
              expenseReportLoading
            }
          >
            <FileText className="mr-2 h-4 w-4" />
            View Report
          </Button>
        </div>

        {expenseReportLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading Expense Report...
          </div>
        ) : expenseReport ? (
          <>
            <div className="grid gap-2 py-4 text-sm md:grid-cols-3">
              <div>
                <span className="font-semibold">
                  Name:
                </span>{" "}
                {expenseReport.candidate_name || ""}
              </div>
              <div>
                <span className="font-semibold">
                  Arrival Date:
                </span>{" "}
                {expenseReport.arrival_date || ""}
              </div>
              <div>
                <span className="font-semibold">
                  Facility:
                </span>{" "}
                {expenseReport.facility || ""}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      Receipt Details
                    </th>
                    <th className="px-3 py-2 text-right">
                      Credits
                    </th>
                    <th className="px-3 py-2 text-right">
                      Deductions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(expenseReport.rows || []).map(
                    row => (
                      <tr
                        key={row.id}
                        className="border-t"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium">
                            {row.label}
                          </div>
                          {row.note && (
                            <div className="text-xs text-muted-foreground">
                              {row.note}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.side === "credit"
                            ? row.reviewed
                              ? `-$${Math.abs(Number(row.amount || 0)).toFixed(2)}`
                              : "Pending review"
                            : ""}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.side === "deduction"
                            ? row.reviewed
                              ? `+$${Math.abs(Number(row.amount || 0)).toFixed(2)}`
                              : "Pending review"
                            : ""}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
                <tfoot className="border-t bg-purple-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2">
                      Totals
                    </td>
                    <td className="px-3 py-2 text-right">
                      -${Math.abs(Number(
                        expenseReport.totals?.credits || 0
                      )).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      +${Math.abs(Number(
                        expenseReport.totals?.deductions || 0
                      )).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 rounded-lg bg-purple-700 px-4 py-3 text-center font-bold text-white">
              Reimbursement Due to {expenseReport.totals?.due_to || "Neither"}:
              {" "}
              ${Number(
                expenseReport.totals?.amount_due || 0
              ).toFixed(2)}
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Upload receipts below. The report will populate after admin review.
          </div>
        )}
      </div>

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
            <><FileCheck className="h-4 w-4" /> Submit and close</>
          )}
        </Button>
      </div>
    </form>
  );
};

// Main Pipeline Component

// Canonicalize every server/cache refresh against the CURRENT configured pipeline.
// This prevents old MongoDB rows from reappearing a few seconds after the page loads.
const sanitizePipelineStages = (incomingStages, candidateEmail) => {
  const email = String(candidateEmail || "").trim().toLowerCase();
  const incoming = Array.isArray(incomingStages) ? incomingStages : [];
  const byName = new Map();

  for (const row of incoming) {
    if (!row?.stage_name) continue;

    const rowEmail = String(
      row.candidate_email ||
      row.email ||
      email
    ).trim().toLowerCase();

    if (rowEmail && email && rowEmail !== email) continue;

    const existing = byName.get(row.stage_name);
    if (!existing) {
      byName.set(row.stage_name, row);
      continue;
    }

    const existingComplete = isPipelineStageComplete(existing);
    const rowComplete = isPipelineStageComplete(row);

    if (rowComplete && !existingComplete) {
      byName.set(row.stage_name, row);
      continue;
    }

    if (existingComplete && !rowComplete) continue;

    const existingUpdated = new Date(
      existing.updated_at ||
      existing.completed_date ||
      existing.completed_at ||
      0
    ).getTime();

    const rowUpdated = new Date(
      row.updated_at ||
      row.completed_date ||
      row.completed_at ||
      0
    ).getTime();

    if (rowUpdated >= existingUpdated) {
      byName.set(row.stage_name, row);
    }
  }

  // The visible main pipeline ALWAYS comes from STAGES_CONFIG.
  const canonical = getEnabledPipelineStages(STAGES_CONFIG).map(config => {
    const remote = byName.get(config.stage_name) || {};
    return {
      ...remote,
      ...config,
      candidate_email: email || remote.candidate_email || "",
      status: remote.status || "Not Started",
      completed: isPipelineStageComplete(remote),
      is_completed: isPipelineStageComplete(remote),
      completed_date:
        remote.completed_date ||
        remote.completed_at ||
        null
    };
  });

  // Retain NCLEX subprocess records for completion/history calculations only.
  const nclexHistory = incoming.filter(row =>
    row?.stage_name &&
    ICP_USRN_SUBPROCESS_CONFIG.some(item => item.name === row.stage_name)
  ).map(row => ({
    ...row,
    candidate_email: email || row.candidate_email || "",
    hidden_from_main_flow: true,
    non_counted_section: true,
    nclex_subprocess: true
  }));

  return preservePermanentSelectPrescreenInStages(
    [
      ...canonical,
      ...nclexHistory
    ],
    email
  );
};

const formatLivePipelineCountdown = (
  targetDate,
  nowMs = Date.now()
) => {
  const target =
    targetDate instanceof Date
      ? targetDate
      : new Date(
          targetDate
        );

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }

  const differenceMs =
    target.getTime() -
    nowMs;

  const overdue =
    differenceMs <
    0;

  const absoluteSeconds =
    Math.max(
      0,
      Math.floor(
        Math.abs(
          differenceMs
        ) /
        1000
      )
    );

  const totalHours =
    Math.floor(
      absoluteSeconds /
      3600
    );

  const days =
    Math.floor(
      totalHours /
      24
    );

  const hours =
    totalHours %
    24;

  const minutes =
    Math.floor(
      (
        absoluteSeconds %
        3600
      ) /
      60
    );

  return {
    target,
    overdue,
    text:
      overdue
        ? `${days}d ${hours}h ${minutes}m overdue`
        : `${days}d ${hours}h ${minutes}m remaining`
  };
};

const LiveCurrentStageTimer = ({
  stage
}) => {
  const [
    now,
    setNow
  ] = useState(
    () =>
      Date.now()
  );

  useEffect(() => {
    setNow(
      Date.now()
    );

    const timer =
      window.setInterval(
        () => {
          setNow(
            Date.now()
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    stage?.stage_name,
    stage?.target_date,
    stage?.targetDate,
    stage?.due_date,
    stage?.dueDate
  ]);

  if (
    !stage ||
    isPipelineStageComplete(
      stage
    )
  ) {
    return null;
  }

  const target =
    stage.target_date ||
    stage.targetDate ||
    stage.due_date ||
    stage.dueDate ||
    null;

  if (!target) {
    return null;
  }

  const countdown =
    formatLivePipelineCountdown(
      target,
      now
    );

  if (!countdown) {
    return null;
  }

  const timingStatus =
    String(
      stage.timing_status ||
      stage.timingStatus ||
      ""
    )
      .trim()
      .toLowerCase();

  const atRisk =
    !countdown.overdue &&
    timingStatus ===
      "at risk";

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border px-3 py-2",
        countdown.overdue
          ? "border-orange-200 bg-orange-50"
          : atRisk
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
      )}
    >
      <div className="flex items-center gap-2">
        <Timer
          className={cn(
            "h-4 w-4",
            countdown.overdue
              ? "text-orange-600"
              : atRisk
                ? "text-amber-600"
                : "text-emerald-600"
          )}
        />

        <span
          className={cn(
            "text-xs font-semibold",
            countdown.overdue
              ? "text-orange-800"
              : atRisk
                ? "text-amber-800"
                : "text-emerald-800"
          )}
        >
          {countdown.text}
        </span>
      </div>

      <p className="mt-1 text-[11px] text-muted-foreground">
        Deadline:{" "}
        {countdown.target.toLocaleString()}
      </p>
    </div>
  );
};

export default function Pipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();
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
  const automaticSyncEmailRef = useRef("");

  const pipelineCacheKey = user?.email
    ? `icp_pipeline_cache_v2:${String(user.email).trim().toLowerCase()}`
    : null;

  useEffect(() => {
    if (!user?.email) return;
    const normalizedEmail = String(user.email).trim().toLowerCase();
    let restored = null;
    try {
      const raw = pipelineCacheKey ? localStorage.getItem(pipelineCacheKey) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.email === normalizedEmail && Array.isArray(parsed?.stages)) {
        restored = parsed.stages.filter(stage =>
          String(stage?.candidate_email || normalizedEmail).trim().toLowerCase() === normalizedEmail
        );
      }
    } catch (cacheError) {
      console.warn("[Pipeline] Per-email cache restore failed:", cacheError.message);
    }

    setStages(
      sanitizePipelineStages(
        restored?.length ? restored : [],
        normalizedEmail
      )
    );
    setIsInitialized(true);
    setIsCheckingNCLEX(false);
    setIsLoading(false);
  }, [user?.email, pipelineCacheKey]);

  // Keep My Pipeline on the same authoritative stage state used by Dashboard.
  // Dashboard already receives the correctly-evaluated CRM/Recruit pipeline from
  // /api/candidate/dashboard-summary, so merge that state immediately instead of
  // letting a slower secondary field-status request leave the visible pipeline locked.
  // ─── Instant Zoho webhook -> WebSocket pipeline updates ─────────────────
  // This does NOT poll CRM/Recruit. The backend only pushes when Zoho reports
  // an actual change, so updates are immediate without spending read credits.
  useEffect(() => {
    if (!user?.email) return;

    let socket = null;
    let reconnectTimer = null;
    let pingTimer = null;
    let liveCrmTimer = null;
    let liveCrmRequestInFlight = false;
    let disposed = false;
    let reconnectAttempts = 0;
    let lastAppliedWebhookKey = "";

    const normalizedUserEmail =
      String(user.email)
        .trim()
        .toLowerCase();

    const applyWebhookState = message => {
      const webhookKey =
        [
          message?.source || "",
          message?.candidateEmail ||
            message?.email ||
            "",
          message?.timestamp || ""
        ].join("|");

      if (
        webhookKey &&
        webhookKey ===
          lastAppliedWebhookKey
      ) {
        return;
      }

      if (webhookKey) {
        lastAppliedWebhookKey =
          webhookKey;
      }

      const targetEmail =
        String(
          message?.candidateEmail ||
          message?.email ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        targetEmail &&
        targetEmail !==
          normalizedUserEmail
      ) {
        return;
      }

      const stageStatus =
        message?.stageStatus &&
        typeof message.stageStatus ===
          "object"
          ? message.stageStatus
          : {};

      const changedFields =
        message?.changedFields &&
        typeof message.changedFields ===
          "object"
          ? message.changedFields
          : {};

      // Apply true AND false states directly so reset CRM gates uncross instantly.
      if (
        Object.keys(stageStatus).length
      ) {
        setStages(previous =>
          previous.map(stage => {
            const preservedPrescreen =
              preservePermanentSelectPrescreenStage(
                stage,
                normalizedUserEmail
              );

            if (
              preservedPrescreen
                ?.candidate_click_completed ===
                true
            ) {
              return preservedPrescreen;
            }

            const live =
              stageStatus[
                stage.stage_name
              ];

            if (
              !live ||
              typeof live.completed !==
                "boolean"
            ) {
              return stage;
            }

            const completed =
              live.completed === true ||
              isPipelineStageComplete(stage);

            return {
              ...stage,
              status:
                completed
                  ? "Completed"
                  : (
                      live.status ||
                      "Not Started"
                    ),
              completed,
              is_completed:
                completed,
              completed_date:
                completed
                  ? (
                      live.completed_date ||
                      stage.completed_date ||
                      new Date()
                        .toISOString()
                    )
                  : null,
              source_trigger_unlocked:
                live.unlocked === true ||
                completed,
              trigger_unlocked:
                live.unlocked === true ||
                completed,
              crm_unlocked:
                message?.source === "crm"
                  ? (
                      live.unlocked === true ||
                      completed
                    )
                  : false,
              recruit_unlocked:
                message?.source ===
                  "recruit"
                  ? (
                      live.unlocked === true ||
                      completed
                    )
                  : false,
              source_trigger_synced:
                true,
              crm_synced:
                message?.source === "crm"
            };
          })
        );
      }

      // Update the exact live source object used by the pipeline renderer.
      setDeploymentFieldStatus(previous => {
        const current =
          previous || {};

        const nextStageStatus = {
          ...(
            current.__stageStatus ||
            {}
          )
        };

        const nextCompletionMap = {
          ...(
            current.__completionMap ||
            {}
          )
        };

        for (
          const [stageName, live]
          of Object.entries(
            stageStatus
          )
        ) {
          nextStageStatus[
            stageName
          ] = {
            ...(
              nextStageStatus[
                stageName
              ] || {}
            ),
            ...live,
            evaluated: true
          };

          if (
            typeof live?.completed ===
              "boolean"
          ) {
            nextCompletionMap[
              stageName
            ] =
              live.completed;
          }
        }

        return {
          ...current,
          ...changedFields,
          __stageStatus:
            nextStageStatus,
          __completionMap:
            nextCompletionMap,
          __sectionGates:
            message?.sectionGates &&
            typeof message.sectionGates ===
              "object"
              ? {
                  ...(
                    current.__sectionGates ||
                    {}
                  ),
                  ...message.sectionGates
                }
              : (
                  current.__sectionGates ||
                  {}
                )
        };
      });

      if (
        message?.sectionGates &&
        typeof message.sectionGates ===
          "object"
      ) {
        setStages(previous =>
          previous.map(stage => {
            let completed = null;

            if (
              stage.stage_name ===
              "Immigration forms submitted"
            ) {
              completed =
                message.sectionGates
                  ?.immigration
                  ?.unlocked === true;
            } else if (
              stage.stage_name ===
              "Speciality Classes"
            ) {
              completed =
                message.sectionGates
                  ?.deployment
                  ?.unlocked === true;
            } else if (
              stage.stage_name ===
              "Arrived"
            ) {
              completed =
                message.sectionGates
                  ?.aftercare
                  ?.unlocked === true;
            }

            if (
              completed === null
            ) {
              return stage;
            }

            return {
              ...stage,
              status:
                completed
                  ? "Completed"
                  : "Not Started",
              completed,
              is_completed:
                completed,
              completed_date:
                completed
                  ? (
                      stage.completed_date ||
                      new Date()
                        .toISOString()
                    )
                  : null,
              source_trigger_unlocked:
                completed,
              trigger_unlocked:
                completed,
              crm_unlocked:
                completed,
              source_trigger_synced:
                true,
              crm_synced:
                true
            };
          })
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          "pipeline-webhook-applied",
          {
            detail: {
              source:
                message?.source,
              stageStatus,
              changedFields,
              timestamp:
                message?.timestamp ||
                new Date()
                  .toISOString()
            }
          }
        )
      );
    };

    const loadDeterministicLiveCrm =
      async () => {
        if (
          disposed ||
          document.hidden ||
          liveCrmRequestInFlight
        ) {
          return;
        }

        const authToken =
          localStorage.getItem(
            "icp_auth_token"
          ) ||
          localStorage.getItem(
            "authToken"
          ) ||
          localStorage.getItem(
            "token"
          );

        if (!authToken) return;

        liveCrmRequestInFlight =
          true;

        try {
          const response =
            await fetch(
              `${API_BASE}/api/pipeline/live-crm-state?_=${Date.now()}`,
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  Authorization:
                    `Bearer ${authToken}`,
                  "Cache-Control":
                    "no-cache",
                  Pragma:
                    "no-cache"
                }
              }
            );

          const payload =
            await response
              .json()
              .catch(() => ({}));

          if (
            disposed ||
            !response.ok ||
            payload?.success !== true
          ) {
            if (
              !response.ok &&
              payload?.error
            ) {
              console.warn(
                "[Pipeline live CRM]",
                payload.error
              );
            }
            return;
          }

          // Feed the deterministic HTTP snapshot through exactly the same
          // state updater as webhook/WebSocket messages.
          applyWebhookState({
            ...payload,
            type:
              "pipeline-updated",
            event:
              "deterministic-live-crm",
            source:
              "crm",
            candidateEmail:
              payload.candidateEmail ||
              normalizedUserEmail,
            timestamp:
              payload.fetchedAt ||
              new Date()
                .toISOString()
          });
        } catch (error) {
          if (!disposed) {
            console.warn(
              "[Pipeline live CRM] request failed:",
              error?.message || error
            );
          }
        } finally {
          liveCrmRequestInFlight =
            false;
        }
      };

    const startLiveCrmPolling =
      () => {
        if (
          disposed ||
          document.hidden
        ) {
          return;
        }

        // Immediate fresh read on Pipeline load/focus.
        loadDeterministicLiveCrm();

        if (liveCrmTimer) {
          window.clearInterval(
            liveCrmTimer
          );
        }

        liveCrmTimer =
          window.setInterval(
            loadDeterministicLiveCrm,
            5000
          );
      };

    const stopLiveCrmPolling =
      () => {
        if (liveCrmTimer) {
          window.clearInterval(
            liveCrmTimer
          );
          liveCrmTimer = null;
        }
      };

    const scheduleReconnect = () => {
      if (
        disposed ||
        reconnectTimer
      ) {
        return;
      }

      reconnectAttempts += 1;

      const delay =
        Math.min(
          1000 *
            Math.pow(
              2,
              Math.min(
                reconnectAttempts - 1,
                4
              )
            ),
          15000
        );

      reconnectTimer =
        window.setTimeout(
          () => {
            reconnectTimer =
              null;
            connect();
          },
          delay
        );
    };

    const connect = () => {
      if (disposed) return;

      const authToken =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!authToken) return;

      try {
        const parsedApi =
          new URL(
            API_BASE,
            window.location.origin
          );

        const protocol =
          parsedApi.protocol ===
            "https:"
            ? "wss:"
            : "ws:";

        const socketUrl =
          `${protocol}//${parsedApi.host}/ws?token=${encodeURIComponent(
            authToken
          )}`;

        socket =
          new WebSocket(
            socketUrl
          );

        socket.onopen = () => {
          reconnectAttempts = 0;

          if (pingTimer) {
            window.clearInterval(
              pingTimer
            );
          }

          // Keeps the websocket alive; does not call Zoho.
          pingTimer =
            window.setInterval(
              () => {
                if (
                  socket?.readyState ===
                  WebSocket.OPEN
                ) {
                  socket.send(
                    JSON.stringify({
                      type: "ping"
                    })
                  );
                }
              },
              25000
            );
        };

        socket.onmessage = event => {
          let message;

          try {
            message =
              JSON.parse(
                event.data
              );
          } catch {
            return;
          }

          if (
            message?.type ===
              "pipeline-updated" ||
            message?.type ===
              "candidate-data-updated" ||
            message?.type ===
              "crm-recruit-updated"
          ) {
            applyWebhookState(
              message
            );
          }
        };

        socket.onerror = () => {
          // onclose handles reconnection
        };

        socket.onclose = () => {
          if (pingTimer) {
            window.clearInterval(
              pingTimer
            );
            pingTimer = null;
          }

          scheduleReconnect();
        };
      } catch (error) {
        console.warn(
          "[Pipeline realtime] WebSocket setup failed:",
          error?.message || error
        );

        scheduleReconnect();
      }
    };

    const handleVisibilityChange =
      () => {
        if (document.hidden) {
          stopLiveCrmPolling();
        } else {
          startLiveCrmPolling();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    connect();
    startLiveCrmPolling();

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      disposed = true;

      if (reconnectTimer) {
        window.clearTimeout(
          reconnectTimer
        );
      }

      if (pingTimer) {
        window.clearInterval(
          pingTimer
        );
      }

      stopLiveCrmPolling();

      if (
        socket &&
        (
          socket.readyState ===
            WebSocket.OPEN ||
          socket.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        socket.close();
      }
    };
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;
    let refreshTimer = null;

    const normalizedEmail = String(user.email).trim().toLowerCase();

    const mergeDashboardPipeline = async () => {
      try {
        const token =
          localStorage.getItem("icp_auth_token") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("token");

        if (!token) return;

        const response = await fetch(
          `${API_BASE}/api/candidate/dashboard-summary?_=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache"
            }
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (cancelled || !response.ok) return;

        const dashboardPipeline = payload?.pipeline || {};
        const dashboardStages = Array.isArray(dashboardPipeline?.stages)
          ? dashboardPipeline.stages
          : [];
        const dashboardCurrentStage = dashboardPipeline?.currentStage || null;

        if (dashboardPipeline?.applicationStatus || dashboardPipeline?.application_status) {
          const nextApplicationStatus =
            dashboardPipeline.applicationStatus ||
            dashboardPipeline.application_status;
          setApplicationStatus(nextApplicationStatus);
          if (isTransferToICPUSRNStatus(nextApplicationStatus)) {
            setShowNCLEX(true);
          }
        }

        if (!dashboardStages.length && !dashboardCurrentStage) return;

        setStages(previous => {
          const baseStages = sanitizePipelineStages(
            previous?.length ? previous : [],
            normalizedEmail
          );

          const dashboardByName = new Map();
          for (const remoteStage of dashboardStages) {
            if (!remoteStage?.stage_name) continue;
            const remoteEmail = String(remoteStage?.candidate_email || normalizedEmail)
              .trim()
              .toLowerCase();
            if (remoteEmail && remoteEmail !== normalizedEmail) continue;
            dashboardByName.set(remoteStage.stage_name, remoteStage);
          }

          const currentName = dashboardCurrentStage?.stage_name || null;

          const merged = baseStages.map(localStage => {
            const remoteStage = dashboardByName.get(localStage.stage_name);
            const isDashboardCurrent = currentName === localStage.stage_name;

            const preservedPrescreen =
              preservePermanentSelectPrescreenStage(
                localStage,
                normalizedEmail
              );

            if (
              preservedPrescreen
                ?.candidate_click_completed ===
                true
            ) {
              return {
                ...preservedPrescreen,
                dashboard_current:
                  false,
                dashboard_synced:
                  true
              };
            }

            if (!remoteStage && !isDashboardCurrent) return localStage;

            const remoteStatus = String(
              remoteStage?.status ||
              dashboardCurrentStage?.status ||
              (isDashboardCurrent ? "In Progress" : localStage.status || "Not Started")
            ).trim();
            const normalizedStatus = remoteStatus.toLowerCase();
            const remoteComplete =
              remoteStage?.completed === true ||
              remoteStage?.is_completed === true ||
              Boolean(remoteStage?.completed_date || remoteStage?.completed_at) ||
              normalizedStatus === "completed" ||
              normalizedStatus === "complete";
            const remoteReached =
              remoteComplete ||
              isDashboardCurrent ||
              remoteStage?.source_trigger_unlocked === true ||
              remoteStage?.trigger_unlocked === true ||
              remoteStage?.crm_unlocked === true ||
              remoteStage?.recruit_unlocked === true ||
              remoteStage?.unlocked === true ||
              remoteStage?.is_unlocked === true;

            const localIsLiveSourceControlled =
              localStage.source_trigger_synced === true ||
              localStage.crm_synced === true ||
              localStage.recruit_synced === true ||
              localStage.synced_from_custom_module_1 === true ||
              Boolean(DEPLOYMENT_CRM_STAGE_RULES?.[localStage.stage_name]) ||
              Boolean(IMMIGRATION_CRM_CHECKLISTS?.[localStage.stage_name]);

            // IMPORTANT: /api/pipeline/field-status is the authoritative source for
            // CRM/Recruit-gated rows. Dashboard data can be a few seconds behind and
            // must never relock or uncheck a stage that the live source already proved.
            if (localIsLiveSourceControlled) {
              return {
                ...localStage,
                candidate_email: normalizedEmail,
                dashboard_current: isDashboardCurrent,
                dashboard_synced: true,
                // Dashboard may add context, but it may not replace live-source state.
                dashboard_unlocked:
                  remoteReached ||
                  localStage.dashboard_unlocked === true
              };
            }

            const localAftercareGateOpen =
              localStage.stage_category === "Aftercare" &&
              (
                localStage.aftercare_unlocked === true ||
                localStage.aftercare_locked === false
              );

            return {
              ...localStage,
              ...(remoteStage || {}),
              candidate_email: normalizedEmail,
              status: remoteComplete
                ? "Completed"
                : (isDashboardCurrent ? "In Progress" : remoteStatus || localStage.status),
              completed: remoteComplete,
              is_completed: remoteComplete,
              completed_date: remoteComplete
                ? (remoteStage?.completed_date || remoteStage?.completed_at || localStage.completed_date || null)
                : null,
              source_trigger_unlocked:
                remoteReached ||
                localStage.source_trigger_unlocked === true,
              trigger_unlocked:
                remoteReached ||
                localStage.trigger_unlocked === true,
              dashboard_unlocked: remoteReached,
              unlocked:
                remoteReached ||
                localStage.unlocked === true ||
                remoteStage?.unlocked === true,
              is_unlocked:
                remoteReached ||
                localStage.is_unlocked === true ||
                remoteStage?.is_unlocked === true,
              is_locked:
                (remoteReached || localAftercareGateOpen)
                  ? false
                  : remoteStage?.is_locked,
              aftercare_unlocked:
                localAftercareGateOpen
                  ? true
                  : remoteStage?.aftercare_unlocked,
              aftercare_locked:
                localAftercareGateOpen
                  ? false
                  : remoteStage?.aftercare_locked,
              aftercare_gate_date:
                localStage.aftercare_gate_date ||
                remoteStage?.aftercare_gate_date ||
                null,
              target_date:
                localStage.target_date ||
                remoteStage?.target_date ||
                null,
              dashboard_current: isDashboardCurrent,
              dashboard_synced: true
            };
          });

          // If Dashboard returns a current stage that is not present in the local
          // config for any reason, do not fabricate a duplicate row. The config
          // remains the source of visible structure; the next refresh will merge
          // it once the stage exists locally.
          return merged;
        });
      } catch (dashboardSyncError) {
        console.warn(
          "[Pipeline] Dashboard pipeline sync failed:",
          dashboardSyncError?.message || dashboardSyncError
        );
      }
    };

    // Run immediately so a candidate who already satisfied later gates does not
    // wait for the slower CRM/Recruit field-status pass before seeing access.
    mergeDashboardPipeline();

    const handleAuthoritativePipelineChange = () => mergeDashboardPipeline();
    window.addEventListener("pipeline-updated", handleAuthoritativePipelineChange);
    window.addEventListener("candidate-data-updated", handleAuthoritativePipelineChange);
    // Do not bind crm-recruit-updated to Dashboard merge: field-status is newer
    // than Dashboard persistence and this listener previously re-locked stages.

    // Keep the page synchronized while it remains open without requiring refresh.
    refreshTimer = window.setInterval(mergeDashboardPipeline, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearInterval(refreshTimer);
      window.removeEventListener("pipeline-updated", handleAuthoritativePipelineChange);
      window.removeEventListener("candidate-data-updated", handleAuthoritativePipelineChange);
      // No crm-recruit-updated Dashboard listener; live field-status owns those gates.
    };
  }, [user?.email]);

  useEffect(() => {
    if (
      searchParams.get(
        "branch"
      ) === "nclex"
    ) {
      setShowNCLEX(true);
      setIsCheckingNCLEX(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const refreshNCLEXAccess = async () => {
      if (!user?.email) {
        setIsCheckingNCLEX(false);
        return;
      }

      try {
        setIsCheckingNCLEX(true);

        const hasAccess =
          await checkNCLEXAccess(
            user.email
          );

        setShowNCLEX(hasAccess);

        console.log(
          "[Pipeline] NCLEX access:",
          hasAccess
        );
      } catch (error) {
        console.error(
          "[Pipeline] Error checking NCLEX access:",
          error
        );

        // Keep the current UI state only for transient request failures.
        setShowNCLEX(previous => previous);
      } finally {
        setIsCheckingNCLEX(false);
      }
    };

    refreshNCLEXAccess();
  }, [user?.email]);

  useEffect(() => {
    if (
      !user?.email ||
      isCheckingNCLEX
    ) {
      return;
    }

    const normalizedEmail =
      String(
        user.email
      )
        .trim()
        .toLowerCase();

    if (
      automaticSyncEmailRef.current ===
      normalizedEmail
    ) {
      return;
    }

    automaticSyncEmailRef.current =
      normalizedEmail;

    syncAutomaticPipeline();
  }, [
    user?.email,
    isCheckingNCLEX
  ]);

  const syncAutomaticPipeline = async () => {
    if (!user?.email) return;
    try {
      const token = localStorage.getItem("icp_auth_token");
      let dateReceivedRaw = null;
      let recruitModulePresence = {
        applications: null,
        candidates: null,
        customModule1: null
      };
      let recruitSnapshotLoaded = false;
      let submittedToImmigrationDate = null;
      let immigrationFiledDate = null;
      let allClearDocumentaryComplete = false;
      let recruitApplicationStatus = "";
      let canonicalHiringCompletedStages =
        new Set();
      let canonicalHiringCurrentStage =
        null;
      let canonicalApplicationsFound =
        null;
      let canonicalCandidatesFound =
        null;
      let canonicalAssociatedWithJob =
        null;
      let canonicalApplicationCandidateLinkVerified =
        false;
      let canonicalMatchedAssociationEmail =
        null;
      let icpUSRNData = {};
      let resolvedFinalArrivalDate = null;
      let backendAftercareGateOpen = false;
      let directFieldStatus = {};
      let directComputedStageStatus = {};

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
          const response = await fetch(`${API_BASE}/api/zoho/my-deals`, {
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
            recruitSnapshotLoaded = true;
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
              "Application_Status",
              "applicationStatus",
              "leadManagementStatus"
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

            const backendPresence =
              userData?.recruitModulePresence || {};
            const hasPresencePayload =
              Object.prototype.hasOwnProperty.call(
                backendPresence,
                "applications"
              ) ||
              Object.prototype.hasOwnProperty.call(
                backendPresence,
                "candidates"
              ) ||
              sourceModules.length > 0;

            recruitModulePresence = hasPresencePayload
              ? {
                  applications:
                    backendPresence.applications === true ||
                    sourceModules.includes("applications"),
                  candidates:
                    backendPresence.candidates === true ||
                    sourceModules.includes("candidates"),
                  customModule1:
                    backendPresence.customModule1 === true ||
                    sourceModules.includes("custommodule1") ||
                    sourceModules.includes("nclex program")
                }
              : {
                  applications: null,
                  candidates: null,
                  customModule1: null
                };

            if (!dateReceivedRaw) {
              dateReceivedRaw =
                ga(userData, "Date_Received", "datereceived", "DateReceived") ||
                null;
            }

            submittedToImmigrationDate =
              ga(
                userData,
                "submittedToImmigration",
                "Added_to_Weekly_I140_Candidates"
              ) || null;

            immigrationFiledDate =
              ga(
                userData,
                "Filed_Date",
                "i140FiledDate",
                "immigrationFiledDate"
              ) || null;

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

        // Fetch live field values directly from CRM Deals and Recruit Candidates.
        // This response is not dependent on the larger cached candidate payload.
        try {
          const fieldResponse = await fetch(
            `${API_BASE}/api/pipeline/field-status?email=${encodeURIComponent(user.email)}&refresh=false&_=${Date.now()}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const fieldPayload = await fieldResponse
            .json()
            .catch(() => ({}));

          if (
            fieldResponse.ok &&
            fieldPayload.success
          ) {
            directFieldStatus = {
              ...(fieldPayload.deployment || {}),
              ...(fieldPayload.immigration || {}),
              ...(fieldPayload.recruit || {}),
              ...(fieldPayload.nclex || {})
            };

            directComputedStageStatus =
              fieldPayload.stageStatus || {};

            immigrationFiledDate =
              directFieldStatus.Filed_Date ||
              immigrationFiledDate;

            setDeploymentFieldStatus({
              ...directFieldStatus,
              __stageStatus:
                directComputedStageStatus,
              __sectionGates:
                fieldPayload.sectionGates || {},
              __completionMap:
                fieldPayload.completionMap || {},
              __immigrationChecklists:
                fieldPayload.immigrationChecklists || {},
              __accessPolicy:
                fieldPayload.accessPolicy || {
                  mode: "normal",
                  restricted: false,
                  locked: false
                }
            });

            if (fieldPayload.accessPolicy) {
              const policy = fieldPayload.accessPolicy;

              setStages(previous =>
                previous.map(stage => {
                  const qPoolOrder =
                    getCanonicalStageOrder({
                      stage_name: "Qualified Candidate Pool"
                    });

                  const notQualifiedOrder =
                    getCanonicalStageOrder({
                      stage_name: "Not Qualified - to close"
                    });

                  const boundary =
                    policy.mode === "qualified-pool"
                      ? qPoolOrder
                      : notQualifiedOrder;

                  const shouldLock =
                    policy.mode ===
                      "not-qualified"
                      ? (
                          stage.stage_name !==
                          "Not Qualified - to close"
                        )
                      : (
                          policy.restricted ===
                            true &&
                          policy.locked ===
                            true &&
                          getCanonicalStageOrder(
                            stage
                          ) >
                            boundary
                        );

                  return {
                    ...stage,
                    access_locked:
                      shouldLock
                  };
                })
              );

              if (
                policy.message &&
                policy.restricted === true
              ) {
                toast.info(
                  policy.message,
                  {
                    id:
                      `pipeline-access-${policy.mode}`,
                    duration:
                      10000
                  }
                );
              }
            }

            icpUSRNData = {
              ...icpUSRNData,
              ...directFieldStatus
            };

            // The NCLEX mini-cards read icpUSRNCRMData. Keep that state tied
            // directly to CustomModule1 instead of the broader mixed user object.
            setICPUSRNCRMData(previous => ({
              ...previous,
              ...(fieldPayload.nclex || {})
            }));
          }
        } catch (fieldError) {
          console.warn(
            "[Pipeline] Direct CRM/Recruit field fetch failed:",
            fieldError.message
          );
        }

        // These two Hiring checkboxes are read from a dedicated endpoint that
        // resolves the Candidate linked to Recruit Applications first.
        try {
          const triggerResponse =
            await fetch(
              `${API_BASE}/api/pipeline/hiring-candidate-triggers?email=${encodeURIComponent(
                user.email
              )}&_=${Date.now()}`,
              {
                method:
                  "GET",
                cache:
                  "no-store",
                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );

          const triggerPayload =
            await triggerResponse
              .json()
              .catch(() => ({}));

          if (
            triggerResponse.ok &&
            triggerPayload.success ===
              true
          ) {
            directFieldStatus = {
              ...directFieldStatus,
              ...(triggerPayload.fields || {})
            };

            directComputedStageStatus = {
              ...directComputedStageStatus,
              "Documents Received": {
                evaluated:
                  true,
                completed:
                  triggerPayload
                    .completion
                    ?.["Documents Received"] ===
                  true,
                status:
                  triggerPayload
                    .completion
                    ?.["Documents Received"] ===
                  true
                    ? "Completed"
                    : "Not Started",
                source_fields: [
                  "All_docs_on_file"
                ],
                resolution_source:
                  triggerPayload
                    .resolutionSource,
                candidate_record_id:
                  triggerPayload
                    .candidateRecordId
              },
              "Mandatory Pre-Interview Coaching Call": {
                evaluated:
                  true,
                completed:
                  triggerPayload
                    .completion
                    ?.["Mandatory Pre-Interview Coaching Call"] ===
                  true,
                status:
                  triggerPayload
                    .completion
                    ?.["Mandatory Pre-Interview Coaching Call"] ===
                  true
                    ? "Completed"
                    : "Not Started",
                source_fields: [
                  "Attended_Pre_Interview_Call"
                ],
                resolution_source:
                  triggerPayload
                    .resolutionSource,
                candidate_record_id:
                  triggerPayload
                    .candidateRecordId
              }
            };
          }
        } catch (triggerError) {
          console.warn(
            "[Pipeline] Dedicated Recruit Hiring trigger fetch failed:",
            triggerError.message
          );
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

            if (gatePayload.unlocked === true) {
              const arrivalGateValue =
                gatePayload.arrivalDate ||
                gatePayload.rawArrival ||
                null;

              setStages(previous =>
                previous.map(stage =>
                  stage.stage_category === "Aftercare"
                    ? {
                        ...stage,
                        aftercare_unlocked: true,
                        aftercare_locked: false,
                        aftercare_gate_date:
                          arrivalGateValue ||
                          stage.aftercare_gate_date ||
                          null
                      }
                    : stage
                )
              );
            }

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

      const cachedPipelineStart =
        pipelineStartDate ||
        stages
          .map(stage =>
            stage?.pipeline_start_date ||
            stage?.start_date ||
            null
          )
          .find(Boolean) ||
        null;

      const received =
        dateReceivedRaw ||
        cachedPipelineStart ||
        null;

      const start =
        received
          ? new Date(
              received
            )
          : null;

      const validStart =
        start &&
        !Number.isNaN(
          start.getTime()
        )
          ? start
          : null;

      if (validStart) {
        setPipelineStartDate(
          validStart
        );
      }
      let saved = [];
      let savedPipelineLoadedSuccessfully = false;
      try {
        const token =
          localStorage.getItem("icp_auth_token");
        const savedResponse = await fetch(
          `${API_BASE}/api/pipeline/get?email=${encodeURIComponent(user.email)}&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        const savedPayload =
          await savedResponse.json().catch(() => ({}));
        if (savedResponse.ok) {
          saved = Array.isArray(
            savedPayload.stages
          )
            ? savedPayload.stages
            : [];

          savedPipelineLoadedSuccessfully =
            true;

          const canonicalHiringState =
            savedPayload
              ?.hiringState ||
            {};

          const canonicalStatus =
            canonicalHiringState
              .applicationStatus ||
            savedPayload
              ?.nclexAccess
              ?.applicationStatus ||
            "";

          if (canonicalStatus) {
            recruitApplicationStatus =
              canonicalStatus;

            setApplicationStatus(
              canonicalStatus
            );
          }

          canonicalHiringCompletedStages =
            new Set(
              Array.isArray(
                canonicalHiringState
                  .completedStages
              )
                ? canonicalHiringState
                    .completedStages
                : []
            );

          canonicalHiringCurrentStage =
            canonicalHiringState
              .currentStage ||
            null;

          canonicalApplicationsFound =
            Object.prototype
              .hasOwnProperty.call(
                canonicalHiringState,
                "applicationsFound"
              )
              ? canonicalHiringState
                  .applicationsFound ===
                true
              : null;

          canonicalCandidatesFound =
            Object.prototype
              .hasOwnProperty.call(
                canonicalHiringState,
                "candidatesFound"
              )
              ? canonicalHiringState
                  .candidatesFound ===
                true
              : null;

          canonicalAssociatedWithJob =
            Object.prototype
              .hasOwnProperty.call(
                canonicalHiringState,
                "associatedWithJob"
              )
              ? canonicalHiringState
                  .associatedWithJob ===
                true
              : null;

          canonicalApplicationCandidateLinkVerified =
            canonicalHiringState
              .applicationCandidateLinkVerified ===
            true;

          canonicalMatchedAssociationEmail =
            canonicalHiringState
              .matchedAssociationEmail ||
            canonicalHiringState
              ?.applicationCandidateLink
              ?.candidateEmail ||
            null;

          if (
            Object.prototype
              .hasOwnProperty.call(
                canonicalHiringState,
                "applicationsFound"
              ) ||
            Object.prototype
              .hasOwnProperty.call(
                canonicalHiringState,
                "candidatesFound"
              )
          ) {
            recruitModulePresence = {
              applications:
                canonicalHiringState
                  .applicationsFound ===
                true,
              candidates:
                canonicalHiringState
                  .candidatesFound ===
                true,
              customModule1:
                recruitModulePresence
                  .customModule1
            };
          }

          if (
            canonicalHiringState
              .nclexEligible ===
              true ||
            canonicalHiringState
              .transferStatusSelected ===
              true ||
            isTransferToICPUSRNStatus(
              canonicalStatus
            ) ||
            savedPayload
              ?.nclexAccess
              ?.eligible ===
              true
          ) {
            setShowNCLEX(
              true
            );
          }
        }
      } catch (error) {
        console.warn(
          "[Pipeline] Could not load saved database stages:",
          error
        );
      }
      const strongestSavedStages =
        Array.from(
          saved.reduce(
            (map, stage) => {
              const current =
                map.get(
                  stage.stage_name
                );

              if (
                !current ||
                (
                  isPipelineStageComplete(
                    stage
                  ) &&
                  !isPipelineStageComplete(
                    current
                  )
                )
              ) {
                map.set(
                  stage.stage_name,
                  stage
                );
              }

              return map;
            },
            new Map()
          ).values()
        );

      saved =
        strongestSavedStages;

      const savedByName =
        saved.reduce(
          (map, stage) => {
            const current =
              map.get(
                stage.stage_name
              );

            if (!current) {
              map.set(
                stage.stage_name,
                stage
              );
              return map;
            }

            const currentComplete =
              isPipelineStageComplete(
                current
              );

            const stageComplete =
              isPipelineStageComplete(
                stage
              );

            if (
              stageComplete &&
              !currentComplete
            ) {
              map.set(
                stage.stage_name,
                stage
              );
              return map;
            }

            if (
              currentComplete &&
              !stageComplete
            ) {
              return map;
            }

            const currentDate =
              new Date(
                current.completed_date ||
                current.completed_at ||
                current.updated_at ||
                0
              ).getTime();

            const stageDate =
              new Date(
                stage.completed_date ||
                stage.completed_at ||
                stage.updated_at ||
                0
              ).getTime();

            if (
              stageDate >
              currentDate
            ) {
              map.set(
                stage.stage_name,
                stage
              );
            }

            return map;
          },
          new Map()
        );

      for (const [visibleStageName, alias] of Object.entries(FLOW_STAGE_ALIASES)) {
        const currentVisible = savedByName.get(visibleStageName);
        const legacyCandidates = alias.sources.map(name => savedByName.get(name)).filter(Boolean);
        const strongestLegacy = getStrongestFlowSource(legacyCandidates);
        if (!currentVisible && strongestLegacy) {
          savedByName.set(visibleStageName, {
            ...strongestLegacy,
            stage_name: visibleStageName,
            legacy_stage_name: strongestLegacy.stage_name,
            restored_from_legacy_flow: true
          });
        }
      }

      const savedNCLEXProgress = saved
        .filter(stage =>
          [
            "NCLEX Roadmap",
            "NCLEX Prescreen"
          ].includes(stage.stage_category) ||
          ICP_USRN_SUBPROCESS_CONFIG.some(
            item =>
              item.name ===
              stage.stage_name
          )
        )
        .reduce((progress, stage) => {
          progress[stage.stage_name] = {
            status: stage.status,
            completed:
              isPipelineStageComplete(stage),
            completed_date:
              stage.completed_date || null
          };
          return progress;
        }, {});

      const savedTransferStage =
        savedByName.get(
          "Transfer to ICP USRN School"
        );

      const savedTransferStatus =
        String(
          savedTransferStage?.status ||
          ""
        )
          .trim()
          .toLowerCase();

      const savedTransferReached =
        Boolean(
          savedTransferStage
        ) &&
        (
          isPipelineStageComplete(
            savedTransferStage
          ) ||
          [
            "in progress",
            "in-progress",
            "active"
          ].includes(
            savedTransferStatus
          ) ||
          savedTransferStage
            ?.nclex_eligible ===
            true ||
          savedTransferStage
            ?.nclex_branch_visible ===
            true ||
          savedTransferStage
            ?.transfer_status_verified ===
            true
        ) ||
        Object.keys(
          savedNCLEXProgress
        ).length > 0;

      if (savedTransferReached) {
        setShowNCLEX(true);
      }
      
      // Build stages with immigration details.
      // The first two hiring stages are controlled only by Recruit module presence:
      // Applied -> Applications; Associated with Job -> Applications + Candidates.
      const applicationsFound =
        canonicalApplicationsFound !==
        null
          ? canonicalApplicationsFound
          : recruitModulePresence
              .applications ===
            true;

      const candidatesFound =
        canonicalCandidatesFound !==
        null
          ? canonicalCandidatesFound
          : recruitModulePresence
              .candidates ===
            true;

      const associatedWithJobFound =
        canonicalAssociatedWithJob !==
        null
          ? canonicalAssociatedWithJob
          : (
              applicationsFound &&
              candidatesFound
            );

      const applicationsPresenceKnown =
        canonicalApplicationsFound !==
          null ||
        recruitModulePresence
          .applications !==
          null;

      const candidatesPresenceKnown =
        canonicalCandidatesFound !==
          null ||
        recruitModulePresence
          .candidates !==
          null;

      let allStages = STAGES_CONFIG.map(stage => {
        const savedStage = savedByName.get(stage.stage_name);
        const isAppliedStage = stage.stage_name === "Applied";
        const isAssociatedStage = stage.stage_name === "Associated with Job";
        const isFirstImmigrationStage = stage.stage_name === "Submitted for Immigration";
        const isFirstDeploymentStage = stage.stage_name === "Introduction to Deployment";

        let automaticStatus = null;

        if (isAppliedStage) {
          if (
            applicationsFound ||
            canonicalHiringCompletedStages
              .has(
                "Applied"
              )
          ) {
            automaticStatus =
              "Completed";
          } else if (
            applicationsPresenceKnown &&
            !savedStage
          ) {
            automaticStatus =
              null;
          }
        } else if (isAssociatedStage) {
          const savedAssociatedComplete =
            isPipelineStageComplete(
              savedStage
            );

          // Module presence is independent of Application_Status. A candidate
          // can still have Application_Status="Applied" while already existing
          // in BOTH Applications and Candidates. That must complete Associated.
          const bothRecruitModulesFound =
            applicationsFound ===
              true &&
            candidatesFound ===
              true;

          const normalizedHiringStatus = normalizeApplicationStatus(recruitApplicationStatus);
          const recruitStatusHasPassedApplied = Boolean(
            normalizedHiringStatus &&
            normalizedHiringStatus !== "new candidate" &&
            normalizedHiringStatus !== "applied"
          );

          if (
            savedAssociatedComplete ||
            canonicalApplicationCandidateLinkVerified ||
            bothRecruitModulesFound ||
            associatedWithJobFound ||
            recruitStatusHasPassedApplied ||
            canonicalHiringCompletedStages.has("Associated with Job")
          ) {
            automaticStatus =
              "Completed";
          } else if (
            applicationsPresenceKnown &&
            candidatesPresenceKnown &&
            !savedStage
          ) {
            automaticStatus =
              null;
          }
        } else if (isFirstImmigrationStage && submittedToImmigrationDate) {
          automaticStatus = savedStage?.status === "Completed" ? "Completed" : "In Progress";
        } else if (isFirstDeploymentStage && allClearDocumentaryComplete) {
          automaticStatus = savedStage?.status === "Completed" ? "Completed" : "In Progress";
        }

        const isAutomaticallyCompleted = automaticStatus === "Completed";

        const fixedDayOneTarget =
          validStart
            ? getFixedDayOneStageTarget(
                stage,
                validStart
              )
            : null;

        const baseStage = {
          ...stage,
          ...savedStage,

          // Keep the current configured position regardless of completion
          // status or the stage_order stored in an older MongoDB record.
          stage_order:
            getCanonicalStageOrder(
              stage
            ),

          candidate_email: user.email,
          start_date:
            validStart
              ? validStart.toISOString()
              : (
                  savedStage?.start_date ||
                  savedStage?.pipeline_start_date ||
                  null
                ),
          pipeline_start_date:
            validStart
              ? validStart.toISOString()
              : (
                  savedStage?.pipeline_start_date ||
                  savedStage?.start_date ||
                  null
                ),
          target_date:
            fixedDayOneTarget
              ? fixedDayOneTarget.toISOString()
              : (
                  savedStage?.target_date ||
                  stage.target_date ||
                  null
                ),
          timing_source:
            fixedDayOneTarget
              ? "hiring_day_1_fixed"
              : (
                  savedStage?.timing_source ||
                  stage.timing_source ||
                  null
                ),
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
            savedStage?.status === "Completed" ||
            savedStage?.completed === true ||
            savedStage?.is_completed === true ||
            Boolean(savedStage?.completed_date)
              ? "Completed"
              : automaticStatus !== null
                ? automaticStatus
                : stage.auto_complete_on_email && user.email
                  ? "Completed"
                  : savedStage?.status || "Not Started",
          completed_date:
            savedStage?.completed_date ||
            (
              savedStage?.status === "Completed" ||
              savedStage?.completed === true ||
              savedStage?.is_completed === true
                ? format(new Date(), "yyyy-MM-dd")
                : automaticStatus !== null && isAutomaticallyCompleted
                  ? format(new Date(), "yyyy-MM-dd")
                  : stage.auto_complete_on_email && user.email
                    ? format(new Date(), "yyyy-MM-dd")
                    : null
            ),

          ...(isAssociatedStage
            ? {
                matched_association_email:
                  canonicalMatchedAssociationEmail,
                associated_with_job_verified:
                  associatedWithJobFound ===
                    true ||
                  canonicalApplicationCandidateLinkVerified,
                application_candidate_link_verified:
                  canonicalApplicationCandidateLinkVerified
              }
            : {})
        };
        
        // Add immigration stage details if available
        if (stage.stage_category === "Immigration" && IMMIGRATION_STAGE_DETAILS[stage.stage_name]) {
          baseStage.stage_details = IMMIGRATION_STAGE_DETAILS[stage.stage_name];
        }
        
        return baseStage;
      });
      
      // Immigration timing is anchored to the real CRM milestone dates,
      // not Date_Received or arbitrary whole-pipeline offsets.
      const parsePipelineDate =
        value => {
          if (!value) return null;

          const raw =
            unwrapPipelineFieldValue(
              value
            );

          if (!raw) return null;

          const parsed =
            new Date(raw);

          return Number.isNaN(
            parsed.getTime()
          )
            ? null
            : parsed;
        };

      const submittedImmigrationAnchor =
        parsePipelineDate(
          submittedToImmigrationDate
        );

      const immigrationApprovedStage =
        savedByName.get(
          "Immigration approved"
        );

      const approvalAnchor =
        parsePipelineDate(
          directFieldStatus
            .Approval_Date ||
          directFieldStatus
            .Approval_datetime ||
          immigrationApprovedStage
            ?.completed_date ||
          immigrationApprovedStage
            ?.completed_at
        );

      const visaBillIssuedStage =
        savedByName.get(
          "Visa bill issued"
        );

      const visaBillReceivedAnchor =
        parsePipelineDate(
          directFieldStatus
            .Visa_Fee_Bill_Received_Date ||
          directFieldStatus
            .Visa_Fee_Bill_Received ||
          directFieldStatus
            .Fee_Bill_Received_Date ||
          directFieldStatus
            .Visa_Fee_Bill_Date ||
          visaBillIssuedStage
            ?.completed_date ||
          visaBillIssuedStage
            ?.completed_at
        );

      const visaPaidStage =
        savedByName.get(
          "Visa bill paid"
        );

      const visaFeePaidAnchor =
        parsePipelineDate(
          directFieldStatus
            .Visa_Fee_Bill_Paid_Date ||
          directFieldStatus
            .Visa_Fee_Paid_Date ||
          directFieldStatus
            .Fee_Bill_Paid_Date ||
          visaPaidStage
            ?.completed_date ||
          visaPaidStage
            ?.completed_at
        );

      const ds260Stage =
        savedByName.get(
          "DS-260 / Civil Document Submission"
        );

      const civilDocsSubmittedAnchor =
        parsePipelineDate(
          directFieldStatus
            .DS260_Submission_Date ||
          directFieldStatus
            .DS_260_Submission_Date ||
          directFieldStatus
            .Civil_Documents_Submitted_Date ||
          directFieldStatus
            .DS260_Submission_Projected_Date ||
          ds260Stage
            ?.completed_date ||
          ds260Stage
            ?.completed_at
        );

      const documentarilyQualifiedStage =
        savedByName.get(
          "Documentarily Qualified"
        );

      const allClearAnchor =
        parsePipelineDate(
          directFieldStatus
            .All_Clear_Date ||
          directFieldStatus
            .All_Clear_Date_Time ||
          directFieldStatus
            .allClearDate ||
          documentarilyQualifiedStage
            ?.completed_date ||
          documentarilyQualifiedStage
            ?.completed_at
        );

      allStages =
        allStages.map(stage => {
          if (
            stage.stage_category !==
            "Immigration"
          ) {
            return stage;
          }

          // 1. Immigration forms submitted:
          //    submitted date + 7 days.
          if (
            stage.stage_name ===
              "Immigration forms submitted" &&
            submittedImmigrationAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  submittedImmigrationAnchor,
                  7
                ).toISOString(),
              timing_rule:
                "Submitted for immigration date + 7 days",
              timing_anchor:
                submittedImmigrationAnchor
                  .toISOString()
            };
          }

          // 2. Foundation courses:
          //    submitted date + 90 days.
          if (
            stage.stage_name ===
              "Foundations: Pillars" &&
            submittedImmigrationAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  submittedImmigrationAnchor,
                  90
                ).toISOString(),
              timing_rule:
                "Submitted for immigration date + 90 days",
              timing_anchor:
                submittedImmigrationAnchor
                  .toISOString()
            };
          }

          // Keep Cultural Readiness aligned to the broader Foundation-course
          // timeline rather than the previous filed-date 3–18 month window.
          if (
            stage.stage_name ===
              "Foundations: Cultural Readiness" &&
            submittedImmigrationAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  submittedImmigrationAnchor,
                  90
                ).toISOString(),
              timing_rule:
                "Submitted for immigration date + 90 days",
              timing_anchor:
                submittedImmigrationAnchor
                  .toISOString()
            };
          }

          // 3. Endorsement courses:
          //    submitted date + 20 months.
          if (
            stage.stage_name ===
              "Foundations: Endorsement Discovery" &&
            submittedImmigrationAnchor
          ) {
            return {
              ...stage,
              target_date:
                addMonths(
                  submittedImmigrationAnchor,
                  20
                ).toISOString(),
              timing_rule:
                "Submitted for immigration date + 20 months",
              timing_anchor:
                submittedImmigrationAnchor
                  .toISOString()
            };
          }

          // 4. Case approved:
          //    submitted date + 24 months.
          if (
            stage.stage_name ===
              "Immigration approved" &&
            submittedImmigrationAnchor
          ) {
            return {
              ...stage,
              target_date:
                addMonths(
                  submittedImmigrationAnchor,
                  24
                ).toISOString(),
              timing_rule:
                "Submitted for immigration date + 24 months",
              timing_anchor:
                submittedImmigrationAnchor
                  .toISOString()
            };
          }

          // 5. Visa fee bill:
          //    approved date + 90 days.
          if (
            stage.stage_name ===
              "Visa bill issued" &&
            approvalAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  approvalAnchor,
                  90
                ).toISOString(),
              timing_rule:
                "Case approval date + 90 days",
              timing_anchor:
                approvalAnchor
                  .toISOString()
            };
          }

          // 6. Fee bill paid:
          //    fee bill received date + 30 days.
          if (
            stage.stage_name ===
              "Visa bill paid" &&
            visaBillReceivedAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  visaBillReceivedAnchor,
                  30
                ).toISOString(),
              timing_rule:
                "Visa fee bill received date + 30 days",
              timing_anchor:
                visaBillReceivedAnchor
                  .toISOString()
            };
          }

          // 7. DS-260 / civil documents submitted:
          //    fee bill paid date + 30 days.
          if (
            stage.stage_name ===
              "DS-260 / Civil Document Submission" &&
            visaFeePaidAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  visaFeePaidAnchor,
                  30
                ).toISOString(),
              timing_rule:
                "Visa fee bill paid date + 30 days",
              timing_anchor:
                visaFeePaidAnchor
                  .toISOString()
            };
          }

          // 8. Documentarily Qualified / All Clear:
          //    civil documents submitted date + 60 days.
          if (
            stage.stage_name ===
              "Documentarily Qualified" &&
            civilDocsSubmittedAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  civilDocsSubmittedAnchor,
                  60
                ).toISOString(),
              timing_rule:
                "DS-260 / civil documents submitted date + 60 days",
              timing_anchor:
                civilDocsSubmittedAnchor
                  .toISOString()
            };
          }

          // 9. Immigration to Deployment Transition Call:
          //    All Clear date + 60 days.
          if (
            stage.stage_name ===
              "Immigration to Deployment Transition Call" &&
            allClearAnchor
          ) {
            return {
              ...stage,
              target_date:
                addDays(
                  allClearAnchor,
                  60
                ).toISOString(),
              timing_rule:
                "All Clear date + 60 days",
              timing_anchor:
                allClearAnchor
                  .toISOString(),
              candidate_notice:
                "Before this transition call, ICP must confirm active bedside employment, licensure status, academic course status, and other deployment-readiness requirements."
            };
          }

          return stage;
        });

      if (
        canonicalHiringCompletedStages
          .size > 0 ||
        canonicalHiringCurrentStage
      ) {
        allStages =
          allStages.map(stage => {
            if (
              stage.stage_category !==
              "Hiring"
            ) {
              return stage;
            }

            if (
              canonicalHiringCompletedStages
                .has(
                  stage.stage_name
                )
            ) {
              return {
                ...stage,
                status:
                  "Completed",
                completed:
                  true,
                is_completed:
                  true,
                completed_date:
                  stage.completed_date ||
                  format(
                    new Date(),
                    "yyyy-MM-dd"
                  ),
                synced_from_application_status:
                  true,
                recruit_application_status:
                  recruitApplicationStatus
              };
            }

            if (
              canonicalHiringCurrentStage ===
              stage.stage_name
            ) {
              return {
                ...stage,
                status:
                  "In Progress",
                completed:
                  false,
                is_completed:
                  false,
                completed_date:
                  null,
                synced_from_application_status:
                  true,
                recruit_application_status:
                  recruitApplicationStatus
              };
            }

            return stage;
          });
      }

      const liveTransferSelected =
        isTransferToICPUSRNStatus(
          recruitApplicationStatus
        );

      const verifiedSavedTransfer =
        saved.some(stage => {
          if (
            stage.stage_name !==
            "Transfer to ICP USRN School"
          ) {
            return false;
          }

          const status =
            String(
              stage.status ||
              ""
            )
              .trim()
              .toLowerCase();

          return (
            isPipelineStageComplete(
              stage
            ) ||
            [
              "in progress",
              "in-progress",
              "active"
            ].includes(
              status
            ) ||
            stage.nclex_eligible ===
              true ||
            stage.nclex_branch_visible ===
              true ||
            stage.transfer_status_verified ===
              true
          );
        });

      const verifiedSavedNCLEXHistory =
        saved.some(
          stage =>
            ICP_USRN_SUBPROCESS_CONFIG.some(
              item =>
                item.name ===
                stage?.stage_name
            ) &&
            (
              isPipelineStageComplete(
                stage
              ) ||
              [
                "in progress",
                "in-progress"
              ].includes(
                String(
                  stage?.status ||
                  ""
                )
                  .trim()
                  .toLowerCase()
              )
            )
        );

      const transferToICPUSRN =
        liveTransferSelected ||
        verifiedSavedTransfer ||
        verifiedSavedNCLEXHistory;

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
              completed:
                true,
              is_completed:
                true,
              nclex_eligible:
                true,
              nclex_branch_visible:
                true,
              transfer_status_verified:
                true,
              completion_source:
                "recruit_transfer_status",
              completed_date:
                stage.completed_date ||
                savedByName.get(
                  stage.stage_name
                )?.completed_date ||
                (
                  stage.stage_name ===
                    "Transfer to ICP USRN School"
                    ? savedTransferStage?.completed_date
                    : null
                ) ||
                format(
                  new Date(),
                  "yyyy-MM-dd"
                ),
              synced_from_application_status: true,
              transfer_to_nclex_branch: true,
              recruit_application_status: recruitApplicationStatus
            };
          }

          return stage;
        });

        setShowNCLEX(true);
      } else {
        const savedTransferStage =
          savedByName.get("Transfer to ICP USRN School");
        const transferSavedStatus =
          String(
            savedTransferStage?.status ||
            ""
          )
            .trim()
            .toLowerCase();

        const transferWasPreviouslyReached =
          Boolean(
            savedTransferStage
          ) &&
          (
            isPipelineStageComplete(
              savedTransferStage
            ) ||
            [
              "in progress",
              "in-progress",
              "active"
            ].includes(
              transferSavedStatus
            ) ||
            savedTransferStage
              ?.nclex_eligible ===
              true ||
            savedTransferStage
              ?.nclex_branch_visible ===
              true ||
            savedTransferStage
              ?.transfer_status_verified ===
              true
          );

        if (
          recruitSnapshotLoaded &&
          recruitApplicationStatus &&
          !transferWasPreviouslyReached
        ) {
          allStages = allStages.filter(
            stage =>
              stage.stage_name !==
              "Transfer to ICP USRN School"
          );
        }

        const normalizedHiringStatus =
          normalizeApplicationStatus(recruitApplicationStatus);
        const hiringProgress =
          HIRING_STATUS_PROGRESS[normalizedHiringStatus] || null;
        const mappedHiringStage =
          getMappedHiringStage(
            recruitApplicationStatus
          );
        const effectiveQualificationOutcome =
          getEffectiveQualificationOutcome(
            recruitApplicationStatus
          );

        if (
          recruitApplicationStatus &&
          (
            hiringProgress ||
            mappedHiringStage === "Not Qualified - to close"
          )
        ) {
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

      const hiringStagesToPersist = allStages
        .filter(stage =>
          stage.stage_category === "Hiring" &&
          stage.synced_from_application_status === true &&
          ["Completed", "In Progress"].includes(stage.status)
        );

      if (token && hiringStagesToPersist.length > 0) {
        await Promise.allSettled(
          hiringStagesToPersist.map(stage =>
            fetch(`${API_BASE}/api/pipeline/update-stage`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: user.email,
                stage_name: stage.stage_name,
                status: stage.status,
                completed_date:
                  stage.status === "Completed"
                    ? (
                        stage.completed_date ||
                        new Date().toISOString()
                      )
                    : null
              })
            })
          )
        );
      }

      // Every CRM/Recruit-controlled stage is recalculated from the current
      // source field on each refresh. A checked source revives a previously
      // lost stage; clearing the source reverts an adaptive stage.
      const sourceFieldValues = {
        ...icpUSRNData,
        ...deploymentFieldStatus,
        ...directFieldStatus
      };

      const directStageUpdates = [];

      allStages = allStages.map(stage => {
        const rule =
          DEPLOYMENT_CRM_STAGE_RULES[
            stage.stage_name
          ];

        const backendStageStatus =
          directComputedStageStatus?.[stage.stage_name];

        const backendEvaluated =
          backendStageStatus?.evaluated === true;

        // Lead Management Status is the authoritative, reversible trigger for
        // Transfer to ICP USRN School. When selected, the Hiring row crosses off
        // immediately and the NCLEX mini-pipeline becomes visible. Clearing/changing
        // the trigger reverses this row on the next live sync.
        if (stage.stage_name === "Transfer to ICP USRN School") {
          const liveLeadManagementStatus =
            directFieldStatus?.Application_Status ??
            applicationStatus;

          const transferComplete =
            backendEvaluated &&
            typeof backendStageStatus?.completed === "boolean"
              ? backendStageStatus.completed === true
              : isTransferToICPUSRNStatus(
                  unwrapPipelineFieldValue(liveLeadManagementStatus)
                );

          return {
            ...stage,
            status: transferComplete ? "Completed" : "Not Started",
            completed: transferComplete,
            is_completed: transferComplete,
            completed_date: transferComplete
              ? (stage.completed_date || new Date().toISOString())
              : null,
            source_trigger_unlocked: transferComplete,
            trigger_unlocked: transferComplete,
            recruit_unlocked: transferComplete,
            synced_from_application_status: true
          };
        }

        // The backend field-status endpoint evaluates all CRM/Recruit mapped
        // stages, including the three Foundations rows. Apply that result even
        // when this frontend has no local modal rule for the stage. This is the
        // key reversible source-of-truth path: filled => crossed off; cleared =>
        // Not Started again.
        if (!rule && backendEvaluated && typeof backendStageStatus?.completed === "boolean") {
          const backendComplete = backendStageStatus.completed === true;
          const backendInProgress = String(backendStageStatus.status || "").trim().toLowerCase() === "in progress";
          return {
            ...stage,
            status: backendComplete ? "Completed" : backendInProgress ? "In Progress" : "Not Started",
            completed: backendComplete,
            is_completed: backendComplete,
            completed_date: backendComplete
              ? (backendStageStatus.completed_date || stage.completed_date || new Date().toISOString())
              : null,
            source_trigger_unlocked: backendComplete || backendInProgress,
            trigger_unlocked: backendComplete || backendInProgress,
            crm_unlocked: backendComplete || backendInProgress,
            source_trigger_synced: true,
            source_trigger_fields: backendStageStatus.source_fields || stage.source_trigger_fields || []
          };
        }

        if (!rule) {
          return stage;
        }

        const value = rule.fields
          ? Object.fromEntries(
              rule.fields.map(field => [
                field,
                getLivePipelineFieldValue(sourceFieldValues, field)
              ])
            )
          : getLivePipelineFieldValue(
              sourceFieldValues,
              rule.fieldsAny || rule.field
            );

        // field-status is computed from the same authenticated candidate CRM /
        // Recruit records on the backend. Prefer its boolean result when it has
        // evaluated this exact visible stage; otherwise evaluate the raw field
        // locally. This keeps Dashboard and My Pipeline crossed-off state equal.
        const completed =
          backendEvaluated &&
          typeof backendStageStatus?.completed === "boolean"
            ? backendStageStatus.completed
            : rule.complete?.(value) === true;

        const sourceInProgress =
          !completed &&
          (
            rule.inProgress?.(value) === true ||
            rule.allowContinue?.(value) === true ||
            (backendEvaluated &&
              String(backendStageStatus?.status || "")
                .trim()
                .toLowerCase() === "in progress")
          );

        const nextStatus = completed
          ? "Completed"
          : sourceInProgress
            ? "In Progress"
            : "Not Started";

        const currentCompleted =
          isPipelineStageComplete(stage);
        const changed =
          stage.status !== nextStatus ||
          currentCompleted !== completed;

        const completionDate = completed
          ? (
              stage.completed_date ||
              format(
                new Date(),
                "yyyy-MM-dd"
              )
            )
          : null;

        if (changed) {
          directStageUpdates.push({
            stage_name:
              stage.stage_name,
            status:
              nextStatus,
            completed_date:
              completionDate
          });
        }

        return {
          ...stage,
          crm_field_label:
            rule.label ||
            stage.stage_name,
          crm_field_value:
            value,
          synced_from_live_source:
            true,
          source_trigger_synced:
            true,
          source_trigger_unlocked:
            completed || sourceInProgress,
          trigger_unlocked:
            completed || sourceInProgress,
          crm_unlocked:
            completed || sourceInProgress,
          status:
            nextStatus,
          completed:
            completed,
          is_completed:
            completed,
          completed_date:
            completionDate
        };
      });

      // Mandatory Pre-Interview Coaching Call is controlled ONLY by
      // Recruit Candidates.Attended_Pre_Interview_Call.
      const attendedPreInterviewCall =
        sourceFieldValues
          .Attended_Pre_Interview_Call ??
        directFieldStatus
          .Attended_Pre_Interview_Call ??
        null;

      const backendPreInterviewStatus =
        directComputedStageStatus[
          "Mandatory Pre-Interview Coaching Call"
        ];

      const normalizeRecruitBoolean =
        value => {
          if (
            value === true ||
            value === 1
          ) {
            return true;
          }

          if (
            value === false ||
            value === 0 ||
            value === null ||
            value === undefined
          ) {
            return false;
          }

          if (
            typeof value ===
            "object"
          ) {
            return normalizeRecruitBoolean(
              value.checked ??
              value.selected ??
              value.value ??
              value.display_value ??
              false
            );
          }

          return [
            "true",
            "1",
            "yes",
            "checked",
            "selected",
            "on"
          ].includes(
            String(value)
              .trim()
              .toLowerCase()
          );
        };

      const preInterviewCallComplete =
        typeof backendPreInterviewStatus
          ?.completed === "boolean"
          ? backendPreInterviewStatus
              .completed
          : normalizeRecruitBoolean(
              attendedPreInterviewCall
            );

      allStages =
        allStages.map(stage => {
          if (
            stage.stage_name !==
            "Mandatory Pre-Interview Coaching Call"
          ) {
            return stage;
          }

          const nextStatus =
            preInterviewCallComplete
              ? "Completed"
              : "Not Started";

          const completionDate =
            preInterviewCallComplete
              ? (
                  stage.completed_date ||
                  savedByName.get(
                    stage.stage_name
                  )?.completed_date ||
                  format(
                    new Date(),
                    "yyyy-MM-dd"
                  )
                )
              : null;

          if (
            backendPreInterviewStatus ||
            attendedPreInterviewCall !==
              null
          ) {
            directStageUpdates.push({
              stage_name:
                stage.stage_name,
              status:
                nextStatus,
              completed_date:
                completionDate
            });
          }

          return {
            ...stage,
            status:
              nextStatus,
            completed:
              preInterviewCallComplete,
            is_completed:
              preInterviewCallComplete,
            completed_date:
              completionDate,
            recruit_field_label:
              "Attended Pre-Interview Call",
            recruit_boolean_field:
              "Attended_Pre_Interview_Call",
            recruit_boolean_value:
              attendedPreInterviewCall,
            synced_from_recruit_candidate_fields: [
              "Attended_Pre_Interview_Call"
            ]
          };
        });

      // Documents Received is controlled ONLY by Recruit Candidates.All_docs_on_file.
      // Library uploads and the old Proof_of_NCLEX/Birth_Certificate fields must
      // never complete this Hiring stage.
      const allDocsOnFile =
        sourceFieldValues.All_docs_on_file ??
        sourceFieldValues.All_Docs_on_File ??
        directFieldStatus.All_docs_on_file ??
        null;

      const backendDocumentsStatus =
        directComputedStageStatus[
          "Documents Received"
        ];

      const savedDocumentsStage =
        savedByName.get(
          "Documents Received"
        );

      const documentsReceivedComplete =
        typeof backendDocumentsStatus
          ?.completed === "boolean"
          ? backendDocumentsStatus.completed
          : normalizeRecruitBoolean(
              allDocsOnFile
            );

      allStages = allStages.map(stage => {
        if (
          stage.stage_name !==
          "Documents Received"
        ) {
          return stage;
        }

        const nextStatus =
          documentsReceivedComplete
            ? "Completed"
            : "Not Started";

        const completionDate =
          documentsReceivedComplete
            ? (
                stage.completed_date ||
                savedDocumentsStage
                  ?.completed_date ||
                format(
                  new Date(),
                  "yyyy-MM-dd"
                )
              )
            : null;

        if (
          backendDocumentsStatus ||
          allDocsOnFile !== null
        ) {
          directStageUpdates.push({
            stage_name:
              stage.stage_name,
            status:
              nextStatus,
            completed_date:
              completionDate
          });
        }

        return {
          ...stage,
          status:
            nextStatus,
          completed:
            documentsReceivedComplete,
          is_completed:
            documentsReceivedComplete,
          completed_date:
            completionDate,
          recruit_field_label:
            "All docs on file",
          recruit_text_field_values: {
            All_docs_on_file:
              allDocsOnFile
          },
          recruit_trigger_field_types: {
            All_docs_on_file:
              "boolean"
          },
          synced_from_recruit_candidate_fields:
            [
              "All_docs_on_file"
            ]
        };
      });

      if (
        token &&
        directStageUpdates.length > 0
      ) {
        const latestByStage =
          Array.from(
            new Map(
              directStageUpdates.map(item => [
                item.stage_name,
                item
              ])
            ).values()
          );

        await Promise.allSettled(
          latestByStage.map(item =>
            fetch(
              `${API_BASE}/api/pipeline/update-stage`,
              {
                method: "POST",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  "Content-Type":
                    "application/json"
                },
                body: JSON.stringify({
                  email:
                    user.email,
                  stage_name:
                    item.stage_name,
                  status:
                    item.status,
                  completed_date:
                    item.completed_date
                })
              }
            )
          )
        );
      }

      if (token && transferToICPUSRN) {
        await Promise.allSettled(
          ["Applied", "Associated with Job", "Qualified - Match", "Transfer to ICP USRN School"].map(
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

      if (transferToICPUSRN || showNCLEX) {
        const nclexStages = NCLEX_STAGES.map(stage => {
          const savedStage = savedByName.get(stage.stage_name);
          const triggerIndex = ICP_USRN_SUBPROCESS_CONFIG.findIndex(item => item.name === stage.stage_name);
          const trigger = triggerIndex >= 0 ? ICP_USRN_SUBPROCESS_CONFIG[triggerIndex] : null;
          const crmCompleted = trigger
            ? isICPUSRNItemComplete(trigger, icpUSRNData)
            : false;
          const crmUnlocked = trigger
            ? isICPUSRNItemUnlocked(trigger, triggerIndex, icpUSRNData)
            : false;
          const fixedNCLEXTarget =
            validStart &&
            trigger
              ? addDays(
                  validStart,
                  Number(
                    trigger.days ||
                    0
                  )
                )
              : null;

          return {
            ...stage,
            ...savedStage,
            candidate_email: user.email,
            days_from_start:
              trigger?.days ??
              stage.days_from_start,
            target_date:
              fixedNCLEXTarget
                ? fixedNCLEXTarget.toISOString()
                : (
                    savedStage?.target_date ||
                    stage.target_date ||
                    null
                  ),
            timing_rule:
              trigger
                ? `Due by day ${trigger.days} from Day 1.`
                : (
                    savedStage?.timing_rule ||
                    stage.timing_rule ||
                    null
                  ),
            timing_source:
              fixedNCLEXTarget
                ? "nclex_day_1_fixed"
                : (
                    savedStage?.timing_source ||
                    stage.timing_source ||
                    null
                  ),
            status: crmCompleted
              ? "Completed"
              : crmUnlocked
                ? "In Progress"
                : (savedStage?.status || "Not Started"),
            completed_date: crmCompleted ? (savedStage?.completed_date || format(new Date(), "yyyy-MM-dd")) : (savedStage?.completed_date || null),
            synced_from_custom_module_1: crmCompleted,
            nclex_unlocked: crmUnlocked,
            source_trigger_unlocked: crmUnlocked,
            trigger_unlocked: crmUnlocked,
            source_trigger_gate: trigger?.performanceGate || null,
            stage_details: NCLEX_STAGE_DETAILS[stage.stage_name] || null
          };
        });
        allStages = [...allStages, ...nclexStages];

        const nclexExamPassed =
          normalizeCRMValue(
            icpUSRNData?.NCLEX_Status
          ) ===
          "passed";

        if (
          nclexExamPassed &&
          validStart
        ) {
          const returnTarget =
            addDays(
              validStart,
              215
            );

          allStages =
            allStages.map(stage =>
              stage.stage_name ===
                "Select Prescreen Time" &&
              !isPipelineStageComplete(
                stage
              )
                ? {
                    ...stage,
                    target_date:
                      returnTarget.toISOString(),
                    timing_rule:
                      "Return to Select Prescreen Time by day 215 from Day 1 after completing NCLEX.",
                    timing_source:
                      "nclex_return_to_hiring"
                  }
                : stage
            );
        }

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
        const locallyCompletedCount =
          Object.values(
            checklistResults
          ).filter(Boolean).length;

        const backendChecklistStatus =
          directComputedStageStatus[
            stage.stage_name
          ];

        const allComplete =
          typeof backendChecklistStatus
            ?.completed === "boolean"
            ? backendChecklistStatus
                .completed
            : (
                locallyCompletedCount ===
                checklist.length
              );

        const completedCount =
          backendChecklistStatus
            ?.checklist_completed ??
          locallyCompletedCount;

        const completedDate =
          allComplete
            ? (
                backendChecklistStatus
                  ?.completed_date ||
                stage.completed_date ||
                savedByName.get(
                  stage.stage_name
                )?.completed_date ||
                format(
                  new Date(),
                  "yyyy-MM-dd"
                )
              )
            : null;

        if (
          allComplete &&
          stage.status !==
            "Completed"
        ) {
          crmDrivenImmigrationUpdates.push({
            stage_name:
              stage.stage_name,
            completed_date:
              completedDate
          });
        }

        return {
          ...stage,
          crm_checklist:
            checklistResults,
          crm_checklist_completed:
            completedCount,
          crm_checklist_total:
            backendChecklistStatus
              ?.checklist_total ??
            checklist.length,
          status:
            allComplete
              ? "Completed"
              : "Not Started",
          completed:
            allComplete,
          is_completed:
            allComplete,
          completed_date:
            completedDate,
          synced_from_crm_checklist:
            true
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

      allStages = applyVisibleFlowAliases(allStages);

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
          !Number.isNaN(
            stageArrivalDate.getTime()
          ) &&
          isArrivalCalendarDateTodayOrPast(
            stage.aftercare_gate_date ||
            stage.aftercareGateDate ||
            stageArrivalDate.toISOString()
          );

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

      allStages = allStages.map(stage =>
        stage.stage_name ===
          "Transfer to ICP USRN School"
          ? {
              ...stage,
              nclex_saved_progress:
                savedNCLEXProgress,
              nclex_branch_visible:
                transferToICPUSRN ||
                savedTransferReached
            }
          : stage
      );

      allStages =
        restoreForwardOnlyHiringStages({
          stages:
            allStages,
          savedByName,
          applicationStatus:
            recruitApplicationStatus
        });

      // Final Hiring safeguard: Recruit module presence is a separate trigger
      // from Application_Status. Never let a later "Applied" status pass erase
      // an Associated completion that was proven by Applications + Candidates.
      const normalizedFinalHiringStatus = normalizeApplicationStatus(recruitApplicationStatus);
      const finalStatusPastApplied = Boolean(
        normalizedFinalHiringStatus &&
        normalizedFinalHiringStatus !== "new candidate" &&
        normalizedFinalHiringStatus !== "applied"
      );

      if (
        (
          applicationsFound === true &&
          (candidatesFound === true || canonicalApplicationCandidateLinkVerified)
        ) ||
        finalStatusPastApplied
      ) {
        allStages =
          allStages.map(
            stage =>
              stage.stage_name ===
                "Associated with Job"
                ? {
                    ...stage,
                    status:
                      "Completed",
                    completed:
                      true,
                    is_completed:
                      true,
                    completed_date:
                      stage.completed_date ||
                      savedByName.get(
                        "Associated with Job"
                      )?.completed_date ||
                      new Date()
                        .toISOString(),
                    unlocked:
                      true,
                    is_locked:
                      false,
                    associated_with_job_verified:
                      true,
                    completion_source:
                      stage.completion_source ||
                      "recruit_module_email_presence"
                  }
                : stage
          );
      }

      // Restore every section from pipelinestages. A saved Completed record
      // with a completion date is authoritative unless a live adaptive trigger
      // was successfully evaluated during this refresh.
      allStages = allStages.map(stage => {
        const savedStage =
          savedByName.get(
            stage.stage_name
          );

        const triggerStatus =
          directComputedStageStatus[
            stage.stage_name
          ];

        const triggerWasEvaluated =
          triggerStatus?.evaluated ===
          true;

        if (
          ADAPTIVE_TRIGGER_STAGE_NAMES.has(
            stage.stage_name
          ) &&
          triggerWasEvaluated
        ) {
          const complete =
            triggerStatus.completed ===
            true;

          return {
            ...stage,
            status:
              complete
                ? "Completed"
                : (
                    triggerStatus.status ||
                    "Not Started"
                  ),
            completed:
              complete,
            is_completed:
              complete,
            completed_date:
              complete
                ? (
                    triggerStatus
                      .completed_date ||
                    savedStage
                      ?.completed_date ||
                    savedStage
                      ?.completed_at ||
                    new Date()
                      .toISOString()
                  )
                : null,
            unlocked:
              complete
                ? true
                : stage.unlocked,
            is_locked:
              complete
                ? false
                : stage.is_locked,
            restored_from_live_trigger:
              true
          };
        }

        if (
          isStrictSavedCompleted(
            savedStage
          )
        ) {
          return {
            ...stage,
            ...savedStage,
            status:
              "Completed",
            completed:
              true,
            is_completed:
              true,
            completed_date:
              savedStage
                .completed_date ||
              savedStage
                .completed_at,
            unlocked:
              true,
            is_locked:
              false,
            restored_from_pipelinestages:
              true
          };
        }

        if (
          isStrictSavedInProgress(
            savedStage
          )
        ) {
          return {
            ...stage,
            ...savedStage,
            status:
              "In Progress",
            completed:
              false,
            is_completed:
              false,
            completed_date:
              null,
            unlocked:
              true,
            is_locked:
              false,
            restored_from_pipelinestages:
              true
          };
        }

        return stage;
      });

      setStages(
        preservePermanentSelectPrescreenInStages(
          sanitizePipelineStages(
            allStages,
            user.email
          ),
          user.email
        )
      );
      const persistedStageNames = new Set(
        saved
          .filter(stage => stage?.is_deleted !== true)
          .map(stage => stage?.stage_name)
          .filter(Boolean)
      );

      // NCLEX rows are auxiliary subprocess stages and are persisted by their
      // own CRM synchronization. The main configured flow is what Admin uses
      // for its summary and what `/pipeline/initialize` writes.
      const isFullPipelinePersisted = STAGES_CONFIG
        .every(stage => persistedStageNames.has(stage.stage_name));

      if (
        savedPipelineLoadedSuccessfully &&
        !isFullPipelinePersisted
      ) {
        // A Recruit/CRM checkpoint is precisely when a candidate needs the
        // full pipeline persisted. A Recruit lookup can save only Applied or
        // Associated with Job before this point, so checking merely for an
        // empty collection still leaves an incomplete Admin summary. Persist
        // every missing visible stage, preserving all CRM/Recruit completions.
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
          !Number.isNaN(
            parsedArrival.getTime()
          ) &&
          isArrivalCalendarDateTodayOrPast(
            responseArrivalDate
          );

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

      setStages(previous => {
        const combined = [
          ...(Array.isArray(previous) ? previous : []),
          ...parsed
        ];
        const sanitized =
          sanitizePipelineStages(
            combined,
            user.email
          );

        return sanitized.map(stage => {
          const fixedTarget =
            pipelineStartDate
              ? getFixedDayOneStageTarget(
                  stage,
                  pipelineStartDate
                )
              : null;

          return fixedTarget
            ? {
                ...stage,
                target_date:
                  fixedTarget.toISOString(),
                timing_source:
                  stage.timing_source ===
                    "nclex_return_to_hiring"
                    ? stage.timing_source
                    : (
                        stage.nclex_stage ===
                          true
                          ? "nclex_day_1_fixed"
                          : "hiring_day_1_fixed"
                      )
              }
            : stage;
        });
      });
      setIsInitialized(parsed.length > 0);
    } catch (error) {
      console.error(
        "Error loading pipeline from database:",
        error
      );

      setStages(previous =>
        preservePermanentSelectPrescreenInStages(
          Array.isArray(previous)
            ? previous
            : [],
          user?.email ||
          ""
        )
      );
    }
  };

  const handleInitialize = async () => {
    if (!user?.email) return toast.error("User email not found");
    if (stages.length > 0) { await loadStages(); toast.success("Existing pipeline restored from the database."); return; }
    setIsLoading(true);
    try {
      let allStages = STAGES_CONFIG.map(stage => ({ ...stage, candidate_email: user.email, status: "Not Started", completed_date: null, notes: null, target_date: null, stage_details: stage.stage_category === "Immigration" ? IMMIGRATION_STAGE_DETAILS[stage.stage_name] || null : null }));
      // ICP USRN milestones are rendered as subprocess items under
      // Transfer to ICP USRN School and are not additional main pipeline stages.
      const token = localStorage.getItem("icp_auth_token");
      const response = await fetch(`${API_BASE}/api/pipeline/initialize`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, stages: allStages }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pipeline initialization failed");
      setStages(sanitizePipelineStages(data.stages || allStages, user.email));
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

    if (
      searchParams.get("form") ||
      searchParams.get("stage")
    ) {
      setSearchParams(
        {},
        {
          replace: true
        }
      );
    }
  };

  useEffect(() => {
    if (
      !isInitialized ||
      isLoading ||
      modalState.isOpen
    ) {
      return;
    }

    const requestedForm =
      String(
        searchParams.get("form") ||
        ""
      )
        .trim()
        .toLowerCase();

    const requestedStage =
      String(
        searchParams.get("stage") ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      requestedForm ===
      "hub"
    ) {
      openModal(
        "Forms",
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Open and complete your required candidate forms.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                key: "behavioral",
                title: "Behavioral Assessment",
                description:
                  "Complete your behavioral assessment.",
                icon: ClipboardList
              },
              {
                key: "housing",
                title: "Housing & Transportation Call",
                description:
                  "Complete your housing and transportation form.",
                icon: Home
              }
            ].map(item => {
              const Icon =
                item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setModalState({
                      isOpen: false,
                      type: null,
                      title: null,
                      component: null
                    });

                    setSearchParams(
                      {
                        form:
                          item.key
                      },
                      {
                        replace:
                          true
                      }
                    );
                  }}
                  className="rounded-xl border bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );

      return;
    }

    if (
      requestedForm ===
      "behavioral"
    ) {
      openModal(
        "Behavioral Assessment",
        <BehavioralAssessmentForm
          onClose={closeModal}
          user={user}
        />
      );

      return;
    }

    if (
      requestedForm ===
      "housing"
    ) {
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

    if (
      requestedStage ===
      "welcome-packet"
    ) {
      openModal(
        "ICP Welcome Packet",
        <WelcomePacketView
          onClose={closeModal}
          user={user}
          setStages={setStages}
          setDeploymentFieldStatus={setDeploymentFieldStatus}
        />
      );
    }
  }, [
    isInitialized,
    isLoading,
    searchParams,
    modalState.isOpen,
    user?.email
  ]);

  const cycleStatus = async (stageId) => {
    const order = ["Not Started", "In Progress", "Completed", "Blocked"];
    const stage = stages.find(item => item.id === stageId || item._id === stageId);
    if (!stage) return;
    const nextStatus = order[(order.indexOf(stage.status) + 1) % order.length];
    const saved = await updateStageStatus(user.email, stage.stage_name, setStages, nextStatus);
    if (saved) toast.success(`${stage.stage_name} marked as ${nextStatus}`);
  };

  const getRiskStatus = (stage) => {
    if (!stage) {
      return null;
    }

    if (
      isPipelineStageComplete(
        stage
      )
    ) {
      return null;
    }

    const backendTimingStatus =
      String(
        stage.timing_status ||
        stage.timingStatus ||
        ""
      ).trim();

    if (
      [
        "At Risk",
        "Late"
      ].includes(
        backendTimingStatus
      )
    ) {
      return backendTimingStatus;
    }

    // The backend owns the sequential clock. Every screen must use the exact
    // saved target_date so Dashboard and Pipeline cannot count from different
    // dates. Legacy calculations are used only if an old row has no target.
    const storedTarget =
      stage.target_date ||
      stage.targetDate ||
      null;

    if (storedTarget) {
      const deadline =
        new Date(
          storedTarget
        );

      if (
        !Number.isNaN(
          deadline.getTime()
        )
      ) {
        const hoursRemaining =
          (
            deadline.getTime() -
            Date.now()
          ) /
          (
            1000 *
            60 *
            60
          );

        if (
          hoursRemaining <
          0
        ) {
          return "Late";
        }

        if (
          hoursRemaining <=
          24
        ) {
          return "At Risk";
        }

        return "Good Standing";
      }
    }

    // Old database rows created before target_date existed are the only rows
    // allowed to use these compatibility calculations.
    if (
      stage.stage_name ===
      "Immigration Call"
    ) {
      const hiredStage =
        stages.find(
          item =>
            item.stage_name ===
            "Hired"
        );

      if (
        !hiredStage
          ?.completed_date
      ) {
        return null;
      }

      const hiredDate =
        new Date(
          hiredStage.completed_date
        );

      if (
        Number.isNaN(
          hiredDate.getTime()
        )
      ) {
        return null;
      }

      const deadline =
        addDays(
          hiredDate,
          30
        );

      const hoursRemaining =
        (
          deadline.getTime() -
          Date.now()
        ) /
        (
          1000 *
          60 *
          60
        );

      if (
        hoursRemaining <
        0
      ) {
        return "Late";
      }

      if (
        hoursRemaining <=
        24
      ) {
        return "At Risk";
      }

      return "Good Standing";
    }

    return (
      stage.timing_status ||
      null
    );
  };

  const isStageClickable = (stageName) => {
    return CLICKABLE_STAGES[stageName]?.clickable || false;
  };

  const getStageAction = (stageName) => {
    return CLICKABLE_STAGES[stageName] || null;
  };

  const shouldCompleteInformationalStageOnView = (stage) => {
    if (!stage || isPipelineStageComplete(stage)) return false;
    if (stage.stage_category === "Aftercare") return false;
    if (stage.nclex_subprocess) return false;
    if (stage.admin_only_completion || stage.candidate_read_only) return false;
    if (deploymentFieldStatus?.__stageStatus?.[stage.stage_name]?.evaluated === true) return false;

    const action = CLICKABLE_STAGES[stage.stage_name];
    return action?.clickable === true && action?.type === "view";
  };

  const handleStageClick = async (stage) => {
    if (
      stage?.stage_name ===
        SELECT_PRESCREEN_STAGE &&
      (
        hasPermanentSelectPrescreenCompletion(
          user?.email ||
          stage.candidate_email ||
          ""
        ) ||
        isPipelineStageComplete(
          stage
        )
      )
    ) {
      return;
    }

    const stageUnlocked =
      isStageUnlocked(
        stage,
        displayStages
      );

    if (
      !stageUnlocked &&
      !isPipelineStageComplete(
        stage
      )
    ) {
      toast.info(
        "This stage is locked. Complete the previous stage or satisfy this stage's CRM/Recruit gate."
      );
      return;
    }

    const normalizedStageName = String(
      stage?.stage_name || ""
    )
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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

    if (IMMIGRATION_CRM_CHECKLISTS[stage.stage_name]) {
      openModal(
        stage.stage_name,
        <ImmigrationCRMChecklistView
          stageName={stage.stage_name}
          onClose={closeModal}
          user={user}
          setStages={setStages}
          stages={stages}
        />
      );
      return;
    }

    const candidateActionStages = new Set([
      "Welcome Packet",
      "Receipt Submission",
      "Relocation Follow up",
      "US Integration Check-in",
      "Year One Anniversary Check-in"
    ]);

    // CRM-only stages are display/status rows, not candidate actions.
    // They cross off automatically from CRM. Foundations are handled above.
    if (
      DEPLOYMENT_CRM_STAGE_RULES[stage.stage_name] &&
      !candidateActionStages.has(stage.stage_name)
    ) {
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
      
      if (
        stage.nclex_subprocess === true &&
        [
          "Program Prescreen",
          "Credential Evaluation Set-up",
          "Select Meeting Time"
        ].includes(stage.stage_name)
      ) {
        window.open(
          PRESCREEN_BOOKING_URL,
          "_blank",
          "noopener,noreferrer"
        );

        if (
          stage.stage_name ===
          "Select Meeting Time"
        ) {
          const completedAt =
            new Date()
              .toISOString();

          // The click itself is the completion trigger. Update the NCLEX box
          // immediately, then persist the completion to the backend.
          setStages(previous => {
            const exists =
              previous.some(
                item =>
                  item.stage_name ===
                  "Select Meeting Time"
              );

            if (exists) {
              return previous.map(item =>
                item.stage_name ===
                  "Select Meeting Time"
                  ? {
                      ...item,
                      status:
                        "Completed",
                      completed:
                        true,
                      is_completed:
                        true,
                      completed_date:
                        completedAt,
                      unlocked:
                        true,
                      is_unlocked:
                        true,
                      is_locked:
                        false,
                      access_locked:
                        false,
                      source_trigger_unlocked:
                        true,
                      trigger_unlocked:
                        true
                    }
                  : item
              );
            }

            return [
              ...previous,
              {
                stage_name:
                  "Select Meeting Time",
                stage_category:
                  "NCLEX Program",
                stage_order:
                  6.105,
                status:
                  "Completed",
                completed:
                  true,
                is_completed:
                  true,
                completed_date:
                  completedAt,
                unlocked:
                  true,
                is_unlocked:
                  true,
                is_locked:
                  false,
                access_locked:
                  false,
                source_trigger_unlocked:
                  true,
                trigger_unlocked:
                  true,
                nclex_stage:
                  true,
                non_counted_section:
                  true
              }
            ];
          });

          setDeploymentFieldStatus(previous => ({
            ...previous,
            __stageStatus: {
              ...(previous?.__stageStatus || {}),
              "Select Meeting Time": {
                ...(previous?.__stageStatus?.["Select Meeting Time"] || {}),
                evaluated:
                  true,
                completed:
                  true,
                unlocked:
                  true,
                status:
                  "Completed",
                completed_date:
                  completedAt
              }
            }
          }));

          window.dispatchEvent(
            new CustomEvent(
              "pipeline-updated",
              {
                detail: {
                  stageName:
                    "Select Meeting Time",
                  source:
                    "nclex-meeting-click"
                }
              }
            )
          );

          try {
            const token =
              localStorage.getItem(
                "icp_auth_token"
              );

            if (token) {
              const response =
                await fetch(
                  `${API_BASE}/api/pipeline/update-stage`,
                  {
                    method: "POST",
                    headers: {
                      Authorization:
                        `Bearer ${token}`,
                      "Content-Type":
                        "application/json"
                    },
                    body:
                      JSON.stringify({
                        stage_name:
                          "Select Meeting Time",
                        status:
                          "Completed",
                        completed_date:
                          completedAt
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
                  "Unable to save meeting selection."
                );
              }
            }
          } catch (error) {
            console.warn(
              "[NCLEX] Meeting selection could not be persisted:",
              error?.message ||
              error
            );
          }
        }

        toast.success(
          stage.stage_name ===
            "Select Meeting Time"
            ? "Meeting booking opened and this step was marked complete."
            : "Meeting booking opened. This step will complete when its existing Recruit trigger is met."
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

    if (
      action.type === "booking" &&
      action.bookingType === "prescreen"
    ) {
      window.open(
        PRESCREEN_BOOKING_URL,
        "_blank",
        "noopener,noreferrer"
      );

      if (
        stage.stage_name ===
        "Select Prescreen Time"
      ) {
        const completedAt =
          new Date()
            .toISOString();

        persistPermanentSelectPrescreenCompletion(
          user?.email ||
          stage.candidate_email ||
          ""
        );

        setStages(previous =>
          preservePermanentSelectPrescreenInStages(
            previous.map(item =>
              item.stage_name ===
                SELECT_PRESCREEN_STAGE
                ? {
                    ...item,
                    status:
                      "Completed",
                    completed:
                      true,
                    is_completed:
                      true,
                    completed_date:
                      item.completed_date ||
                      completedAt,
                    completed_at:
                      item.completed_at ||
                      completedAt,
                    candidate_click_completed:
                      true,
                    completion_source:
                      "candidate_click",
                    unlocked:
                      true,
                    is_unlocked:
                      true,
                    is_locked:
                      false,
                    access_locked:
                      false,
                    source_trigger_unlocked:
                      true,
                    trigger_unlocked:
                      true
                  }
                : item
            ),
            user?.email ||
            stage.candidate_email ||
            ""
          )
        );

        try {
          const token =
            localStorage.getItem(
              "icp_auth_token"
            );

          if (token) {
            const response =
              await fetch(
                `${API_BASE}/api/pipeline/update-stage`,
                {
                  method:
                    "POST",
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                    "Content-Type":
                      "application/json"
                  },
                  body:
                    JSON.stringify({
                      stage_name:
                        "Select Prescreen Time",
                      status:
                        "Completed",
                      completed_date:
                        completedAt
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
                "Unable to save the prescreen meeting selection."
              );
            }
          }


        } catch (error) {
          console.warn(
            "[Hiring] Prescreen meeting selection could not be persisted:",
            error?.message ||
            error
          );
        }
      }

      toast.success(
        stage.stage_name ===
          "Select Prescreen Time"
          ? "Prescreen booking opened and this step was marked complete."
          : "Click to select meeting time."
      );

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

    if (action.type === "external") {
      if (action.url) {
        window.open(action.url, "_blank", "noopener,noreferrer");
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
        case "reimbursement":
          openModal("Expense Report", <ReimbursementUpload onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "reimbursementExpenses": {
          if (
            stage.stage_name ===
              "Receipt Submission" &&
            !isPipelineStageComplete(
              stage
            )
          ) {
            try {
              const token =
                localStorage.getItem(
                  "icp_auth_token"
                );

              if (token) {
                const response =
                  await fetch(
                    `${API_BASE}/api/reimbursement/acknowledge-expense-report`,
                    {
                      method:
                        "POST",
                      cache:
                        "no-store",
                      headers: {
                        Authorization:
                          `Bearer ${token}`,
                        "Content-Type":
                          "application/json"
                      },
                      body:
                        JSON.stringify({
                          acknowledged:
                            true,
                          trigger:
                            "expense-report-section-click"
                        })
                    }
                  );

                const data =
                  await response
                    .json()
                    .catch(
                      () => ({})
                    );

                if (
                  response.ok &&
                  data.success ===
                    true
                ) {
                  setStages(
                    previous =>
                      applyOrderedLocksWithDeepEntry(
                        previous.map(
                          item =>
                            item.stage_name ===
                              "Receipt Submission"
                              ? {
                                  ...item,
                                  status:
                                    "Completed",
                                  completed:
                                    true,
                                  is_completed:
                                    true,
                                  completed_date:
                                    data.acknowledgedAt ||
                                    new Date()
                                      .toISOString(),
                                  completion_source:
                                    "candidate_expense_report_total_click",
                                  source_trigger_unlocked:
                                    true,
                                  trigger_unlocked:
                                    true,
                                  crm_unlocked:
                                    true
                                }
                              : item
                        )
                      )
                  );

                  window.dispatchEvent(
                    new CustomEvent(
                      "pipeline-updated",
                      {
                        detail: {
                          email:
                            user?.email,
                          stage_name:
                            "Receipt Submission",
                          status:
                            "Completed",
                          completed:
                            true,
                          source:
                            "candidate_expense_report_total_click"
                        }
                      }
                    )
                  );
                } else if (
                  response.status !==
                  400
                ) {
                  console.warn(
                    "[Expense Report] Section-click completion failed:",
                    data.error ||
                    response.status
                  );
                }
              }
            } catch (error) {
              console.warn(
                "[Expense Report] Section-click completion failed:",
                error?.message ||
                error
              );
            }
          }

          openModal(
            "Reimbursement/Expenses",
            <ReimbursementExpensesView
              onClose={closeModal}
              user={user}
              setStages={setStages}
            />
          );
          break;
        }
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
            <WelcomePacketView
              onClose={closeModal}
              user={user}
              setStages={setStages}
              setDeploymentFieldStatus={setDeploymentFieldStatus}
            />
          );
          break;
        case "aftercareCall":
          openModal(
            stage.stage_name,
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  This Aftercare milestone is scheduled from your Final Destination Arrival date.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your portal will keep this stage timed from your arrival date and preserve the saved completion state.
              </p>
            </div>
          );
          break;
        case "relocationSurvey":
          openModal("Relocation Follow up", <RelocationSurvey onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "thirtyDaySurvey":
          openModal("US Integration Check-in", <ThirtyDaySurvey onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "oneYearSurvey":
          openModal("Year One Anniversary Check-in", <OneYearSurvey onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "orientationStart":
          openModal("Submit Orientation Start Date", <OrientationStartView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "orientationEnd":
          openModal("Submit Start Date on Floor Independently", <OrientationEndView onClose={closeModal} user={user} setStages={setStages} />);
          break;
        case "foundationsPillars":
          openModal("Foundations: Pillars", <ImmigrationCRMChecklistView stageName="Foundations: Pillars" onClose={closeModal} user={user} setStages={setStages} stages={stages} />);
          break;
        case "endorsementDiscovery":
          openModal("Foundations: Endorsement Discovery", <ImmigrationCRMChecklistView stageName="Foundations: Endorsement Discovery" onClose={closeModal} user={user} setStages={setStages} stages={stages} />);
          break;
        case "culturalReadiness":
          openModal("Foundations: Cultural Readiness", <ImmigrationCRMChecklistView stageName="Foundations: Cultural Readiness" onClose={closeModal} user={user} setStages={setStages} stages={stages} />);
          break;
        case "introductionDeployment":
          openModal("Introduction to Deployment", <div className="space-y-4"><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-medium text-emerald-900">Introduction to Deployment</p><p className="mt-1 text-sm text-emerald-800">Review your Step 3 call, skills preparation and deployment documents.</p></div><Button type="button" variant="outline" onClick={() => { closeModal(); navigate("/documents"); }}>Open Document Library</Button></div>);
          break;
        case "deploymentTransition":
          openModal(
            "Immigration to Deployment Transition Call",
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This call is scheduled 60 days after your All Clear date and provides the formal handoff from Immigration to Deployment.
              </p>
              <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F0FF] p-4">
                <p className="text-sm font-semibold text-[#6D28D9]">
                  Before the transition call, ICP must confirm:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Active bedside employment / recent bedside status</li>
                  <li>Current licensure and endorsement status</li>
                  <li>Academic / required course completion status</li>
                  <li>Other deployment-readiness requirements requested by ICP</li>
                </ul>
              </div>
            </div>
          );
          break;
        case "immigrationFlowInfo":
        case "deploymentFlowInfo":
          openModal(stage.stage_name, <DeploymentCRMStatusView stage={stage} status={deploymentFieldStatus} onClose={closeModal} user={user} setStages={setStages} />);
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
          openModal(
            "Download Deploymate App",
            <DeploymateDownloadView
              onClose={closeModal}
              user={user}
              setStages={setStages}
            />
          );
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

    const refreshNCLEXStatus = async () => {
      try {
        const token =
          localStorage.getItem(
            "icp_auth_token"
          );

        if (!token) return;

        const response =
          await fetch(
            `${API_BASE}/api/pipeline/nclex-status?_=${Date.now()}`,
            {
              cache: "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (
          cancelled ||
          !response.ok ||
          data.success !== true
        ) {
          return;
        }

        setICPUSRNCRMData(previous => ({
          ...previous,
          ...(data.fields || {}),
          __live: true,
          __recordId:
            data.recordId || null
        }));

        if (
          data.applicationStatus
        ) {
          setApplicationStatus(
            data.applicationStatus
          );
        }

        if (
          data.nclexEligible === true ||
          Object.values(
            data.completion || {}
          ).some(Boolean)
        ) {
          setShowNCLEX(true);
        }

        setDeploymentFieldStatus(previous => {
          const stageStatus = {
            ...(previous?.__stageStatus || {})
          };

          for (
            const [stageName, completed]
            of Object.entries(data.completion || {})
          ) {
            const existing =
              stageStatus[stageName] ||
              {};

            const persistedCompleted =
              isPipelineStageComplete(
                stages.find(
                  stage =>
                    stage?.stage_name ===
                    stageName
                )
              );

            const stickyCompleted =
              completed === true ||
              existing.completed === true ||
              existing.status === "Completed" ||
              persistedCompleted;

            stageStatus[stageName] = {
              ...existing,
              evaluated: true,
              completed:
                stickyCompleted,
              unlocked:
                stickyCompleted ||
                existing.unlocked === true,
              status:
                stickyCompleted
                  ? "Completed"
                  : (
                      existing.status ||
                      "Not Started"
                    )
            };
          }

          return {
            ...previous,
            ...(data.fields || {}),
            __stageStatus: stageStatus
          };
        });
      } catch (error) {
        console.warn(
          "[Pipeline] Dedicated NCLEX status refresh failed:",
          error?.message || error
        );
      }
    };

    refreshNCLEXStatus();

    const interval =
      window.setInterval(
        refreshNCLEXStatus,
        15000
      );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.email]);


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
    if (!user?.email) {
      return;
    }

    let cancelled =
      false;

    const refreshLeadManagementStatus =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "icp_auth_token"
            );

          if (!token) {
            return;
          }

          const response =
            await fetch(
              `${API_BASE}/api/pipeline/application-status-live?_=${Date.now()}`,
              {
                cache:
                  "no-store",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  "Cache-Control":
                    "no-cache",
                  Pragma:
                    "no-cache"
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
            response.status ===
              403 &&
            data
              ?.portalAccessBlocked ===
              true
          ) {
            localStorage.removeItem(
              "icp_auth_token"
            );

            toast.error(
              data.message ||
              "Your portal access has ended."
            );

            navigate(
              "/login",
              {
                replace:
                  true
              }
            );

            return;
          }

          if (
            cancelled ||
            !response.ok ||
            data.success !== true
          ) {
            return;
          }

          const nextStatus =
            data.applicationStatus ||
            "";

          setApplicationStatus(
            nextStatus
          );

          const policy =
            data.accessPolicy || {
              mode:
                "normal",
              restricted:
                false,
              locked:
                false,
              portal_locked:
                false
            };

          setDeploymentFieldStatus(
            previous => ({
              ...previous,
              Application_Status:
                nextStatus,
              __accessPolicy:
                policy
            })
          );

          setStages(
            previous =>
              previous.map(
                stage => {
                  const qPoolOrder =
                    getCanonicalStageOrder({
                      stage_name:
                        "Qualified Candidate Pool"
                    });

                  const shouldLock =
                    policy.mode ===
                      "not-qualified"
                      ? (
                          stage.stage_name !==
                          "Not Qualified - to close"
                        )
                      : (
                          policy.mode ===
                            "qualified-pool" &&
                          getCanonicalStageOrder(
                            stage
                          ) >
                            qPoolOrder
                        );

                  return {
                    ...stage,
                    access_locked:
                      shouldLock
                  };
                }
              )
          );

          if (
            policy.message &&
            policy.restricted ===
              true
          ) {
            toast.info(
              policy.message,
              {
                id:
                  `pipeline-access-${policy.mode}`,
                duration:
                  12000
              }
            );
          }

          window.dispatchEvent(
            new CustomEvent(
              "candidate-data-updated"
            )
          );
        } catch (
          error
        ) {
          console.warn(
            "[Pipeline] Lead Management Status refresh failed:",
            error?.message ||
            error
          );
        }
      };

    refreshLeadManagementStatus();

    const interval =
      window.setInterval(
        refreshLeadManagementStatus,
        15000
      );

    const onFocus =
      () =>
        refreshLeadManagementStatus();

    window.addEventListener(
      "focus",
      onFocus
    );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "focus",
        onFocus
      );
    };
  }, [user?.email]);


  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    const loadExpiryAndDeploymentStatus = async () => {
      try {
        const token = localStorage.getItem("icp_auth_token");
        const response = await fetch(
          `${API_BASE}/api/pipeline/field-status?email=${encodeURIComponent(user.email)}&refresh=false&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        setDeploymentFieldStatus({
          ...(data.deployment || {}),
          ...(data.recruit || {}),
          ...(data.immigration || {}),
          __stageStatus:
            data.stageStatus || {},
          __sectionGates:
            data.sectionGates || {},
          __completionMap:
            data.completionMap || {},
          __immigrationChecklists:
            data.immigrationChecklists || {},
          __accessPolicy:
            data.accessPolicy || {
              mode: "normal",
              restricted: false,
              locked: false
            }
        });

        const policy =
          data.accessPolicy || {
            mode: "normal",
            restricted: false,
            locked: false
          };

        setStages(previous =>
          previous.map(stage => {
            const qPoolOrder =
              getCanonicalStageOrder({
                stage_name: "Qualified Candidate Pool"
              });

            const notQualifiedOrder =
              getCanonicalStageOrder({
                stage_name: "Not Qualified - to close"
              });

            const boundary =
              policy.mode === "qualified-pool"
                ? qPoolOrder
                : notQualifiedOrder;

            const shouldLock =
              policy.restricted === true &&
              policy.locked === true &&
              getCanonicalStageOrder(stage) > boundary;

            return {
              ...stage,
              access_locked:
                shouldLock
            };
          })
        );

        if (
          policy.message &&
          policy.restricted === true
        ) {
          toast.info(
            policy.message,
            {
              id:
                `pipeline-access-${policy.mode}`,
              duration:
                10000
            }
          );
        }

        if (data.nclex && typeof data.nclex === "object") {
          setICPUSRNCRMData(previous => ({
            ...previous,
            ...data.nclex,
            __live: true
          }));
        }

        const liveApplicationStatus =
          data.recruit?.Application_Status;

        if (
          liveApplicationStatus !== undefined &&
          liveApplicationStatus !== null
        ) {
          setApplicationStatus(
            liveApplicationStatus
          );

          if (
            isTransferToICPUSRNStatus(
              liveApplicationStatus
            ) ||
            data.nclexAccess?.eligible === true ||
            Object.values(
              data.stageStatus || {}
            ).some(
              item =>
                item?.nclex_stage === true &&
                item?.completed === true
            )
          ) {
            setShowNCLEX(true);
          }
        }

        if (data.sectionGates && typeof data.sectionGates === "object") {
          setStages(previous =>
            previous.map(stage => {
              let sectionCompleted = null;

              if (stage.stage_name === "Immigration forms submitted") {
                sectionCompleted =
                  data.sectionGates?.immigration?.unlocked === true;
              } else if (stage.stage_name === "Speciality Classes") {
                sectionCompleted =
                  data.sectionGates?.deployment?.unlocked === true;
              } else if (stage.stage_name === "Arrived") {
                sectionCompleted =
                  data.sectionGates?.aftercare?.unlocked === true;
              }

              if (sectionCompleted === null) {
                return stage;
              }

              return {
                ...stage,
                status:
                  sectionCompleted
                    ? "Completed"
                    : "Not Started",
                completed:
                  sectionCompleted,
                is_completed:
                  sectionCompleted,
                completed_date:
                  sectionCompleted
                    ? (
                        stage.completed_date ||
                        new Date().toISOString()
                      )
                    : null,
                source_trigger_unlocked:
                  sectionCompleted,
                trigger_unlocked:
                  sectionCompleted,
                crm_unlocked:
                  sectionCompleted,
                source_trigger_synced:
                  true,
                crm_synced:
                  true
              };
            })
          );
        }

        if (data.stageStatus && typeof data.stageStatus === "object") {
          const rawLiveFields = {
            ...(data.deployment || {}),
            ...(data.immigration || {}),
            ...(data.recruit || {}),
            ...(data.nclex || {})
          };

          setStages(previous => previous.map(stage => {
            const preservedPrescreen =
              preservePermanentSelectPrescreenStage(
                stage,
                user.email
              );

            if (
              preservedPrescreen
                ?.candidate_click_completed ===
                true
            ) {
              return preservedPrescreen;
            }

            const live = data.stageStatus?.[stage.stage_name];
            const rule = DEPLOYMENT_CRM_STAGE_RULES?.[stage.stage_name];

            // Evaluate exact CRM field mappings directly from the same live
            // response. This is intentionally independent of live.evaluated:
            // a populated CRM value must never remain locked because Zoho omitted
            // the field from an auxiliary metadata check.
            let rawRuleCompleted = null;
            let rawRuleHasValue = false;

            if (rule) {
              const rawValue = rule.fields
                ? Object.fromEntries(
                    rule.fields.map(field => [
                      field,
                      getLivePipelineFieldValue(rawLiveFields, field)
                    ])
                  )
                : getLivePipelineFieldValue(
                    rawLiveFields,
                    rule.fieldsAny || rule.field
                  );

              if (rule.fields) {
                rawRuleHasValue = Object.values(rawValue || {}).some(value =>
                  hasFlowValue(unwrapPipelineFieldValue(value))
                );
              } else {
                rawRuleHasValue =
                  hasFlowValue(unwrapPipelineFieldValue(rawValue));
              }

              rawRuleCompleted =
                rule.complete?.(rawValue) === true;
            }

            const backendEvaluated =
              live?.evaluated === true &&
              typeof live?.completed === "boolean";

            const completed =
              rawRuleCompleted === true ||
              (
                rawRuleCompleted !== false &&
                backendEvaluated &&
                live.completed === true
              ) ||
              (
                !rule &&
                backendEvaluated &&
                live.completed === true
              );

            const backendInProgress =
              backendEvaluated &&
              String(live?.status || "")
                .trim()
                .toLowerCase() === "in progress";

            const liveOpen =
              completed ||
              backendInProgress ||
              live?.unlocked === true;

            // If this stage has a direct CRM rule, the direct raw field is the
            // source of truth and is fully reversible. Empty / unmet => not complete.
            if (rule) {
              const nextCompleted =
                rawRuleCompleted === true ||
                (
                  !rawRuleHasValue &&
                  backendEvaluated &&
                  live.completed === true
                );

              const nextOpen =
                nextCompleted ||
                (
                  !rawRuleHasValue &&
                  backendInProgress
                );

              return {
                ...stage,
                status: nextCompleted
                  ? "Completed"
                  : nextOpen
                    ? "In Progress"
                    : "Not Started",
                completed: nextCompleted,
                is_completed: nextCompleted,
                completed_date: nextCompleted
                  ? (
                      live?.completed_date ||
                      stage.completed_date ||
                      new Date().toISOString()
                    )
                  : null,
                source_trigger_unlocked: nextOpen,
                trigger_unlocked: nextOpen,
                crm_unlocked: nextOpen,
                source_trigger_fields:
                  live?.source_fields ||
                  (
                    rule.fields
                      ? rule.fields
                      : [rule.field].filter(Boolean)
                  ),
                source_trigger_synced: true,
                crm_synced: true,
                live_raw_gate_value:
                  rule.fields
                    ? Object.fromEntries(
                        rule.fields.map(field => [
                          field,
                          getLivePipelineFieldValue(rawLiveFields, field)
                        ])
                      )
                    : getLivePipelineFieldValue(
                        rawLiveFields,
                        rule.fieldsAny || rule.field
                      )
              };
            }

            if (!backendEvaluated) return stage;

            return {
              ...stage,
              status: live.status || (completed ? "Completed" : "Not Started"),
              completed,
              is_completed: completed,
              completed_date: completed
                ? (live.completed_date || stage.completed_date || null)
                : null,
              source_trigger_unlocked: liveOpen,
              trigger_unlocked: liveOpen,
              crm_unlocked:
                stage.stage_category !== "Hiring"
                  ? liveOpen
                  : stage.crm_unlocked,
              recruit_unlocked:
                stage.stage_category === "Hiring"
                  ? liveOpen
                  : stage.recruit_unlocked,
              source_trigger_gate: live.gate || stage.source_trigger_gate || null,
              source_trigger_gate_snapshot: live.gate_snapshot || null,
              source_trigger_fields: live.source_fields || stage.source_trigger_fields || [],
              source_trigger_synced: true,
              crm_synced:
                stage.stage_category !== "Hiring"
                  ? true
                  : stage.crm_synced,
              recruit_synced:
                stage.stage_category === "Hiring"
                  ? true
                  : stage.recruit_synced
            };
          }));
        }

        window.dispatchEvent(
          new CustomEvent(
            "crm-recruit-updated",
            {
              detail: {
                source:
                  "field-status",
                stageStatus:
                  data.stageStatus || {}
              }
            }
          )
        );

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

    // API-conservation mode: one cached load when the Pipeline mounts.
    // No timed polling and no focus polling.
    loadExpiryAndDeploymentStatus();

    let lastRefreshAt = 0;
    const MIN_CLIENT_REFRESH_GAP_MS =
      10 * 60 * 1000;

    const refreshOnDemand = async () => {
      const now = Date.now();
      if (
        now - lastRefreshAt <
        MIN_CLIENT_REFRESH_GAP_MS
      ) {
        return;
      }

      lastRefreshAt = now;

      try {
        const token =
          localStorage.getItem(
            "icp_auth_token"
          );

        if (!token) return;

        const response = await fetch(
          `${API_BASE}/api/pipeline/field-status?email=${encodeURIComponent(
            user.email
          )}&refresh=true&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Cache-Control":
                "no-cache",
              Pragma:
                "no-cache"
            }
          }
        );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) return;

        setDeploymentFieldStatus({
          ...(data.deployment || {}),
          ...(data.recruit || {}),
          ...(data.immigration || {}),
          __stageStatus:
            data.stageStatus || {},
          __sectionGates:
            data.sectionGates || {},
          __completionMap:
            data.completionMap || {},
          __immigrationChecklists:
            data.immigrationChecklists || {}
        });

        window.dispatchEvent(
          new CustomEvent(
            "pipeline-live-status-refreshed",
            {
              detail: {
                email:
                  user.email
              }
            }
          )
        );
      } catch (error) {
        console.warn(
          "[Pipeline] Live refresh failed:",
          error?.message || error
        );
      }
    };

    window.addEventListener(
      "crm-recruit-refresh",
      refreshOnDemand
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "crm-recruit-refresh",
        refreshOnDemand
      );
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
      30 * 60 * 1000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.email]);

  const effectiveApplicationStatus =
    unwrapPipelineFieldValue(
      deploymentFieldStatus
        ?.Application_Status
    ) ||
    applicationStatus;

  const normalizedCurrentApplicationStatus =
    normalizeApplicationStatus(
      effectiveApplicationStatus
    );

  const qualificationOutcomeNames = [
    "Qualified - Match",
    "Qualified Candidate Pool",
    "Not Qualified - to close"
  ];

  const mappedQualificationOutcome =
    getEffectiveQualificationOutcome(
      effectiveApplicationStatus
    );

  const savedQualificationOutcome =
    stages.find(stage =>
      qualificationOutcomeNames.includes(
        stage?.stage_name
      ) &&
      isPipelineStageComplete(stage)
    )?.stage_name || null;

  const progressedPastQualification =
    isTransferToICPUSRNStatus(applicationStatus) ||
    stages.some(stage =>
      [
        "Transfer to ICP USRN School",
        "Select Prescreen Time",
        "Prescreen Scheduled",
        "Prescreen Completed",
        "Client Documents & Video Provided",
        "Pending Interview Selection",
        "Mandatory Pre-Interview Coaching Call",
        "Interview Scheduled",
        "Interview Attended",
        "Offer Made",
        "Offer Accepted",
        "Offer Declined",
        "Employment Contract Sent",
        "Employment Contract Signed",
        "Documents Received",
        "Hired"
      ].includes(stage?.stage_name) &&
      (isPipelineStageComplete(stage) || ["in progress", "in-progress", "active"].includes(String(stage?.status || "").trim().toLowerCase()))
    );

  const explicitQualificationHold =
    [
      "qualified-candidate pool",
      "qualified candidate pool"
    ].includes(
      normalizedCurrentApplicationStatus
    )
      ? "Qualified Candidate Pool"
      : [
          "unqualified",
          "not qualified-to close",
          "not qualified - to close",
          "not qualified to close",
          "not qualified-to-close"
        ].includes(
          normalizedCurrentApplicationStatus
        )
        ? "Not Qualified - to close"
        : null;

  const selectedQualificationOutcome =
    explicitQualificationHold ||
    (
      progressedPastQualification
        ? "Qualified - Match"
        : qualificationOutcomeNames.includes(
            mappedQualificationOutcome
          )
          ? mappedQualificationOutcome
          : savedQualificationOutcome
    );

  const transferStage =
    stages.find(stage =>
      stage?.stage_name ===
      "Transfer to ICP USRN School"
    );

  const liveTransferBackendStatus =
    deploymentFieldStatus?.__stageStatus?.[
      "Transfer to ICP USRN School"
    ];

  const liveLeadManagementStatus =
    deploymentFieldStatus?.Application_Status ??
    applicationStatus;

  const transferStatusSelected =
    liveTransferBackendStatus?.evaluated === true &&
    typeof liveTransferBackendStatus?.completed === "boolean"
      ? liveTransferBackendStatus.completed === true
      : isTransferToICPUSRNStatus(
          unwrapPipelineFieldValue(liveLeadManagementStatus)
        );

  const transferStageStatus =
    String(
      transferStage?.status ||
      ""
    )
      .trim()
      .toLowerCase();

  const savedTransferEligibility =
    Boolean(
      transferStage
    ) &&
    (
      isPipelineStageComplete(
        transferStage
      ) ||
      [
        "in progress",
        "in-progress",
        "active"
      ].includes(
        transferStageStatus
      ) ||
      transferStage
        ?.nclex_eligible ===
        true ||
      transferStage
        ?.nclex_branch_visible ===
        true ||
      transferStage
        ?.transfer_status_verified ===
        true
    );

  const savedNCLEXHistoryExists =
    stages.some(
      stage =>
        ICP_USRN_SUBPROCESS_CONFIG.some(
          item =>
            item.name ===
            stage?.stage_name
        ) &&
        (
          isPipelineStageComplete(
            stage
          ) ||
          [
            "in progress",
            "in-progress"
          ].includes(
            String(
              stage?.status ||
              ""
            )
              .trim()
              .toLowerCase()
          )
        )
    );

  const nclexBranchVisible =
    explicitQualificationHold !==
      "Qualified Candidate Pool" &&
    explicitQualificationHold !==
      "Not Qualified - to close" &&
    (
      transferStatusSelected ||
      savedTransferEligibility ||
      savedNCLEXHistoryExists ||
      showNCLEX ||
      Object.values(
        deploymentFieldStatus?.__stageStatus || {}
      ).some(
        state =>
          state?.nclex_stage === true &&
          (
            state?.completed === true ||
            state?.unlocked === true
          )
      )
    );

  const nclexProgress =
    transferStage
      ?.nclex_saved_progress ||
    {};

  useEffect(() => {
    // Once a verified Transfer/NCLEX history exists, keep the NCLEX branch
    // visible even after Recruit Application_Status advances to a later stage.
    if (nclexBranchVisible) {
      setShowNCLEX(true);
    }
  }, [
    nclexBranchVisible
  ]);

  const regularDisplayStages =
    stages.filter(stage => {
      const authenticatedEmail = String(user?.email || "").trim().toLowerCase();
      const stageEmail = String(stage?.candidate_email || "").trim().toLowerCase();
      if (stageEmail && authenticatedEmail && stageEmail !== authenticatedEmail) {
        return false;
      }

      if (stage?.is_gate || stage?.hidden_from_main_flow === true) {
        return false;
      }

      if (stage.stage_name === "Request for further evidence") {
        return false;
      }

      if (stage.stage_name === "Transfer to ICP USRN School") {
        return nclexBranchVisible;
      }

      if (
        qualificationOutcomeNames.includes(
          stage.stage_name
        )
      ) {
        return (
          selectedQualificationOutcome ===
          stage.stage_name
        );
      }

      if (
        explicitQualificationHold ===
          "Qualified Candidate Pool" &&
        getCanonicalStageOrder(
          stage
        ) >
          getCanonicalStageOrder({
            stage_name:
              "Qualified Candidate Pool"
          })
      ) {
        return false;
      }

      if (
        explicitQualificationHold ===
          "Not Qualified - to close" &&
        stage.stage_name !==
          "Not Qualified - to close"
      ) {
        return false;
      }

      const acceptedSelected =
        normalizedCurrentApplicationStatus ===
          "offer accepted" ||
        (
          normalizedCurrentApplicationStatus !==
            "offer declined" &&
          isPipelineStageComplete(
            stages.find(item =>
              item?.stage_name ===
              "Offer Accepted"
            )
          )
        );

      const declinedSelected =
        normalizedCurrentApplicationStatus ===
          "offer declined" ||
        (
          normalizedCurrentApplicationStatus !==
            "offer accepted" &&
          isPipelineStageComplete(
            stages.find(item =>
              item?.stage_name ===
              "Offer Declined"
            )
          )
        );

      if (
        acceptedSelected &&
        stage.stage_name ===
          "Offer Declined"
      ) {
        return false;
      }

      if (
        declinedSelected &&
        stage.stage_name ===
          "Offer Accepted"
      ) {
        return false;
      }

      return true;
    });

  // NCLEX is rendered only in the mini-card grid below. It is deliberately
  // excluded from the main linear pipeline and from overall stage totals.
  //
  // Completion status never changes position. Deployment and Aftercare stay
  // in the configured sequence whether a row is Completed, In Progress,
  // Not Started, Late or At Risk.

  const LIVE_SOURCE_COMPLETION_STAGES = new Set([
    // Recruit live trigger
    "Transfer to ICP USRN School",

    // Immigration direct CRM fields
    "Immigration forms submitted",
    "Foundations: Pillars",
    "Foundations: Endorsement Discovery",
    "Immigration approved",
    "Visa bill issued",
    "Visa bill paid",
    "DS-260 / Civil Document Submission",
    "Foundations: Cultural Readiness",
    "Immigration to Deployment Transition Call",
    "Documentarily Qualified",

    // Deployment direct CRM fields / direct portal completion
    "Introduction to Deployment Call",
    "Speciality Classes",
    "Final Self Assessment",
    "Speciality with Trainer Skills Check",
    "Housing / Transportation Call",
    "Deployment Pre-Arrival Call",
    "Pre-Arrival Banking Call",
    "Employer Pre-Arrival Call",
    "deployMate Ready",
    // Welcome Packet is completed by candidate acknowledgement, not CRM.
    "Arrived",

    // Aftercare source-driven completion
    "Welcome Call",
    "First week in US Check-in",
    "Second week in US Check-in",
    "Placement Stability Check-in",
    "Year One Anniversary Check-in"
  ]);

  const deriveLivePipelineStage = stage => {
    if (!stage) return stage;

    const liveFields = {
      ...(deploymentFieldStatus || {})
    };

    const liveStageStatus =
      deploymentFieldStatus?.__stageStatus?.[
        stage.stage_name
      ] || null;

    const rule =
      DEPLOYMENT_CRM_STAGE_RULES?.[
        stage.stage_name
      ] || null;

    let next = {
      ...stage
    };

    if (
      IMMIGRATION_CRM_CHECKLISTS?.[stage.stage_name]
    ) {
      const checklistItems =
        IMMIGRATION_CRM_CHECKLISTS[
          stage.stage_name
        ] || [];

      const backendChecklist =
        deploymentFieldStatus
          ?.__immigrationChecklists
          ?.[stage.stage_name] ||
        {};

      const liveFoundationResults =
        checklistItems.map(item => {
          const backendItem =
            backendChecklist?.[
              item.key
            ];

          if (
            typeof backendItem
              ?.complete ===
              "boolean"
          ) {
            return backendItem.complete;
          }

          const rawValue =
            getLivePipelineFieldValue(
              deploymentFieldStatus || {},
              [
                item.key,
                ...(item.aliases || [])
              ]
            );

          return isCRMChecklistComplete(
            rawValue
          );
        });

      const foundationComplete =
        liveFoundationResults.length > 0 &&
        liveFoundationResults.every(
          Boolean
        );

      next = {
        ...next,
        status:
          foundationComplete
            ? "Completed"
            : "Not Started",
        completed:
          foundationComplete,
        is_completed:
          foundationComplete,
        completed_date:
          foundationComplete
            ? (
                next.completed_date ||
                new Date().toISOString()
              )
            : null,
        crm_checklist_completed:
          liveFoundationResults.filter(
            Boolean
          ).length,
        crm_checklist_total:
          liveFoundationResults.length,
        source_trigger_unlocked:
          foundationComplete,
        trigger_unlocked:
          foundationComplete,
        crm_unlocked:
          foundationComplete,
        source_trigger_synced:
          true,
        crm_synced:
          true
      };
    }

    const sectionGates =
      deploymentFieldStatus?.__sectionGates || {};

    const completionMap =
      deploymentFieldStatus?.__completionMap || {};

    const useLiveCompletion =
      LIVE_SOURCE_COMPLETION_STAGES.has(
        stage.stage_name
      );

    const explicitBackendCompletion =
      useLiveCompletion &&
      typeof completionMap?.[stage.stage_name] === "boolean"
        ? completionMap[stage.stage_name]
        : null;

    const forceSectionTriggerComplete =
      (
        stage.stage_name === "Immigration forms submitted" &&
        (
          sectionGates?.immigration?.unlocked === true ||
          completionMap?.["Immigration forms submitted"] === true
        )
      ) ||
      (
        stage.stage_name === "Speciality Classes" &&
        (
          sectionGates?.deployment?.unlocked === true ||
          completionMap?.["Speciality Classes"] === true
        )
      ) ||
      (
        stage.stage_name === "Arrived" &&
        (
          sectionGates?.aftercare?.unlocked === true ||
          completionMap?.["Arrived"] === true
        )
      );

    if (forceSectionTriggerComplete) {
      next = {
        ...next,
        status: "Completed",
        completed: true,
        is_completed: true,
        completed_date:
          next.completed_date ||
          new Date().toISOString(),
        source_trigger_unlocked: true,
        trigger_unlocked: true,
        crm_unlocked: true,
        source_trigger_synced: true,
        crm_synced: true
      };
    }

    // Exact CRM/Recruit rule evaluation.
    // The raw field itself is authoritative when a rule exists.
    if (
      useLiveCompletion &&
      rule &&
      !IMMIGRATION_CRM_CHECKLISTS?.[stage.stage_name] &&
      !forceSectionTriggerComplete
    ) {
      const value = rule.fields
        ? Object.fromEntries(
            rule.fields.map(field => [
              field,
              getLivePipelineFieldValue(
                liveFields,
                field
              )
            ])
          )
        : getLivePipelineFieldValue(
            liveFields,
            rule.fieldsAny ||
            rule.field
          );

      const localRuleCompleted =
        rule.complete?.(value) === true;

      const rawCompleted =
        explicitBackendCompletion !== null
          ? explicitBackendCompletion
          : localRuleCompleted;

      const rawInProgress =
        !rawCompleted &&
        (
          rule.inProgress?.(value) ===
            true ||
          rule.allowContinue?.(value) ===
            true
        );

      next = {
        ...next,
        status: rawCompleted
          ? "Completed"
          : rawInProgress
            ? "In Progress"
            : "Not Started",
        completed:
          rawCompleted,
        is_completed:
          rawCompleted,
        completed_date:
          rawCompleted
            ? (
                next.completed_date ||
                liveStageStatus
                  ?.completed_date ||
                new Date()
                  .toISOString()
              )
            : null,
        source_trigger_unlocked:
          rawCompleted ||
          rawInProgress,
        trigger_unlocked:
          rawCompleted ||
          rawInProgress,
        crm_unlocked:
          rawCompleted ||
          rawInProgress,
        source_trigger_synced:
          true,
        crm_synced:
          true,
        live_raw_gate_value:
          value
      };
    } else if (
      useLiveCompletion &&
      (
        explicitBackendCompletion !== null ||
        (
          liveStageStatus?.evaluated === true &&
          typeof liveStageStatus?.completed === "boolean"
        )
      )
    ) {
      const backendCompleted =
        explicitBackendCompletion !== null
          ? explicitBackendCompletion
          : liveStageStatus?.completed === true;

      const backendInProgress =
        String(
          liveStageStatus.status || ""
        )
          .trim()
          .toLowerCase() ===
        "in progress";

      next = {
        ...next,
        status:
          backendCompleted
            ? "Completed"
            : backendInProgress
              ? "In Progress"
              : "Not Started",
        completed:
          backendCompleted,
        is_completed:
          backendCompleted,
        completed_date:
          backendCompleted
            ? (
                liveStageStatus
                  .completed_date ||
                next.completed_date ||
                new Date()
                  .toISOString()
              )
            : null,
        source_trigger_unlocked:
          backendCompleted ||
          backendInProgress ||
          liveStageStatus
            ?.unlocked ===
            true,
        trigger_unlocked:
          backendCompleted ||
          backendInProgress ||
          liveStageStatus
            ?.unlocked ===
            true,
        source_trigger_synced:
          true
      };
    }

    if (
      next.stage_category ===
      "Deployment"
    ) {
      const deploymentTiming =
        getDeploymentStageTiming({
          stageName:
            next.stage_name,
          liveFields:
            deploymentFieldStatus ||
            {},
          sourceStages:
            stages,
          finalArrivalDate
        });

      if (deploymentTiming) {
        next = {
          ...next,
          target_date:
            deploymentTiming
              .targetDate
              ? deploymentTiming
                  .targetDate
                  .toISOString()
              : null,
          timing_rule:
            deploymentTiming
              .timingRule,
          timing_anchor_type:
            deploymentTiming
              .anchorType,
          timing_anchor:
            deploymentTiming
              .anchorDate
              ? deploymentTiming
                  .anchorDate
                  .toISOString()
              : null,
          deployment_timing:
            true
        };
      }
    }

    // Aftercare opening is derived DIRECTLY from live Flight_Arrival_Time.
    // It does not depend on saved pipeline state.
    if (
      next.stage_category ===
      "Aftercare"
    ) {
      const rawArrival =
        getLivePipelineFieldValue(
          liveFields,
          "Flight_Arrival_Time"
        ) ||
        finalArrivalDate
          ?.toISOString?.() ||
        next.aftercare_gate_date ||
        next.aftercareGateDate ||
        null;

      const arrivalReached =
        isArrivalCalendarDateTodayOrPast(
          unwrapPipelineFieldValue(
            rawArrival
          )
        ) ||
        deploymentFieldStatus
          ?.__sectionGates
          ?.aftercare
          ?.unlocked ===
          true;

      if (arrivalReached) {
        const arrivalDate =
          new Date(
            unwrapPipelineFieldValue(
              rawArrival
            )
          );

        const validArrival =
          !Number.isNaN(
            arrivalDate.getTime()
          );

        next = {
          ...next,
          aftercare_unlocked:
            true,
          aftercare_locked:
            false,
          aftercare_gate_date:
            validArrival
              ? arrivalDate
                  .toISOString()
              : rawArrival,
          live_arrival_gate:
            rawArrival,
          target_date:
            validArrival &&
            next.days_from_arrival !==
              undefined
              ? addDays(
                  arrivalDate,
                  Number(
                    next.days_from_arrival ||
                    0
                  )
                ).toISOString()
              : next.target_date
        };
      }
    }

    if (
      useLiveCompletion &&
      explicitBackendCompletion === false &&
      !isPipelineStageComplete(next)
    ) {
      next = {
        ...next,
        status: "Not Started",
        completed: false,
        is_completed: false,
        completed_date: null,
        source_trigger_unlocked: false,
        trigger_unlocked: false,
        crm_unlocked: false,
        recruit_unlocked: false,
        source_trigger_synced: true
      };
    } else if (
      next.completed === true ||
      next.is_completed === true
    ) {
      next = {
        ...next,
        status: "Completed",
        completed: true,
        is_completed: true,
        completed_date:
          next.completed_date ||
          new Date().toISOString()
      };
    }

    return next;
  };

  let displayStages =
    sortStagesByConfiguredOrder(
      regularDisplayStages
    ).map(
      deriveLivePipelineStage
    );

  if (nclexBranchVisible) {
    const prerequisites =
      new Set([
        "Applied",
        "Associated with Job",
        "Qualified - Match",
        "Transfer to ICP USRN School"
      ]);

    displayStages =
      displayStages.map(stage =>
        prerequisites.has(stage.stage_name)
          ? {
              ...stage,
              status: "Completed",
              completed: true,
              is_completed: true,
              unlocked: true,
              is_unlocked: true,
              access_locked: false,
              is_locked: false,
              source_trigger_unlocked: true,
              trigger_unlocked: true,
              recruit_unlocked: true
            }
          : stage
      );
  }

  const categories = [
    "Hiring",
    "Immigration",
    "Deployment",
    "Aftercare"
  ];
  const progressStages =
    displayStages.filter(stage =>
      !(stage?.stage_name === "Transfer to ICP USRN School" && !nclexBranchVisible)
    );

  // NCLEX miniboxes are part of the same continuous Hiring progress whenever
  // Transfer to ICP USRN School is active. Their crossed-off state is calculated
  // directly from current Recruit CustomModule1 values so it is reversible.
  if (nclexBranchVisible) {
    const seenProgressNames = new Set(progressStages.map(stage => stage.stage_name));
    ICP_USRN_SUBPROCESS_CONFIG.forEach((item, index) => {
      if (seenProgressNames.has(item.name)) return;
      const complete =
        isICPUSRNItemComplete(
          item,
          icpUSRNCRMData
        ) ||
        deploymentFieldStatus
          ?.__stageStatus
          ?.[item.name]
          ?.completed === true ||
        nclexProgress
          ?.[item.name]
          ?.completed === true ||
        isPipelineStageComplete(
          stages.find(
            stage =>
              stage?.stage_name ===
              item.name
          )
        );

      const virtualNCLEXTarget =
        pipelineStartDate &&
        Number.isFinite(
          Number(
            item.days
          )
        )
          ? addDays(
              pipelineStartDate,
              Number(
                item.days
              )
            ).toISOString()
          : null;

      progressStages.push({
        id: `nclex-progress-${index + 1}`,
        stage_name: item.name,
        stage_category: "Hiring",
        stage_order: 6 + ((index + 1) / 100),
        nclex_stage: true,
        days_from_start:
          item.days,
        target_date:
          virtualNCLEXTarget,
        timing_rule:
          `Due by day ${item.days} from Day 1.`,
        timing_source:
          virtualNCLEXTarget
            ? "nclex_day_1_fixed"
            : null,
        status: complete ? "Completed" : "Not Started",
        completed: complete,
        is_completed: complete
      });
      seenProgressNames.add(item.name);
    });
  }

  const completedCount =
    progressStages.filter(
      isPipelineStageComplete
    ).length;

  const totalCount =
    progressStages.length;
  const progressPct =
    totalCount > 0
      ? Math.round(
          (completedCount / totalCount) *
          100
        )
      : 0;

  const orderedCandidateStages =
    sortStagesByConfiguredOrder(
      progressStages
    );

  const currentCandidateStage =
    orderedCandidateStages.find(
      stage =>
        !isPipelineStageComplete(stage) &&
        String(stage.status || "").trim().toLowerCase() === "in progress" &&
        isStageUnlocked(stage, displayStages)
    ) ||
    orderedCandidateStages.find(
      stage =>
        !isPipelineStageComplete(stage) &&
        isStageUnlocked(stage, displayStages)
    ) ||
    null;

  const pendingNextStage =
    currentCandidateStage
      ? orderedCandidateStages.find(
          stage =>
            getCanonicalStageOrder(stage) > getCanonicalStageOrder(currentCandidateStage) &&
            !isPipelineStageComplete(stage) &&
            isStageUnlocked(stage, displayStages)
        ) || null
      : null;

  // The current-stage countdown must always use an immutable deadline. If a
  // transient live/dashboard payload omitted target_date, rebuild it from the
  // same original Day-1 / Deployment / Arrival anchors instead of hiding the
  // timer or starting a new clock from zero.
  const currentStagePipelineStart =
    pipelineStartDate ||
    parsePipelineTimingDate(
      currentCandidateStage
        ?.pipeline_start_date ||
      currentCandidateStage
        ?.start_date ||
      stages
        .map(stage =>
          stage?.pipeline_start_date ||
          stage?.start_date ||
          null
        )
        .find(Boolean) ||
      null
    );

  let currentCandidateStageForTimer =
    currentCandidateStage
      ? {
          ...currentCandidateStage
        }
      : null;

  if (
    currentCandidateStageForTimer &&
    !(
      currentCandidateStageForTimer.target_date ||
      currentCandidateStageForTimer.targetDate ||
      currentCandidateStageForTimer.due_date ||
      currentCandidateStageForTimer.dueDate
    )
  ) {
    const fixedDayOneTarget =
      currentStagePipelineStart
        ? getFixedDayOneStageTarget(
            currentCandidateStageForTimer,
            currentStagePipelineStart
          )
        : null;

    if (fixedDayOneTarget) {
      currentCandidateStageForTimer = {
        ...currentCandidateStageForTimer,
        target_date:
          fixedDayOneTarget.toISOString(),
        pipeline_start_date:
          currentStagePipelineStart.toISOString(),
        timing_source:
          currentCandidateStageForTimer
            .nclex_stage === true
            ? "nclex_day_1_fixed"
            : (
                currentCandidateStageForTimer
                  .timing_source ||
                "hiring_day_1_fixed"
              )
      };
    }
  }

  if (
    currentCandidateStageForTimer
      ?.stage_category ===
      "Deployment"
  ) {
    const deploymentTiming =
      getDeploymentStageTiming({
        stageName:
          currentCandidateStageForTimer
            .stage_name,
        liveFields:
          deploymentFieldStatus ||
          {},
        sourceStages:
          stages,
        finalArrivalDate
      });

    if (
      deploymentTiming
        ?.targetDate
    ) {
      currentCandidateStageForTimer = {
        ...currentCandidateStageForTimer,
        target_date:
          deploymentTiming
            .targetDate
            .toISOString(),
        timing_rule:
          deploymentTiming
            .timingRule,
        timing_anchor:
          deploymentTiming
            .anchorDate
            ?.toISOString?.() ||
          null,
        timing_anchor_type:
          deploymentTiming
            .anchorType
      };
    }
  }

  if (false && isCheckingNCLEX) {
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

        </div>
      </div>

      {explicitQualificationHold ===
        "Qualified Candidate Pool" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Qualified Candidate Pool
              </p>
              <p className="mt-1 text-sm text-amber-800">
                There are currently no openings matching your profile. We will notify you when a suitable opening becomes available.
              </p>
            </div>
          </div>
        </div>
      )}

      {explicitQualificationHold ===
        "Not Qualified - to close" && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">
                Qualification Criteria Not Met
              </p>
              <p className="mt-1 text-sm text-red-800">
                You do not currently meet the qualification criteria. All other pipeline sections are locked.
              </p>
              <p className="mt-1 text-xs text-red-700">
                Your portal access will remain available for 5 days from this status change and will then be disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {(currentCandidateStage ||
        pendingNextStage) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          {currentCandidateStage && (
            <>
              <p className="text-sm font-semibold text-blue-900">
                Current stage:{" "}
                {currentCandidateStage.stage_name}
              </p>

              <LiveCurrentStageTimer
                stage={
                  currentCandidateStageForTimer
                }
              />

              {currentCandidateStageForTimer
                ?.timing_rule && (
                <p className="mt-2 text-xs text-blue-700">
                  {currentCandidateStageForTimer.timing_rule}
                </p>
              )}

              {currentCandidateStageForTimer &&
                !(
                  currentCandidateStageForTimer.target_date ||
                  currentCandidateStageForTimer.targetDate ||
                  currentCandidateStageForTimer.due_date ||
                  currentCandidateStageForTimer.dueDate
                ) && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Countdown will appear as soon as the required timing anchor is available.
                  </p>
                )}
            </>
          )}

          {pendingNextStage && (
            <p className="mt-1 text-xs text-blue-700">
              Pending next stage:{" "}
              {pendingNextStage.stage_name}
            </p>
          )}
        </div>
      )}

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
        const baseCategoryStages =
          displayStages.filter(stage =>
            stage.stage_category === cat
          );

        const catStages = [...baseCategoryStages];

        if (!catStages || catStages.length === 0) return null;
        const colors = categoryColors[cat];
        const countedCategoryStages = [
          ...catStages.filter(stage =>
            !(stage.stage_name === "Transfer to ICP USRN School" && !nclexBranchVisible)
          ),
          ...(cat === "Hiring" && nclexBranchVisible
            ? ICP_USRN_SUBPROCESS_CONFIG.map((item, index) => {
                const complete = isICPUSRNItemComplete(item, icpUSRNCRMData);
                return {
                  id: `nclex-count-${index + 1}`,
                  stage_name: item.name,
                  stage_category: "Hiring",
                  nclex_stage: true,
                  status: complete ? "Completed" : "Not Started",
                  completed: complete,
                  is_completed: complete
                };
              })
            : [])
        ];

        const catCompleted =
          countedCategoryStages.filter(
            isPipelineStageComplete
          ).length;
        const isNCLEX = cat === "NCLEX Roadmap";
        const isHiring = cat === "Hiring";
        const isImmigration = cat === "Immigration";
        
        return (
          <div key={cat} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className={cn("px-5 py-3 flex items-center justify-between border-b border-border", colors.bg)}>
              <h2 className={cn("font-semibold text-sm", colors.text)}>
                {(isNCLEX ? "🎓" : `Stage ${categories.indexOf(cat) + 1}`)} – {cat}
              </h2>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", colors.bg, colors.text, colors.border)}>
                {`${catCompleted}/${countedCategoryStages.length} complete`}
              </span>
            </div>
            

            <div className="divide-y divide-border">
              {catStages.map((stage, idx) => {
                if (!stage) return null;
                const cfg = statusConfig[stage.status] || statusConfig["Not Started"];
                const Icon = cfg.icon;
                const isClickable = isStageClickable(stage.stage_name);
                const isNCLEXStage =
                  stage.nclex_stage === true ||
                  stage.stage_category === "NCLEX Roadmap";
                const isImmigrationStage = stage.stage_category === "Immigration";
                const isGate = stage.is_gate === true;
                const hasTimingTarget =
                  Boolean(
                    stage.target_date ||
                    stage.targetDate ||
                    stage.due_date ||
                    stage.dueDate
                  );
                const riskStatus =
                  (
                    isHiring ||
                    stage.days_from_start ||
                    hasTimingTarget ||
                    stage.stage_name ===
                      "Immigration Call"
                  ) &&
                  stage.status !== "Completed"
                    ? getRiskStatus(stage)
                    : null;
                const riskCfg = riskStatus ? riskConfig[riskStatus] : null;
                const showRisk =
                  riskStatus &&
                  !isPipelineStageComplete(
                    stage
                  ) &&
                  Boolean(
                    hasTimingTarget ||
                    stage.stage_name ===
                      "Immigration Call"
                  );
                const unlocked = stage.non_counted_section === true
                  ? true
                  : isStageUnlocked(stage, displayStages);
                const isLocked = !unlocked && !isPipelineStageComplete(stage);
                const canInteract = (isClickable || isNCLEXStage || isImmigrationStage) && !isLocked;
                
                return (
                  <React.Fragment key={stage.id}>
                  <div
                    title={PIPELINE_STAGE_COMMENTS[stage.stage_name] || undefined}
                    aria-label={PIPELINE_STAGE_COMMENTS[stage.stage_name] ? `${stage.stage_name}: ${PIPELINE_STAGE_COMMENTS[stage.stage_name]}` : stage.stage_name}
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
                      ) : isImmigrationStage &&
                        (
                          stage.stage_name
                            ?.toLowerCase()
                            .includes("course") ||
                          stage.stage_name
                            ?.toLowerCase()
                            .includes("foundations") ||
                          stage.stage_name ===
                            "Foundations (Phases 1–3)" ||
                          stage.stage_name ===
                            "Licensure (General) & Live English Assessment" ||
                          stage.stage_name ===
                            "English Practice & Development" ||
                          stage.stage_name ===
                            "Cultural Adaptation & Integration"
                        ) ? (
                        <Book className={cn("h-5 w-5", cfg.color)} />
                      ) : isImmigrationStage ? (
                        <FileCheck className={cn("h-5 w-5", cfg.color)} />
                      ) : (
                        <Icon className={cn("h-5 w-5", cfg.color)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        isPipelineStageComplete(stage) &&
                          "line-through text-muted-foreground",
                        canInteract && "text-primary hover:underline",
                        isGate && "text-blue-700"
                      )}>
                        {isGate && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">GATE</span>}
                        {stage.display_name || stage.stage_name}
                        {PIPELINE_STAGE_COMMENTS[stage.stage_name] && (
                          <span
                            className="ml-2 inline-flex cursor-help items-center text-xs text-muted-foreground no-underline"
                            title={PIPELINE_STAGE_COMMENTS[stage.stage_name]}
                            aria-label="Hover for stage details"
                          >
                            ⓘ
                          </span>
                        )}
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
                      {isNCLEXStage && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isLocked) {
                              cycleStatus(
                                stage.id
                              );
                            }
                          }}
                          disabled={isLocked}
                          className="mt-2 rounded-lg border border-purple-200 px-2 py-1 text-xs text-purple-700 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Update Status
                        </button>
                      )}
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2 self-center">
                      {isImmigrationStage &&
                        stage.timing_rule && (
                          <span
                            className="max-w-[260px] rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                            title={stage.timing_rule}
                          >
                            {stage.timing_rule}
                          </span>
                        )}

                      {showRisk &&
                        riskCfg && (
                          <span
                            className={cn(
                              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs",
                              riskStatus ===
                                "Late" &&
                                "border-red-200 bg-red-50 text-red-700",
                              riskStatus ===
                                "At Risk" &&
                                "border-amber-200 bg-amber-50 text-amber-700",
                              riskStatus ===
                                "Good Standing" &&
                                "border-emerald-200 bg-emerald-50 text-emerald-700"
                            )}
                          >
                            <riskCfg.icon className="h-3 w-3" />
                            {riskCfg.label}
                          </span>
                        )}

                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs",
                          cfg.badge
                        )}
                      >
                        {stage.status}
                      </span>
                    </div>
                  </div>
                  {cat === "Hiring" &&
                    nclexBranchVisible &&
                    (
                      (
                        transferStatusSelected &&
                        stage.stage_name === "Transfer to ICP USRN School"
                      ) ||
                      (
                        !transferStatusSelected &&
                        stage.stage_name === "Associated with Job"
                      )
                    ) && (
                  <section className="border-t border-amber-200 bg-amber-50/40 p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <h2 className="font-semibold text-amber-900">
                                  NCLEX Program
                                </h2>
                                <p className="text-xs text-amber-700">
                                  Your NCLEX milestones. Every stage is live-gated from Recruit CustomModule1 and re-locks if a threshold is no longer met.
                                </p>
                              </div>
                              <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800">
                                {ICP_USRN_SUBPROCESS_CONFIG.filter(item => {
                                  if (item.nonCounted === true) return false;
                                  return (
                                    isICPUSRNItemComplete(
                                      item,
                                      icpUSRNCRMData
                                    ) ||
                                    deploymentFieldStatus
                                      ?.__stageStatus
                                      ?.[item.name]
                                      ?.completed === true ||
                                    nclexProgress
                                      ?.[item.name]
                                      ?.completed === true ||
                                    isPipelineStageComplete(
                                      stages.find(
                                        stage =>
                                          stage?.stage_name ===
                                          item.name
                                      )
                                    )
                                  );
                                }).length}/{ICP_USRN_SUBPROCESS_CONFIG.filter(
                                  item => item.nonCounted !== true
                                ).length} complete
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {ICP_USRN_SUBPROCESS_CONFIG.map((item, index) => {
                                const savedItem =
                                  nclexProgress[item.name];

                                const persistedStage =
                                  stages.find(
                                    stage =>
                                      stage?.stage_name ===
                                      item.name
                                  );

                                const backendItem =
                                  deploymentFieldStatus
                                    ?.__stageStatus
                                    ?.[item.name];

                                const complete =
                                  isICPUSRNItemComplete(
                                    item,
                                    icpUSRNCRMData
                                  ) ||
                                  backendItem?.completed === true ||
                                  savedItem?.completed === true ||
                                  isPipelineStageComplete(
                                    persistedStage
                                  );

                                const laterMilestoneReached =
                                  ICP_USRN_SUBPROCESS_CONFIG
                                    .slice(index + 1)
                                    .some(laterItem =>
                                      isICPUSRNItemComplete(
                                        laterItem,
                                        icpUSRNCRMData
                                      ) ||
                                      deploymentFieldStatus
                                        ?.__stageStatus
                                        ?.[laterItem.name]
                                        ?.completed === true ||
                                      nclexProgress
                                        ?.[laterItem.name]
                                        ?.completed === true ||
                                      isPipelineStageComplete(
                                        stages.find(
                                          stage =>
                                            stage?.stage_name ===
                                            laterItem.name
                                        )
                                      )
                                    );

                                const unlocked =
                                  complete ||
                                  laterMilestoneReached ||
                                  backendItem?.unlocked === true ||
                                  isICPUSRNItemUnlocked(
                                    item,
                                    index,
                                    icpUSRNCRMData
                                  );

                                const gate = item.performanceGate;
                                const performance = getNCLEXPerformanceSnapshot(icpUSRNCRMData);

                                const miniStage = {
                                  id: `nclex-mini-${index + 1}`,
                                  stage_name: item.name,
                                  stage_category: "NCLEX Prescreen",
                                  stage_order: index + 1,
                                  status: complete ? "Completed" : unlocked ? "In Progress" : "Not Started",
                                  completed: complete,
                                  is_completed: complete,
                                  completed_date: complete ? (savedItem?.completed_date || null) : null,
                                  nclex_subprocess: true,
                                  nclex_config: item,
                                  nclex_unlocked: unlocked
                                };

                                return (
                                  <button
                                    key={item.name}
                                    type="button"
                                    disabled={!unlocked && !complete}
                                    onClick={() => (unlocked || complete) && handleStageClick(miniStage)}
                                    className={cn(
                                      "rounded-xl border bg-white p-4 text-left transition",
                                      complete
                                        ? "border-emerald-200"
                                        : unlocked
                                          ? "border-amber-200 hover:-translate-y-0.5 hover:shadow-sm"
                                          : "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <p className={cn(
                                        "text-sm font-semibold",
                                        complete ? "text-emerald-800" : unlocked ? "text-gray-900" : "text-gray-500"
                                      )}>
                                        {item.name}
                                      </p>
                                      {complete ? (
                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                                      ) : unlocked ? (
                                        <Circle className="h-5 w-5 shrink-0 text-amber-500" />
                                      ) : (
                                        <Lock className="h-5 w-5 shrink-0 text-gray-400" />
                                      )}
                                    </div>

                                    {gate && (
                                      <div className="mt-2 rounded-lg border border-purple-100 bg-purple-50/60 p-2 text-[11px] text-purple-800">
                                        Gate: {gate.assessmentsRequired} self assessments{gate.assignmentsRequired > 0 ? `, ${gate.assignmentsRequired} classes` : ""}, and Performance Rating High or Very High.
                                        <div className="mt-1 text-purple-600">
                                          Current: {performance.assessmentsCompleted} assessments · {performance.assignmentsCompleted} classes · {performance.rating || "no rating"}
                                        </div>
                                      </div>
                                    )}

                                    {item.name === "Board Approval" && (
                                      <div className="mt-2 space-y-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                          Re-application Date
                                        </p>
                                        {hasCRMValue(icpUSRNCRMData?.Re_application_Date) ? (
                                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                            {String(
                                              unwrapPipelineFieldValue(
                                                icpUSRNCRMData?.Re_application_Date
                                              ) ?? ""
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400">
                                            Not provided
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {[
                                      "Program Prescreen",
                                      "Credential Evaluation Set-up",
                                      "Select Meeting Time"
                                    ].includes(item.name) ? (
                                      <div className="mt-2 space-y-2">
                                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                          Click to select meeting time
                                        </span>

                                        {item.name === "Credential Evaluation Set-up" && (
                                          <div className="space-y-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                              Credentialing Status
                                            </p>
                                            <span className={cn(
                                              "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
                                              complete
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-slate-50 text-slate-700"
                                            )}>
                                              {icpUSRNCRMData?.Credentialing_Status || "None"}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-xs text-gray-500">
                                        {complete ? "Completed" : unlocked ? "Available" : "Locked until the previous stage and gate are satisfied"}
                                      </p>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                  )}
                  </React.Fragment>
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
