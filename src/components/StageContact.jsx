// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Mail, Phone, Calendar, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StageContact() {
  const { user } = useAuth();

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile", user?.email],
    queryFn: () => base44.entities.CandidateProfile.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const profile = profiles[0];

  // Safety check: if profile or stage doesn't exist, don't render
  if (!profile) {
    return null;
  }

  // Get stage safely with fallback
  const currentStage = profile.stage || profile.status || "Application Submitted";
  
  // Ensure it's a string before calling toLowerCase
  const stageName = typeof currentStage === 'string' ? currentStage : String(currentStage);

  // Define contact info based on stage - add safety checks
  const getContactInfo = () => {
    const stage = stageName.toLowerCase();
    
    // Hiring stage contacts
    if (stage.includes("screening") || stage.includes("interview") || stage.includes("assessment")) {
      return {
        name: "Recruitment Team",
        email: "Recruiting@Infinitycarepartners.com",
        role: "Recruitment Specialist",
        message: "Need help with your interview or assessment? Contact our recruitment team.",
        action: "Schedule Interview",
        actionLink: "/calendar"
      };
    }
    
    // Immigration stage contacts
    if (stage.includes("visa") || stage.includes("credential") || stage.includes("license") || stage.includes("nclex")) {
      return {
        name: "Immigration Services",
        email: "immigration@infinitycarepartners.com",
        role: "Immigration Coordinator",
        message: "Questions about your visa, credential evaluation, or licensing? Our immigration team is here to help.",
        action: "Upload Documents",
        actionLink: "/documents"
      };
    }
    
    // Deployment stage contacts
    if (stage.includes("flight") || stage.includes("housing") || stage.includes("arrival") || stage.includes("orientation")) {
      return {
        name: "Deployment Services",
        email: "Deployment@Infinitycarepartners.com",
        role: "Deployment Coordinator",
        message: "Need assistance with travel, housing, or orientation? Contact our deployment team.",
        action: "View Itinerary",
        actionLink: "/relocation"
      };
    }
    
    // Default contact
    return {
      name: "Support Team",
      email: "info@infinitycarepartners.com",
      role: "Candidate Support",
      message: "Have questions about your application? Our support team is ready to assist you.",
      action: "Contact Support",
      actionLink: "/updates"
    };
  };

  const contact = getContactInfo();
  const phoneNumber = "+1 615-881-5321";

  return (
    <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl border border-border p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{contact.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {contact.role}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{contact.message}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                {contact.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:+16158815321`} className="text-primary hover:underline">
                {phoneNumber}
              </a>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <a href={contact.actionLink}>
            {contact.action}
            <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </div>
    </div>
  );
}