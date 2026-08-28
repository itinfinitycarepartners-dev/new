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
  ChevronDown,
  X,
  Eye
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
    action:
      "candidate-lifecycle"
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
    contactRole:
      "Director",
    contactName:
      "James D. Krulder",
    phone:
      "516.496.1810",
    phoneHref:
      "tel:+15164961810"
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
    action:
      "rn-endorsement"
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


// Candidate-facing source files. The portal opens these resources in an in-app
// viewer; the public paths remain available for the embedded PDF/source assets.
const CANDIDATE_RESOURCE_FILES = {
  candidateLifecycle:
    "/resources/infinity-candidate-lifecycle-summary.pdf",
  endorsementStopover:
    "/resources/endorsement-stop-over-states.docx",
  rnEndorsementMatrix:
    "/resources/rn-endorsement-requirements-2026.xlsx",
  corporateDiscounts:
    "/resources/corporate-account-discounts-candidate-safe.xlsx",
  advancialContacts:
    "/resources/advancial-pre-arrival-banking-contacts-faq.docx",
  advancialAffiliationLetter:
    "/resources/icp-advancial-affiliation-letter-template.docx"
};

const ENDORSEMENT_STOP_OVER_STATES = [
  {
    state: "Illinois",
    requirements: "CES, fingerprints",
    notes: "Very portable; accepts alternative NCLEX verification."
  },
  {
    state: "Texas",
    requirements: "CES, fingerprints",
    notes: "NLC state; extremely portable."
  },
  {
    state: "Nevada",
    requirements: "CES, fingerprints",
    notes: "Fast processing; accepts alternative NCLEX verification."
  },
  {
    state: "New Jersey",
    requirements: "CES, fingerprints",
    notes: "Predictable endorsement; Nursys."
  },
  {
    state: "Pennsylvania",
    requirements: "CES",
    notes: "Very easy endorsement in/out."
  },
  {
    state: "Colorado",
    requirements: "CES",
    notes: "NLC state; highly portable."
  },
  {
    state: "Arizona",
    requirements: "CES",
    notes: "NLC state; friendly to foreign-educated nurses."
  },
  {
    state: "Missouri",
    requirements: "CES",
    notes: "Accepts alternative NCLEX verification; Nursys."
  }
];


