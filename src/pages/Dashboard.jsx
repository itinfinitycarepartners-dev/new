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
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import PipelineProgress from "../components/PipelineProgress";
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

export default function Dashboard() {
  const { user } = useAuth();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState([]);
  const [conversations, setConversations] = useState([]);

  // Pipeline Countdown State
  const [activeStage, setActiveStage] = useState(null);
  const [countdown, setCountdown] = useState({ text: "", color: "", icon: null });

  // Stage-action popup state — only fires once per page load/refresh
  const [showActionPopup, setShowActionPopup] = useState(false);
  const hasShownPopupRef = useRef(false);
  const hasShownToastRef = useRef(false);

  // Persistent inline banner state — stays visible on the page (independent
  // of the popup) until the user dismisses it for this specific stage.
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile", user?.email],
    queryFn: () => base44.entities.CandidateProfile.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["updates", user?.email],
    queryFn: () => base44.entities.CandidateUpdate.filter({ candidate_email: user?.email }, "-created_date", 5),
    enabled: !!user?.email,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", user?.email],
    queryFn: () => base44.entities.CandidateDocument.filter({ candidate_email: user?.email }),
    enabled: !!user?.email,
  });

  const profile = profiles[0];
  const unreadUpdates = updates.filter(u => !u.is_read).length;
  const pendingDocs = docs.filter(d => d.status === "Pending Review").length;
  const approvedDocs = docs.filter(d => d.status === "Approved").length;

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    const updateCountdown = async () => {
      try {
        const token = localStorage.getItem("icp_auth_token");
        if (!token) return;

        const response = await fetch(
          `${API_BASE}/api/pipeline/get?email=${encodeURIComponent(user.email)}&_=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load pipeline");

        const databaseStages = Array.isArray(payload.stages) ? payload.stages : [];
        databaseStages.sort(
          (a, b) => Number(a.stage_order || 0) - Number(b.stage_order || 0)
        );

        const current = databaseStages.find(
          stage => stage.status !== "Completed" && !stage.is_gate
        );

        if (!current) {
          if (!cancelled) {
            setActiveStage(null);
            setCountdown({
              text: "All stages completed",
              standing: "Good Standing",
              color: "text-emerald-700 bg-emerald-100 border-emerald-200",
              icon: CheckCircle2,
            });
          }
          return;
        }

        if (cancelled) return;
        setActiveStage(current);

        const deadline = current.target_date ? new Date(current.target_date) : null;
        if (!deadline || Number.isNaN(deadline.getTime())) {
          setCountdown({
            text: current.started_at ? "Timer is being calculated" : "Waiting for previous stage",
            standing: "Good Standing",
            color: "text-emerald-700 bg-emerald-100 border-emerald-200",
            icon: Clock,
          });
          return;
        }

        const result = formatCountdown(deadline, new Date());
        const durationMs = Math.max(
          HOUR_MS,
          Number(current.duration_hours || 0) * HOUR_MS
        );

        let standing = "Good Standing";
        let color = "text-emerald-700 bg-emerald-100 border-emerald-200";
        let icon = Timer;

        if (result.overdue) {
          standing = "Late";
          color = "text-red-700 bg-red-100 border-red-200";
          icon = AlertCircle;
        } else if (result.remainingMs <= durationMs * 0.25) {
          standing = "At Risk";
          color = "text-amber-700 bg-amber-100 border-amber-200";
          icon = AlertTriangle;
        }

        setCountdown({
          text: `${standing} · ${result.text}`,
          standing,
          color,
          icon,
        });
      } catch (error) {
        console.error("[Dashboard] Error loading database pipeline:", error);
        if (!cancelled) {
          setCountdown({
            text: "Unable to calculate timeline",
            standing: "Late",
            color: "text-red-700 bg-red-100 border-red-200",
            icon: AlertCircle,
          });
        }
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 30 * 1000);
    const handlePipelineUpdate = () => updateCountdown();
    const handleFocus = () => updateCountdown();

    window.addEventListener("pipeline-updated", handlePipelineUpdate);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("pipeline-updated", handlePipelineUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.email]);

  // ─── Stage Action Notifications ──────────────────────────────────────────
  useEffect(() => {
    if (!activeStage || !user?.email) return;

    const guide = STAGE_ACTION_GUIDE[activeStage.stage_name];
    if (!guide) {
      setBannerDismissed(false);
      return;
    }

    // Toast — fires once per page load
    if (!hasShownToastRef.current) {
      toast.warning(guide.message, {
        description: `${activeStage.stage_name} - Action Required`,
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        duration: 10000,
        action: {
          label: guide.cta || "View",
          onClick: () => { window.location.href = "/pipeline"; },
        },
      });
      hasShownToastRef.current = true;
    }

    // Modal popup — fires once per page load
    if (!hasShownPopupRef.current) {
      setShowActionPopup(true);
      hasShownPopupRef.current = true;
    }

    // Persistent banner — respects a per-stage dismissal stored in sessionStorage
    const dismissedForStage = sessionStorage.getItem(bannerDismissKey(user.email, activeStage.stage_name));
    setBannerDismissed(!!dismissedForStage);
  }, [activeStage, user?.email]);

  const dismissActionPopup = () => setShowActionPopup(false);

  const dismissActionBanner = () => {
    if (activeStage && user?.email) {
      sessionStorage.setItem(bannerDismissKey(user.email, activeStage.stage_name), "1");
    }
    setBannerDismissed(true);
  };

  const activeGuide = activeStage ? STAGE_ACTION_GUIDE[activeStage.stage_name] : null;

  // Helper function to get sender display name
  const getSenderDisplayName = (message, conversation) => {
    const currentUserEmail = tokenStorage.get();
    
    if (message.senderEmail === currentUserEmail || message.sender === currentUserEmail) {
      return 'You';
    }
    
    let senderName = message.senderName || message.sender;
    
    if (senderName === 'admin' || senderName === 'Admin' || !senderName || senderName === 'Unknown') {
      const senderEmail = message.senderEmail || message.sender;
      
      if (conversation && conversation.participantNames) {
        if (senderEmail && conversation.participantNames[senderEmail]) {
          senderName = conversation.participantNames[senderEmail];
        } else {
          const currentUserEmail = tokenStorage.get();
          const otherParticipant = conversation.participants?.find(email => email !== currentUserEmail);
          if (otherParticipant && conversation.participantNames[otherParticipant]) {
            senderName = conversation.participantNames[otherParticipant];
          }
        }
      }
      
      if (senderName === 'admin' || senderName === 'Admin' || senderName === 'Unknown') {
        if (senderEmail) {
          senderName = senderEmail.split('@')[0];
        }
      }
    }
    
    return senderName || 'User';
  };

  const getConversationName = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.groupName || 'Group Chat';
    }
    const currentUserEmail = tokenStorage.get();
    const otherUser = conversation.participants?.find(
      (email) => email !== currentUserEmail
    );
    
    if (otherUser && conversation.participantNames && conversation.participantNames[otherUser]) {
      return conversation.participantNames[otherUser];
    }
    
    return otherUser?.split('@')[0] || 'Chat';
  };

  // ─── Messaging ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadMessagingData = async () => {
      try {
        const token = tokenStorage.get();
        if (!token) return;

        const convResponse = await messaging.getConversations(10);
        if (convResponse.success) {
          const convs = convResponse.conversations || [];
          setConversations(convs);
          
          const totalUnread = convs.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          setUnreadMessageCount(totalUnread);

          const recent = convs
            .filter(conv => conv.lastMessage)
            .slice(0, 3)
            .map(conv => {
              const lastMsg = conv.lastMessage;
              const senderName = getSenderDisplayName(lastMsg, conv);
              const conversationName = getConversationName(conv);
              
              return {
                ...lastMsg,
                conversationId: conv._id,
                conversationName: conversationName,
                senderName: senderName,
                senderEmail: lastMsg?.senderEmail || lastMsg?.sender,
              };
            });
          setRecentMessages(recent);
        }
      } catch (error) {
        console.error('Failed to load messaging data:', error);
      }
    };

    loadMessagingData();

    const handleNewMessage = (message) => {
      setUnreadMessageCount(prev => prev + 1);
      
      const conversation = conversations.find(c => c._id === message.conversationId);
      let senderName = getSenderDisplayName(message, conversation);
      let conversationName = conversation ? getConversationName(conversation) : 'Chat';
      
      setRecentMessages(prev => {
        const existingIndex = prev.findIndex(m => m.conversationId === message.conversationId);
        
        const newMessage = {
          ...message,
          conversationId: message.conversationId,
          conversationName: conversationName,
          senderName: senderName,
          senderEmail: message.senderEmail || message.sender,
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          updated.splice(existingIndex, 1);
          return [newMessage, ...updated];
        } else {
          return [newMessage, ...prev.slice(0, 2)];
        }
      });
    };

    websocket.on('new_message', handleNewMessage);

    return () => {
      websocket.off('new_message', handleNewMessage);
    };
  }, [conversations]);

  const getTimeAgo = (date) => {
    if (!date) return '';
    try {
      return moment(date).fromNow();
    } catch {
      return '';
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const quickLinks = [
    { path: "/documents", label: "Documents", sublabel: `${pendingDocs} pending`, icon: FileText, color: "bg-blue-50 text-blue-600" },
    { path: "/updates", label: "Updates", sublabel: `${unreadUpdates} unread`, icon: Bell, color: "bg-amber-50 text-amber-600" },
    { 
      path: "/messages", 
      label: "Messages", 
      sublabel: `${unreadMessageCount} unread`, 
      icon: MessageCircle, 
      color: "bg-purple-50 text-purple-600",
      badge: unreadMessageCount > 0 
    },
    { path: "/welcome-packet", label: "Welcome Packet", sublabel: "View itinerary", icon: Briefcase, color: "bg-indigo-50 text-indigo-600" },
    { path: "/relocation", label: "Relocation Hub", sublabel: profile?.destination_city || "View info", icon: MapPin, color: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* STICKY ACTION BANNER - Always visible at the top */}
      {activeStage && activeGuide && !bannerDismissed && (
        <StickyActionBanner
          stage={activeStage}
          guide={activeGuide}
          onDismiss={dismissActionBanner}
        />
      )}

      {/* Stage Action Popup — shows on every page load/refresh */}
      {showActionPopup && (
        <StageActionPopup
          stage={activeStage}
          guide={activeGuide}
          onDismiss={dismissActionPopup}
        />
      )}

      {/* Welcome Banner with Countdown */}
      <div className="bg-gradient-to-br from-primary/10 via-accent to-primary/5 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {greeting()}, {profile?.full_name || user?.full_name || "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.status ? (
              <span>Your status: <StatusBadge status={profile.status} /></span>
            ) : (
              "Welcome to your candidate portal. Start by completing your profile."
            )}
          </p>
          {profile?.deployment_date && (
            <p className="text-sm text-muted-foreground mt-3">
              <Clock className="h-4 w-4 inline mr-1" />
              Deployment: {moment(profile.deployment_date).format("MMMM D, YYYY")} — {moment(profile.deployment_date).fromNow()}
            </p>
          )}
        </div>

        {/* Active Stage Countdown */}
        {activeStage && (
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm min-w-[280px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Stage
              </p>
              <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1">
                View <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="font-medium text-foreground mb-3 line-clamp-1" title={activeStage.stage_name}>
              {activeStage.stage_name}
            </p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border font-medium ${countdown.color}`}>
              {countdown.icon && <countdown.icon className="h-4 w-4" />}
              {countdown.text}
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Progress */}
      <PipelineProgress />

      {/* Stage Contact */}
      <StageContact />

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {quickLinks.map(link => {
          const Icon = link.icon;
          return (
            <Link 
              key={link.path} 
              to={link.path} 
              className="group bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative"
            >
              {link.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
              <div className={`h-10 w-10 rounded-lg ${link.color} flex items-center justify-center mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">{link.label}</p>
              <p className="text-xs text-muted-foreground">{link.sublabel}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Messages Section */}
      {recentMessages.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-500" />
              Recent Messages
            </h2>
            <Link to="/messages" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMessages.map((msg, index) => (
              <Link 
                key={index} 
                to={`/messages/${msg.conversationId}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                    {msg.conversationName?.charAt(0).toUpperCase() || '?'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{msg.conversationName}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {getTimeAgo(msg.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {msg.senderName !== 'You' && (
                        <span className="font-medium text-foreground">{msg.senderName}: </span>
                      )}
                      {msg.content?.substring(0, 40)}{msg.content?.length > 40 ? '...' : ''}
                    </span>
                    {!msg.isRead && msg.senderEmail !== tokenStorage.get() && (
                      <span className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full"></span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {unreadMessageCount > recentMessages.length && (
            <div className="text-center mt-3">
              <Link to="/messages" className="text-sm text-primary hover:underline">
                +{unreadMessageCount - recentMessages.length} more unread messages
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Document Overview & Recent Updates */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Document Status</h2>
            <Link to="/documents" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" style={{ color: '#6fb04f' }} />
              <span>{approvedDocs} approved</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>{pendingDocs} pending</span>
            </div>
          </div>
          {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
          <div className="space-y-2">
            {docs.slice(0, 4).map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm truncate flex-1">{doc.document_name}</span>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Updates</h2>
            <Link to="/updates" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {updates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
          <div className="space-y-3">
            {updates.slice(0, 4).map(update => (
              <div key={update.id} className={`p-3 rounded-lg border ${!update.is_read ? "bg-accent/50 border-primary/20" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{update.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{update.message}</p>
                  </div>
                  <StatusBadge status={update.update_type} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{moment(update.created_date).fromNow()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action: New Message Button */}
      <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-50">
        <Link
          to="/messages"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Messages</span>
          {unreadMessageCount > 0 && (
            <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center ml-1">
              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}