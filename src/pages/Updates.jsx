


// @ts-nocheck
import React, {
  useCallback,
  useEffect,
  useState
} from "react";
import {
  Bell,
  CheckCircle,
  Edit,
  Info,
  Loader2,
  RefreshCw,
  PlaneLanding
} from "lucide-react";
import { tokenStorage } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

const getUpdateIcon = type => {
  switch (
    String(type || "")
      .toLowerCase()
  ) {
    case "arrival":
      return (
        <PlaneLanding className="h-5 w-5 text-blue-500" />
      );
    case "add":
      return (
        <CheckCircle className="h-5 w-5 text-green-500" />
      );
    case "edit":
      return (
        <Edit className="h-5 w-5 text-amber-500" />
      );
    default:
      return (
        <Info className="h-5 w-5 text-gray-400" />
      );
  }
};

const formatDate = value => {
  if (!value) return "Just now";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Just now";
  }

  const diffMs =
    Date.now() -
    date.getTime();

  const mins =
    Math.floor(
      diffMs / 60000
    );

  const hours =
    Math.floor(
      diffMs / 3600000
    );

  const days =
    Math.floor(
      diffMs / 86400000
    );

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
};

export default function Updates() {
  const [updates, setUpdates] =
    useState([]);

  const [unread, setUnread] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadUpdates =
    useCallback(
      async ({
        refreshZoho = false
      } = {}) => {
        const token =
          tokenStorage.get();

        if (!token) {
          setLoading(false);
          return;
        }

        try {
          if (refreshZoho) {
            // User-triggered only. This bypasses the cache once so CRM/Recruit
            // changes can be detected without background polling.
            await fetch(
              `${API_BASE}/api/zoho/my-deals?refresh=true`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );
          }

          const response =
            await fetch(
              `${API_BASE}/api/updates?limit=100`,
              {
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
              "Unable to load updates."
            );
          }

          setUpdates(
            Array.isArray(
              payload.updates
            )
              ? payload.updates
              : []
          );

          setUnread(
            Number(
              payload.unread ||
              0
            )
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadUpdates();

    const handleUpdate =
      () => loadUpdates();

    window.addEventListener(
      "candidate-data-updated",
      handleUpdate
    );

    window.addEventListener(
      "pipeline-updated",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "candidate-data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "pipeline-updated",
        handleUpdate
      );
    };
  }, [loadUpdates]);

  const manualRefresh =
    async () => {
      setRefreshing(true);

      try {
        await loadUpdates({
          refreshZoho: true
        });

        toast.success(
          "Updates refreshed."
        );
      } catch (error) {
        toast.error(
          error.message ||
          "Unable to refresh updates."
        );
      } finally {
        setRefreshing(false);
      }
    };

  const markAllRead =
    async () => {
      const token =
        tokenStorage.get();

      if (!token) return;

      try {
        await fetch(
          `${API_BASE}/api/updates/mark-read`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json"
            }
          }
        );

        setUpdates(previous =>
          previous.map(
            update => ({
              ...update,
              is_read: true
            })
          )
        );

        setUnread(0);

        window.dispatchEvent(
          new CustomEvent(
            "updates-read"
          )
        );
      } catch {
        toast.error(
          "Unable to mark updates as read."
        );
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Updates
          </h1>
          <p className="text-sm text-muted-foreground">
            CRM and Recruit changes relevant to your candidate record.
          </p>
        </div>

        <div className="flex gap-2">
          {unread > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={
                markAllRead
              }
            >
              Mark all read
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={
              manualRefresh
            }
            disabled={
              refreshing
            }
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <p className="font-semibold">
            {unread} unread update{unread === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {updates.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">
            No updates yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes from CRM and Recruit will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(
            update => (
              <div
                key={
                  update.id ||
                  update._id
                }
                className={`rounded-xl border p-4 ${
                  update.is_read
                    ? "bg-card"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getUpdateIcon(
                      update.update_type
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">
                        {update.title ||
                          "Candidate record updated"}
                      </p>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(
                          update.created_date ||
                          update.created_at
                        )}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {update.message ||
                        update.text ||
                        "Your record was updated."}
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}