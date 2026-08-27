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
  BookOpen,
  ChevronDown
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
    action:
      "faqs"
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


const CANDIDATE_FAQ_DEPARTMENTS = [
  {
    key: "recruiting",
    name: "Recruiting Department",
    shortName: "Recruiting",
    email: "recruiting@infinitycarepartners.com",
    icon: Users,
    questions: [
      {
        question: "What type of agency is Infinity Care Partners (ICP)?",
        answer:
          "ICP is a Direct Hire Agency. Healthcare professionals are hired directly by their U.S. employer, who also serves as their immigration petitioner. Candidates receive pay and benefits competitive with American healthcare workers of similar experience and location."
      },
      {
        question: "Who is eligible to apply?",
        answer: "ICP assists:",
        bullets: [
          "NCLEX-Passed RNs in all specialties (ICU, Med-Surg, Dialysis, Cath Lab, OR, etc.)",
          "Medical Technologists",
          "Sonographers",
          "Nurse Aides (CNAs)",
          "Non-NCLEX nurses through our in-house NCLEX program"
        ]
      },
      {
        question: "What are the minimum requirements for NCLEX RNs?",
        bullets: [
          "Must have passed the NCLEX-RN exam.",
          "Must be currently working bedside in the department you are applying for.",
          "Must have at least 2 years of recent bedside experience in that specialty (ICU, Dialysis, Med-Surg, OR, etc.)."
        ]
      },
      {
        question: "Why is active bedside experience required?",
        answer:
          "U.S. hospitals expect international nurses to be clinically current in the exact specialty where they are being placed. This ensures you are fully prepared for your role upon arrival."
      },
      {
        question: "Can I apply if I am not currently working bedside?",
        answer:
          "If you are not working bedside, you will need to return to active clinical work in your specialty for at least 1–2 years before applying. This requirement is non-negotiable for U.S. employers."
      },
      {
        question: "Can I choose my specialty?",
        answer:
          "Yes, but you will only be considered for the specialty where you have 2+ years of continuous, recent bedside experience. For example:",
        bullets: [
          "If you have ICU experience, you can apply for ICU roles.",
          "If you are currently in Dialysis, you will be considered for Dialysis placements."
        ]
      },
      {
        question: "Do I need to pay ICP for recruitment services?",
        answer:
          "No. ICP is a direct-hire placement company. You do not pay us for placement. Your U.S. employer pays all associated fees."
      },
      {
        question: "Can I choose my U.S. location?",
        answer:
          "You may share preferences for certain states or cities, but placement is based on employer demand and specialty openings. ICP staff across all 50 states."
      },
      {
        question: "How long does the hiring process take before immigration begins?",
        answer:
          "Most nurses complete the recruiting and employer interview stage within 4–6 weeks, depending on employer availability and candidate readiness."
      },
      {
        question: "How do I apply?",
        answer:
          "Apply online at jobs.infinitycarepartners.com. A recruiter will contact you within 24 hours after submission."
      },
      {
        question: "What happens after I apply?",
        answer:
          "Your application will be reviewed by our recruiting team. If you meet requirements, we will contact you for a Video screening interview and begin matching you with possible employers."
      }
    ]
  },
  {
    key: "immigration",
    name: "Immigration Department",
    shortName: "Immigration",
    email: "immigration@infinitycarepartners.com",
    icon: Globe2,
    questions: [
      {
        question: "What English exam do I need to take?",
        answer:
          "We recommend IELTS, as it is widely accepted by U.S. Boards of Nursing and for VisaScreen certification."
      },
      {
        question: "Does ICP cover my immigration costs?",
        answer:
          "Yes. Your employer (with ICP coordination) covers petition filing fees and most immigration costs. Certain reimbursable costs may be advanced by ICP."
      },
      {
        question: "Will my dependents (spouse and children) be included?",
        answer:
          "Yes. ICP files cases for legally married spouses and unmarried children under 21."
      },
      {
        question: "What is a Visa Screen Certificate?",
        answer:
          "It’s a U.S.-required certification confirming your education, license, and English proficiency. It must be completed before you can receive a visa."
      },
      {
        question: "How long does the immigration process take?",
        answer:
          "On average, 18–24 months from job offer to arrival. Timelines vary depending on visa retrogression and government processing times."
      },
      {
        question: "Can I work in another country while waiting for my U.S. visa?",
        answer:
          "Yes, but you must remain available to complete required steps (medical exams, embassy interviews, etc.)."
      },
      {
        question: "What is the I-140 petition?",
        answer:
          "The I-140 is the immigrant petition filed by your employer (with ICP support) to U.S. Citizenship and Immigration Services (USCIS). It establishes that you are eligible for an immigrant visa as a healthcare worker and that your employer qualifies to sponsor you."
      },
      {
        question: "How long does I-140 approval take?",
        answer:
          "Currently, around 12–15 months under regular processing. ICP does not file premium processing unless your priority date is current and all requirements (VisaScreen, English exam) are complete."
      },
      {
        question: "What is a Priority Date and why is it important?",
        answer:
          "The Priority Date is the date USCIS receives your I-140. It determines your place in the visa line. Your case can only move forward when your priority date becomes “current” according to the U.S. Department of State Visa Bulletin."
      },
      {
        question: "What is Visa Retrogression?",
        answer:
          "Visa retrogression happens when demand for visas is higher than supply. A priority date that is “current” one month may move backward the next, which can temporarily delay embassy scheduling."
      },
      {
        question: "What happens after my I-140 is approved?",
        answer:
          "Your case moves to the National Visa Center (NVC). At this stage, you will submit fees and civil documents (passport, birth certificate, marriage certificate if applicable, etc.). ICP helps ensure your file is complete so the NVC can qualify your case."
      },
      {
        question: "What is the DS-260?",
        answer:
          "The DS-260 is the online immigrant visa application form. It is completed for you and each dependent before your case is scheduled for an embassy interview. You must provide accurate biographical information, employment history, and travel history."
      },
      {
        question: "When can I add dependents to my case?",
        answer:
          "Dependents can be added any time before DS-260 submission. After submission, only limited changes are possible, so it’s important to confirm dependents early."
      },
      {
        question: "What happens at the embassy interview?",
        answer:
          "You will attend an interview at the U.S. Embassy or Consulate in your home country. An officer will review your documents, confirm your qualifications, and ask questions about your employment and family. If approved, your immigrant visa will be placed in your passport."
      },
      {
        question: "How long after the embassy interview will I get my visa?",
        answer:
          "Most candidates receive their visa within 2–4 weeks of the interview, depending on embassy workload and any required additional processing."
      },
      {
        question: "When should I schedule my medical exam?",
        answer:
          "After receiving your embassy interview date. The exam should be as close as possible to the interview (valid only 180 days)."
      },
      {
        question: "Can I travel while my passport is with the embassy?",
        answer:
          "No. Once your passport is submitted to the embassy, you cannot use it until your visa is issued and returned."
      },
      {
        question: "Does ICP cover my dependent’s fees?",
        answer:
          "No, ICP’s payment for candidate visa fee bills, which will be deducted from reimbursable costs."
      },
      {
        question: "What happens if a dependent has a medical delay (e.g., sputum testing)?",
        answer:
          "Your arrival may be rescheduled. In some cases, you may travel ahead while your dependent follows after medical clearance."
      },
      {
        question: "What documents do I need for the embassy interview?",
        bullets: [
          "Passport (and any renewed passports since DS-260 submission)",
          "Visa appointment letter",
          "Birth certificate",
          "Marriage certificate (if applicable)",
          "NCLEX and nursing license verification",
          "VisaScreen certificate",
          "Completed medical exam results"
        ]
      }
    ]
  },
  {
    key: "relocation-logistics",
    name: "Relocation & Logistics Department",
    shortName: "Relocation & Logistics",
    email: "deployment@infinitycarepartners.com",
    icon: Plane,
    questions: [
      {
        question: "How many bags can I bring on my flight?",
        answer:
          "ICP provides 2 checked bags. If your ticket does not reflect this, you may pay for the second bag at check-in and submit the receipt for reimbursement."
      },
      {
        question: "What happens if I experience a sputum delay after my medical exam?",
        answer:
          "You may need an additional 6–8 weeks for clearance. Arrival timelines will be adjusted based on medical clearance, resignation requirements, and visa validity."
      },
      {
        question: "How long after the embassy interview will I receive my visa?",
        answer:
          "Typically 2–4 weeks."
      },
      {
        question: "What if my dependent experiences a sputum delay?",
        answer:
          "Arrival timelines will be adjusted. In some cases, you may travel ahead and your dependent can follow once cleared."
      },
      {
        question: "Can I use my international driver’s license in the U.S.?",
        answer:
          "Yes, up to one year. Requirements vary by state, so confirm with the Department of Motor Vehicles (DMV) where you are placed."
      },
      {
        question: "How does ICP assist with housing?",
        answer:
          "ICP will help you complete a housing form and secure appropriate accommodations near your worksite. Housing options vary by location."
      },
      {
        question: "When and how can I enroll my children in school?",
        answer:
          "Public schools allow enrollment throughout the year. Most schools run August–May with holiday breaks."
      },
      {
        question: "Does ICP provide transportation assistance?",
        answer:
          "Yes, guidance will be provided on obtaining a vehicle or using public transport depending on your placement state. ICP also partners with vendors that can support transportation needs."
      },
      {
        question: "What resources are provided before arrival?",
        bullets: [
          "Relias training modules (to be completed before arrival)",
          "Skills assessment checklist",
          "Pre-arrival orientation on housing, transportation, and community resources"
        ]
      },
      {
        question: "Who should I contact if I need help?",
        answer:
          "Each department (Recruiting, Immigration, Relocation & Logistics, Customer Service) has dedicated support. You will be given departmental contact details during your onboarding."
      },
      {
        question: "What travel arrangements does ICP provide?",
        answer:
          "We coordinate your flight to the U.S. and provide 2 checked bags. You’ll receive your flight itinerary before departure."
      },
      {
        question: "What happens when I arrive in the U.S.?",
        answer:
          "A member of the ICP team or a facility representative will meet you at the airport, assist with transportation, and guide you through your housing check-in."
      },
      {
        question: "What should I pack?",
        answer:
          "We recommend essentials for the first month (clothing, documents, personal items). Larger purchases like furniture or appliances can be made in the U.S."
      },
      {
        question: "Will I have health insurance when I arrive?",
        answer:
          "Yes, your employer provides health insurance benefits. Coverage start dates vary, so ICP will explain when your coverage begins."
      },
      {
        question: "Can ICP help with opening a U.S. bank account?",
        answer:
          "Yes, we guide you through setting up a U.S. bank account and provide advice on managing your finances after arrival."
      },
      {
        question: "Do I need to have an unlocked cell phone before traveling to the U.S.?",
        answer:
          "Yes. We strongly recommend that you bring an unlocked smartphone from your home country. An unlocked phone allows you to purchase and use a U.S. SIM card immediately upon arrival."
      },
      {
        question: "Why does my phone need to be unlocked?",
        answer:
          "Phones locked to a carrier in your home country may not work with U.S. networks. If your phone is unlocked, you can quickly set up service with U.S. carriers like AT&T, T-Mobile, or Verizon."
      },
      {
        question: "Can ICP help me set up a U.S. phone plan?",
        answer:
          "Yes. Our relocation team will guide you in choosing a carrier and plan that works best for your location and budget."
      },
      {
        question: "What if my phone is locked?",
        answer:
          "You should contact your current provider before departure to request an unlock. If you arrive with a locked phone, you may need to purchase a new device in the U.S."
      },
      {
        question: "How much money should I bring with me when I arrive in the U.S.?",
        answer:
          "We recommend bringing enough funds to cover your first 6–8 weeks of expenses. Even with housing and employer support, you’ll need to budget for groceries, utilities, deposits, transportation, and personal essentials before your first paycheck.",
        bullets: [
          "Single Nurse: Bring at least $3,000 – $4,500 USD. This allows for rent deposits, groceries, utilities, public transportation or initial car expenses, and setting up a household.",
          "Nurse with Spouse/Family: Bring at least $6,000 – $8,000 USD, depending on family size. Families have higher upfront costs — including larger housing deposits, more groceries, school supplies, childcare needs, and transportation."
        ]
      },
      {
        question: "Should I bring cash or a card?",
        bullets: [
          "Carry $300–$500 in cash for immediate needs like taxis, meals, or baggage fees.",
          "The remainder should be on a debit/credit card (Visa or Mastercard recommended) that works internationally."
        ]
      },
      {
        question: "What if I cannot bring this much money?",
        answer:
          "Bring as much as you can — but be prepared to budget very carefully. Keep in mind U.S. employers typically pay every 2–4 weeks, so you must cover all living costs until your first paycheck."
      }
    ]
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
  href,
  onClick
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left text-sm font-medium transition hover:border-primary/40 hover:bg-primary/5"
      >
        <span>{label}</span>
        <CircleHelp className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

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

function DepartmentFaqSection({
  department,
  openFaqItem,
  setOpenFaqItem
}) {
  const DepartmentIcon =
    department.icon ||
    CircleHelp;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-col gap-3 border-b bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <DepartmentIcon className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h3 className="font-semibold">
              {department.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {department.questions.length} frequently asked questions
            </p>
          </div>
        </div>

        <a
          href={`mailto:${department.email}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <Send className="h-4 w-4" />
          {department.email}
        </a>
      </div>

      <div className="divide-y">
        {department.questions.map(
          (item, index) => {
            const itemKey =
              `${department.key}:${index}`;

            const isOpen =
              openFaqItem ===
              itemKey;

            const isPurpleRow =
              index % 2 === 0;

            return (
              <div
                key={itemKey}
                className={
                  isPurpleRow
                    ? "bg-[#f7f1ff]"
                    : "bg-white"
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqItem(
                      isOpen
                        ? ""
                        : itemKey
                    )
                  }
                  aria-expanded={
                    isOpen
                  }
                  className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition ${
                    isPurpleRow
                      ? "hover:bg-[#efe4ff]"
                      : "hover:bg-primary/5"
                  }`}
                >
                  <div className="flex min-w-0 gap-3">
                    <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm font-semibold leading-6">
                      {item.question}
                    </span>
                  </div>

                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    className={`px-5 pb-5 pl-12 ${
                      isPurpleRow
                        ? "bg-[#f7f1ff]"
                        : "bg-white"
                    }`}
                  >
                    {item.answer && (
                      <p className="text-sm leading-7 text-muted-foreground">
                        {item.answer}
                      </p>
                    )}

                    {Array.isArray(
                      item.bullets
                    ) &&
                      item.bullets.length >
                        0 && (
                        <ul className={`${item.answer ? "mt-3" : ""} space-y-2 pl-5 text-sm leading-7 text-muted-foreground`}>
                          {item.bullets.map(
                            (
                              bullet,
                              bulletIndex
                            ) => (
                              <li
                                key={`${itemKey}:bullet:${bulletIndex}`}
                                className="list-disc"
                              >
                                {bullet}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
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
    openFaqItem,
    setOpenFaqItem
  ] =
    useState("");

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
          Relocation, licensure, member services, and candidate FAQs in one place.
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-2">
        <button
          type="button"
          onClick={() => setTab("relocation")}
          className={`min-w-[150px] flex-1 rounded-lg px-5 py-2.5 text-center text-sm font-medium ${
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
          className={`min-w-[150px] flex-1 rounded-lg px-5 py-2.5 text-center text-sm font-medium ${
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
          className={`min-w-[150px] flex-1 rounded-lg px-5 py-2.5 text-center text-sm font-medium ${
            tab === "member-services"
              ? "bg-white shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Exclusive Member Services
        </button>
        <button
          type="button"
          onClick={() => setTab("faqs")}
          className={`min-w-[150px] flex-1 rounded-lg px-5 py-2.5 text-center text-sm font-medium ${
            tab === "faqs"
              ? "bg-white shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          FAQs
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
                  onClick={
                    resource.action === "faqs"
                      ? () => setTab("faqs")
                      : undefined
                  }
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
      ) : tab === "faqs" ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <CircleHelp className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    Candidate Frequently Asked Questions
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    All candidate FAQs are organized by the ICP department responsible for that part of your journey.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {CANDIDATE_FAQ_DEPARTMENTS.map(
                department => {
                  const DepartmentIcon =
                    department.icon ||
                    CircleHelp;

                  return (
                    <div
                      key={`faq-summary:${department.key}`}
                      className="rounded-xl border bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <DepartmentIcon className="h-4 w-4 text-primary" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold">
                            {department.shortName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {department.questions.length} FAQs
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          {CANDIDATE_FAQ_DEPARTMENTS.map(
            department => (
              <DepartmentFaqSection
                key={department.key}
                department={department}
                openFaqItem={openFaqItem}
                setOpenFaqItem={setOpenFaqItem}
              />
            )
          )}
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
                title="Preferred Licensure Agent"
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
                  Preferred Licensure Agent
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