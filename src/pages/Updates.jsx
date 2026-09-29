// @ts-nocheck
// src/pages/Updates.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCircle,
  Edit,
  Info,
  Loader2,
  RefreshCw,
  PlaneLanding,
  AlertTriangle
} from "lucide-react";
import { tokenStorage, websocket } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTO_REFRESH_MS = 10000;

const getUpdateIcon = type => {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "arrival") return <PlaneLanding className="h-5 w-5 text-blue-500" />;
  if (normalized === "add") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (normalized === "edit") return <Edit className="h-5 w-5 text-amber-500" />;
  if (normalized === "rfe" || normalized === "stage") return <AlertTriangle className="h-5 w-5 text-orange-500" />;
  if (normalized === "form-submission") return <CheckCircle className="h-5 w-5 text-green-500" />;
  return <Info className="h-5 w-5 text-gray-400" />;
};

const formatDate = value => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(Math.max(diffMs, 0) / 60000);
  const hours = Math.floor(Math.max(diffMs, 0) / 3600000);
  const days = Math.floor(Math.max(diffMs, 0) / 86400000);

  let relative = "Just now";
  if (mins >= 1 && mins < 60) {
    relative = `${mins} min ago`;
  } else if (hours >= 1 && hours < 24) {
    relative = `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (days >= 1) {
    relative = `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const absolute = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });

  return `${absolute} • ${relative}`;
};