const RN_ENDORSEMENT_MATRIX_2026 = [
  { state: "Alabama", ces: "❌", nursys: "✔", ssn: "✔", fingerprint: "Alabama Law Enforcement Agency (ALEA)", english: "Alabama Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Alaska", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "FD-258 Ink Card Only", english: "Alaska  Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "Arizona", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "Arizona Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Arkansas", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Arkansas State Police", english: "Arkansas    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "California", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "CA DOJ Live Scan (state-approved vendors)", english: "California  Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Colorado", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "Colorado    Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Connecticut", ces: "✔*", nursys: "✔", ssn: "✔", fingerprint: "Ink Card (if out of state)", english: "Connecticut Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET" },
  { state: "Delaware", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "Delaware    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "District of Columbia (DC)", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "District of Columbia    Strict  Exam OR 12 months U.S. RN experience    TOEFL, IELTS, PTE, OET" },
  { state: "Florida", ces: "✔", nursys: "✔", ssn: "✔*", fingerprint: "FDLE Live Scan", english: "Florida Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Georgia", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Georgia Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Hawaii", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint (US) / Ink Card (abroad)", english: "Hawaii  Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET" },
  { state: "Idaho", ces: "❌", nursys: "✔", ssn: "✔", fingerprint: "Idaho State Police", english: "Idaho   Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Illinois", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Illinois State Police / Approved Vendors", english: "Illinois    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "Indiana", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Indiana Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Iowa", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Iowa DPS", english: "Iowa    Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Kansas", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Kansas Bureau of Investigation", english: "Kansas  Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Kentucky", ces: "❌", nursys: "✔", ssn: "✔", fingerprint: "Kentucky State Police", english: "Kentucky    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Louisiana", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Louisiana State Police", english: "Louisiana   Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Maine", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Maine State Police", english: "Maine   Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET" },
  { state: "Maryland", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "Maryland    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Massachusetts", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Massachusetts   Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Michigan", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Michigan    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "Minnesota", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "MN Bureau of Criminal Apprehension", english: "Minnesota   Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Mississippi", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Mississippi Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET" },
  { state: "Missouri", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Missouri Highway Patrol", english: "Missouri    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "Montana", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Montana DOJ / Ink Card", english: "Montana Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Nebraska", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Nebraska State Patrol / Ink Card", english: "Nebraska    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Nevada", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Nevada DPS", english: "Nevada  Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "New Hampshire", ces: "❌", nursys: "✔", ssn: "✔", fingerprint: "NH State Police", english: "New Hampshire   Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET" },
  { state: "New Jersey", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "New Jersey  Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "New Mexico", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "New Mexico  Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "New York", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "New York    Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "North Carolina", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "North Carolina  Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "North Dakota", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "ND Bureau of Criminal Investigation / Ink Card", english: "North Dakota    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Ohio", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Ohio    Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Oklahoma", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Oklahoma State Bureau of Investigation", english: "Oklahoma    Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET" },
  { state: "Oregon", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Oregon State Police", english: "Oregon  Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Pennsylvania", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "❌ No fingerprints required", english: "Pennsylvania    Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Rhode Island", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "RI State Police", english: "Rhode Island    Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "South Carolina", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint/ (Ink card if abroad)", english: "South Carolina  Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "South Dakota", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO / Ink Card", english: "South Dakota    Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Tennessee", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Tennessee   Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Texas", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO", english: "Texas   Conditional Exam required only if CES cannot verify English instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "Utah", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Utah Bureau of Criminal Identification", english: "Utah    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "Vermont", ces: "❌", nursys: "✔", ssn: "✔", fingerprint: "❌ No fingerprints required", english: "Vermont Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Virginia", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Virginia State Police", english: "Virginia    Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET, MET" },
  { state: "Washington", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Washington State Patrol", english: "Washington  Strict  CES must confirm English-medium instruction TOEFL, IELTS, PTE, OET" },
  { state: "West Virginia", ces: "❌*", nursys: "✔", ssn: "✔", fingerprint: "IdentoGO / Ink Card", english: "West Virginia   Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Wisconsin", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Fieldprint or State Police/ Ink card if abroad", english: "Wisconsin   Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" },
  { state: "Wyoming", ces: "✔", nursys: "✔", ssn: "✔", fingerprint: "Wyoming DCI / IdentoGO/ Ink card if abroad", english: "Wyoming Not Required    Exam only if CES cannot verify English instruction  TOEFL, IELTS, PTE, OET" }
];

const ENDORSEMENT_GUIDE_PRINCIPLES = [
  {
    title: "1. Original-state license verification matters",
    text: "Some states use national verification systems while others use their own internal systems. Endorsement can be blocked when the receiving Board cannot verify the original license through a compatible method."
  },
  {
    title: "2. NCLEX verification methods differ",
    text: "States store and release NCLEX results differently. If the receiving Board requires verification that the original state cannot provide, endorsement may not proceed through the usual path."
  },
  {
    title: "3. Some Boards require original-state verification",
    text: "When a receiving state insists on NCLEX confirmation directly from the original licensing state, a verification mismatch can stop the endorsement even when the nurse's education, English exam, immigration status and work history are otherwise acceptable."
  },
  {
    title: "4. Some states accept alternative verification paths",
    text: "Alternative routes may include score transfers, third-party credential evaluations, secondary verification from another licensed state, or manual verification methods."
  },
  {
    title: "5. The receiving state's rules determine portability",
    text: "Two nurses with similar qualifications can have different endorsement outcomes because state verification systems and Board requirements are not identical."
  }
];

const ADVANCIAL_AFFILIATION_TEMPLATE = [
  "ICP Affiliation Confirmation Letter",
  "Date",
  "",
  "To Whom It May Concern,",
  "",
  "(Candidate Name), RN is affiliated with Infinity Care Partners and is now a contracted employee of (Employer Name) in (City, State).",
  "",
  "Name (employee):",
  "Title / Position Type: Nurse",
  "Employment contract duration: 3 years",
  "Salary: $",
  "Human Resources Director:",
  "Infinity Care Partners representative: Alex MacInnis",
  "",
  "Thank you,",
  "Alex MacInnis",
  "amacinnis@infinitycarepartners.com",
  "Infinity Care Partners"
];

const CORPORATE_DISCOUNT_RESOURCES = [
  {
    category: "Hotel",
    vendor: "Hilton",
    detail:
      "ICP business-account invitation link. Use the ICP vendor email when requested.",
    href:
      "https://www.hilton.com/en/business/invite/3NsGu772s1XwEsc650yz1tHvlONJFvmVkYj1puqXrSTRP8pnCa1m8xbEVYVZo0rMj5v_5ZNMNZtu-kqdWXfLCQ",
    code: "icpvendor@infinitycarepartners.com"
  },
  {
    category: "Hotel",
    vendor: "IHG Hotels",
    detail:
      "ICP has business-account access. Contact the ICP vendor/support team for account-based access; credentials are not published in the candidate portal."
  },
  {
    category: "Hotel",
    vendor: "Choice Hotels",
    detail:
      "ICP has business-account access. Contact the ICP vendor/support team for account-based access; credentials are not published in the candidate portal."
  },
  {
    category: "Rental Car",
    vendor: "Sixt",
    detail:
      "Use the ICP corporate guest link and search for Infinity Care Partners when prompted.",
    href:
      "https://corporate-guest.sixt.com/?sfid=965ce02a-9f09-4559-b953-2a1c8e76fe47"
  },
  {
    category: "Rental Car",
    vendor: "Avis",
    detail:
      "Worldwide Discount Code can be used with an existing Avis account at checkout; source notes up to 30% off the base rate.",
    code: "W736250"
  },
  {
    category: "Rental Car",
    vendor: "Hertz",
    detail:
      "ICP corporate discount. The source notes that the non-employee link is still awaiting approval; add the CDP number to your Hertz profile where permitted.",
    code: "CDP #2317543 · 20% discount"
  }
];

const ADVANCIAL_FAQ_SECTION = {
  key: "advancial-pre-arrival-banking",
  name: "Advancial Pre-Arrival Banking FAQs",
  shortName: "Advancial Banking",
  email: "SpecialtyAccounts@advancial.org",
  icon: Landmark,
  questions: [
    {
      question: "What is the pre-arrival banking program?",
      answer:
        "The program allows you to begin opening a U.S. bank account up to 15 days before arriving in the United States."
    },
    {
      question: "Why should I open my bank account before arriving?",
      answer:
        "Starting early helps reduce delays, lowers stress after arrival, and allows you to focus on housing, transportation, and orientation."
    },
    {
      question: "How early can I start the process?",
      answer:
        "You can begin the process up to 15 days before your scheduled arrival date."
    },
    {
      question: "Which bank is providing this service?",
      answer:
        "Advancial Credit Union is providing the pre-arrival banking service."
    },
    {
      question: "How do I apply?",
      answer:
        "Submit an application for an Advancial account and follow the instructions provided by their team."
    },
    {
      question: "What address should I use on my application?",
      answer:
        "Use Infinity Care Partners' corporate address: 5016 Centennial Blvd, Suite 200, Nashville, TN 37209."
    },
    {
      question: "Why do I need to use the corporate address?",
      answer:
        "It allows Advancial to safely send your banking materials before you have permanent housing in the U.S."
    },
    {
      question: "What support does Infinity Care Partners provide?",
      answer:
        "Infinity Care Partners provides a liability letter that authorizes Advancial to send banking materials to the corporate address."
    },
    {
      question: "What banking materials can be sent to the corporate address?",
      answer:
        "Debit cards, approved credit cards, and other account materials can be sent there."
    },
    {
      question: "Will I have a dedicated banking representative?",
      answer:
        "Yes. Advancial will assign you a representative to guide you through the setup process."
    },
    {
      question: "What financial topics can I discuss with my representative?",
      answer:
        "You can discuss budgeting, credit-building, loans, and financial planning."
    },
    {
      question: "When will Advancial contact me?",
      answer:
        "Advancial will typically contact you 12–15 days before your scheduled arrival date."
    },
    {
      question: "Can I apply for a car loan through Advancial?",
      answer:
        "Yes, provided you meet the required documentation requirements."
    },
    {
      question: "Can I apply for other credit products?",
      answer:
        "Yes. Credit products may be available if the required employment information is provided."
    },
    {
      question: "What information must be included in my job offer letter for lending purposes?",
      answer:
        "Your offer letter must include either a specific start date or at least the start month and year."
    },
    {
      question: "Why is a start date important?",
      answer:
        "Without a start date or start month/year, loan or credit applications may be delayed."
    },
    {
      question: "What should I do after I arrive in the U.S.?",
      answer:
        "Once you secure permanent housing, update your address directly with Advancial."
    },
    {
      question: "Will I need additional paperwork to update my address?",
      answer:
        "No. No additional paperwork is required when updating your address after arrival."
    },
    {
      question: "Who should I contact if I have questions or want to get started?",
      answer:
        "Email SpecialtyAccounts@advancial.org and copy your Infinity Care Partners department email address."
    },
    {
      question: "What is the main benefit of the pre-arrival banking program?",
      answer:
        "The program helps you arrive in the U.S. with greater financial stability, personalized banking support, and fewer immediate responsibilities."
    }
  ]
};

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

const PRE_DEPARTURE_FAQ_GROUPS = [
  {
    "title": "General Preparation",
    "questions": [
      {
        "question": "What is the purpose of the Pre-Departure Readiness Program?",
        "answer": "The program helps participants prepare for relocation to the United States by covering travel preparation, workplace expectations, daily living requirements, financial readiness, and personal wellbeing."
      },
      {
        "question": "What should I do before leaving for the U.S.?",
        "answer": "Review your travel documents, organize important records, prepare personal items, and ensure you have access to sufficient funds for your transition."
      },
      {
        "question": "Should I open my visa packet before traveling?",
        "answer": "No. Review your documents, but do not open your visa packet unless instructed by immigration officials."
      },
      {
        "question": "What items should I pack?",
        "answer": "Bring professional clothing, weather-appropriate clothing, medications, important documents, and essential personal care items. Pack critical items in your carry-on luggage whenever possible."
      },
      {
        "question": "What if I take prescription medication?",
        "answer": "Bring enough medication to cover several weeks, carry prescriptions or supporting documentation, and verify airline and customs requirements before travel."
      }
    ]
  },
  {
    "title": "Travel and Arrival",
    "questions": [
      {
        "question": "What can I expect during my trip to the United States?",
        "answer": "Most travelers will complete an international flight, pass through immigration, clear customs, and then proceed to their arranged arrival destination."
      },
      {
        "question": "What happens during immigration processing?",
        "answer": "You will present your passport and visa, answer basic questions, and have your documents reviewed by immigration officials."
      },
      {
        "question": "How should I respond to immigration officers?",
        "answer": "Remain calm, answer questions honestly, and provide requested documentation."
      },
      {
        "question": "What should I do during my first few days in the U.S.?",
        "answer": "You may complete important appointments such as banking, cellphone setup, grocery shopping, employer onboarding, and settling into your housing."
      },
      {
        "question": "Which phone numbers should I save immediately?",
        "answer": "Save your employer contacts, ICP support contacts, emergency services (911), and important family or personal contacts."
      }
    ]
  },
  {
    "title": "Working in the U.S. Healthcare System",
    "questions": [
      {
        "question": "What values are important in U.S. healthcare workplaces?",
        "answer": "Teamwork, communication, accountability, patient-centered care, and professional conduct are highly valued."
      },
      {
        "question": "What is a nurse's scope of practice?",
        "answer": "A nurse's scope of practice defines the tasks and responsibilities permitted based on education, experience, licensure, employer policies, and state regulations."
      },
      {
        "question": "What are common responsibilities of Registered Nurses (RNs)?",
        "answer": "Responsibilities include assessments, patient care planning, medication administration, patient education, monitoring patient conditions, and documenting care outcomes."
      },
      {
        "question": "What are RNs generally not allowed to do independently?",
        "answer": "In most situations, RNs cannot independently diagnose medical conditions, prescribe medications, perform surgery, or administer anesthesia without proper authorization and credentials."
      },
      {
        "question": "Why does scope of practice differ from one workplace to another?",
        "answer": "State laws, facility policies, specialty certifications, and supervision requirements may all affect what nurses are authorized to do."
      },
      {
        "question": "What should I do if I do not understand a healthcare term or instruction?",
        "answer": "Ask for clarification immediately to ensure patient safety and effective communication."
      }
    ]
  },
  {
    "title": "Workplace Expectations",
    "questions": [
      {
        "question": "What are employers expecting from me?",
        "answer": "Employers expect punctuality, professionalism, teamwork, reliability, and clear communication."
      },
      {
        "question": "Why does workplace communication sometimes feel direct?",
        "answer": "Direct communication is common in many U.S. workplaces and is intended to promote clarity and efficiency."
      },
      {
        "question": "What should I do if I am unsure about instructions?",
        "answer": "Ask questions, seek clarification, and confirm expectations before proceeding."
      },
      {
        "question": "What is the chain of command in a healthcare setting?",
        "answer": "Healthcare organizations follow reporting structures that often involve charge nurses, nurse managers, and department leadership. Concerns should be communicated through the appropriate channels."
      }
    ]
  },
  {
    "title": "Living in the United States",
    "questions": [
      {
        "question": "What should I know about housing?",
        "answer": "Many rental agreements are for 12 months, often requiring a security deposit and first month's rent before move-in. Always review lease terms carefully."
      },
      {
        "question": "What transportation options are available?",
        "answer": "Transportation may include personal vehicles, public transportation, rideshare services, or employer-supported transportation solutions depending on your location."
      },
      {
        "question": "Do I need a U.S. driver's license?",
        "answer": "To legally drive, you will typically need a valid driver's license and vehicle insurance in accordance with local requirements."
      },
      {
        "question": "What weather conditions should I prepare for?",
        "answer": "Conditions vary by region and may include snow, cold weather, severe storms, flooding, hurricanes, tornadoes, or extreme heat."
      },
      {
        "question": "What community resources can help me adjust?",
        "answer": "Public libraries, community centers, faith-based organizations, cultural groups, and local resource networks can help support your transition."
      },
      {
        "question": "Is it normal to feel overwhelmed during the first month?",
        "answer": "Yes. Most newcomers experience a period of adjustment while developing routines and becoming familiar with their new environment."
      }
    ]
  },
  {
    "title": "Financial Readiness",
    "questions": [
      {
        "question": "What is a W-2 form?",
        "answer": "A W-2 form summarizes your annual earnings and taxes withheld by your employer. It is used for tax filing purposes."
      },
      {
        "question": "When are taxes generally due in the United States?",
        "answer": "Federal income tax returns are generally due by April 15 each year."
      },
      {
        "question": "What is a W-4 form?",
        "answer": "The W-4 tells your employer how much federal income tax to withhold from your paycheck."
      },
      {
        "question": "What is an I-9 form?",
        "answer": "The I-9 verifies your identity and authorization to work in the United States."
      },
      {
        "question": "Why is my take-home pay different from my salary calculation?",
        "answer": "Your paycheck may include deductions for taxes, insurance, retirement plans, and other authorized deductions."
      },
      {
        "question": "What expenses should I prepare for during my first month?",
        "answer": "Common expenses include housing costs, groceries, transportation, phone service, and household items."
      },
      {
        "question": "Why is budgeting important?",
        "answer": "Budgeting helps you manage expenses, build savings, and reduce financial stress during your transition."
      }
    ]
  },
  {
    "title": "Safety, Rights, and Wellbeing",
    "questions": [
      {
        "question": "What rights do workers have in the United States?",
        "answer": "Workers are entitled to fair treatment, safe working conditions, and protection from discrimination."
      },
      {
        "question": "What scams should I watch out for?",
        "answer": "Be cautious of housing scams, financial scams, and immigration-related scams. Always verify information before providing money or personal information."
      },
      {
        "question": "When should I call 911?",
        "answer": "Call 911 during emergencies that require immediate assistance from police, fire, or medical services."
      },
      {
        "question": "Is culture shock normal?",
        "answer": "Yes. Many people experience homesickness, stress, and culture shock when moving to a new country."
      },
      {
        "question": "How can I manage stress during my transition?",
        "answer": "Stay connected with family and friends, establish healthy routines, seek support when needed, and maintain a balance between work and personal life."
      },
      {
        "question": "When should I seek additional support?",
        "answer": "Seek support if you feel overwhelmed, isolated, or unable to adjust. Employee Assistance Programs (EAPs) and other support resources may be available through your employer."
      }
    ]
  },
  {
    "title": "Immigration and Career Growth",
    "questions": [
      {
        "question": "How do I maintain my immigration status?",
        "answer": "Maintain employment, keep immigration documents current, and follow all applicable immigration requirements."
      },
      {
        "question": "What should I do before traveling outside the U.S.?",
        "answer": "Verify documentation requirements, review re-entry rules, and obtain any necessary approvals from your employer."
      },
      {
        "question": "What career growth opportunities are available to nurses in the U.S.?",
        "answer": "Opportunities may include specialty certifications, leadership positions, advanced practice roles, education, compliance, informatics, and management careers."
      },
      {
        "question": "What are the most important keys to success in my transition?",
        "answer": "Preparation, financial planning, workplace professionalism, personal safety, and maintaining wellbeing are all critical to long-term success."
      }
    ]
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



function InAppResourceCard({
  title,
  description,
  fileType = "Resource",
  onOpen
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-4 rounded-xl border bg-white p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <FileCheck2 className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {fileType}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          <Eye className="h-3.5 w-3.5" />
          Open in My Resources
        </p>
      </div>

      <Eye className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function ResourceDocumentViewer({
  documentKey,
  onClose
}) {
  if (!documentKey) return null;

  const titleMap = {
    "candidate-lifecycle": "Candidate Lifecycle",
    "rn-endorsement": "RN Endorsement Requirements (2026)",
    "endorsement-stopover": "Endorsement Stop-over States Guide",
    "corporate-discounts": "Corporate Account Discounts",
    "advancial-contacts": "Advancial Contacts & Pre-Arrival Banking FAQ",
    "advancial-affiliation": "ICP Advancial Affiliation Letter Template"
  };

  const title =
    titleMap[documentKey] ||
    "Resource";

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              In-app resource viewer
            </p>
            <h2 className="mt-1 text-lg font-bold sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              This resource stays inside the candidate portal.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border bg-white p-2 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
            aria-label="Close resource viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {documentKey === "candidate-lifecycle" ? (
            <div className="h-[72vh] overflow-hidden rounded-xl border bg-slate-100">
              <iframe
                title="Candidate Lifecycle PDF"
                src={CANDIDATE_RESOURCE_FILES.candidateLifecycle}
                className="h-full w-full"
              />
            </div>
          ) : documentKey === "rn-endorsement" ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-primary/5 p-4">
                <p className="font-semibold">2026 State Endorsement Matrix</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Review CES, Nursys, SSN, fingerprint/vendor process, and English-exam information for each state.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-[1050px] w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">State</th>
                      <th className="px-4 py-3">CES</th>
                      <th className="px-4 py-3">Nursys</th>
                      <th className="px-4 py-3">SSN</th>
                      <th className="px-4 py-3">Fingerprint Vendor / Process</th>
                      <th className="px-4 py-3">English Exam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {RN_ENDORSEMENT_MATRIX_2026.map(item => (
                      <tr key={item.state} className="align-top odd:bg-white even:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold">{item.state}</td>
                        <td className="px-4 py-3">{item.ces}</td>
                        <td className="px-4 py-3">{item.nursys}</td>
                        <td className="px-4 py-3">{item.ssn}</td>
                        <td className="px-4 py-3 leading-6">{item.fingerprint}</td>
                        <td className="px-4 py-3 leading-6">{item.english}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : documentKey === "endorsement-stopover" ? (
            <div className="space-y-5">
              <div className="rounded-xl border bg-primary/5 p-4">
                <h3 className="font-semibold">
                  Why Some RN Licenses Can Be Endorsed Easily and Others Can’t
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Endorsement depends on how the original licensing state verifies the license and NCLEX results, and on what the receiving Board accepts.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {ENDORSEMENT_GUIDE_PRINCIPLES.map(item => (
                  <div key={item.title} className="rounded-xl border bg-white p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="font-semibold">Friendly “Stop-over” States</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">State</th>
                        <th className="px-4 py-3">Requirements</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ENDORSEMENT_STOP_OVER_STATES.map(item => (
                        <tr key={item.state}>
                          <td className="px-4 py-3 font-semibold">{item.state}</td>
                          <td className="px-4 py-3">{item.requirements}</td>
                          <td className="px-4 py-3">{item.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : documentKey === "corporate-discounts" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">Candidate-safe access</p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Shared business-account passwords and private staff login credentials are intentionally not shown in the candidate portal. Contact ICP for account-based access where required.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {CORPORATE_DISCOUNT_RESOURCES.map(resource => (
                  <div key={`${resource.category}:${resource.vendor}`} className="rounded-xl border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {resource.category}
                    </p>
                    <p className="mt-1 font-semibold">{resource.vendor}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {resource.detail}
                    </p>
                    {resource.code ? (
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-semibold">Access / Code: </span>
                        <span className="break-all">{resource.code}</span>
                      </div>
                    ) : null}
                    {resource.href ? (
                      <a
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                      >
                        Open vendor website
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : documentKey === "advancial-contacts" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Specialty Accounts Manager
                  </p>
                  <p className="mt-2 font-semibold">Zoey Parr</p>
                  <a href="mailto:zparr@advancial.org" className="mt-1 block break-all text-sm font-medium text-primary hover:underline">
                    zparr@advancial.org
                  </a>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Specialty Accounts
                  </p>
                  <a href="mailto:SpecialtyAccounts@advancial.org" className="mt-2 block break-all font-semibold text-primary hover:underline">
                    SpecialtyAccounts@advancial.org
                  </a>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    ICP Mailing Address
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6">
                    5016 Centennial Blvd, Suite 200<br />
                    Nashville, TN 37209
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {ADVANCIAL_FAQ_SECTION.questions.map((item, index) => (
                  <div key={`viewer-advancial:${index}`} className="rounded-xl border bg-white p-4">
                    <p className="font-semibold">
                      {index + 1}. {item.question}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : documentKey === "advancial-affiliation" ? (
            <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm sm:p-8">
              {ADVANCIAL_AFFILIATION_TEMPLATE.map((line, index) => {
                if (index === 0) {
                  return (
                    <h3 key={index} className="mb-8 text-center text-2xl font-bold">
                      {line}
                    </h3>
                  );
                }

                if (line === "") {
                  return <div key={index} className="h-5" />;
                }

                return (
                  <p
                    key={index}
                    className={`mb-3 leading-7 ${
                      [
                        "Name (employee):",
                        "Title / Position Type: Nurse",
                        "Employment contract duration: 3 years",
                        "Salary: $",
                        "Human Resources Director:",
                        "Infinity Care Partners representative: Alex MacInnis"
                      ].includes(line)
                        ? "font-semibold"
                        : ""
                    }`}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
    openResourceDocument,
    setOpenResourceDocument
  ] =
    useState("");

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

                {section.title === "Pre-Arrival Phase" && (
                  <div className="border-t bg-white">
                    <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            ICP Pre-Departure Readiness Program FAQs
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            43 pre-departure questions covering preparation, travel, U.S. healthcare, workplace expectations, daily living, finances, safety, wellbeing, immigration, and career growth.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      {PRE_DEPARTURE_FAQ_GROUPS.map((group, groupIndex) => (
                        <div
                          key={`predeparture-group:${group.title}`}
                          className="overflow-hidden rounded-xl border bg-white"
                        >
                          <div className="border-b bg-slate-50 px-4 py-3">
                            <p className="text-sm font-bold">
                              {group.title}
                            </p>
                          </div>

                          <div className="divide-y">
                            {group.questions.map((item, itemIndex) => {
                              const faqKey =
                                `predeparture:${groupIndex}:${itemIndex}`;
                              const isOpen =
                                openFaqItem === faqKey;

                              return (
                                <div
                                  key={faqKey}
                                  className={
                                    itemIndex % 2 === 0
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
                                          : faqKey
                                      )
                                    }
                                    aria-expanded={isOpen}
                                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-primary/5"
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
                                    <div className="px-5 pb-5 pl-12">
                                      <p className="text-sm leading-7 text-muted-foreground">
                                        {item.answer}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      : resource.action === "candidate-lifecycle"
                        ? () =>
                            setOpenResourceDocument(
                              "candidate-lifecycle"
                            )
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

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InAppResourceCard
                title="RN Endorsement Requirements (2026)"
                description="50-state endorsement matrix covering CES, Nursys, SSN, fingerprint/vendor process, and English-exam requirements."
                fileType="XLSX"
                onOpen={() =>
                  setOpenResourceDocument(
                    "rn-endorsement"
                  )
                }
              />

              <InAppResourceCard
                title="Endorsement Stop-over States Guide"
                description="Explains endorsement/NCLEX verification compatibility and identifies candidate-friendly stop-over states."
                fileType="DOCX"
                onOpen={() =>
                  setOpenResourceDocument(
                    "endorsement-stopover"
                  )
                }
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border">
              <div className="border-b bg-primary/5 px-4 py-3">
                <p className="font-semibold">Friendly “Stop-over” States</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Endorsement depends on whether the receiving Board can verify the original license and NCLEX record. These states were identified in the ICP guide as more portable options.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">State</th>
                      <th className="px-4 py-3 font-semibold">Requirements</th>
                      <th className="px-4 py-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ENDORSEMENT_STOP_OVER_STATES.map(item => (
                      <tr key={item.state} className="bg-white">
                        <td className="px-4 py-3 font-medium">{item.state}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.requirements}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ResourceLink
                label="License Endorsement Requirements by State"
                onClick={() =>
                  setOpenResourceDocument(
                    "rn-endorsement"
                  )
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
                  onClick={
                    resource.action ===
                    "rn-endorsement"
                      ? () =>
                          setOpenResourceDocument(
                            "rn-endorsement"
                          )
                      : undefined
                  }
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
              {PREFERRED_VENDOR_RESOURCES.map(resource =>
                resource.phone ? (
                  <div
                    key={resource.label}
                    className="flex items-start gap-3 rounded-lg border bg-white px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {resource.label}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {resource.contactRole}: {resource.contactName}
                      </p>
                      <a
                        href={resource.phoneHref}
                        className="mt-1 inline-flex text-sm font-semibold text-primary hover:underline"
                      >
                        {resource.phone}
                      </a>
                    </div>
                  </div>
                ) : (
                  <ResourceLink
                    key={resource.label}
                    {...resource}
                  />
                )
              )}
            </div>
          </section>


          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">
                  Corporate Account Discounts
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Candidate-safe hotel and rental-car corporate offers. Shared staff login passwords are intentionally not displayed in the portal.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {CORPORATE_DISCOUNT_RESOURCES.map(resource => (
                <div
                  key={`${resource.category}:${resource.vendor}`}
                  className="rounded-xl border bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {resource.category}
                      </p>
                      <p className="mt-1 font-semibold">{resource.vendor}</p>
                    </div>
                    {resource.href ? (
                      <a
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border p-2 text-primary transition hover:bg-primary/5"
                        aria-label={`Open ${resource.vendor} corporate resource`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {resource.detail}
                  </p>

                  {resource.code ? (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold">Access / Code: </span>
                      <span className="break-all">{resource.code}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <InAppResourceCard
                title="Corporate Account Discounts — Candidate Safe Copy"
                description="Open the candidate-facing hotel and rental-car discount guide inside the portal. Internal shared passwords and staff login credentials remain hidden."
                fileType="XLSX"
                onOpen={() =>
                  setOpenResourceDocument(
                    "corporate-discounts"
                  )
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">
                  Advancial Pre-Arrival Banking
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Banking contacts, pre-arrival guidance, and the ICP affiliation-letter template used to support account setup.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Specialty Accounts Manager
                </p>
                <p className="mt-2 font-semibold">Zoey Parr</p>
                <a
                  href="mailto:zparr@advancial.org"
                  className="mt-1 block break-all text-sm font-medium text-primary hover:underline"
                >
                  zparr@advancial.org
                </a>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  General Specialty Accounts
                </p>
                <a
                  href="mailto:SpecialtyAccounts@advancial.org"
                  className="mt-2 block break-all font-semibold text-primary hover:underline"
                >
                  SpecialtyAccounts@advancial.org
                </a>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Include your Infinity Care Partners department email when contacting Advancial.
                </p>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Timing
                </p>
                <p className="mt-2 font-semibold">Up to 15 days pre-arrival</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Advancial typically contacts candidates about 12–15 days before the scheduled arrival date.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="font-semibold">ICP corporate mailing address for the application</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                5016 Centennial Blvd, Suite 200, Nashville, TN 37209
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ICP provides an affiliation/liability letter so approved banking materials can be sent to the corporate address before permanent U.S. housing is established.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InAppResourceCard
                title="Advancial Contacts & Pre-Arrival Banking FAQ"
                description="Specialty-account contacts plus the full 20-question pre-arrival banking guide."
                fileType="DOCX"
                onOpen={() =>
                  setOpenResourceDocument(
                    "advancial-contacts"
                  )
                }
              />

              <InAppResourceCard
                title="ICP Advancial Affiliation Letter Template"
                description="Template confirming ICP affiliation, employer, location, contract duration, salary, and ICP representative details."
                fileType="DOCX"
                onOpen={() =>
                  setOpenResourceDocument(
                    "advancial-affiliation"
                  )
                }
              />
            </div>
          </section>

          <DepartmentFaqSection
            department={ADVANCIAL_FAQ_SECTION}
            openFaqItem={openFaqItem}
            setOpenFaqItem={setOpenFaqItem}
          />

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

      <ResourceDocumentViewer
        documentKey={openResourceDocument}
        onClose={() =>
          setOpenResourceDocument(
            ""
          )
        }
      />
    </div>
  );
}