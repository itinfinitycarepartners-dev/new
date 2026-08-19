


// @ts-nocheck
// src/pages/MakeRequest.jsx
import React, {
  useEffect,
  useState
} from "react";
import {
  Building2,
  Loader2,
  Plus,
  Save,
  UserPlus,
  CheckCircle2,
  ExternalLink,
  BadgeHelp,
  Calendar
} from "lucide-react";
import {
  tokenStorage
} from "@/api/icpClient";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

const emptyDependant = () => ({
  name: "",
  age: "",
  relationship: "",
  passport: "",
  passportFile: null,
  passportPreview: ""
});

export default function MakeRequest() {
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState("");
  const [notice, setNotice] =
    useState("");
  const [licenseUrl, setLicenseUrl] =
    useState("");
  const [embassyLocation, setEmbassyLocation] =
    useState("");
  const [embassyReason, setEmbassyReason] =
    useState("");
  const [dependant, setDependant] =
    useState(emptyDependant());
  const [dependants, setDependants] =
    useState([]);
  const [requests, setRequests] =
    useState([]);

  const requestDate =
    new Date().toLocaleDateString();

  const getHeaders = () => {
    const token =
      tokenStorage.get();

    if (!token) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    return {
      Authorization:
        `Bearer ${token}`
    };
  };

  const load = async () => {
    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_BASE}/api/requests?_=${Date.now()}`,
          {
            headers:
              getHeaders(),
            cache:
              "no-store"
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
          "Unable to load requests."
        );
      }

      setLicenseUrl(
        String(
          data.licenseEndorsementUrl ||
          ""
        ).trim()
      );
      setEmbassyLocation(
        data.embassyLocation ||
        ""
      );
      setDependants(
        Array.isArray(
          data.dependants
        )
          ? data.dependants
          : []
      );
      setRequests(
        Array.isArray(
          data.requests
        )
          ? data.requests
          : []
      );
    } catch (error) {
      setNotice(
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (
    requestType,
    details
  ) => {
    setSubmitting(
      requestType
    );
    setNotice("");

    try {
      const response =
        await fetch(
          `${API_BASE}/api/requests`,
          {
            method: "POST",
            headers: {
              ...getHeaders(),
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                requestType,
                details
              })
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
          "The request could not be submitted."
        );
      }

      toast.success(
        data.message ||
        "Request submitted successfully."
      );

      if (
        requestType ===
        "embassy_change"
      ) {
        setNotice(
          data.message ||
          "Embassy change request submitted for admin approval. CRM will update only after approval."
        );
        setEmbassyReason("");
      } else {
        setNotice(
          data.message ||
          "Your dependant request was submitted successfully and is awaiting admin approval."
        );
        setDependant(
          emptyDependant()
        );
      }

      await load();

      window.dispatchEvent(
        new CustomEvent(
          "candidate-data-updated"
        )
      );
    } catch (error) {
      setNotice(
        error.message
      );
    } finally {
      setSubmitting("");
    }
  };

  const submitDependantRequest = async () => {
    if (
      !dependant.name.trim() ||
      !String(dependant.age).trim() ||
      !dependant.relationship.trim() ||
      !dependant.passportFile
    ) {
      setNotice(
        "Name, age, relationship and a passport image are required."
      );
      return;
    }

    setSubmitting(
      "add_dependant"
    );
    setNotice("");

    try {
      const token =
        tokenStorage.get();

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const passportData =
        new FormData();

      passportData.append(
        "passport",
        dependant.passportFile
      );

      const passportResponse =
        await fetch(
          `${API_BASE}/api/requests/dependant-passport`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`
            },
            body:
              passportData
          }
        );

      const passportResult =
        await passportResponse
          .json()
          .catch(() => ({}));

      if (
        !passportResponse.ok ||
        passportResult.success !== true
      ) {
        throw new Error(
          passportResult.error ||
          "The passport image could not be uploaded."
        );
      }

      const passport =
        passportResult.passport ||
        {};

      const response =
        await fetch(
          `${API_BASE}/api/requests`,
          {
            method: "POST",
            headers: {
              ...getHeaders(),
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                requestType:
                  "add_dependant",
                details: {
                  name:
                    dependant.name.trim(),
                  age:
                    String(
                      dependant.age
                    ).trim(),
                  relationship:
                    dependant.relationship.trim(),
                  passport:
                    passport.name ||
                    dependant.passportFile.name,
                  passportDocumentName:
                    passport.name ||
                    dependant.passportFile.name,
                  passportUploaded:
                    true,
                  passportSource:
                    passport.source ||
                    "crm",
                  passportAttachmentId:
                    passport.attachmentId ||
                    "",
                  passportDealId:
                    passport.dealId ||
                    "",
                  passportMimeType:
                    passport.mimeType ||
                    dependant.passportFile.type
                }
              })
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
          "The dependant request could not be submitted."
        );
      }

      if (
        dependant.passportPreview
      ) {
        URL.revokeObjectURL(
          dependant.passportPreview
        );
      }

      setDependant(
        emptyDependant()
      );

      const message =
        data.message ||
        "Your dependant request and passport image were submitted for admin approval.";

      setNotice(
        message
      );

      toast.success(
        "Request submitted successfully."
      );

      await load();

      window.dispatchEvent(
        new CustomEvent(
          "candidate-data-updated"
        )
      );
    } catch (error) {
      setNotice(
        error.message ||
        "The dependant request could not be submitted."
      );
    } finally {
      setSubmitting("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const pendingEmbassy =
    requests.find(
      item =>
        item.request_type ===
          "embassy_change" &&
        item.status ===
          "Pending Approval"
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Make a Request
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit requests to ICP.
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {notice}
        </div>
      )}

      {/* Hidden until LICENSE_ENDORSEMENT_ASSISTANCE_URL is configured. */}
      {licenseUrl && (
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <BadgeHelp className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="font-semibold">
                License Endorsement Assistance
              </h2>
              <p className="text-sm text-slate-500">
                Open the ICP license endorsement assistance resource.
              </p>
            </div>
          </div>

          <a
            href={licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Open Assistance
          </a>
        </section>
      )}

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-purple-600" />
          <div>
            <h2 className="font-semibold">
              Embassy Change
            </h2>
            <p className="text-sm text-slate-500">
              Requests require admin approval before CRM Deals →
              Embassy_Location is updated.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          Date of request: {requestDate}
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Requested Embassy Location
        </label>
        <input
          type="text"
          value={embassyLocation}
          onChange={event =>
            setEmbassyLocation(
              event.target.value
            )
          }
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Reason for Request
        </label>
        <textarea
          value={embassyReason}
          onChange={event =>
            setEmbassyReason(
              event.target.value
            )
          }
          rows={5}
          placeholder="Explain why you are requesting an embassy change."
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />

        {pendingEmbassy && (
          <p className="mt-3 text-sm font-medium text-amber-700">
            A previous embassy change request is pending admin approval.
          </p>
        )}

        <button
          type="button"
          disabled={
            submitting ===
              "embassy_change" ||
            !embassyLocation.trim() ||
            !embassyReason.trim()
          }
          onClick={() =>
            submit(
              "embassy_change",
              {
                embassyLocation:
                  embassyLocation.trim(),
                reason:
                  embassyReason.trim(),
                requestedDate:
                  new Date()
                    .toISOString()
              }
            )
          }
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ===
          "embassy_change" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Submit for Approval
        </button>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-purple-600" />
          <div>
            <h2 className="font-semibold">
              Add Dependants
            </h2>
            <p className="text-sm text-slate-500">
              Submit a dependant for admin approval. Once approved, the dependant will appear on your profile.
            </p>
          </div>
        </div>

        {dependants.length > 0 && (
          <div className="mt-4 space-y-2">
            {dependants.map(
              (item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                >
                  <strong>
                    {item.name}
                  </strong>
                  <span className="text-slate-500">
                    {" "}·{" "}
                    {item.relationship ||
                      "Dependant"}
                    {item.age
                      ? ` · Age ${item.age}`
                      : ""}
                    {item.passport
                      ? ` · Passport ${item.passport}`
                      : ""}
                  </span>
                </div>
              )
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Full name"
            value={dependant.name}
            onChange={event =>
              setDependant(value => ({
                ...value,
                name:
                  event.target.value
              }))
            }
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            type="number"
            min="0"
            max="120"
            placeholder="Age"
            value={dependant.age}
            onChange={event =>
              setDependant(value => ({
                ...value,
                age:
                  event.target.value
              }))
            }
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Relationship to applicant"
            value={dependant.relationship}
            onChange={event =>
              setDependant(value => ({
                ...value,
                relationship:
                  event.target.value
              }))
            }
          />

          <div className="rounded-lg border p-3">
            <label className="block text-xs font-semibold text-slate-600">
              Passport image
            </label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              onChange={event => {
                const file =
                  event.target.files?.[0] ||
                  null;

                setDependant(value => {
                  if (
                    value.passportPreview
                  ) {
                    URL.revokeObjectURL(
                      value.passportPreview
                    );
                  }

                  return {
                    ...value,
                    passport:
                      file?.name ||
                      "",
                    passportFile:
                      file,
                    passportPreview:
                      file
                        ? URL.createObjectURL(
                            file
                          )
                        : ""
                  };
                });
              }}
            />

            {dependant.passportPreview && (
              <img
                src={dependant.passportPreview}
                alt="Dependant passport preview"
                className="mt-3 max-h-44 rounded-lg border object-contain"
              />
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={
            submitting ===
              "add_dependant" ||
            !dependant.name.trim() ||
            !String(dependant.age).trim() ||
            !dependant.relationship.trim() ||
            !dependant.passportFile
          }
          onClick={
            submitDependantRequest
          }
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ===
          "add_dependant" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Submit Dependant for Approval
        </button>
      </section>
    </div>
  );
}