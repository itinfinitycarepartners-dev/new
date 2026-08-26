import { cn } from "@/lib/utils";

const variants = {
  "Pre-Deployment": "bg-[#F5F0FF] text-[#3B0764] border-[#E8E1F2]",
  "In Transit": "bg-[#F5F0FF] text-[#6D28D9] border-[#E8E1F2]",
  "Arrived": "bg-[#FDF2F8] text-[#86198F] border-[#E8E1F2]",
  "Onboarding": "bg-[#F5F0FF] text-[#6D28D9] border-[#E8E1F2]",
  "Active": "bg-[#FDF2F8] text-[#86198F] border-[#E8E1F2]",
  "Pending Review": "bg-[#F5F0FF] text-[#3B0764] border-[#E8E1F2]",
  "Approved": "bg-[#FDF2F8] text-[#86198F] border-[#E8E1F2]",
  "Rejected": "bg-[#FDF2F8] text-[#86198F] border-[#E8E1F2]",
  "Expired": "bg-[#F5F0FF] text-[#64748B] border-[#E8E1F2]",
  "Info": "bg-[#F5F0FF] text-[#6D28D9] border-[#E8E1F2]",
  "Action Required": "bg-[#FDF2F8] text-[#86198F] border-[#E8E1F2]",
  "Milestone": "bg-[#FDF2F8] text-[#86198F] border-[#E8E1F2]",
  "Reminder": "bg-[#F5F0FF] text-[#3B0764] border-[#E8E1F2]",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[status] || "bg-muted text-muted-foreground border-border")}>
      {status}
    </span>
  );
}