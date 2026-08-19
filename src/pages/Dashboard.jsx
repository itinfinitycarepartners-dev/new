








// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Bell, 
  MapPin, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MessageCircle,
  Users,
  Send,
  Timer,
  X,
  Upload,
  Eye,
  Sparkles,
  Calendar,
  FileSignature,
  Book,
  Download,
  Video,
  Plane,
  User,
  Receipt,
  Phone,
  Home,
  ClipboardList,
  AlertTriangle,
  Info,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import StageContact from "../components/StageContact";
import moment from "moment";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// ─── IMPORT FROM src/api/icpClient.js ──────────────────────────────────────
import { messaging, websocket, tokenStorage } from "@/api/icpClient";
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fictional-carnival-3inv.onrender.com';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Zoho Recruit may return Date_Received as:
 *   2026-07-30
 *   2026-07-30T14:25:00
 *   2026-07-30T14:25:00+03:00
 *
 * A plain YYYY-MM-DD string is parsed by JavaScript as UTC, which can shift
 * the displayed timeline. Treat date-only Recruit values as the start of that
 * calendar day in the browser's local timezone. Preserve explicit offsets
 * when Zoho supplies one.
 */
const parseRecruitDateReceived = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      0,
      0,
      0,
      0
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Zoho sometimes returns a space instead of "T".
  const normalized = raw.includes(" ") && !raw.includes("T")
    ? raw.replace(" ", "T")
    : raw;

  const hasExplicitTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const parsed = new Date(
    hasExplicitTimezone ? normalized : normalized
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getStageTargetTime = (stage, startDate) => {
  if (!stage || !startDate) return null;

  if (
    stage.hours_from_start !== undefined &&
    stage.hours_from_start !== null
  ) {
    return new Date(
      startDate.getTime() + Number(stage.hours_from_start) * HOUR_MS
    );
  }

  if (
    stage.days_from_start !== undefined &&
    stage.days_from_start !== null
  ) {
    return new Date(
      startDate.getTime() + Number(stage.days_from_start) * DAY_MS
    );
  }

  return null;
};

const formatCountdown = (deadline, now = new Date()) => {
  const diffMs = deadline.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const absoluteMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absoluteMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  let durationText;
  if (days > 0) {
    durationText = `${days}d ${hours}h`;
  } else if (hours > 0) {
    durationText = `${hours}h ${minutes}m`;
  } else {
    durationText = `${minutes}m`;
  }

  return {
    overdue,
    text: overdue
      ? `${durationText} overdue`
      : `${durationText} remaining`,
    remainingMs: diffMs,
  };
};

// ─── Stage → "what you need to do" guide ───────────────────────────────────
const REQUIRED_STAGE_ACTIONS = {
  "Mandatory Pre-Interview Coaching Call": { message: "Complete the mandatory coaching call 24–36 hours before your interview.", cta: "View Pipeline", icon: Phone, urgency: "high" },
  "Introduction to Deployment Call": { message: "Attend your introduction to deployment call.", cta: "View Deployment", icon: Phone, urgency: "high" },
  "Speciality Classes": { message: "Complete your assigned speciality classes.", cta: "View Deployment", icon: Book, urgency: "high" },
  "Final Self Assessment": { message: "Complete your final self assessment.", cta: "View Deployment", icon: ClipboardList, urgency: "high" },
  "Speciality w/Trainer Skills Check": { message: "Complete your speciality skills check with your trainer.", cta: "View Deployment", icon: CheckCircle2, urgency: "high" },
  "Deployment Eligible / Not Eligible": { message: "Your deployment eligibility is being confirmed.", cta: "View Status", icon: CheckCircle2, urgency: "medium" },
  "Deployment Pre-Arrival Call": { message: "Attend your deployment pre-arrival call.", cta: "View Deployment", icon: Phone, urgency: "high" },
  "Housing / Transportation Call": { message: "Confirm housing and transportation arrangements.", cta: "View Deployment", icon: Home, urgency: "high" },
  "Pre-Arrival Banking Call": { message: "Attend your pre-arrival banking call.", cta: "View Deployment", icon: Phone, urgency: "high" },
  "Mandatory Petitioner / Employer Call": { message: "Attend the mandatory petitioner/employer call.", cta: "View Deployment", icon: Phone, urgency: "high" },
  "deployMate Ready": { message: "Complete your deployMate readiness requirements.", cta: "View Deployment", icon: CheckCircle2, urgency: "high" },
  "Arrival Itinerary": { message: "Review and acknowledge your welcome packet.", cta: "View Packet", icon: FileText, urgency: "high" },
  "Receipt Submission": { message: "Complete and submit your expense report.", cta: "Submit Report", icon: Receipt, urgency: "high" },
  "Arrived": { message: "Your arrival is confirmed. Your Aftercare journey is next.", cta: "View Pipeline", icon: Plane, urgency: "medium" },
  "Concierge Debrief": { message: "This step is completed by an ICP administrator. No candidate action is required.", cta: "View Status", icon: Clock, urgency: "low" },
  "Request for further evidence": { message: "If an RFE is active, follow the immigration team's evidence instructions. This step closes when the immigration stage becomes Approved.", cta: "View Immigration", icon: FileText, urgency: "high" },
  "Visa bill issued": { message: "Your visa fee bill is ready to be paid. Review the immigration instructions for the next step.", cta: "View Immigration", icon: Receipt, urgency: "high" },
  "Visa bill paid": { message: "The visa fee is paid. Prepare your DS-260 and civil documents for submission.", cta: "View Immigration", icon: FileText, urgency: "high" },
  "DS-260 / Civil Document Submission": { message: "Complete and submit the DS-260 and required civil documents to NVC.", cta: "View Immigration", icon: FileText, urgency: "high" },
  "Final Self Assessment": { message: "Complete your final ICP self assessment.", cta: "View Deployment", icon: ClipboardList, urgency: "high" },
  "Deployment Eligible / Not Eligible": { message: "Your deployment eligibility is being confirmed. Eligible must be selected before this step completes.", cta: "View Status", icon: CheckCircle2, urgency: "medium" },
  "Deployment Pre-Arrival Call": { message: "Attend your Nurse Deployment Call.", cta: "View Deployment", icon: Phone, urgency: "high" },
  "Housing / Transportation Call": { message: "Attend and complete the housing/transportation call.", cta: "View Deployment", icon: Home, urgency: "high" },
  "Mandatory Petitioner / Employer Call": { message: "Attend the mandatory petitioner/employer arrival call.", cta: "View Deployment", icon: Phone, urgency: "high" },
  "Arrived": { message: "Your Final Destination Arrival date will complete this stage and unlock Aftercare when that time is reached.", cta: "View Deployment", icon: Plane, urgency: "medium" },

};

const getDashboardVisibleStages = (stages = [], applicationStatus = "") => {
  const normalized = String(applicationStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ");
  const complete = name => stages.some(stage => stage?.stage_name === name && isPipelineStageComplete(stage));
  const transferOrQualifiedMatch = [
    "transfer to icp usrn school",
    "transfer to ivp usrn school",
    "qualified-match",
    "qualified match"
  ].includes(normalized);
  const progressed = transferOrQualifiedMatch || stages.some(stage => [
    "Transfer to ICP USRN School","Select Prescreen Time","Prescreen Scheduled","Prescreen Completed",
    "Client Documents & Video Provided","Pending Interview Selection","Mandatory Pre-Interview Coaching Call",
    "Interview Scheduled","Interview Attended","Offer Made","Offer Accepted","Offer Declined",
    "Employment Contract Sent","Employment Contract Signed","Documents Received","Hired"
  ].includes(stage?.stage_name) && (isPipelineStageComplete(stage) || String(stage?.status || "").toLowerCase() === "in progress"));
  const accepted = normalized === "offer accepted" || (normalized !== "offer declined" && complete("Offer Accepted"));
  const declined = normalized === "offer declined" || (normalized !== "offer accepted" && complete("Offer Declined"));
  return stages.filter(stage => {
    if (progressed && ["Qualified Candidate Pool","Not Qualified - to close"].includes(stage?.stage_name)) return false;
    if (accepted && stage?.stage_name === "Offer Declined") return false;
    if (declined && stage?.stage_name === "Offer Accepted") return false;
    return true;
  });
};

const STAGE_ACTION_GUIDE = {
  // Hiring Stages
  "Select Prescreen Time": {
    message: "You need to pick a time for your prescreen interview.",
    cta: "Pick a Time",
    icon: Timer,
    urgency: "high"
  },
  "Prescreen Scheduled": {
    message: "Your prescreen call is on the calendar — double check the details.",
    cta: "View Schedule",
    icon: Eye,
    urgency: "medium"
  },
  "Prescreen Completed": {
    message: "Please upload your passport and NCLEX report.",
    cta: "Upload Documents",
    icon: Upload,
    urgency: "high"
  },
  "Client Documents & Video Provided": {
    message: "New client documents and a video are ready for you to review.",
    cta: "Review Documents",
    icon: Eye,
    urgency: "medium"
  },
  "Interview Scheduled": {
    message: "You have an interview scheduled — review the details before it starts.",
    cta: "View Interview",
    icon: Eye,
    urgency: "high"
  },
  "Interview Attended": {
    message: "Your interview feedback is ready to view.",
    cta: "View Feedback",
    icon: Eye,
    urgency: "medium"
  },
  "Offer Made": {
    message: "You have a new job offer waiting for your review.",
    cta: "Review Offer",
    icon: Eye,
    urgency: "high"
  },
  "Offer Accepted": {
    message: "Please upload your signed offer acceptance.",
    cta: "Upload Acceptance",
    icon: Upload,
    urgency: "high"
  },
  "Employment Contract Sent": {
    message: "Your employment contract has been sent — please review it.",
    cta: "Review Contract",
    icon: Eye,
    urgency: "high"
  },
  "Employment Contract Signed": {
    message: "Please upload your signed employment contract.",
    cta: "Upload Contract",
    icon: Upload,
    urgency: "high"
  },
  "Documents Received": {
    message: "Please upload the outstanding documents for this stage.",
    cta: "Upload Documents",
    icon: Upload,
    urgency: "high"
  },
  "Hired": {
    message: "Congrats on being hired! Please upload your birth certificate and government ID.",
    cta: "Upload Documents",
    icon: Upload,
    urgency: "high"
  },

  // Immigration/Licensure Stages
  "Licensure": {
    message: "Please upload your nursing license.",
    cta: "Upload License",
    icon: Upload,
    urgency: "high"
  },
  "Education": {
    message: "Please upload your transcript and diploma.",
    cta: "Upload Documents",
    icon: Upload,
    urgency: "high"
  },
  "License Endorsement": {
    message: "Check the status of your license endorsement.",
    cta: "View Status",
    icon: Eye,
    urgency: "medium"
  },

  // NCLEX Roadmap Stages
  "Complete Pre-assessment": {
    message: "Complete the initial pre-assessment to determine your readiness.",
    cta: "Start Assessment",
    icon: FileText,
    urgency: "high"
  },
  "Program Prescreen": {
    message: "Complete the program prescreen for the ICP USRN School.",
    cta: "Start Prescreen",
    icon: FileText,
    urgency: "high"
  },
  "Document Review": {
    message: "Submit all required documents for review.",
    cta: "Upload Documents",
    icon: Upload,
    urgency: "high"
  },
  "Educational Program Agreement": {
    message: "Review and sign the educational program agreement.",
    cta: "Sign Agreement",
    icon: FileSignature,
    urgency: "high"
  },
  "Program Approval": {
    message: "Your program approval is pending. Check your status.",
    cta: "Check Status",
    icon: Eye,
    urgency: "medium"
  },
  "Credential Evaluation Set-up": {
    message: "Set up your credential evaluation with CGFNS or similar.",
    cta: "Set Up Evaluation",
    icon: FileText,
    urgency: "high"
  },
  "Credential Evaluation": {
    message: "Your credential evaluation is in progress.",
    cta: "Check Status",
    icon: Eye,
    urgency: "medium"
  },
  "Credential Evaluation Completed": {
    message: "Your credential evaluation is complete. Review the report.",
    cta: "Review Report",
    icon: Eye,
    urgency: "medium"
  },
  "Credentials Issued": {
    message: "Your credentials have been issued. Verify them.",
    cta: "Verify Credentials",
    icon: Eye,
    urgency: "medium"
  },
  "Board Registration": {
    message: "Complete your Board of Nursing registration.",
    cta: "Register Now",
    icon: FileText,
    urgency: "high"
  },
  "Board Approval": {
    message: "Your board approval is pending. Check your status.",
    cta: "Check Status",
    icon: Eye,
    urgency: "medium"
  },
  "Pearson Vue Registration": {
    message: "Register with Pearson Vue for your NCLEX exam.",
    cta: "Register Now",
    icon: FileText,
    urgency: "high"
  },
  "Exam Registration": {
    message: "Complete your NCLEX exam registration.",
    cta: "Complete Registration",
    icon: FileText,
    urgency: "high"
  },
  "Exam Results": {
    message: "Your NCLEX exam results are ready to view.",
    cta: "View Results",
    icon: Eye,
    urgency: "high"
  },

  // NCLEX Prescreen Stages
  "Schedule Time - Booking App": {
    message: "Schedule your time using the booking app.",
    cta: "Schedule Time",
    icon: Calendar,
    urgency: "high"
  },
  "Learn HUB Enrollment": {
    message: "Complete your Learn HUB enrollment.",
    cta: "Enroll Now",
    icon: FileText,
    urgency: "high"
  },
  "Performance Check 1": {
    message: "Complete Performance Check 1.",
    cta: "Start Check",
    icon: FileText,
    urgency: "medium"
  },
  "Performance Check 2": {
    message: "Complete Performance Check 2.",
    cta: "Start Check",
    icon: FileText,
    urgency: "medium"
  },
  "Required Courses": {
    message: "Complete the required courses.",
    cta: "View Courses",
    icon: Book,
    urgency: "high"
  },
  "Performance Check 3": {
    message: "Complete Performance Check 3.",
    cta: "Start Check",
    icon: FileText,
    urgency: "medium"
  },
  "ATT Received": {
    message: "Your Authorization to Test (ATT) has been received.",
    cta: "View ATT",
    icon: Eye,
    urgency: "high"
  },
  "Performance Check FINAL": {
    message: "Complete your final performance check.",
    cta: "Start Final Check",
    icon: FileText,
    urgency: "high"
  },
  "Background Complete": {
    message: "Your background check is complete.",
    cta: "View Results",
    icon: Eye,
    urgency: "medium"
  },
  "Performance Check 4": {
    message: "Complete Performance Check 4.",
    cta: "Start Check",
    icon: FileText,
    urgency: "medium"
  },

  // Deployment Stages
  "Deployment Details": {
    message: "You have a final pre-deployment requirements checklist to complete.",
    cta: "Complete Checklist",
    icon: Briefcase,
    urgency: "high"
  },
  "Housing Details": {
    message: "Please fill out your housing details form.",
    cta: "Complete Form",
    icon: Home,
    urgency: "high"
  },
  "R&L Details": {
    message: "Please complete your Relocation & Logistics details.",
    cta: "Go to R&L",
    icon: FileText,
    urgency: "high"
  },
  "Flight Details": {
    message: "Your flight details are ready to view.",
    cta: "View Flight",
    icon: Plane,
    urgency: "medium"
  },
  "Concierge Details": {
    message: "Review your concierge arrival details.",
    cta: "View Details",
    icon: User,
    urgency: "medium"
  },
  "Welcome Appointments": {
    message: "You have welcome appointments to review and complete.",
    cta: "View Appointments",
    icon: Calendar,
    urgency: "high"
  },
  "Reimbursement/Expense Report": {
    message: "Please submit your reimbursement/expense report.",
    cta: "Submit Report",
    icon: Receipt,
    urgency: "high"
  },
  "Deployment & Skills Checklist": {
    message: "Complete your deployment and skills checklist.",
    cta: "View Checklist",
    icon: ClipboardList,
    urgency: "high"
  },
  "Submit Updated Work Status, Civil Docs & Licensing Credentials": {
    message: "Submit your updated work status, civil documents, and licensing credentials.",
    cta: "Submit Documents",
    icon: Upload,
    urgency: "high"
  },
  "Submit Housing Form": {
    message: "Submit your housing details form.",
    cta: "Complete Form",
    icon: Home,
    urgency: "high"
  },
  "Submit R&L Checklist": {
    message: "Submit your Relocation & Logistics checklist.",
    cta: "Complete Checklist",
    icon: ClipboardList,
    urgency: "high"
  },
  "Confirmation of Eligibility to Proceed": {
    message: "Confirm your eligibility to proceed.",
    cta: "Confirm",
    icon: CheckCircle2,
    urgency: "high"
  },
  "Embassy Interview Scheduled": {
    message: "Your embassy interview is scheduled.",
    cta: "View Details",
    icon: Eye,
    urgency: "high"
  },
  "Request Job Offer Letter": {
    message: "Request your job offer letter.",
    cta: "Request Now",
    icon: FileText,
    urgency: "high"
  },
  "Schedule Medical Exam": {
    message: "Schedule your medical exam.",
    cta: "Schedule Now",
    icon: Calendar,
    urgency: "high"
  },
  "Schedule Biometrics Appointment": {
    message: "Schedule your biometrics appointment.",
    cta: "Schedule Now",
    icon: Calendar,
    urgency: "high"
  },
  "Post-Embassy Interview Update": {
    message: "Review your post-embassy interview update.",
    cta: "View Update",
    icon: Eye,
    urgency: "medium"
  },
  "Confirm Scheduled Arrival Date": {
    message: "Confirm your scheduled arrival date.",
    cta: "Confirm Date",
    icon: Calendar,
    urgency: "high"
  },
  "Download Deploymate App": {
    message: "Download the Deploymate App to stay connected.",
    cta: "Download App",
    icon: Download,
    urgency: "medium"
  },
  "Attend Housing and Transportation Call": {
    message: "Attend your housing and transportation call.",
    cta: "View Details",
    icon: Video,
    urgency: "high"
  },
  "Join ICP Pre-Arrival Support Group": {
    message: "Join the ICP Pre-Arrival Support Group.",
    cta: "Join Group",
    icon: Users,
    urgency: "medium"
  },
  "Attend Deployment Call": {
    message: "Attend your deployment call.",
    cta: "View Details",
    icon: Video,
    urgency: "high"
  },
  "Confirm Final Transportation Plan": {
    message: "Confirm your final transportation plan.",
    cta: "Confirm Plan",
    icon: MapPin,
    urgency: "high"
  },
  "Attend Facility/RN Pre-Arrival Call": {
    message: "Attend your facility/RN pre-arrival call.",
    cta: "View Details",
    icon: Video,
    urgency: "high"
  },
  "Flights Booked": {
    message: "Your flights are booked. Review the details.",
    cta: "View Flight",
    icon: Plane,
    urgency: "medium"
  },
  "ICP Welcome Packet & Itinerary": {
    message: "Your welcome packet and itinerary are ready.",
    cta: "View Packet",
    icon: FileText,
    urgency: "medium"
  },
  "Connect with Concierge": {
    message: "Connect with your concierge.",
    cta: "Contact Concierge",
    icon: User,
    urgency: "medium"
  },
  "Reimbursement/Advance Payment Report Released": {
    message: "Submit your reimbursement and advance payment report.",
    cta: "Submit Report",
    icon: Receipt,
    urgency: "high"
  },
  "Communicate During Travel": {
    message: "Review your travel communication details.",
    cta: "View Details",
    icon: MessageCircle,
    urgency: "medium"
  },
  "Submit Post-Arrival Documents": {
    message: "Submit your post-arrival documents.",
    cta: "Upload Documents",
    icon: Upload,
    urgency: "high"
  },

  // Aftercare Stages
  "Relocation Survey": {
    message: "Please share your feedback in the Relocation Survey.",
    cta: "Take Survey",
    icon: FileText,
    urgency: "medium"
  },
  "30 Day Survey": {
    message: "Your 30 Day Survey is ready for your feedback.",
    cta: "Take Survey",
    icon: FileText,
    urgency: "medium"
  },
  "90 Day Survey": {
    message: "Your 90 Day Survey is ready for your feedback.",
    cta: "Take Survey",
    icon: FileText,
    urgency: "medium"
  },
  "90 Day Exit Call": {
    message: "Complete your 90 Day Exit Call.",
    cta: "View Details",
    icon: Phone,
    urgency: "high"
  },
  "Submit Active License": {
    message: "Submit your active nursing license.",
    cta: "Upload License",
    icon: Upload,
    urgency: "high"
  },
  "Submit Orientation Start Date": {
    message: "Submit your orientation start date.",
    cta: "Submit Date",
    icon: Calendar,
    urgency: "high"
  },
  "Submit Start Date on Floor Independently": {
    message: "Submit your start date on the floor independently.",
    cta: "Submit Date",
    icon: Calendar,
    urgency: "high"
  },
  "Reimbursement/Expenses": {
    message: "Submit your reimbursement and expenses.",
    cta: "Submit Now",
    icon: Receipt,
    urgency: "high"
  },
};

// ─── Helper function for banner dismissal key ──────────────────────────────
const bannerDismissKey = (email, stageName) => `banner_dismissed_${email}_${stageName}`;

// ─── Persistent Sticky Banner - Always visible at the top ──────────────────
function StickyActionBanner({ stage, guide, onDismiss }) {
  if (!stage || !guide) return null;
  const GuideIcon = guide.icon || Bell;
  
  // Determine urgency styling
  const urgencyStyles = {
    high: {
      bg: "bg-red-50 border-red-300",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      textColor: "text-red-800",
      buttonBg: "bg-red-600 hover:bg-red-700",
      badge: "bg-red-500",
      badgeText: "URGENT"
    },
    medium: {
      bg: "bg-amber-50 border-amber-300",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      textColor: "text-amber-800",
      buttonBg: "bg-amber-600 hover:bg-amber-700",
      badge: "bg-amber-500",
      badgeText: "ACTION NEEDED"
    },
    low: {
      bg: "bg-blue-50 border-blue-300",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-800",
      buttonBg: "bg-blue-600 hover:bg-blue-700",
      badge: "bg-blue-500",
      badgeText: "NEXT STEP"
    }
  };

  const urgency = guide.urgency || "medium";
  const styles = urgencyStyles[urgency] || urgencyStyles.medium;

  return (
    <div className={`sticky top-0 z-50 ${styles.bg} border-b-4 ${styles.border} shadow-lg`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 ${styles.iconBg} rounded-full p-2 mt-0.5`}>
            <GuideIcon className={`h-5 w-5 ${styles.iconColor}`} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${styles.badge} text-white`}>
                {styles.badgeText}
              </span>
              <span className={`text-xs font-semibold ${styles.textColor}`}>
                {stage.stage_name}
              </span>
            </div>
            <p className={`text-sm font-medium ${styles.textColor} mt-0.5`}>
              {guide.message}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/pipeline">
              <Button size="sm" className={`${styles.buttonBg} text-white font-semibold gap-2 shadow-md hover:shadow-lg transition-all`}>
                {guide.cta || "Go to Pipeline"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <button
              onClick={onDismiss}
              className={`p-1.5 rounded-lg ${styles.iconBg} hover:bg-opacity-75 transition-colors`}
              aria-label="Dismiss"
            >
              <X className={`h-4 w-4 ${styles.iconColor}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Popup shown on page load when the current stage needs action ─────────
function StageActionPopup({ stage, guide, onDismiss }) {
  if (!stage || !guide) return null;
  const GuideIcon = guide.icon || Bell;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative border-4 border-amber-400">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
              ⚠️ Action Required
            </p>
            <p className="text-sm font-semibold text-gray-800">{stage.stage_name}</p>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <GuideIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">{guide.message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onDismiss}>
            Maybe Later
          </Button>
          <Link to="/pipeline">
            <Button onClick={onDismiss} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
              {guide.cta || "Go to Pipeline"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const isPipelineStageComplete = (stage) => {
  if (!stage) return false;

  const normalizedStatus = String(
    stage.status ||
    stage.stage_status ||
    stage.pipeline_status ||
    ""
  ).trim().toLowerCase();

  return (
    normalizedStatus === "completed" ||
    normalizedStatus === "complete" ||
    stage.completed === true ||
    stage.is_completed === true ||
    stage.isComplete === true ||
    Boolean(stage.completed_date) ||
    Boolean(stage.completedAt) ||
    Boolean(stage.date_completed)
  );
};

export default function Dashboard() {
  const { user } =
    useAuth();

  const [
    unreadMessageCount,
    setUnreadMessageCount
  ] = useState(0);

  const [
    recentMessages,
    setRecentMessages
  ] = useState([]);

  const [
    timerNow,
    setTimerNow
  ] =
    useState(
      Date.now()
    );

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setTimerNow(
            Date.now()
          );
        },
        60 * 1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  const {
    data: summary,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [
      "dashboard-summary",
      user?.email
    ],
    enabled:
      Boolean(
        user?.email
      ),
    staleTime:
      0,
    refetchInterval:
      15 * 1000,
    refetchIntervalInBackground:
      false,
    refetchOnWindowFocus:
      true,
    queryFn:
      async () => {
        const token =
          tokenStorage.get();

        if (!token) {
          throw new Error(
            "Authentication token is missing."
          );
        }

        const response =
          await fetch(
            `${API_BASE}/api/candidate/dashboard-summary?_=${Date.now()}`,
            {
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            payload.error ||
            payload.message ||
            "Unable to load dashboard."
          );
        }

        return payload;
      }
  });

  const profile =
    summary?.candidate ||
    {};

  const pipeline =
    summary?.pipeline ||
    {};

  const visiblePipelineStages = getDashboardVisibleStages(
    Array.isArray(pipeline.stages) ? pipeline.stages : [],
    pipeline.applicationStatus || pipeline.application_status || pipeline.hiringState?.applicationStatus || ""
  );

  const hiddenStageNames = new Set(
    (Array.isArray(pipeline.stages) ? pipeline.stages : [])
      .filter(stage => !visiblePipelineStages.some(item => item?.stage_name === stage?.stage_name))
      .map(stage => stage?.stage_name)
  );

  const dashboardApplicationStatus=String(
    pipeline.applicationStatus||
    pipeline.application_status||
    pipeline.hiringState?.applicationStatus||
    profile.applicationStatus||
    profile.Application_Status||
    ""
  ).trim().toLowerCase().replace(/[–—]/g,"-").replace(/\s*-\s*/g,"-").replace(/\s+/g," ");
  const isQualifiedCandidatePool=["qualified-candidate pool","qualified candidate pool"].includes(dashboardApplicationStatus);
  const isNotQualifiedToClose=[
    "not qualified-to close",
    "not qualified - to close",
    "not qualified to close",
    "unqualified"
  ].includes(dashboardApplicationStatus);
  const dashboardAccessPolicy=
    pipeline.accessPolicy||
    {mode:"normal",restricted:false,locked:false,message:""};
  const rawActiveStage=isQualifiedCandidatePool
    ? visiblePipelineStages.find(stage=>stage?.stage_name==="Qualified Candidate Pool")||{stage_name:"Qualified Candidate Pool",stage_category:"Hiring",stage_order:5,status:"In Progress"}
    : isNotQualifiedToClose
      ? visiblePipelineStages.find(stage=>stage?.stage_name==="Not Qualified - to close")||{stage_name:"Not Qualified - to close",stage_category:"Hiring",stage_order:3,status:"In Progress"}
      : pipeline.currentStage||null;
  const rawPendingNextStage=
    (isQualifiedCandidatePool||isNotQualifiedToClose)
      ? null
      : (pipeline.nextStage||null);

  const progressedPastQualification = (() => {
    const stages = visiblePipelineStages;
    const markerNames = new Set([
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
      "Employment Contract Sent",
      "Employment Contract Signed",
      "Documents Received",
      "Hired"
    ]);
    return stages.some(stage => {
      if (!markerNames.has(stage?.stage_name)) return false;
      const status = String(stage?.status || "").toLowerCase();
      return status === "completed" || status === "complete" || status === "in progress" ||
        stage?.completed === true || Boolean(stage?.completed_date);
    });
  })();

  const obsoleteQualificationStage = stage =>
    !stage ||
    hiddenStageNames.has(stage?.stage_name) ||
    (progressedPastQualification && ["Qualified Candidate Pool", "Not Qualified - to close"].includes(stage?.stage_name));

  const orderedVisibleStages = [...visiblePipelineStages]
    .filter(stage => !obsoleteQualificationStage(stage))
    .sort((a, b) => Number(a?.stage_order || 0) - Number(b?.stage_order || 0));

  const fallbackActiveStage =
    orderedVisibleStages.find(stage =>
      !isPipelineStageComplete(stage) &&
      String(stage?.status || "").trim().toLowerCase() === "in progress"
    ) ||
    orderedVisibleStages.find(stage =>
      !isPipelineStageComplete(stage) &&
      (stage?.unlocked === true || stage?.is_unlocked === true || stage?.started_at || stage?.startedAt)
    ) ||
    null;

  const furthestReachedStage =
    orderedVisibleStages.reduce(
      (furthest, stage) => {
        const reached =
          isPipelineStageComplete(stage) ||
          stage?.source_trigger_unlocked === true ||
          stage?.trigger_unlocked === true ||
          stage?.crm_unlocked === true ||
          stage?.recruit_unlocked === true ||
          stage?.nclex_unlocked === true ||
          String(stage?.status || "").trim().toLowerCase() === "in progress";

        if (!reached) return furthest;

        return !furthest ||
          Number(stage?.stage_order || 0) >
            Number(furthest?.stage_order || 0)
          ? stage
          : furthest;
      },
      null
    );

  const activeStage =
    furthestReachedStage &&
    !isPipelineStageComplete(furthestReachedStage)
      ? furthestReachedStage
      : orderedVisibleStages.find(stage =>
          Number(stage?.stage_order || 0) >
            Number(furthestReachedStage?.stage_order ?? -Infinity) &&
          !isPipelineStageComplete(stage)
        ) ||
        fallbackActiveStage ||
        orderedVisibleStages.find(stage =>
          !isPipelineStageComplete(stage)
        ) ||
        null;

  const pendingNextStage =
    activeStage
      ? orderedVisibleStages.find(stage =>
          Number(stage?.stage_order || 0) >
            Number(activeStage?.stage_order || 0) &&
          !isPipelineStageComplete(stage)
        ) || null
      : null;

  const serverTimerMatchesActive =
    pipeline.timer?.stageName &&
    activeStage?.stage_name &&
    pipeline.timer.stageName === activeStage.stage_name;

  const activeTimer =
    serverTimerMatchesActive
      ? pipeline.timer
      : activeStage?.target_date
        ? {
            stageName: activeStage.stage_name,
            startedAt: activeStage.started_at || null,
            targetDate: activeStage.target_date,
            timingStatus: activeStage.timing_status || null
          }
        : null;

  const activeDeadline =
    activeTimer?.targetDate
      ? new Date(
          activeTimer.targetDate
        )
      : null;

  const activeCountdown =
    activeDeadline &&
    !Number.isNaN(
      activeDeadline.getTime()
    )
      ? formatCountdown(
          activeDeadline,
          new Date(
            timerNow
          )
        )
      : null;

  const docs =
    Array.isArray(
      summary?.documents
    )
      ? summary.documents
      : [];

  const DASHBOARD_UPDATE_TYPES =
    new Set([
      "urgent",
      "rfe",
      "expiry",
      "expired",
      "document-required",
      "pipeline",
      "stage",
      "access"
    ]);

  const updates =
    Array.isArray(
      summary?.updates
    )
      ? summary.updates.filter(
          update =>
            DASHBOARD_UPDATE_TYPES.has(
              String(
                update?.update_type ||
                ""
              )
                .trim()
                .toLowerCase()
            ) ||
            /^pipeline:/i.test(
              String(
                update?.source ||
                ""
              )
            )
        )
      : [];

  const documentCount =
    Number(
      summary?.counts
        ?.documents ||
      0
    );

  const pendingDocs =
    Number(
      summary?.counts
        ?.documentPending ||
      0
    );

  const approvedDocs =
    Number(
      summary?.counts
        ?.documentApproved ||
      0
    );

  const unreadUpdates =
    Number(
      summary?.counts
        ?.updates ||
      0
    );

  const pipelineCompletedCount =
    Number(
      pipeline.completed ||
      0
    );

  const pipelineTotalCount =
    Number(
      pipeline.total ||
      0
    );

  const pipelineProgressPercent =
    Number(
      pipeline.progress ||
      0
    );

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    let cancelled =
      false;

    const loadMessages =
      async () => {
        try {
          const response =
            await messaging.getConversations();

          if (
            cancelled ||
            !response?.success
          ) {
            return;
          }

          const conversations =
            Array.isArray(
              response.conversations
            )
              ? response.conversations
              : [];

          const unread =
            conversations.reduce(
              (
                total,
                conversation
              ) =>
                total +
                Number(
                  conversation
                    .unreadCount ||
                  0
                ),
              0
            );

          setUnreadMessageCount(
            unread
          );

          const recent =
            conversations
              .filter(
                conversation =>
                  conversation
                    .lastMessage
              )
              .sort(
                (a, b) =>
                  new Date(
                    b.lastMessageAt ||
                    0
                  ) -
                  new Date(
                    a.lastMessageAt ||
                    0
                  )
              )
              .slice(
                0,
                3
              )
              .map(
                conversation => ({
                  id:
                    conversation._id ||
                    conversation.id,
                  conversationId:
                    conversation._id ||
                    conversation.id,
                  content:
                    conversation
                      .lastMessage
                      ?.content ||
                    conversation
                      .lastMessageText ||
                    "",
                  senderName:
                    conversation
                      .lastMessage
                      ?.senderName ||
                    conversation
                      .groupName ||
                    "Message",
                  createdAt:
                    conversation
                      .lastMessageAt ||
                    conversation
                      .lastMessage
                      ?.createdAt
                })
              );

          setRecentMessages(
            recent
          );
        } catch (messageError) {
          console.error(
            "[Dashboard] Messages:",
            messageError
          );

          setUnreadMessageCount(
            Number(
              summary?.counts
                ?.messages ||
              0
            )
          );
        }
      };

    loadMessages();

    const handleMessage =
      () =>
        loadMessages();

    websocket.on(
      "new_message",
      handleMessage
    );

    window.addEventListener(
      "messaging-updated",
      handleMessage
    );

    return () => {
      cancelled = true;

      websocket.off(
        "new_message",
        handleMessage
      );

      window.removeEventListener(
        "messaging-updated",
        handleMessage
      );
    };
  }, [
    user?.email,
    summary?.counts?.messages
  ]);

  useEffect(() => {
    const refresh =
      () => {
        refetch();
      };

    websocket.on("pipeline-updated", refresh);
    websocket.on("candidate-data-updated", refresh);
    websocket.on("crm-recruit-updated", refresh);

    window.addEventListener(
      "pipeline-updated",
      refresh
    );

    window.addEventListener(
      "documents-updated",
      refresh
    );

    window.addEventListener(
      "updates-read",
      refresh
    );

    window.addEventListener(
      "candidate-data-updated",
      refresh
    );

    return () => {
      websocket.off("pipeline-updated", refresh);
      websocket.off("candidate-data-updated", refresh);
      websocket.off("crm-recruit-updated", refresh);

      window.removeEventListener(
        "pipeline-updated",
        refresh
      );

      window.removeEventListener(
        "documents-updated",
        refresh
      );

      window.removeEventListener(
        "updates-read",
        refresh
      );

      window.removeEventListener(
        "candidate-data-updated",
        refresh
      );
    };
  }, [refetch]);

  const greeting =
    () => {
      const hour =
        new Date().getHours();

      if (hour < 12) {
        return "Good morning";
      }

      if (hour < 17) {
        return "Good afternoon";
      }

      return "Good evening";
    };

  const deploymentDate =
    summary?.deploymentDate ||
    profile
      ?.initial_departure_time ||
    null;

  const welcomeCompleted =
    summary?.welcomePacket
      ?.completed === true;

  const notifications =
    [
      activeStage
        ? {
            title:
              "Current Stage",
            message:
              activeStage.stage_name,
            type:
              "current"
          }
        : null,
      pendingNextStage
        ? {
            title:
              "Next Stage",
            message:
              pendingNextStage
                .stage_name,
            type:
              "next"
          }
        : null
    ].filter(Boolean);

  useEffect(() => {
    const popupItems = [
      ...(Array.isArray(updates) ? updates : []),
      ...notifications
    ];
    if (popupItems.length === 0) return;

    const userEmailKey = String(user?.email || "").trim().toLowerCase();

    popupItems
      .filter(item => item && item.is_read !== true)
      .slice(0, 8)
      .forEach(item => {
        const notificationKey =
          `dashboard_notification_seen:${userEmailKey}:${item.id || item._id || item.title || item.message}`;
        if (sessionStorage.getItem(notificationKey)) return;

        const text = String(item.message || item.text || item.title || "").trim();
        const title = String(item.title || "Pipeline update").trim();
        const combined = `${title} ${text}`.toLowerCase();
        const isRFE =
          combined.includes("request for evidence") ||
          combined.includes("request for further evidence") ||
          combined.includes("rfe");

        if (isRFE) {
          toast.warning(title || "Request for Evidence", {
            description: text || "Your immigration record has a Request for Evidence update.",
            duration: 10000
          });
        } else if (item.update_type || item.type === "stage") {
          toast.info(title, {
            description: text || "Your candidate record has changed.",
            duration: 7000
          });
        }

        sessionStorage.setItem(notificationKey, "1");
      });
  }, [updates, notifications, user?.email]);


  const quickLinks = [
    {
      path:
        "/documents",
      label:
        "Documents",
      sublabel:
        `${documentCount} document${documentCount === 1 ? "" : "s"}`,
      icon:
        FileText,
      color:
        "bg-blue-50 text-blue-600"
    },
    {
      path:
        "/updates",
      label:
        "Updates",
      sublabel:
        `${unreadUpdates} unread`,
      icon:
        Bell,
      color:
        "bg-amber-50 text-amber-600",
      badge:
        unreadUpdates >
        0
    },
    {
      path:
        "/messages",
      label:
        "Messages",
      sublabel:
        `${unreadMessageCount} unread`,
      icon:
        MessageCircle,
      color:
        "bg-purple-50 text-purple-600",
      badge:
        unreadMessageCount >
        0
    },
    {
      path:
        "/pipeline?stage=welcome-packet",
      label:
        "Arrival Itinerary",
      sublabel:
        welcomeCompleted
          ? "Acknowledged"
          : "View in pipeline",
      icon:
        Briefcase,
      color:
        "bg-indigo-50 text-indigo-600"
    },
    {
      path:
        "/pipeline?form=hub",
      label:
        "Forms",
      sublabel:
        "R&L, Housing, Behavioral",
      icon:
        ClipboardList,
      color:
        "bg-emerald-50 text-emerald-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-800">
          Dashboard could not be loaded.
        </p>
        <p className="mt-1 text-sm text-red-700">
          {error.message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() =>
            refetch()
          }
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent to-primary/5 p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              {greeting()}, {String(profile?.firstName || profile?.First_Name || profile?.candidateName || user?.full_name || "there").trim().split(/\s+/)[0]} 👋
            </h1>

            <p className="mt-1 text-muted-foreground">
              Your candidate portal is synchronized with your current pipeline.
            </p>

            {deploymentDate && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Plane className="h-4 w-4" />
                Deployment: {deploymentDate}
              </p>
            )}
          </div>

          {activeStage && (
            <div className="min-w-[280px] rounded-xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Stage
              </p>

              <p className="mt-1 font-medium">
                {activeStage.stage_name}
              </p>

              {activeCountdown && (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2 ${
                    activeCountdown.overdue
                      ? "border-orange-200 bg-orange-50"
                      : activeTimer?.timingStatus ===
                          "At Risk"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Timer
                      className={`h-4 w-4 ${
                        activeCountdown.overdue
                          ? "text-orange-600"
                          : activeTimer?.timingStatus ===
                              "At Risk"
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    />
                    <span className="text-xs font-semibold">
                      {activeCountdown.text}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Same deadline as My Pipeline:{" "}
                    {activeDeadline.toLocaleString()}
                  </p>
                </div>
              )}

              {pendingNextStage && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Next: {pendingNextStage.stage_name}
                </p>
              )}

              <Link
                to="/pipeline"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open Pipeline
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-700" />
            <h2 className="text-sm font-semibold text-blue-900">
              What needs your attention
            </h2>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {notifications.map(
              notification => (
                <Link
                  key={
                    notification.type
                  }
                  to="/pipeline"
                  className="rounded-lg border border-blue-200 bg-white p-3 transition hover:border-blue-300"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {notification.title}
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {notification.message}
                  </p>
                </Link>
              )
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" />
              Pipeline Progress
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Exactly the same saved pipeline progress shown on My Pipeline.
            </p>
          </div>

          <span className="text-sm font-semibold text-primary">
            {pipelineCompletedCount} / {pipelineTotalCount} stages
          </span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all"
            style={{
              width:
                `${pipelineProgressPercent}%`
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>
            {pipelineProgressPercent}% complete
          </span>

          <Link
            to="/pipeline"
            className="font-medium text-primary hover:underline"
          >
            View pipeline
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickLinks.map(
          link => {
            const Icon =
              link.icon;

            return (
              <Link
                key={
                  link.path
                }
                to={
                  link.path
                }
                className="relative rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                {link.badge && (
                  <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}

                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${link.color}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-semibold">
                  {link.label}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {link.sublabel}
                </p>
              </Link>
            );
          }
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Document Status
            </h2>

            <Link
              to="/documents"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                {approvedDocs} in library
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>
                {pendingDocs} awaiting approval
              </span>
            </div>
          </div>

          {docs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No approved documents yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {docs.map(
                doc => (
                  <div
                    key={
                      doc.approval_key ||
                      doc.attachment_id ||
                      doc.document_name
                    }
                    className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {doc.document_name}
                    </span>

                    <span className="rounded-full border bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Available
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Recent Updates
            </h2>

            <Link
              to="/updates"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {updates.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No CRM or Recruit updates yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {updates.map(
                update => (
                  <div
                    key={
                      update.id ||
                      update._id
                    }
                    className={`rounded-lg border p-3 ${
                      update.is_read
                        ? ""
                        : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {update.title}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {update.message}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {recentMessages.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4 text-primary" />
              Recent Messages
            </h2>

            <Link
              to="/messages"
              className="text-xs text-primary hover:underline"
            >
              View Messages
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentMessages.map(
              message => (
                <Link
                  key={
                    message.id
                  }
                  to={
                    message.conversationId
                      ? `/messages/${message.conversationId}`
                      : "/messages"
                  }
                  className="rounded-lg border p-3 transition hover:bg-muted/30"
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {message.senderName}
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm">
                    {message.content ||
                      "New message"}
                  </p>
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}