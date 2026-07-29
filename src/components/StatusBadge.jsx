import { cn } from "@/lib/utils";

const variants = {
  "Pre-Deployment": "bg-amber-50 text-amber-700 border-amber-200",
  "In Transit": "bg-blue-50 text-blue-700 border-blue-200",
  "Arrived": "bg-green-50 text-green-700 border-green-200",
  "Onboarding": "bg-purple-50 text-purple-700 border-purple-200",
  "Active": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pending Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Approved": "bg-green-50 text-green-700 border-green-200",
  "Rejected": "bg-red-50 text-red-700 border-red-200",
  "Expired": "bg-gray-50 text-gray-500 border-gray-200",
  "Info": "bg-blue-50 text-blue-700 border-blue-200",
  "Action Required": "bg-red-50 text-red-700 border-red-200",
  "Milestone": "bg-green-50 text-green-700 border-green-200",
  "Reminder": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[status] || "bg-muted text-muted-foreground border-border")}>
      {status}
    </span>
  );
}