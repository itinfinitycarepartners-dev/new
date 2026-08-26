// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  Plane,
  Home,
  Landmark,
  Car,
  Smartphone,
  CreditCard,
  School,
  Stethoscope,
  ShieldCheck,
  ExternalLink,
  MapPin,
  FileCheck2,
  Globe2,
  Building2,
  Gift,
  Users,
  Newspaper,
  MessageSquareQuote,
  CircleHelp,
  Send,
  BookOpen
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

const QUICK_ACCESS_LINKS = [
  {
    label:
      "Visa Bulletin",
    href:
      "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html"
  },
  {
    label:
      "Track Green Card / USCIS Case Status",
    href:
      "https://egov.uscis.gov/"
  },
  {
    label:
      "Candidate Lifecycle PDF",
    href:
      "/resources/infinity-candidate-lifecycle-summary.pdf"
  },
  {
    label:
      "FAQs",
    href:
      import.meta.env.VITE_CANDIDATE_FAQ_URL ||
      ""
  }
];

const ICP_DEPARTMENTS = [
  {
    name:
      "Recruitment",
    email:
      "recruitment@infinitycarepartners.com",
    summary:
      "Prescreening, interviews, job offers, contracts, interview preparation, and general new-hire support."
  },
  {
    name:
      "Immigration",
    email:
      "immigration@infinitycarepartners.com",
    summary:
      "I-140, H-1B, PERM, visa filings, fee bills, immigration documentation, and dependent-information changes."
  },
  {
    name:
      "Deployment & Relocation",
    email:
      "deployment@infinitycarepartners.com",
    summary:
      "Embassy interview preparation, licensure endorsement support, skills verification, flights, housing, transportation, relocation, and concierge support."
  },
  {
    name:
      "Customer Service / Aftercare",
    email:
      "customerservice@infinitycarepartners.com",
    summary:
      "Ongoing candidate support, local adjustment assistance, follow-ups, satisfaction surveys, and post-arrival support."
  },
  {
    name:
      "General Inquiries",
    email:
      "info@infinitycarepartners.com",
    summary:
      "General job-opportunity, resume, partnership, and vendor inquiries."
  }
];

const PREFERRED_VENDOR_RESOURCES = [
  {
    label:
      "International AutoSource (IAS)",
    href:
      "https://intlauto.com/"
  },
  {
    label:
      "Advancial Federal Credit Union",
    href:
      "https://www.advancial.org/"
  },
  {
    label:
      "Regions Bank",
    href:
      "https://www.regions.com/"
  },
  {
    label:
      "Transportation Vendors",
    href:
      import.meta.env.VITE_TRANSPORTATION_VENDORS_URL ||
      ""
  }
];

const COMMUNITY_RESOURCES = [
  {
    label:
      "Candidate Testimonials",
    href:
      import.meta.env.VITE_TESTIMONIALS_URL ||
      ""
  },
  {
    label:
      "ICP Newsletters",
    href:
      import.meta.env.VITE_NEWSLETTERS_URL ||
      ""
  }
];

const ENGLISH_RESOURCES = [
  { label: "IELTS", href: "https://ielts.org/" },
  { label: "OET", href: "https://oet.com/" },
  {
    label: "PTE Academic",
    href: "https://www.pearson.com/languages/en-us/test-takers/pearson-test-of-english.html"
  },
  { label: "TOEFL", href: "https://www.ets.org/toefl.html" }
];

const LICENSURE_RESOURCES = [
  {
    label:
      "License Endorsement Requirements by State",
    href:
      import.meta.env.VITE_LICENSE_ENDORSEMENT_REQUIREMENTS_URL ||
      ""
  },
  { label: "TruMerit", href: "https://www.trumerit.org/" },
  { label: "Josef Silny & Associates", href: "https://jsilny.org/" },
  {
    label: "Clinfinity",
    href:
      import.meta.env.VITE_CLINFINITY_URL ||
      "https://www.clinfinity.com/"
  },
  {
    label: "NCSBN – Find a Board of Nursing",
    href: "https://www.ncsbn.org/contact-bon.htm"
  }
];

