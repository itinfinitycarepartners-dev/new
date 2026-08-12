// @ts-nocheck
// src/pages/MakeRequest.jsx
import React, {
  useEffect,
  useState
} from "react";
import {
  BadgeHelp,
  Building2,
  Loader2,
  Plus,
  Save,
  UserPlus,
  CheckCircle2
} from "lucide-react";
import {
  tokenStorage
} from "@/api/icpClient";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

const emptyDependant = () => ({
  name: "",
  dob: "",
  email: "",
  relationship: "",
  travelStatus:
    "arriving",
  needsBooster:
    false,
  needsCarSeat:
    false,
  disability:
    ""
});

export default function MakeRequest() {
  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting
  ] =
    useState("");

  const [
    notice,
    setNotice
  ] =
    useState("");

  const [
    embassyLocation,
    setEmbassyLocation
  ] =
    useState("");

  const [
    licenseNotes,
    setLicenseNotes
  ] =
    useState("");

  const [
    dependant,
    setDependant
  ] =
    useState(
      emptyDependant()
    );

  const [
    dependants,
    setDependants
  ] =
    useState([]);

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

  const load =
    async () => {
      setLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE}/api/requests`,
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
          data.success !==
            true
        ) {
          throw new Error(
            data.error ||
            "Unable to load requests."
          );
        }

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

  const submit =
    async (
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
              method:
                "POST",
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
          data.success !==
            true
        ) {
          throw new Error(
            data.error ||
            "The request could not be submitted."
          );
        }

        setNotice(
          "Request submitted successfully."
        );

        if (
          requestType ===
          "license_endorsement_assistance"
        ) {
          setLicenseNotes("");
        }

        if (
          requestType ===
          "add_dependant"
        ) {
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

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Make a Request
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit licensure, embassy, or dependant requests to ICP.
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {notice}
        </div>
      )}

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3">
          <BadgeHelp className="h-5 w-5 text-purple-600" />
          <div>
            <h2 className="font-semibold">
              License Endorsement Assistance
            </h2>
            <p className="text-sm text-slate-500">
              Ask ICP for assistance with your license endorsement process.
            </p>
          </div>
        </div>

        <textarea
          value={licenseNotes}
          onChange={event =>
            setLicenseNotes(
              event.target.value
            )
          }
          rows={5}
          placeholder="Tell us what assistance you need..."
          className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
        />

        <button
          type="button"
          disabled={
            submitting ===
            "license_endorsement_assistance"
          }
          onClick={() =>
            submit(
              "license_endorsement_assistance",
              {
                notes:
                  licenseNotes.trim()
              }
            )
          }
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ===
          "license_endorsement_assistance" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Submit Request
        </button>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-purple-600" />
          <div>
            <h2 className="font-semibold">
              Embassy Change
            </h2>
            <p className="text-sm text-slate-500">
              This updates CRM Deals → Embassy Location
              (API Name: Embassy_Location).
            </p>
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Embassy Location
        </label>

        <input
          type="text"
          value={embassyLocation}
          onChange={event =>
            setEmbassyLocation(
              event.target.value
            )
          }
          placeholder="Enter requested embassy location"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />

        <button
          type="button"
          disabled={
            submitting ===
              "embassy_change" ||
            !embassyLocation.trim()
          }
          onClick={() =>
            submit(
              "embassy_change",
              {
                embassyLocation:
                  embassyLocation.trim()
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
          Request Embassy Change
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
              Add dependant details to your candidate profile.
            </p>
          </div>
        </div>

        {dependants.length > 0 && (
          <div className="mt-4 space-y-2">
            {dependants.map(
              (
                item,
                index
              ) => (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold">
                    {item.name}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    ·{" "}
                    {item.relationship ||
                      "Dependant"}
                    {" "}
                    ·{" "}
                    {item.travelStatus ===
                    "join-to-follow"
                      ? "Join to follow"
                      : "Arriving"}
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
            type="date"
            value={dependant.dob}
            onChange={event =>
              setDependant(value => ({
                ...value,
                dob:
                  event.target.value
              }))
            }
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            type="email"
            placeholder="Email address"
            value={dependant.email}
            onChange={event =>
              setDependant(value => ({
                ...value,
                email:
                  event.target.value
              }))
            }
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Relationship to applicant"
            value={
              dependant.relationship
            }
            onChange={event =>
              setDependant(value => ({
                ...value,
                relationship:
                  event.target.value
              }))
            }
          />

          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={
              dependant.travelStatus
            }
            onChange={event =>
              setDependant(value => ({
                ...value,
                travelStatus:
                  event.target.value
              }))
            }
          >
            <option value="arriving">
              Arriving
            </option>
            <option value="join-to-follow">
              Join to follow
            </option>
          </select>

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Ability / disability notes"
            value={
              dependant.disability
            }
            onChange={event =>
              setDependant(value => ({
                ...value,
                disability:
                  event.target.value
              }))
            }
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={
                dependant.needsBooster
              }
              onChange={event =>
                setDependant(value => ({
                  ...value,
                  needsBooster:
                    event.target
                      .checked
                }))
              }
            />
            Booster seat required
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={
                dependant.needsCarSeat
              }
              onChange={event =>
                setDependant(value => ({
                  ...value,
                  needsCarSeat:
                    event.target
                      .checked
                }))
              }
            />
            Car seat required
          </label>
        </div>

        <button
          type="button"
          disabled={
            submitting ===
              "add_dependant" ||
            !dependant.name.trim() ||
            !dependant.relationship.trim()
          }
          onClick={() =>
            submit(
              "add_dependant",
              dependant
            )
          }
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ===
          "add_dependant" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Dependant
        </button>
      </section>
    </div>
  );
}