// @ts-nocheck
// src/pages/BehavioralAssessmentForm.jsx
import React, { useState } from "react";
import { CheckCircle2, FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const SUBMIT_TIMEOUT_MS = 70000;
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
export const BehavioralAssessmentForm = ({ onClose, user }) => {
  const [behavioralAssessment, setBehavioralAssessment] = useState(createEmptyBehavioralAssessment);
  const [submitting, setSubmitting] = useState(false);
  const updateField = (field, value) => {
    setBehavioralAssessment(previous => ({
      ...previous,
      [field]: value
    }));
  };
  const toggleArrayValue = (field, value, maxSelections = null) => {
    setBehavioralAssessment(previous => {
      const current = Array.isArray(previous[field]) ? previous[field] : [];
      if (current.includes(value)) {
        return {
          ...previous,
          [field]: current.filter(item => item !== value)
        };
      }
      if (maxSelections && current.length >= maxSelections) {
        toast.error(`Select no more than ${maxSelections} options.`);
        return previous;
      }
      return {
        ...previous,
        [field]: [...current, value]
      };
    });
  };
  const isComplete = () => {
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
  const persistLocalNotification = (data, submittedAt) => {
    if (typeof window === "undefined") return;
    try {
      const fallbackNotification = {
        id: data?.notificationId || `local-behavioral-${Date.now()}`,
        title: "Behavioral Assessment",
        message: `Behavioral Assessment was submitted successfully on ${submittedAt}.`,
        update_type: "form-submission",
        form_type: "behavioral",
        form_title: "Behavioral Assessment",
        status: "submitted",
        submitted_at: submittedAt,
        created_date: submittedAt,
        created_at: submittedAt,
        is_read: false
      };
      const notification = data?.notification || fallbackNotification;
      const normalized = {
        ...notification,
        id: String(notification.id || fallbackNotification.id),
        candidate_email: String(user?.email || "").trim().toLowerCase(),
        submitted_at: notification.submitted_at || submittedAt,
        created_date: notification.created_date || notification.submitted_at || submittedAt,
        created_at: notification.created_at || notification.submitted_at || submittedAt,
        is_read: false
      };
      const storageKey = "icp_local_form_notifications";
      const existing = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      const merged = [normalized, ...(Array.isArray(existing) ? existing : [])]
        .filter((item, index, array) =>
          index === array.findIndex(other => String(other?.id || "") === String(item?.id || ""))
        )
        .slice(0, 50);
      window.localStorage.setItem(storageKey, JSON.stringify(merged));
      const eventDetail = {
        email: user?.email || "",
        section: "Behavioral Assessment",
        formKey: "behavioral",
        submittedAt,
        notification: normalized
      };
      window.dispatchEvent(new CustomEvent("candidate-data-updated", { detail: eventDetail }));
      window.dispatchEvent(new CustomEvent("pipeline-updated", { detail: eventDetail }));
      window.dispatchEvent(new CustomEvent("candidate-notification-created", { detail: normalized }));
    } catch (error) {
      console.warn("[Behavioral Assessment] Could not persist local notification receipt:", error);
    }
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (!isComplete()) {
      toast.error("Please complete every Behavioral Assessment question before submitting.");
      return;
    }
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) {
      toast.error("Your candidate email could not be identified. Please sign in again.");
      return;
    }
    const token = localStorage.getItem("icp_auth_token");
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      const submittedAtClient = new Date().toISOString();
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(`${API_BASE}/api/deployment/behavioral-assessment`, {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify({
            candidateEmail: email,
            answers: behavioralAssessment,
            submittedAt: submittedAtClient
          })
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true || data.attachmentVerified !== true) {
        throw new Error(
          data.error ||
          "The Behavioral Assessment PDF was not verified in the candidate's CRM Deal attachments."
        );
      }
      const submittedAt = data.submittedAt || submittedAtClient;
      // The server notification is authoritative when available. The local receipt
      // guarantees that the Updates page can show the submission immediately even
      // if the notification write is temporarily unavailable.
      persistLocalNotification(data, submittedAt);
      // CRM has accepted the attachment. Close immediately; Forms.jsx displays
      // the success message and Updates.jsx already has the local notification.
      onClose?.({
        formTitle: "Behavioral Assessment",
        submittedAt,
        crmVerified: true,
        notificationSaved: data.notificationSaved === true
      });
    } catch (error) {
      console.error("[Behavioral Assessment] Submission error:", error);
      toast.error(error?.message || "Failed to submit Behavioral Assessment");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "space-y-5 overflow-y-auto pr-2",
        submitting && "opacity-60 pointer-events-none"
      )}
    >
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <h2 className="text-lg font-semibold text-blue-900">Behavioral Assessment</h2>
        <p className="mt-1 text-sm text-blue-800">
          Complete all questions. Your answers will be saved to Zoho CRM and a notification will be added to Updates after successful submission.
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">1. Select exactly 5 words that describe you best at work.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {BEHAVIORAL_ASSESSMENT_WORDS.map(word => (
              <label key={`best-${word}`} className="flex items-center gap-2 text-xs border rounded-md p-2 bg-white">
                <input
                  type="checkbox"
                  checked={behavioralAssessment.bestWords.includes(word)}
                  onChange={() => toggleArrayValue("bestWords", word, 5)}
                  disabled={submitting}
                />
                {word}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Selected: {behavioralAssessment.bestWords.length}/5</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">2. Select exactly 5 words that least describe you at work.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {BEHAVIORAL_ASSESSMENT_WORDS.map(word => (
              <label key={`least-${word}`} className="flex items-center gap-2 text-xs border rounded-md p-2 bg-white">
                <input
                  type="checkbox"
                  checked={behavioralAssessment.leastWords.includes(word)}
                  onChange={() => toggleArrayValue("leastWords", word, 5)}
                  disabled={submitting}
                />
                {word}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Selected: {behavioralAssessment.leastWords.length}/5</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-800">3. Select how much you agree or disagree with each statement.</p>
          {BEHAVIORAL_STATEMENTS.map(statement => (
            <div key={statement}>
              <label className="text-xs text-gray-700 block mb-1">{statement}</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={behavioralAssessment.statements[statement]}
                onChange={event =>
                  setBehavioralAssessment(previous => ({
                    ...previous,
                    statements: {
                      ...previous.statements,
                      [statement]: event.target.value
                    }
                  }))
                }
                disabled={submitting}
              >
                <option value="">Select response</option>
                {BEHAVIORAL_AGREEMENT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
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
            <label className="text-sm font-semibold text-gray-800 block mb-1">{question}</label>
            <textarea
              className="w-full min-h-[90px] border rounded-md px-3 py-2 text-sm"
              value={behavioralAssessment[field]}
              onChange={event => updateField(field, event.target.value)}
              disabled={submitting}
            />
          </div>
        ))}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">8. Select all strategies you use to create and maintain work-life balance as a nurse.</p>
          <div className="space-y-2">
            {BEHAVIORAL_WORK_LIFE_OPTIONS.map(option => (
              <label key={option} className="flex items-start gap-2 text-xs border rounded-md p-2 bg-white">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={behavioralAssessment.workLifeBalance.includes(option)}
                  onChange={() => toggleArrayValue("workLifeBalance", option)}
                  disabled={submitting}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1">9. Describe a specific situation in your nursing career where you demonstrated compassion.</label>
          <textarea
            className="w-full min-h-[110px] border rounded-md px-3 py-2 text-sm"
            value={behavioralAssessment.compassionExample}
            onChange={event => updateField("compassionExample", event.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-1">10. Why did you choose to become a nurse?</label>
          <textarea
            className="w-full min-h-[110px] border rounded-md px-3 py-2 text-sm"
            value={behavioralAssessment.nursingMotivation}
            onChange={event => updateField("nursingMotivation", event.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !isComplete()}
          className="min-w-[150px] gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileCheck className="h-4 w-4" />
              Submit and close
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
export default BehavioralAssessmentForm;