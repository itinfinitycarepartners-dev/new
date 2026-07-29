// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { ClipboardList, Bell, CheckCircle2, Star, ChevronRight, X, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="focus:outline-none">
          <Star className={cn("h-6 w-6 transition-colors", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

function SurveyModal({ survey, onClose, onSubmit, isSubmitting }) {
  const [answers, setAnswers] = useState(
    (survey.questions || []).map(q => ({ question: q.question, answer: "" }))
  );
  const [overallRating, setOverallRating] = useState(0);

  const handleAnswer = (idx, val) => {
    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, answer: val } : a));
  };

  const handleSubmit = () => {
    onSubmit({ answers, overall_rating: overallRating });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">{survey.title}</h2>
            {survey.phase && <p className="text-xs text-muted-foreground mt-0.5">{survey.phase}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {survey.description && (
            <p className="text-sm text-muted-foreground">{survey.description}</p>
          )}
          {(survey.questions || []).map((q, idx) => (
            <div key={idx} className="space-y-2">
              <label className="text-sm font-medium">{q.question}</label>
              {q.type === "rating" ? (
                <StarRating value={parseInt(answers[idx]?.answer) || 0} onChange={v => handleAnswer(idx, String(v))} />
              ) : q.type === "yes_no" ? (
                <div className="flex gap-3">
                  {["Yes", "No"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAnswer(idx, opt)}
                      className={cn("px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors", answers[idx]?.answer === opt ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Your answer..."
                  value={answers[idx]?.answer || ""}
                  onChange={e => handleAnswer(idx, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="space-y-2">
            <label className="text-sm font-medium">Overall Experience Rating</label>
            <StarRating value={overallRating} onChange={setOverallRating} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Survey
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Aftercare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSurvey, setActiveSurvey] = useState(null);

  const { data: surveys = [], isLoading: loadingSurveys } = useQuery({
    queryKey: ["aftercare-surveys"],
    queryFn: () => base44.entities.AftercareSurvey.filter({ status: "Active" }),
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["aftercare-responses", user?.email],
    queryFn: () => base44.entities.AftercareSurveyResponse.filter({ candidate_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["aftercare-updates", user?.email],
    queryFn: () => base44.entities.CandidateUpdate.filter({ candidate_email: user?.email }),
    enabled: !!user?.email,
  });

  const submitResponse = useMutation({
    mutationFn: (data) => base44.entities.AftercareSurveyResponse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aftercare-responses", user?.email] });
      setActiveSurvey(null);
    },
  });

  const respondedIds = new Set(responses.map(r => r.survey_id));
  const pendingSurveys = surveys.filter(s => !respondedIds.has(s.id));
  const completedSurveys = surveys.filter(s => respondedIds.has(s.id));

  const handleSubmit = ({ answers, overall_rating }) => {
    submitResponse.mutate({
      candidate_email: user.email,
      survey_id: activeSurvey.id,
      survey_title: activeSurvey.title,
      answers,
      overall_rating,
      submitted_at: new Date().toISOString(),
    });
  };

  const postArrivalUpdates = updates.filter(u =>
    u.update_type === "Info" || u.update_type === "Milestone" || u.update_type === "Reminder"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aftercare</h1>
        <p className="text-sm text-muted-foreground">Post-arrival support, check-ins, and surveys</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{pendingSurveys.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Surveys Pending</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{responses.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{postArrivalUpdates.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Updates</p>
        </div>
      </div>

      {/* Pending Surveys */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Pending Surveys</h2>
          {pendingSurveys.length > 0 && (
            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{pendingSurveys.length}</span>
          )}
        </div>
        {loadingSurveys ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : pendingSurveys.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending surveys at this time.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingSurveys.map(survey => (
              <div key={survey.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{survey.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {survey.phase && <span className="text-xs text-muted-foreground">{survey.phase}</span>}
                    {survey.due_date && (
                      <span className="text-xs text-amber-600">Due {format(new Date(survey.due_date), "MMM d")}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" onClick={() => setActiveSurvey(survey)}>
                  Start <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Surveys */}
      {completedSurveys.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-sm">Completed Surveys</h2>
          </div>
          <div className="divide-y divide-border">
            {completedSurveys.map(survey => {
              const resp = responses.find(r => r.survey_id === survey.id);
              return (
                <div key={survey.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{survey.title}</p>
                    {resp?.submitted_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {format(new Date(resp.submitted_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  {resp?.overall_rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-amber-400" />
                      <span className="text-sm font-medium">{resp.overall_rating}/5</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post-arrival updates */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Post-Arrival Updates</h2>
        </div>
        {postArrivalUpdates.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {postArrivalUpdates.map(update => (
              <div key={update.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{update.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{update.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(update.created_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <StatusBadge status={update.update_type} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSurvey && (
        <SurveyModal
          survey={activeSurvey}
          onClose={() => setActiveSurvey(null)}
          onSubmit={handleSubmit}
          isSubmitting={submitResponse.isPending}
        />
      )}
    </div>
  );
}