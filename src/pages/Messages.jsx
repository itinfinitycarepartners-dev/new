// @ts-nocheck
// src/pages/Messages.jsx
import React, { useState } from "react";
import ConversationList from "../components/messaging/ConversationList";
import { tokenStorage } from "@/api/icpClient";
import {
  Megaphone,
  Loader2,
  X,
  CheckCircle2
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

export default function Messages() {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendBroadcast = async (event) => {
    event.preventDefault();

    if (!content.trim()) {
      setError("Enter a broadcast message.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const token = tokenStorage.get();
      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        `${API_BASE}/api/messaging/broadcast`,
        {
          method: "POST",
          credentials: "omit",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim()
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) {
        throw new Error(
          (
            /admin access required/i.test(
              data.error || data.message || ""
            )
              ? "The backend is still using the old Admin-only broadcast route. Deploy the updated backend."
              : (
                  data.error ||
                  data.message ||
                  "The broadcast could not be sent."
                )
          )
        );
      }

      setTitle("");
      setContent("");
      setShowBroadcast(false);
      setSuccess(
        `Broadcast sent to ${data.recipientCount || 0} user(s).`
      );

      window.dispatchEvent(
        new CustomEvent("messaging-updated", {
          detail: {
            conversationId:
              data.conversation?._id ||
              data.conversation?.id ||
              null,
            type: "broadcast"
          }
        })
      );
    } catch (sendError) {
      setError(
        sendError.message ||
        "The broadcast could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Messages
            </h1>
            <p className="text-xs text-slate-500">
              You can send broadcasts to all users. Direct messages
              to Admin are not available.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowBroadcast(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            <Megaphone className="h-4 w-4" />
            New Broadcast
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-3 max-w-6xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mx-auto mt-3 flex max-w-6xl items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <ConversationList
        allowDirectMessaging={false}
        allowBroadcastMessaging={false}
        hideStartChat
      />

      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={sendBroadcast}
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  New Broadcast
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  This message will be sent to all candidate users.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBroadcast(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={event =>
                    setTitle(event.target.value)
                  }
                  placeholder="Optional broadcast title"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Message
                </label>
                <textarea
                  value={content}
                  onChange={event =>
                    setContent(event.target.value)
                  }
                  placeholder="Write your broadcast message..."
                  rows={7}
                  required
                  className="mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  maxLength={5000}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowBroadcast(false)}
                disabled={sending}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4" />
                    Send to All Users
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}