const EXCLUSIVE_MEMBER_SERVICES = [
  {
    title: "Annual Participation Draw Offers",
    description:
      "View annual participation draw opportunities and member offers.",
    href:
      import.meta.env.VITE_ANNUAL_PARTICIPATION_DRAW_URL ||
      ""
  },
  {
    title: "My Rewards",
    description:
      "Access member rewards, vendor discounts, and other exclusive benefits.",
    href:
      import.meta.env.VITE_MY_REWARDS_URL ||
      ""
  },
  {
    title: "Preferred Vendors",
    description:
      "Preferred vendor resources including IAS, Advancial, and Regions Bank.",
    href:
      import.meta.env.VITE_PREFERRED_VENDORS_URL ||
      ""
  }
];

const phaseSections = [
  {
    title: "Pre-Arrival Phase",
    icon: Plane,
    items: [
      {
        title: "Prepare dependent school enrollment",
        description:
          "For minor dependents, prepare educational transcripts and gather health records and vaccination records.",
        icon: School
      },
      {
        title: "Arrange housing or temporary accommodations",
        description:
          "Confirm permanent housing or a temporary accommodation plan before travel.",
        icon: Home
      },
      {
        title: "Set up an international phone plan for travel",
        description:
          "Use this for your travel and transition period until your local U.S. phone service is active.",
        icon: Smartphone
      },
      {
        title: "Notify credit card companies",
        description:
          "Tell your card issuers that you plan to travel and relocate to the United States so cards can be used on arrival without interruption.",
        icon: CreditCard
      },
      {
        title: "Consider pre-arrival banking options",
        description:
          "Review whether your destination-area bank offers account setup or appointment options before arrival.",
        icon: Landmark
      },
      {
        title: "Confirm your U.S. transportation plan",
        description:
          "Confirm airport pickup and your initial and longer-term transportation plan.",
        icon: Car
      }
    ]
  },
  {
    title: "Arrival & First Week",
    icon: MapPin,
    items: [
      {
        title: "Clear Customs and Immigration at the Port of Entry",
        description:
          "Follow CBP instructions and turn in your unopened visa packet when instructed.",
        icon: ShieldCheck
      },
      {
        title: "Open a U.S. bank account",
        description:
          "Complete this after arrival if it was not already completed during the pre-arrival phase.",
        icon: Landmark
      },
      {
        title: "Activate your local transportation plan",
        description:
          "Confirm how you will travel to work and essential appointments after your arrival transportation is complete.",
        icon: Car
      },
      {
        title: "Social Security follow-up only when applicable",
        description:
          "Do not direct EB-3 immigrant-visa arrivals to file a new SSN application automatically. Candidates who are not arriving with an EB-3 immigrant visa should follow the applicable SSA process. Use the SSA office locator if an SSN issue needs follow-up.",
        icon: FileCheck2
      },
      {
        title: "Set up utilities",
        description:
          "Arrange electricity, water/sewer, gas, internet, and other utilities required for your housing.",
        icon: Home
      }
    ]
  },
  {
    title: "First Month",
    icon: Stethoscope,
    items: [
      {
        title: "Complete RN endorsement",
        description:
          "Complete remaining state endorsement requirements, including fingerprinting when required.",
        icon: Stethoscope
      },
      {
        title: "Complete employer onboarding",
        description:
          "Finish employer orientation, required training, and employment onboarding tasks.",
        icon: Building2
      },
      {
        title: "Stabilize housing and transportation",
        description:
          "Confirm your recurring commute, household needs, and local support plan.",
        icon: Home
      }
    ]
  },
  {
    title: "Long-Term Integration",
    icon: Globe2,
    items: [
      {
        title: "Build your U.S. credit history",
        description:
          "Use credit responsibly and maintain on-time payments as you establish your U.S. credit profile.",
        icon: CreditCard
      },
      {
        title: "Obtain a state driver's license when applicable",
        description:
          "Complete your destination state's driver's-license requirements when eligible and needed.",
        icon: Car
      },
      {
        title: "Permanent-residency planning when applicable",
        description:
          "Many EB-3 immigrant-visa candidates enter the United States as lawful permanent residents already. Candidates on temporary or other statuses should review the appropriate path to permanent residency with their immigration team.",
        icon: ShieldCheck
      }
    ]
  }
];

