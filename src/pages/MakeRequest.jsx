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
  Calendar,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import {
  tokenStorage,
  documentLibrary
} from "@/api/icpClient";

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
  const [currentEmbassyLocation, setCurrentEmbassyLocation] =
    useState("");
  const [requestedEmbassyLocation, setRequestedEmbassyLocation] =
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

  const load = async ({
    background = false
  } = {}) => {
    if (!background) {
      setLoading(true);
    }

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
      setCurrentEmbassyLocation(
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
      if (!background) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fetchWithTimeout = async (
    url,
    options = {},
    timeoutMs = 15000
  ) => {
    const controller =
      new AbortController();

    const timeout =
      window.setTimeout(
        () => controller.abort(),
        timeoutMs
      );

    try {
      return await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal
        }
      );
    } finally {
      window.clearTimeout(
        timeout
      );
    }
  };

  const submitEmbassyChange =
    async () => {
      if (
        submitting ===
        "embassy_change"
      ) {
        return;
      }

      const nextLocation =
        requestedEmbassyLocation
          .trim();

      const reason =
        embassyReason
          .trim();

      if (
        !nextLocation ||
        !reason
      ) {
        setNotice(
          "New embassy location and reason are required."
        );
        return;
      }

      setSubmitting(
        "embassy_change"
      );

      setNotice("");

      try {
        const body = {
          embassyLocation:
            nextLocation,
          newEmbassyLocation:
            nextLocation,
          reason,
          requestedDate:
            new Date()
              .toISOString()
        };

        let response =
          await fetchWithTimeout(
            `${API_BASE}/api/requests/embassy-change`,
            {
              method:
                "POST",
              cache:
                "no-store",
              credentials:
                "include",
              headers: {
                ...getHeaders(),
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
                "Cache-Control":
                  "no-cache",
                Pragma:
                  "no-cache"
              },
              body:
                JSON.stringify(
                  body
                )
            },
            15000
          );

        // Compatibility fallback during deployment if an older backend instance
        // is still serving traffic.
        if (
          response.status ===
            404 ||
          response.status ===
            405
        ) {
          response =
            await fetchWithTimeout(
              `${API_BASE}/api/requests`,
              {
                method:
                  "POST",
                cache:
                  "no-store",
                credentials:
                  "include",
                headers: {
                  ...getHeaders(),
                  "Content-Type":
                    "application/json",
                  Accept:
                    "application/json",
                  "Cache-Control":
                    "no-cache",
                  Pragma:
                    "no-cache"
                },
                body:
                  JSON.stringify({
                    requestType:
                      "embassy_change",
                    request_type:
                      "embassy_change",
                    details:
                      body
                  })
              },
              15000
            );
        }

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          data.success !==
            true ||
          data.submittedToAdmin !==
            true
        ) {
          throw new Error(
            data.error ||
            data.message ||
            "The embassy change request could not be submitted for approval."
          );
        }

        const savedRequest =
          data.request ||
          {
            _id:
              data.requestId,
            candidate_email:
              "",
            request_type:
              "embassy_change",
            status:
              "Pending Approval",
            details: {
              embassyLocation:
                nextLocation,
              newEmbassyLocation:
                nextLocation,
              reason
            },
            requested_at:
              new Date()
                .toISOString()
          };

        setRequests(
          previous => {
            const requestId =
              String(
                savedRequest?._id ||
                data.requestId ||
                ""
              );

            const remaining =
              previous.filter(
                item =>
                  !(
                    item
                      ?.request_type ===
                      "embassy_change" &&
                    (
                      item.status ===
                        "Pending Approval" ||
                      String(
                        item?._id ||
                        ""
                      ) ===
                        requestId
                    )
                  )
              );

            return [
              savedRequest,
              ...remaining
            ];
          }
        );

        setRequestedEmbassyLocation(
          ""
        );

        setEmbassyReason(
          ""
        );

        setNotice(
          data.message ||
          "Embassy change request submitted successfully and is awaiting admin approval."
        );

        window.dispatchEvent(
          new CustomEvent(
            "candidate-data-updated",
            {
              detail: {
                event:
                  "embassy-change-request-submitted",
                requestId:
                  data.requestId,
                embassyLocation:
                  nextLocation,
                status:
                  "Pending Approval"
              }
            }
          )
        );
      } catch (error) {
        console.error(
          "[MakeRequest] Embassy change submission failed:",
          error
        );

        setNotice(
          error?.name ===
            "AbortError"
            ? "The embassy request timed out before the server confirmed it. Please try again."
            : (
                error.message ||
                "The embassy change request could not be submitted for approval."
              )
        );
      } finally {
        setSubmitting(
          ""
        );
      }
    };

  const submit = async (
    requestType,
    details
  ) => {
    if (submitting) return;

    setSubmitting(
      requestType
    );
    setNotice("");

    try {
      const response =
        await fetchWithTimeout(
          `${API_BASE}/api/requests`,
          {
            method: "POST",
            cache: "no-store",
            headers: {
              ...getHeaders(),
              "Content-Type":
                "application/json",
              "Cache-Control":
                "no-cache",
              Pragma:
                "no-cache"
            },
            body:
              JSON.stringify({
                requestType,
                request_type:
                  requestType,
                details
              })
          },
          15000
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

      if (
        requestType ===
        "embassy_change"
      ) {
        setNotice(
          data.message ||
          "Embassy change request submitted for admin approval. CRM will update only after approval."
        );

        setRequestedEmbassyLocation(
          ""
        );

        setEmbassyReason(
          ""
        );

        if (data.request) {
          setRequests(previous => {
            const requestId =
              String(
                data.request?._id ||
                data.requestId ||
                ""
              );

            const withoutSame =
              previous.filter(
                item =>
                  String(
                    item?._id ||
                    ""
                  ) !==
                  requestId
              );

            return [
              data.request,
              ...withoutSame
            ];
          });
        }
      } else {
        setNotice(
          data.message ||
          "Your dependant request was submitted successfully and is awaiting admin approval."
        );
        setDependant(
          emptyDependant()
        );
      }

      // Refresh quietly. A slow Zoho read must never hold the submit button in
      // the loading state after MongoDB has already accepted the request.
      load({
        background: true
      }).catch(() => null);

      window.dispatchEvent(
        new CustomEvent(
          "candidate-data-updated"
        )
      );
    } catch (error) {
      setNotice(
        error?.name ===
          "AbortError"
          ? "The request took too long to respond. Please try once more; the page will not stay stuck loading."
          : (
              error.message ||
              "The request could not be submitted."
            )
      );
    } finally {
      setSubmitting("");
    }
  };

  const submitDependant = async () => {
    if (submitting) return;

    const name =
      dependant.name.trim();
    const age =
      String(
        dependant.age
      ).trim();
    const relationship =
      dependant.relationship.trim();
    const passportFile =
      dependant.passportFile;

    if (
      !name ||
      !age ||
      !relationship ||
      !passportFile
    ) {
      setNotice(
        "Full name, age, relationship and a passport image are required."
      );
      return;
    }

    setSubmitting(
      "add_dependant"
    );
    setNotice("");

    try {
      const uploadResult =
        await documentLibrary.upload({
          file:
            passportFile,
          category:
            "dependant-passport",
          destination:
            "crm",
          documentType:
            `Dependant Passport - ${name}`,
          pipelineSection:
            "Dependants",
          requirementKey:
            "dependant-passport"
        });

      if (
        !uploadResult ||
        uploadResult.success !== true
      ) {
        throw new Error(
          uploadResult?.error ||
          uploadResult?.message ||
          "The passport image could not be uploaded."
        );
      }

      const response =
        await fetch(
          `${API_BASE}/api/requests`,
          {
            method:
              "POST",
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
                  name,
                  age,
                  relationship,
                  passport:
                    passportFile.name,
                  passportDocumentName:
                    passportFile.name,
                  passportUploaded:
                    true
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
          data.message ||
          "The dependant approval request could not be submitted."
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
      setNotice(
        "Your dependant request and passport image were submitted successfully and are awaiting admin approval."
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
        "The dependant approval request could not be submitted."
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
           
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          Date of request: {requestDate}
        </div>

        <div className="mt-4 rounded-lg border bg-slate-50 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Current Embassy Location
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {currentEmbassyLocation ||
              "Not currently available"}
          </p>
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          New Embassy Location
        </label>
        <input
          type="text"
          value={requestedEmbassyLocation}
          onChange={event =>
            setRequestedEmbassyLocation(
              event.target.value
            )
          }
          placeholder="Enter the embassy location you are requesting"
          autoComplete="off"
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
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">
              Embassy change pending admin approval.
            </p>
            {pendingEmbassy
              ?.details
              ?.embassyLocation && (
              <p className="mt-1">
                Requested location:{" "}
                <strong>
                  {pendingEmbassy.details.embassyLocation}
                </strong>
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={
            submitting ===
              "embassy_change" ||
            !requestedEmbassyLocation.trim() ||
            !embassyReason.trim()
          }
          onClick={
            submitEmbassyChange
          }
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ===
          "embassy_change" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting for Approval...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Submit for Approval
            </>
          )}
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
                      ? " · Passport uploaded"
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

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-sm md:col-span-2">
            <Upload className="h-4 w-4 text-purple-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-700">
                Passport image
              </p>
              <p className="truncate text-xs text-slate-500">
                {dependant.passportFile?.name ||
                  "Upload a clear JPG, PNG, WEBP, or HEIC image"}
              </p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={event => {
                const file =
                  event.target.files?.[0] ||
                  null;

                if (!file) return;

                if (
                  !file.type.startsWith("image/")
                ) {
                  setNotice(
                    "Passport must be uploaded as an image."
                  );
                  event.target.value = "";
                  return;
                }

                if (
                  file.size >
                  15 * 1024 * 1024
                ) {
                  setNotice(
                    "Passport image must be under 15MB."
                  );
                  event.target.value = "";
                  return;
                }

                setNotice("");

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
                    passportFile:
                      file,
                    passport:
                      file.name,
                    passportPreview:
                      URL.createObjectURL(
                        file
                      )
                  };
                });
              }}
            />
          </label>

          {dependant.passportPreview && (
            <div className="md:col-span-2 rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                Passport image selected
              </div>
              <img
                src={dependant.passportPreview}
                alt="Dependant passport preview"
                className="max-h-52 rounded-md border object-contain"
              />
            </div>
          )}
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
            submitDependant
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