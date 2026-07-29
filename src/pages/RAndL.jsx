// @ts-nocheck
import { useState } from "react";
import {
  User,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  UserCheck,
  MessageSquare,
  Ruler,
  Weight,
  Shirt,
  Users,
  Upload,
  FileText,
  CheckCircle2,
  X,
  Plus,
  Trash2,
} from "lucide-react";

const PREFERRED_CONTACT_OPTIONS = ["Phone Call", "Text Message", "Email", "WhatsApp"];
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const RELATIONSHIP_OPTIONS = ["Spouse", "Child", "Parent", "Sibling", "Other"];
const CLOTH_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const DOCUMENT_FIELDS = [
  { key: "policeClearance", label: "Police Clearance" },
  { key: "passport", label: "Passport" },
  { key: "nclexFee", label: "NCLEX Fee Receipt" },
  { key: "english", label: "English Proficiency" },
  { key: "cesReport", label: "CES Report" },
  { key: "visaScreen", label: "Visa Screen" },
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://deploy-3or5.onrender.com';

function emptyDependant() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `dep_${Date.now()}_${Math.random()}`,
    name: "",
    dob: "",
    gender: "",
    relationship: "",
    height: "",
    weight: "",
  };
}

function FieldLabel({ icon: Icon, children, required }) {
  return (
    <label className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function TextInput({ icon, label, required, ...props }) {
  return (
    <div>
      <FieldLabel icon={icon} required={required}>
        {label}
      </FieldLabel>
      <input
        {...props}
        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}

function SelectInput({ icon, label, required, options, ...props }) {
  return (
    <div>
      <FieldLabel icon={icon} required={required}>
        {label}
      </FieldLabel>
      <select
        {...props}
        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function DocumentUploadCard({ label, file, onChange, onRemove }) {
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="border border-border rounded-xl p-4 bg-card/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        {file && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Uploaded
          </span>
        )}
      </div>

      {!file ? (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition"
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Click to upload (PDF, JPG, PNG)</span>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange(f);
            }}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between bg-background rounded-lg border border-border px-3 py-2">
          <span className="text-sm text-foreground truncate max-w-[70%]">{file.name}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function RAndL() {
  const [form, setForm] = useState({
    name: "",
    usEmployer: "",
    don: "",
    gender: "",
    email: "",
    phone: "",
    caseManager: "",
    preferredContact: "",
    height: "",
    weight: "",
    clothSize: "",
  });

  const [dependants, setDependants] = useState([]);
  const [documents, setDocuments] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateDependant = (id, key, value) =>
    setDependants((deps) => deps.map((d) => (d.id === id ? { ...d, [key]: value } : d)));

  const addDependant = () => setDependants((deps) => [...deps, emptyDependant()]);

  const removeDependant = (id) => setDependants((deps) => deps.filter((d) => d.id !== id));

  const setDocument = (key, file) => setDocuments((docs) => ({ ...docs, [key]: file }));

  const removeDocument = (key) =>
    setDocuments((docs) => {
      const next = { ...docs };
      delete next[key];
      return next;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.name || !form.email || !form.phone) {
      setErrorMsg("Please fill in Name, Email, and Phone before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("icp_auth_token");
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      const payload = new FormData();
      
      Object.entries(form).forEach(([key, value]) => {
        if (value) payload.append(key, value);
      });
      
      payload.append("dependants", JSON.stringify(dependants));
      
      Object.entries(documents).forEach(([key, file]) => {
        if (file) {
          payload.append(key, file, file.name);
        }
      });

      console.log("[R&L] Submitting form with files...");

      const response = await fetch(`${API_BASE}/api/rl/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Submission failed");
      }

      console.log("[R&L] Success:", data);
      setSubmitted(true);
    } catch (err) {
      console.error("[R&L] Error:", err);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">R&amp;L Submitted</h1>
        <p className="text-sm text-muted-foreground">
          Thank you, {form.name}. Your information and documents have been received.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">R&amp;L</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Please complete your personal information, dependant details, and upload the required documents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-lg text-foreground">Personal Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <TextInput
              icon={User}
              label="Name"
              required
              type="text"
              placeholder="Full legal name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <TextInput
              icon={Briefcase}
              label="US Employer"
              type="text"
              placeholder="Employer name"
              value={form.usEmployer}
              onChange={(e) => updateField("usEmployer", e.target.value)}
            />
            <TextInput
              icon={Calendar}
              label="DOB"
              type="date"
              value={form.don}
              onChange={(e) => updateField("don", e.target.value)}
            />
            <SelectInput
              icon={UserCheck}
              label="Gender"
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            />
            <TextInput
              icon={Mail}
              label="Email"
              required
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <TextInput
              icon={Phone}
              label="Phone"
              required
              type="tel"
              placeholder="+1 (555) 555-5555"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <TextInput
              icon={UserCheck}
              label="Case Manager"
              type="text"
              placeholder="Assigned case manager"
              value={form.caseManager}
              onChange={(e) => updateField("caseManager", e.target.value)}
            />
            <SelectInput
              icon={MessageSquare}
              label="Preferred Contact Method"
              options={PREFERRED_CONTACT_OPTIONS}
              value={form.preferredContact}
              onChange={(e) => updateField("preferredContact", e.target.value)}
            />
            <TextInput
              icon={Ruler}
              label="Height"
              type="text"
              placeholder={`e.g. 5'6" or 168 cm`}
              value={form.height}
              onChange={(e) => updateField("height", e.target.value)}
            />
            <TextInput
              icon={Weight}
              label="Weight"
              type="text"
              placeholder="e.g. 140 lbs or 64 kg"
              value={form.weight}
              onChange={(e) => updateField("weight", e.target.value)}
            />
            <SelectInput
              icon={Shirt}
              label="Cloth Size"
              options={CLOTH_SIZE_OPTIONS}
              value={form.clothSize}
              onChange={(e) => updateField("clothSize", e.target.value)}
            />
          </div>
        </section>

        {/* Dependant Information */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Dependant Information</h2>
            </div>
            <button
              type="button"
              onClick={addDependant}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="h-4 w-4" />
              Add Dependant
            </button>
          </div>

          <div className="p-6 space-y-6">
            {dependants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No dependants added yet. Click "Add Dependant" if applicable.
              </p>
            )}

            {dependants.map((dep, idx) => (
              <div key={dep.id} className="border border-border rounded-lg p-5 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-foreground">Dependant {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeDependant(dep.id)}
                    className="text-muted-foreground hover:text-destructive transition"
                    aria-label="Remove dependant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <TextInput
                    icon={User}
                    label="Name"
                    type="text"
                    placeholder="Dependant's full name"
                    value={dep.name}
                    onChange={(e) => updateDependant(dep.id, "name", e.target.value)}
                  />
                  <TextInput
                    icon={Calendar}
                    label="Date of Birth"
                    type="date"
                    value={dep.dob}
                    onChange={(e) => updateDependant(dep.id, "dob", e.target.value)}
                  />
                  <SelectInput
                    icon={UserCheck}
                    label="Gender"
                    options={GENDER_OPTIONS}
                    value={dep.gender}
                    onChange={(e) => updateDependant(dep.id, "gender", e.target.value)}
                  />
                  <SelectInput
                    icon={Users}
                    label="Relationship"
                    options={RELATIONSHIP_OPTIONS}
                    value={dep.relationship}
                    onChange={(e) => updateDependant(dep.id, "relationship", e.target.value)}
                  />
                  <TextInput
                    icon={Ruler}
                    label="Height"
                    type="text"
                    placeholder={`e.g. 4'2" or 127 cm`}
                    value={dep.height}
                    onChange={(e) => updateDependant(dep.id, "height", e.target.value)}
                  />
                  <TextInput
                    icon={Weight}
                    label="Weight"
                    type="text"
                    placeholder="e.g. 60 lbs or 27 kg"
                    value={dep.weight}
                    onChange={(e) => updateDependant(dep.id, "weight", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Document Uploads */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-lg text-foreground">Required Documents</h2>
            <p className="text-xs text-muted-foreground mt-1">Upload each document below. Accepted formats: PDF, JPG, PNG.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCUMENT_FIELDS.map(({ key, label }) => (
              <DocumentUploadCard
                key={key}
                label={label}
                file={documents[key]}
                onChange={(file) => setDocument(key, file)}
                onRemove={() => removeDocument(key)}
              />
            ))}
          </div>
        </section>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit R&L"}
          </button>
        </div>
      </form>
    </div>
  );
}