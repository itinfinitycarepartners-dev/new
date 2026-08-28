// @ts-nocheck
// src/pages/Messages.jsx
import React, { useState } from "react";
import ConversationList from "../components/messaging/ConversationList";
import { messaging } from "@/api/icpClient";
import { Megaphone, Loader2, X, CheckCircle2 } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

export default function Messages() {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendBroadcast = async event => {
    event.preventDefault();

    const message =
      content.trim();

    if (!message) {
      setError(
        "Enter a public message."
      );
      return;
    }

    if (sending) return;

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const data =
        await messaging.sendUserBroadcast(
          message
        );

      if (
        !data ||
        data.success !== true
      ) {
        throw new Error(
          data?.error ||
          data?.message ||
          "The public message could not be posted."
        );
      }

      setContent("");
      setShowBroadcast(false);
      setSuccess(
        "Public message posted."
      );

      window.dispatchEvent(
        new CustomEvent(
          "messaging-updated",
          {
            detail: {
              conversationId:
                data.conversation?._id ||
                data.conversation?.id ||
                "community",
              type:
                "broadcast"
            }
          }
        )
      );
    } catch (sendError) {
      setError(
        sendError?.message ||
        "The public message could not be posted."
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
            <h1 className="text-lg font-bold text-slate-900">Messages</h1>
            <p className="text-xs text-slate-500">
              You have two message spaces: Admin Messages and Public Messages.
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
            New Public Message
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
        allowBroadcastMessaging={true}
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
                  New Public Message
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Post a message to the shared Public Messages thread.
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
                  Message
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
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
                onClick={sendBroadcast}
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
                    Post to Public
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