export default function Updates() {
  const [updates, setUpdates] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlightRef = useRef(false);
  const knownIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);
  const observerRef = useRef(null);
  const readInFlightRef = useRef(new Set());

  const markOneRead = useCallback(async update => {
    const id = String(update?.id || update?._id || "").trim();
    if (!id || update?.is_read === true || readInFlightRef.current.has(id)) return;
    const token = tokenStorage.get();
    if (!token) return;
    readInFlightRef.current.add(id);
    try {
      const response = await fetch(`${API_BASE}/api/updates/${encodeURIComponent(id)}/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Unable to mark notification as read.");
      const payload = await response.json().catch(() => ({}));
      setUpdates(previous => previous.map(item =>
        String(item?.id || item?._id || "") === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
      ));
      if (Number.isFinite(Number(payload.unread))) setUnread(Math.max(0, Number(payload.unread)));
      else setUnread(previous => Math.max(0, previous - 1));
      window.dispatchEvent(new CustomEvent("updates-read", { detail: { id, unread: payload.unread } }));
    } catch (error) {
      console.warn("[Updates] Could not mark notification read:", error.message);
    } finally {
      readInFlightRef.current.delete(id);
    }
  }, []);

  const loadUpdates = useCallback(async ({ refreshZoho = false, silent = false } = {}) => {
    const token = tokenStorage.get();
    if (!token) { setLoading(false); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (refreshZoho) {
        await fetch(`${API_BASE}/api/zoho/my-deals?refresh=true&_=${Date.now()}`, {
          cache: "no-store", headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
      }
      const response = await fetch(`${API_BASE}/api/updates?limit=100&_=${Date.now()}`, {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || payload.message || "Unable to load updates.");
      const serverUpdates = Array.isArray(payload.updates) ? payload.updates : [];
      let localUpdates = [];
      try {
        const stored = JSON.parse(window.localStorage.getItem("icp_local_form_notifications") || "[]");
        const currentEmail = String(tokenStorage.getUser?.()?.email || "").trim().toLowerCase();
        localUpdates = (Array.isArray(stored) ? stored : []).filter(item => {
          if (!currentEmail) return true;
          return !item?.candidate_email || String(item.candidate_email).trim().toLowerCase() === currentEmail;
        });
      } catch (_) {
        localUpdates = [];
      }
      const byId = new Map();
      [...localUpdates, ...serverUpdates].forEach(item => {
        const id = String(item?.id || item?._id || `${item?.form_type || "update"}-${item?.submitted_at || item?.created_at || ""}`);
        if (!byId.has(id)) byId.set(id, item);
      });
      const nextUpdates = Array.from(byId.values()).sort((a, b) => {
        const aTime = new Date(a?.submitted_at || a?.submittedAt || a?.created_at || a?.created_date || 0).getTime();
        const bTime = new Date(b?.submitted_at || b?.submittedAt || b?.created_at || b?.created_date || 0).getTime();
        return bTime - aTime;
      });
      const previousIds = knownIdsRef.current;
      const newUnread = nextUpdates.filter(
        item =>
          !item.is_read &&
          !previousIds.has(String(item.id || item._id))
      ).length;

      setUpdates(nextUpdates);

      // The server count is authoritative for persisted notifications. Add any
      // local-only form receipts that are not already represented by the server.
      const serverIds = new Set(
        serverUpdates.map(item => String(item?.id || item?._id || "")).filter(Boolean)
      );
      const localOnlyUnread = localUpdates.filter(
        item =>
          !item?.is_read &&
          !serverIds.has(String(item?.id || item?._id || ""))
      ).length;

      setUnread(
        Math.max(
          0,
          Number(payload.unread || 0) + localOnlyUnread
        )
      );
      knownIdsRef.current = new Set(nextUpdates.map(item => String(item.id || item._id || "")).filter(Boolean));

      if (!firstLoadRef.current && newUnread > 0) {
        const newest = nextUpdates.find(item => !item.is_read && !previousIds.has(String(item.id || item._id)));
        toast.info(newUnread === 1 ? (newest?.title || "New notification") : `${newUnread} new notifications`, {
          description: newest?.message || "You have a new update."
        });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification(newest?.title || "New notification", { body: newest?.message || "You have a new update." }); } catch (_) {}
        }
      }
      firstLoadRef.current = false;
    } catch (error) {
      if (!silent) throw error;
      console.warn("[Updates] Background refresh failed:", error.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadUpdates();
    const handleUpdate = () => loadUpdates({ silent: true });
    const handleNotificationCreated = event => {
      const notification = event?.detail;
      if (!notification) return;
      setUpdates(previous => {
        const id = String(notification.id || `local-${Date.now()}`);
        if (previous.some(item => String(item?.id || item?._id || "") === id)) return previous;
        return [notification, ...previous].sort((a, b) => {
          const aTime = new Date(a?.submitted_at || a?.created_at || a?.created_date || 0).getTime();
          const bTime = new Date(b?.submitted_at || b?.created_at || b?.created_date || 0).getTime();
          return bTime - aTime;
        });
      });
      setUnread(previous => previous + (notification.is_read ? 0 : 1));
    };
    const handleVisible = () => { if (document.visibilityState === "visible") loadUpdates({ silent: true }); };
    window.addEventListener("candidate-data-updated", handleUpdate);
    window.addEventListener("pipeline-updated", handleUpdate);
    window.addEventListener("candidate-notification-created", handleNotificationCreated);
    window.addEventListener("crm-recruit-updated", handleUpdate);
    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);
    websocket?.on?.("candidate-data-updated", handleUpdate);
    websocket?.on?.("pipeline-updated", handleUpdate);
    websocket?.on?.("crm-recruit-updated", handleUpdate);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadUpdates({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("candidate-data-updated", handleUpdate);
      window.removeEventListener("pipeline-updated", handleUpdate);
      window.removeEventListener("candidate-notification-created", handleNotificationCreated);
      window.removeEventListener("crm-recruit-updated", handleUpdate);
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
      websocket?.off?.("candidate-data-updated", handleUpdate);
      websocket?.off?.("pipeline-updated", handleUpdate);
      websocket?.off?.("crm-recruit-updated", handleUpdate);
    };
  }, [loadUpdates]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      // Ask only after the user has reached the notification page.
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    observerRef.current?.disconnect?.();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) markOneRead(entry.target.__updateRecord);
      });
    }, { threshold: 0.55, rootMargin: "0px 0px -10% 0px" });
    observerRef.current = observer;
    document.querySelectorAll("[data-update-card]").forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [updates, markOneRead]);

  const manualRefresh = async () => {
    setRefreshing(true);
    try { await loadUpdates({ refreshZoho: true }); toast.success("Updates refreshed."); }
    catch (error) { toast.error(error.message || "Unable to refresh updates."); }
    finally { setRefreshing(false); }
  };

  const markAllRead = async () => {
    const token = tokenStorage.get();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/updates/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Unable to mark updates as read.");
      setUpdates(previous => previous.map(update => ({ ...update, is_read: true, read_at: new Date().toISOString() })));
      setUnread(0);
      window.dispatchEvent(new CustomEvent("updates-read", { detail: { unread: 0 } }));
    } catch (error) { toast.error(error.message || "Unable to mark updates as read."); }
  };

  if (loading) return <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          <p className="text-sm text-muted-foreground">Urgent alerts, expiration reminders, document requirements and important pipeline notifications.</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && <Button type="button" variant="outline" onClick={markAllRead}>Mark all read</Button>}
          <Button type="button" variant="outline" onClick={manualRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <p className="font-semibold">{unread} unread update{unread === 1 ? "" : "s"}</p>
        </div>
      </div>

      {updates.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No updates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Urgent candidate and pipeline notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(update => (
            <div
              key={update.id || update._id}
              data-update-card
              ref={node => { if (node) node.__updateRecord = update; }}
              className={`rounded-xl border p-4 transition ${update.is_read ? "bg-card" : "border-primary/20 bg-primary/5"}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getUpdateIcon(update.update_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{update.title || "Candidate record updated"}</p>
                    <span className="shrink-0 text-right text-xs text-muted-foreground" title={formatDate(update.submitted_at || update.submittedAt || update.created_date || update.created_at)}>
                        {formatDate(update.submitted_at || update.submittedAt || update.created_date || update.created_at)}
                      </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                      {update.message || update.text || "Your record was updated."}
                    </p>
                    {(update.form_type === "behavioral" || update.form_title === "Behavioral Assessment") &&
                      (update.submitted_at || update.submittedAt) && (
                        <p className="mt-2 text-xs font-medium text-emerald-700">
                          Submitted on: {new Date(
                            update.submitted_at || update.submittedAt
                          ).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </p>
                      )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
