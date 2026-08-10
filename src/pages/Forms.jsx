


// @ts-nocheck
import React from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Home,
  HeartHandshake,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const FORM_ITEMS = [
  {
    key: "behavioral",
    title: "Behavioral Assessment",
    description:
      "Complete the behavioral assessment used in your deployment document stage.",
    icon: ClipboardList
  },
  {
    key: "rl",
    title: "R&L Form",
    description:
      "Complete your Relocation & Logistics checklist and required acknowledgements.",
    icon: HeartHandshake
  },
  {
    key: "housing",
    title: "Housing & Transportation Form",
    description:
      "Complete your required housing and transportation information.",
    icon: Home
  }
];

export default function Forms() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Forms
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete and review your candidate forms in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FORM_ITEMS.map(item => {
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              to={`/pipeline?form=${encodeURIComponent(item.key)}`}
              className="group rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <h2 className="mt-4 font-semibold">
                {item.title}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Open form
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}