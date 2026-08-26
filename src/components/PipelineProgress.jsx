// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "../pages/Pipeline";
import { getEnabledPipelineStages } from "@/config/releaseConfig";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

const CATEGORY_COLORS = {
  Hiring: {
    active: "bg-[#6D28D9]",
    done: "bg-[#6D28D9]",
    text: "text-[#6D28D9]",
    light: "bg-[#F5F0FF]",
  },
  Immigration: {
    active: "bg-[#6D28D9]",
    done: "bg-[#6D28D9]",
    text: "text-[#6D28D9]",
    light: "bg-[#F5F0FF]",
  },
  Deployment: {
    active: "bg-[#8B5CF6]",
    done: "bg-[#8B5CF6]",
    text: "text-[#6D28D9]",
    light: "bg-[#F5F0FF]",
  },
  Aftercare: {
    active: "bg-[#C026D3]",
    done: "bg-[#C026D3]",
    text: "text-[#86198F]",
    light: "bg-[#FDF2F8]",
  },
  Reimbursement: {
    active: "bg-[#8B5CF6]",
    done: "bg-[#8B5CF6]",
    text: "text-[#6D28D9]",
    light: "bg-[#F5F0FF]",
  },
  "NCLEX Roadmap": {
    active: "bg-[#C026D3]",
    done: "bg-[#C026D3]",
    text: "text-[#86198F]",
    light: "bg-[#FDF2F8]",
  },
};

const CATEGORY_ORDER = [
  "Hiring",
  "Immigration",
  "Deployment",
  "Aftercare",
  "Reimbursement",
  "NCLEX Roadmap",
];

const createDefaultStages = (email) =>
  (Array.isArray(PIPELINE_STAGES) ? PIPELINE_STAGES : []).map((stage) => ({
    ...stage,
    candidate_email: email,
    status: "Not Started",
    completed_date: null,
  }));

const readSavedStages = (email) => {
  if (!email) return [];

  try {
    const raw = localStorage.getItem(`pipeline_${email}`);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[PipelineProgress] Could not read saved stages:", error);
    return [];
  }
};

const normalizeModuleNames = (data) => {
  const sourceModules = Array.isArray(data?.recruitSourceModules)
    ? data.recruitSourceModules.map((name) =>
        String(name || "").trim().toLowerCase()
      )
    : [];

  return {
    applications:
      data?.recruitModulePresence?.applications === true ||
      sourceModules.includes("applications"),
    candidates:
      data?.recruitModulePresence?.candidates === true ||
      sourceModules.includes("candidates"),
  };
};

const applyRecruitStageRules = (stages, presence) => {
  const today = new Date().toISOString().slice(0, 10);

  return stages.map((stage) => {
    if (stage.stage_name === "Applied") {
      const completed = presence.applications === true;

      return {
        ...stage,
        status: completed ? "Completed" : "Not Started",
        completed_date: completed
          ? stage.completed_date || today
          : null,
      };
    }

    if (stage.stage_name === "Associated with Job") {
      const completed =
        presence.applications === true && presence.candidates === true;

      return {
        ...stage,
        status: completed ? "Completed" : "Not Started",
        completed_date: completed
          ? stage.completed_date || today
          : null,
      };
    }

    return stage;
  });
};

