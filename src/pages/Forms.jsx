// @ts-nocheck
// src/pages/Forms.jsx
import React, {
  useState
} from "react";
import { Link } from "react-router-dom";
import {
  Home,
  FileCheck,
  ArrowLeft,
  Info,
  ClipboardList,
  CircleHelp
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
      <div className="min-h-screen space-y-4 bg-[#F3F4F6] p-4 lg:p-6">
        <button
          type="button"
          onClick={() =>
            setActiveForm(
              null
            )
          }
          className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-base font-semibold"
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
    <div className="min-h-screen space-y-6 bg-[#F3F4F6] p-4 lg:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Forms
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Stay on track with your required forms
        </p>
      </div>

      <div className="relative flex min-h-[150px] w-full items-center overflow-hidden rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="relative z-10 flex max-w-[70%] items-start gap-3">
          <Info className="mt-0.5 h-7 w-7 shrink-0 text-blue-700" />
          <div>
            <h2 className="text-xl font-bold text-[#111827]">
              Complete the forms available to you now.
            </h2>
            <p className="mt-2 text-base leading-7 text-[#111827]">
               Additional forms will be released as you move through the process.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-8 flex items-center text-[#6D28D9] opacity-90">
          <ClipboardList className="h-28 w-28" strokeWidth={1.25} />
        </div>
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
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-8 w-8 text-primary" />
              </div>

              <h2 className="mt-4 text-lg font-bold">
                {item.title}
              </h2>

              <p className="mt-2 text-base text-muted-foreground">
                {item.description}
              </p>

              <div className="mt-5 text-sm font-semibold text-primary">
                Open form
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-4 rounded-xl border border-[#E8E1F2] bg-[#F5F0FF] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-0.5 h-8 w-8 shrink-0 text-[#8B5CF6]" />
          <div>
            <h2 className="text-xl font-bold text-[#111827]">
              Questions about the forms?
            </h2>
            <p className="mt-2 text-base text-[#64748B]">
              Visit My Resources for helpful guides, examples, and submission instructions.
            </p>
          </div>
        </div>

        <Link
          to="/resource"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#8B5CF6] px-4 py-2 text-base font-semibold text-[#6D28D9] transition-colors hover:bg-white"
        >
          View My Resources
        </Link>
      </div>
    </div>
  );
}