// @ts-nocheck
// src/pages/Forms.jsx
import React, {
  useState
} from "react";
import {
  Home,
  FileCheck,
  ArrowLeft
} from "lucide-react";
import {
  useAuth
} from "@/lib/AuthContext";
import {
  DeploymentDetails,
  HousingDetailsForm
} from "./Pipeline";

const FORMS = [
  {
    key: "behavioral",
    title: "Behavioral Assessment",
    description:
      "Complete and submit your Behavioral Assessment.",
    icon:
      FileCheck
  },
  {
    key: "housing",
    title:
      "Housing & Transportation Form",
    description:
      "Complete your housing and transportation information.",
    icon:
      Home
  }
];

export default function Forms() {
  const {
    user
  } = useAuth();

  const [
    activeForm,
    setActiveForm
  ] =
    useState(null);

  const [
    localStages,
    setLocalStages
  ] =
    useState([]);

  if (activeForm) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() =>
            setActiveForm(
              null
            )
          }
          className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forms
        </button>

        <div className="rounded-xl border bg-white p-4">
          {activeForm ===
            "behavioral" && (
            <DeploymentDetails
              user={user}
              setStages={
                setLocalStages
              }
              behavioralOnly
              onClose={() =>
                setActiveForm(
                  null
                )
              }
            />
          )}

          {activeForm ===
            "housing" && (
            <HousingDetailsForm
              user={user}
              setStages={
                setLocalStages
              }
              onClose={() =>
                setActiveForm(
                  null
                )
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Forms
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete your forms directly here. You will not be redirected to Pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FORMS.map(item => {
          const Icon =
            item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setActiveForm(
                  item.key
                )
              }
              className="rounded-xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <h2 className="mt-4 font-semibold">
                {item.title}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>

              <div className="mt-4 text-xs font-semibold text-primary">
                Open form
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}