export default function PipelineProgress() {
  const { user } = useAuth();
  const [stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = user?.email ? `pipeline_${user.email}` : null;

  const loadStages = useCallback(
    async ({ refreshRecruit = false } = {}) => {
      if (!user?.email) {
        setStages([]);
        setIsLoading(false);
        return;
      }

      let nextStages = getEnabledPipelineStages(readSavedStages(user.email));

      if (nextStages.length === 0) {
        nextStages = createDefaultStages(user.email);
      }

      /*
       * Keep the first two stages consistent with the full Pipeline page:
       * Applied = email exists in Applications.
       * Associated with Job = email exists in Applications and Candidates.
       */
      const token = localStorage.getItem("icp_auth_token");

      if (token) {
        try {
          const response = await fetch(
            `${API_BASE}/api/zoho/my-deals${refreshRecruit ? "?refresh=true" : ""}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const payload = await response.json();
            const presence = normalizeModuleNames(payload?.data || {});
            nextStages = applyRecruitStageRules(nextStages, presence);

            localStorage.setItem(storageKey, JSON.stringify(nextStages));
          }
        } catch (error) {
          console.warn(
            "[PipelineProgress] Recruit status refresh failed:",
            error.message
          );
        }
      }

      setStages(nextStages);
      setIsLoading(false);
    },
    [storageKey, user?.email]
  );

  useEffect(() => {
    setIsLoading(true);
    loadStages({ refreshRecruit: true });

    const handleStorageChange = (event) => {
      if (!event.key || event.key === storageKey) {
        loadStages();
      }
    };

    const handlePipelineUpdate = () => {
      loadStages();
    };

    const handleFocus = () => {
      loadStages({ refreshRecruit: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadStages();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pipeline-updated", handlePipelineUpdate);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    /*
     * The browser storage event does not fire in the same tab that writes to
     * localStorage. This lightweight check keeps the dashboard card synced
     * when the full Pipeline page updates the stages in the same tab.
     */
    const intervalId = window.setInterval(() => {
      const saved = getEnabledPipelineStages(readSavedStages(user?.email));
      if (saved.length > 0) {
        setStages((current) => {
          const currentJson = JSON.stringify(current);
          const savedJson = JSON.stringify(saved);
          return currentJson === savedJson ? current : saved;
        });
      }
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pipeline-updated", handlePipelineUpdate);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.clearInterval(intervalId);
    };
  }, [loadStages, storageKey, user?.email]);

  const completedCount = useMemo(
    () => stages.filter((stage) => stage.status === "Completed").length,
    [stages]
  );

  const totalCount = stages.length;

  const progressPct =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  const categories = useMemo(
    () =>
      CATEGORY_ORDER.filter((category) =>
        stages.some((stage) => stage.stage_category === category)
      ),
    [stages]
  );

  const renderStageIcon = (stage, colors) => {
    const isActive = stage.status === "In Progress";
    const isDone = stage.status === "Completed";
    const isBlocked = stage.status === "Blocked";

    let IconComponent = Circle;
    let iconClassName = "h-5 w-5 text-muted-foreground/30";
    let tooltipText = `${stage.stage_name} — Not Started`;

    if (isDone) {
      IconComponent = CheckCircle2;
      iconClassName = `h-5 w-5 ${colors.done.replace("bg-", "text-")}`;
      tooltipText = `${stage.stage_name} — Completed`;
    } else if (isActive) {
      IconComponent = Clock;
      iconClassName = `h-5 w-5 ${colors.active.replace("bg-", "text-")}`;
      tooltipText = `${stage.stage_name} — In Progress`;
    } else if (isBlocked) {
      IconComponent = AlertCircle;
      iconClassName = "h-5 w-5 text-red-500";
      tooltipText = `${stage.stage_name} — Blocked`;
    }

    return (
      <div className="relative group" key={`${stage.id}-${stage.stage_name}`}>
        <IconComponent className={iconClassName} />

        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 pointer-events-none">
          <div className="bg-foreground text-background text-[10px] rounded px-2 py-1 whitespace-nowrap max-w-[240px]">
            {tooltipText}
          </div>
        </div>
      </div>
    );
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Your journey stages have not been set up yet.
          </p>
        </div>

        <Link
          to="/pipeline"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Set Up Pipeline
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Pipeline Progress</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {totalCount} stages completed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary">
            {progressPct}%
          </span>

          <Link
            to="/pipeline"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Details
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div
        className={cn(
          "grid gap-3",
          categories.length <= 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        )}
      >
        {categories.map((category) => {
          const categoryStages = stages.filter(
            (stage) => stage.stage_category === category
          );

          const colors =
            CATEGORY_COLORS[category] || CATEGORY_COLORS.Hiring;

          const categoryCompleted = categoryStages.filter(
            (stage) => stage.status === "Completed"
          ).length;

          const categoryTotal = categoryStages.length;
          const isComplete =
            categoryTotal > 0 && categoryCompleted === categoryTotal;

          return (
            <div
              key={category}
              className={cn(
                "rounded-xl p-3 transition-all",
                colors.light,
                isComplete && "ring-1 ring-emerald-300"
              )}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold truncate",
                    colors.text
                  )}
                  title={category}
                >
                  {category === "NCLEX Roadmap"
                    ? "NCLEX"
                    : category}
                </span>

                <span className={cn("text-xs font-medium", colors.text)}>
                  {categoryCompleted}/{categoryTotal}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categoryStages.map((stage) =>
                  renderStageIcon(stage, colors)
                )}
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
