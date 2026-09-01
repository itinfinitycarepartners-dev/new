// Admin panel theme and UI constants
export const THEME = {
  brand: '#81348d', 
  brandDark: '#5e2568', 
  brandLight: '#a855b5', 
  brandGhost: '#f3e8f5',
  teal: '#0d9488', 
  tealLight: '#ccfbf1', 
  amber: '#d97706', 
  amberLight: '#fef3c7',
  red: '#dc2626', 
  redLight: '#fee2e2', 
  green: '#16a34a', 
  greenLight: '#dcfce7',
  blue: '#2563eb', 
  blueLight: '#dbeafe', 
  bg: '#f8f7fb', 
  card: '#ffffff',
  border: '#ede9f0', 
  text: '#1a1025', 
  muted: '#7c6f85', 
  subtle: '#c4b8cc',
};

export const DOCUMENT_REJECTION_REASONS = [
  {
    value: "Expired",
    label: "Expired",
    description: "The document that you have provided has either expired or is set to expire outside of the processing window"
  },
  {
    value: "Not applicable",
    label: "Not applicable",
    description: "The document that you have provided does not apply to the document requested"
  },
  {
    value: "Inconclusive",
    label: "Inconclusive",
    description: "The document that you have provided does not provide sufficient evidence to determine the documents viability (signature, date, etc.)"
  }
];

export const PIPELINE_CATEGORIES = {
  Hiring: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Immigration: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Deployment: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Aftercare: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "NCLEX Roadmap": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "NCLEX Prescreen": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "NCLEX Program": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export const PIPELINE_STATUS = {
  "Completed": { icon: "CheckCircle2", color: "text-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "In Progress": { icon: "Clock", color: "text-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "Blocked": { icon: "AlertCircle", color: "text-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
  "Not Started": { icon: "Circle", color: "text-gray-400", badge: "bg-gray-100 text-gray-600 border-gray-200" },
};