const endorsementSteps = [
  "Confirm your endorsement state and Board of Nursing.",
  "Complete credential/CES requirements if your state requires them.",
  "Submit the endorsement application, fee, and required license verification.",
  "Complete fingerprints/background checks before arrival when your state allows it.",
  "Complete a jurisprudence exam when required by your state.",
  "Complete post-arrival fingerprints or identity steps when the state requires in-person processing.",
  "Provide any final U.S. address, SSN, or Board-requested information when applicable.",
  "Monitor Board approval and confirm your active endorsed license."
];

function ResourceLink({
  label,
  href
}) {
  if (!href) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-4 py-3 text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        <span className="text-xs">
          Coming soon
        </span>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-medium transition hover:border-primary/40 hover:bg-primary/5"
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

function MemberServiceCard({
  title,
  description,
  href,
  onClick
}) {
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Gift className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {title}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {href && (
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-4 rounded-xl border bg-white p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 rounded-xl border bg-white p-4 transition hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border bg-slate-50 p-4">
      {content}
    </div>
  );
}

export default function Resource() {
  const [tab, setTab] =
    useState("relocation");

  const [
    preferredLicensureAgentUrl,
    setPreferredLicensureAgentUrl
  ] =
    useState(
      import.meta.env.VITE_PREFERRED_LICENSURE_AGENT_URL ||
      import.meta.env.VITE_LICENSE_ENDORSEMENT_ASSISTANCE_URL ||
      ""
    );

  const [
    showPreferredAgentOffer,
    setShowPreferredAgentOffer
  ] =
    useState(false);

  const [
    referralForm,
    setReferralForm
  ] =
    useState({
      friendName:
        "",
      friendEmail:
        "",
      friendPhone:
        "",
      notes:
        "",
      consentConfirmed:
        false
    });

  const [
    referralSubmitting,
    setReferralSubmitting
  ] =
    useState(false);

  const [
    referralNotice,
    setReferralNotice
  ] =
    useState("");

  useEffect(() => {
    const token =
      localStorage.getItem(
        "icp_auth_token"
      );

    if (!token) {
      return;
    }

    let cancelled =
      false;

    const loadPreferredAgentUrl =
      async () => {
        try {
          const response =
            await fetch(
              `${API_BASE}/api/requests?_=${Date.now()}`,
              {
                cache:
                  "no-store",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  "Cache-Control":
                    "no-cache",
                  Pragma:
                    "no-cache"
                }
              }
            );

          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (
            !cancelled &&
            response.ok &&
            data.success ===
              true &&
            data
              .licenseEndorsementUrl
          ) {
            setPreferredLicensureAgentUrl(
              String(
                data
                  .licenseEndorsementUrl
              ).trim()
            );
          }
        } catch (error) {
          console.warn(
            "[Resources] Preferred licensure-agent URL unavailable:",
            error?.message ||
            error
          );
        }
      };

    loadPreferredAgentUrl();

    return () => {
      cancelled =
        true;
    };
  }, []);

  const submitReferral =
    async event => {
      event.preventDefault();

      if (referralSubmitting) {
        return;
      }

      const token =
        localStorage.getItem(
          "icp_auth_token"
        );

      if (!token) {
        setReferralNotice(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      setReferralSubmitting(
        true
      );

      setReferralNotice(
        ""
      );

      try {
        const response =
          await fetch(
            `${API_BASE}/api/referrals`,
            {
              method:
                "POST",
              cache:
                "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                "Cache-Control":
                  "no-cache",
                Pragma:
                  "no-cache"
              },
              body:
                JSON.stringify(
                  referralForm
                )
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          data.success !==
            true
        ) {
          throw new Error(
            data.error ||
            "The referral could not be submitted."
          );
        }

        setReferralNotice(
          data.message ||
          "Referral submitted successfully."
        );

        setReferralForm({
          friendName:
            "",
          friendEmail:
            "",
          friendPhone:
            "",
          notes:
            "",
          consentConfirmed:
            false
        });
      } catch (error) {
        setReferralNotice(
          error.message ||
          "The referral could not be submitted."
        );
      } finally {
        setReferralSubmitting(
          false
        );
      }
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          My Resources
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Relocation, arrival, integration, and licensure guidance in chronological order.
        </p>
      </div>

      <div className="inline-flex rounded-xl border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab("relocation")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "relocation"
              ? "bg-white shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Relocation & Integration
        </button>
        <button
          type="button"
          onClick={() => setTab("licensure")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "licensure"
              ? "bg-white shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Licensure
        </button>

        <button
          type="button"
          onClick={() => setTab("member-services")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "member-services"
              ? "bg-white shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Exclusive Member Services
        </button>
      </div>

      {tab === "relocation" ? (
        <div className="space-y-6">
          {phaseSections.map(section => {
            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className="overflow-hidden rounded-2xl border bg-card"
              >
                <div className="flex items-center gap-3 border-b bg-slate-50 px-5 py-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">
                    {section.title}
                  </h2>
                </div>
                <div className="divide-y">
                  {section.items.map(item => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex gap-4 p-5"
                      >
                        <ItemIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              Quick Access Links
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Immigration, case-tracking, candidate-lifecycle, and frequently requested resources.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {QUICK_ACCESS_LINKS.map(resource => (
                <ResourceLink
                  key={resource.label}
                  {...resource}
                />
              ))}

              <ResourceLink
                label="Find your local SSA office"
                href="https://secure.ssa.gov/ICON/main.jsp"
              />

              <ResourceLink
                label="U.S. Customs and Border Protection"
                href="https://www.cbp.gov/"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">
                  Infinity Care Partners Departments
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quick view of the team to contact and what each department supports.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {ICP_DEPARTMENTS.map(department => (
                <div
                  key={department.name}
                  className="rounded-xl border bg-white p-4"
                >
                  <p className="font-semibold">
                    {department.name}
                  </p>

                  <a
                    href={`mailto:${department.email}`}
                    className="mt-1 block text-sm font-medium text-primary hover:underline"
                  >
                    {department.email}
                  </a>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {department.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : tab === "licensure" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              License Endorsement Process
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pre-arrival steps first, followed by post-arrival requirements.
            </p>

            <div className="mt-5 space-y-3">
              {endorsementSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-3 rounded-lg border p-4"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm font-medium">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              State Requirements
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium">
                  Pre-Arrival States
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Follow the state-specific plan provided by your ICP licensing team for endorsement tasks that your Board permits before U.S. arrival.
                </p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium">
                  Post-Arrival States
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Some states require one or more endorsement steps after arrival, such as in-person fingerprinting, identity verification, a U.S. address, or other Board-specific items.
                </p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium">
                  Jurisprudence Exam Requirements
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Some Boards require a nursing-law or jurisprudence exam. Check your assigned Board of Nursing before completing the endorsement application.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ResourceLink
                label="License Endorsement Requirements by State"
                href={
                  import.meta.env.VITE_LICENSE_ENDORSEMENT_REQUIREMENTS_URL ||
                  ""
                }
              />

              <ResourceLink
                label="Find your State Board of Nursing (NCSBN)"
                href="https://www.ncsbn.org/contact-bon.htm"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              Helpful Resources
            </h2>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              English Exam Websites
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {ENGLISH_RESOURCES.map(resource => (
                <ResourceLink
                  key={resource.label}
                  {...resource}
                />
              ))}
            </div>

            <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Credentialing & Licensure
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {LICENSURE_RESOURCES.map(resource => (
                <ResourceLink
                  key={resource.label}
                  {...resource}
                />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Exclusive Member Services
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Member-only services, rewards, offers, and preferred vendor resources.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <MemberServiceCard
                title="Preferred 3rd Party Licensure Agent"
                description="ICP's preferred third-party licensure support option with an exclusive candidate-member offering."
                href={
                  preferredLicensureAgentUrl
                }
                onClick={() =>
                  setShowPreferredAgentOffer(
                    true
                  )
                }
              />

              {EXCLUSIVE_MEMBER_SERVICES.map(service => (
                <MemberServiceCard
                  key={service.title}
                  {...service}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              Preferred Vendors
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quick access to ICP preferred banking, vehicle, and transportation resources.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {PREFERRED_VENDOR_RESOURCES.map(resource => (
                <ResourceLink
                  key={resource.label}
                  {...resource}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">
                  Refer a Friend
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Refer a healthcare professional to ICP. Eligible referrals may earn ICP points or credits if the referral becomes a hire, subject to the active referral program.
                </p>
              </div>
            </div>

            <form
              onSubmit={
                submitReferral
              }
              className="mt-5 space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    Friend&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    value={
                      referralForm.friendName
                    }
                    onChange={event =>
                      setReferralForm(previous => ({
                        ...previous,
                        friendName:
                          event.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Friend&apos;s Email
                  </label>
                  <input
                    type="email"
                    value={
                      referralForm.friendEmail
                    }
                    onChange={event =>
                      setReferralForm(previous => ({
                        ...previous,
                        friendEmail:
                          event.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Friend&apos;s Phone
                  </label>
                  <input
                    type="tel"
                    value={
                      referralForm.friendPhone
                    }
                    onChange={event =>
                      setReferralForm(previous => ({
                        ...previous,
                        friendPhone:
                          event.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={
                      referralForm.notes
                    }
                    onChange={event =>
                      setReferralForm(previous => ({
                        ...previous,
                        notes:
                          event.target.value
                      }))
                    }
                    placeholder="Specialty, location, or anything helpful"
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={
                    referralForm.consentConfirmed
                  }
                  onChange={event =>
                    setReferralForm(previous => ({
                      ...previous,
                      consentConfirmed:
                        event.target.checked
                    }))
                  }
                  className="mt-1"
                />
                <span>
                  I confirm that my friend has agreed to have their contact information shared with Infinity Care Partners.
                </span>
              </label>

              {referralNotice && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {referralNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  referralSubmitting
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {referralSubmitting
                  ? "Submitting..."
                  : "Submit Referral"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              Community & Updates
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Candidate stories and recurring ICP updates can live here without adding another Resources tab.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {COMMUNITY_RESOURCES.map(resource => (
                <ResourceLink
                  key={resource.label}
                  {...resource}
                />
              ))}
            </div>
          </section>

          {showPreferredAgentOffer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-2xl">
                <h2 className="text-xl font-bold">
                  Preferred 3rd Party Licensure Agent
                </h2>

                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm leading-6">
                    ICP candidates receive an exclusive member offering of 10% off processing fees for the selected service. If you elect to use this service, you will be re-directed to a 3rd party licensure HUB for processing. Please follow the instructions provided to begin this process. An agent will guide you through this journey.
                  </p>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPreferredAgentOffer(
                        false
                      )
                    }
                    className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      !preferredLicensureAgentUrl
                    }
                    onClick={() => {
                      if (
                        preferredLicensureAgentUrl
                      ) {
                        window.open(
                          preferredLicensureAgentUrl,
                          "_blank",
                          "noopener,noreferrer"
                        );
                        setShowPreferredAgentOffer(
                          false
                        );
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue to Licensure HUB
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}