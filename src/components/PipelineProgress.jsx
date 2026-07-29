// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Loader2, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Import the stages from Pipeline component
import { PIPELINE_STAGES } from "../pages/Pipeline";

const CATEGORY_COLORS = {
  Hiring: { active: "bg-blue-500", done: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" },
  Immigration: { active: "bg-purple-500", done: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50" },
  Deployment: { active: "bg-emerald-500", done: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" },
  Aftercare: { active: "bg-rose-500", done: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50" },
  "NCLEX Roadmap": { active: "bg-amber-500", done: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" },
};

export default function PipelineProgress() {
  const { user } = useAuth();
  const [stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStages = () => {
      if (user?.email) {
        const savedStages = localStorage.getItem(`pipeline_${user.email}`);
        if (savedStages) {
          const parsed = JSON.parse(savedStages);
          if (parsed.length > 0) {
            setStages(parsed);
          }
        }
      }
      setIsLoading(false);
    };
    
    loadStages();
    
    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === `pipeline_${user?.email}`) {
        loadStages();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.email]);

  // Get status for a stage by name
  const getStatus = (stageName) => {
    const found = stages.find(s => s.stage_name === stageName);
    return found?.status || "Not Started";
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-center h-28">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Pipeline Progress</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your journey stages haven't been set up yet.</p>
        </div>
        <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1">
          Set Up Pipeline <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const completedCount = stages.filter(s => s.status === "Completed").length;
  const totalCount = stages.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Get unique categories from stages, maintaining order: Hiring, Immigration, Deployment, Aftercare, NCLEX Roadmap
  const categoryOrder = ["Hiring", "Immigration", "Deployment", "Aftercare", "NCLEX Roadmap"];
  const categories = categoryOrder.filter(cat => stages.some(s => s.stage_category === cat));

  // Get stage details for tooltip
  const getStageDetails = (stageName) => {
    return stages.find(s => s.stage_name === stageName);
  };

  // Render icon for a stage
  const renderStageIcon = (stage, colors) => {
    const status = stage.status;
    const isActive = status === "In Progress";
    const isDone = status === "Completed";
    const isBlocked = status === "Blocked";
    const isNotStarted = status === "Not Started";

    let IconComponent;
    let iconClassName = "h-5 w-5";
    let tooltipText = stage.stage_name;
    
    if (isDone) {
      IconComponent = CheckCircle2;
      iconClassName += ` ${colors.done.replace("bg-", "text-")}`;
      tooltipText = `${stage.stage_name} ✅ Completed`;
    } else if (isActive) {
      IconComponent = Clock;
      iconClassName += ` ${colors.active.replace("bg-", "text-")}`;
      tooltipText = `${stage.stage_name} ⏳ In Progress`;
    } else if (isBlocked) {
      IconComponent = AlertCircle;
      iconClassName += " text-red-500";
      tooltipText = `${stage.stage_name} ⛔ Blocked`;
    } else {
      IconComponent = Circle;
      iconClassName += " text-muted-foreground/30";
      tooltipText = `${stage.stage_name} ⚪ Not Started`;
    }

    return (
      <div className="relative group" key={stage.id}>
        <IconComponent className={iconClassName} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
          <div className="bg-foreground text-background text-[10px] rounded px-2 py-1 whitespace-nowrap max-w-[200px] truncate">
            {tooltipText}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Pipeline Progress</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {totalCount} stages completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary">{progressPct}%</span>
          <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1">
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="grid grid-cols-5 gap-3">
        {categories.map(cat => {
          const catStages = stages.filter(s => s.stage_category === cat);
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Hiring;
          const catCompleted = catStages.filter(s => s.status === "Completed").length;
          const catTotal = catStages.length;
          const isComplete = catCompleted === catTotal && catTotal > 0;

          return (
            <div key={cat} className={cn("rounded-xl p-3 transition-all", colors.light, isComplete && "ring-1 ring-emerald-300")}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-xs font-semibold", colors.text)}>
                  {cat === "NCLEX Roadmap" ? "🎓 NCLEX" : cat}
                </span>
                <span className={cn("text-xs font-medium", colors.text)}>
                  {catCompleted}/{catTotal}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catStages.map((stage) => renderStageIcon(stage, colors))}
              </div>
              {isComplete && (
                <div className="mt-1.5 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
          <span className="text-xs text-muted-foreground">Not Started</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs text-muted-foreground">Blocked</span>
        </div>
      </div>
    </div>
  );
}