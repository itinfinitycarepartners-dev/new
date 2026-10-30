// @ts-nocheck
// src/pages/Forms.jsx
import React, {
  useEffect,
  useRef,
  useState
} from "react";
import { Link } from "react-router-dom";
import {
  Home,
  FileCheck,
  ArrowLeft,
  Info,
  ClipboardList,
  CircleHelp,
  FileText,
  CheckCircle2,
  X,
  Mic,
  Video,
  Square,
  Play,
  RotateCcw
} from "lucide-react";
import {
  useAuth
} from "@/lib/AuthContext";
import { tokenStorage } from "@/api/icpClient";
import { toast } from "sonner";
import { HousingDetailsForm } from "./Pipeline";
import BehavioralAssessmentForm from "./BehavioralAssessmentForm";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
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
    key: "preDeployment",
    title: "Pre-Deployment Questionnaire",
    description: "Review the questionnaire, record your answers directly in the portal, and submit.",
    icon: ClipboardList
  },
  {
    key: "housing",
    title:
      "Housing & Transportation Form",
    description:
      "Complete your housing and transportation information.",
    icon:
      Home
  },
  {
    key: "travelHousingPolicies",
    title: "Travel and Housing Policies",
    description:
      "Read this required policy document and acknowledge it below.",
    icon: FileText,
    documentUrl: "/documents/ICP-Travel-and-Housing-Policies.pdf"
  },
  {
    key: "photoRelease",
    title: "Photo Release",
    description:
      "Read this required release document and acknowledge it below.",
    icon: FileText,
    documentUrl: "/documents/Photo_Release.pdf"
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
  const [preDeployment, setPreDeployment] = useState({ loading:true, due:false, submission:null, fullLegalName:"", nursingSpecialty:"", usEmployer:"", departmentUnit:"", file:null, submitting:false });
  const [recordingMode, setRecordingMode] = useState("audio");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState("");
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const [
    localStages,
    setLocalStages
  ] =
    useState([]);

  // Forms are available to every authenticated candidate at every pipeline stage.
  // Individual electronic-signature forms still require the document to be opened
  // before the acknowledgement/sign action is enabled.
  const [formsAccessLoading] = useState(false);
  const [formsAccessAllowed] = useState(true);
  const [formsAccessStage] = useState("");

  const policyAcknowledgementKey = user?.email
    ? `icp_policy_acknowledgements:${String(user.email).trim().toLowerCase()}`
    : null;
  const [policyAcknowledgements, setPolicyAcknowledgements] = useState({});
  const [policySignatures, setPolicySignatures] = useState({});
  const [signatureInputs, setSignatureInputs] = useState({});
  const [openedPolicyDocuments, setOpenedPolicyDocuments] = useState({});
  const [loadingAcknowledgements, setLoadingAcknowledgements] = useState(true);
  const [savingAcknowledgement, setSavingAcknowledgement] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
 const showFormSubmissionSuccess = (formTitle, submittedAt = null) => {
  const timestamp = submittedAt || new Date().toISOString();
  const formattedTimestamp = new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  const message = `${formTitle} was submitted successfully on ${formattedTimestamp}.`;
  toast.success(message);
  setSubmissionSuccess({ title: formTitle, message });
};
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return setPreDeployment(p => ({...p, loading:false}));
    fetch(`${API_BASE}/api/forms/pre-deployment`, { headers:{Authorization:`Bearer ${token}`}, cache:"no-store" })
      .then(r => r.json().then(data => ({ok:r.ok,data})))
      .then(({ok,data}) => setPreDeployment(p => ({...p, loading:false, due:ok && data?.due===true, embassyInterviewDate:data?.embassyInterviewDate||null, visaStatus:data?.visaStatus||null, submission:data?.submission||null})))
      .catch(() => setPreDeployment(p => ({...p, loading:false, due:false})));
  }, [user?.email]);
  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startPreDeploymentRecording = async (mode = recordingMode) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        return toast.error("Recording is not supported by this browser. Please use a current Chrome, Edge, Safari, or Firefox browser.");
      }
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl("");
      setPreDeployment(p => ({ ...p, file: null }));
      recordingChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video"
      });
      mediaStreamRef.current = stream;
      const preferred = mode === "video"
        ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
        : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find(type => MediaRecorder.isTypeSupported?.(type)) || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const actualType = recorder.mimeType || (mode === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(recordingChunksRef.current, { type: actualType });
        const extension = actualType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `pre-deployment-${Date.now()}.${extension}`, { type: actualType });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        setPreDeployment(p => ({ ...p, file }));
        setIsRecording(false);
        stopMediaTracks();
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      recorder.start(1000);
      setRecordingMode(mode);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (error) {
      stopMediaTracks();
      setIsRecording(false);
      toast.error(error?.name === "NotAllowedError" ? "Microphone/camera permission was denied." : "Unable to start recording.");
    }
  };

  const stopPreDeploymentRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const resetPreDeploymentRecording = () => {
    if (isRecording) stopPreDeploymentRecording();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl("");
    setRecordingSeconds(0);
    setPreDeployment(p => ({ ...p, file: null }));
  };

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    stopMediaTracks();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const submitPreDeployment = async () => {
    const token = tokenStorage.get();

    if (!token) {
      return toast.error("Your session has expired. Please sign in again.");
    }

    if (!preDeployment.file) {
      return toast.error("Record your audio or video answers first.");
    }

    setPreDeployment(previous => ({
      ...previous,
      submitting:true
    }));

    try {
      // Use the same /api/documents/upload route as ordinary candidate documents.
      // The backend recognizes this document_type/form_type as an audio/video
      // Pre-Deployment recording and stages it for Admin approval.
      const body = new FormData();
      body.append("file", preDeployment.file);
      body.append("document_name", preDeployment.file.name || `Pre-Deployment Questionnaire ${Date.now()}.webm`);
      body.append("document_type", "Pre-Deployment Questionnaire Recording");
      body.append("document_library_upload", "true");
      body.append("document_department", "Deployment");
      body.append("document_category", "other");
      body.append("pipeline_section", "Deployment");
      body.append("destination", "crm");
      body.append("form_type", "pre-deployment-questionnaire");
      body.append("full_legal_name", preDeployment.fullLegalName || "");
      body.append("nursing_specialty", preDeployment.nursingSpecialty || "");
      body.append("us_employer", preDeployment.usEmployer || "");
      body.append("department_unit", preDeployment.departmentUnit || "");
      body.append(
        "client_submission_id",
        [
          preDeployment.file.name || "recording",
          preDeployment.file.size || 0,
          preDeployment.file.lastModified || 0
        ].join(":")
      );

      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        90000
      );

      let response;
      let data = {};

      try {
        response = await fetch(`${API_BASE}/api/documents/upload`, {
          method:"POST",
          credentials:"include",
          signal:controller.signal,
          headers:{
            Authorization:`Bearer ${token}`,
            Accept:"application/json"
          },
          body
        });

        data = await response.json().catch(() => ({}));
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.error ||
          data.message ||
          "Unable to submit recording."
        );
      }

      const submittedAt =
        data.submission?.submitted_at ||
        new Date().toISOString();

      setPreDeployment(previous => ({
        ...previous,
        submitting:false,
        file:null,
        submission:
          data.submission || {
            submitted_at:submittedAt,
            approval_status:data.approval_status || "pending",
            status:"Pending ICP Review",
            pending_upload_id:data.pending_upload_id || null
          }
      }));

      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }

      setRecordingUrl("");
      setRecordingSeconds(0);

      // Keep the questionnaire mounted until the candidate acknowledges
      // the success confirmation. This guarantees the user sees a positive
      // confirmation after the backend has actually stored the recording.
      showFormSubmissionSuccess(
        "Pre-Deployment Questionnaire",
        submittedAt
      );

      toast.success(
        data.message ||
        "Recording submitted successfully. It is pending ICP review.",
        { duration: 6000 }
      );

      window.dispatchEvent(
        new CustomEvent("candidate-data-updated", {
          detail:{
            event:"pre-deployment-submitted",
            pendingUploadId:data.pending_upload_id || null
          }
        })
      );
    } catch (error) {
      console.error("[Pre-Deployment] Submission failed:", error);

      const message =
        error?.name === "AbortError"
          ? "The recording upload took too long. Please check your connection and press Submit Recording again; the server will not duplicate a recording that was already received."
          : (
              error?.message ||
              "Unable to submit recording."
            );

      toast.error(message, { duration:8000 });
    } finally {
      setPreDeployment(previous => ({
        ...previous,
        submitting:false
      }));
    }
  };

  useEffect(() => {
    const loadAcknowledgements = async () => {
      const token = tokenStorage.get();
      if (!token) {
        setLoadingAcknowledgements(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/api/forms/policy-acknowledgements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok || data.success !== true) throw new Error(data.error || "Unable to load acknowledgements");
        setPolicyAcknowledgements(data.acknowledgements || {});
        setPolicySignatures(data.signatures || {});
      } catch (error) {
        toast.error(error.message || "Unable to load policy acknowledgements.");
      } finally {
        setLoadingAcknowledgements(false);
      }
    };
    loadAcknowledgements();
  }, [policyAcknowledgementKey]);
  const signPolicy = async (key) => {
    const token = tokenStorage.get();
    if (!token) return;
    const signature = String(signatureInputs[key] || "").trim();
    if (!openedPolicyDocuments[key]) return toast.error("Open and review the PDF before signing.");
    if (!signature) return toast.error("Type your full legal name to sign.");
    setSavingAcknowledgement(key);
    try {
      const response = await fetch(`${API_BASE}/api/forms/policy-acknowledgements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ documentKey: key, signature, consent: true })
      });
      const data = await response.json().catch(() => ({}));
      if (
        !response.ok ||
        data.success !== true ||
        data.acknowledged !== true ||
        data.attachment?.success !== true ||
        data.attachment?.verified !== true ||
        !data.attachment?.attachment_id
      ) {
        throw new Error(
          data.error ||
          "The signed document was not verified in the candidate's CRM Deal attachments."
        );
      }
      setPolicyAcknowledgements(previous => ({ ...previous, [key]: true }));
      setPolicySignatures(previous => ({ ...previous, [key]: data.signature }));
      setSignatureInputs(previous => ({ ...previous, [key]: "" }));
      toast.success("Document electronically signed.");
    } catch (error) {
      toast.error(error.message || "Unable to save policy acknowledgement.");
    } finally {
      setSavingAcknowledgement(null);
    }
  };
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] p-6">
        <div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">
          Please sign in to access your forms.
        </div>
      </div>
    );
  }
  if (formsAccessLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] p-6">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">
            Checking forms access
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We are confirming that you are currently in Deployment or Aftercare.
          </p>
        </div>
      </div>
    );
  }

  if (!formsAccessAllowed) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] p-6">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <ClipboardList className="h-7 w-7 text-amber-700" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Forms are not available yet
          </h1>
          <p className="mt-3 text-base leading-7 text-gray-600">
            Your Forms section becomes available when you reach the Deployment stage and remains available during Aftercare.
          </p>
          {formsAccessStage ? (
            <p className="mt-2 text-sm text-gray-500">
              Current stage: {formsAccessStage}
            </p>
          ) : null}
          <Link
            to="/pipeline"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View My Pipeline
          </Link>
        </div>
      </div>
    );
  }

  if (activeForm) {
    return (
      <div className="min-h-screen space-y-4 bg-[#F3F4F6] p-4 lg:p-6">
        {submissionSuccess && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="active-form-submission-success-title"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="active-form-submission-success-title"
                    className="text-xl font-bold text-gray-900"
                  >
                    Recording submitted successfully
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {submissionSuccess.message}
                  </p>
                  {submissionSuccess.title === "Pre-Deployment Questionnaire" && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-sm font-semibold text-emerald-800">
                        Your recording has been received by ICP.
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        It is now pending administrator review and approval. You do not need to submit it again.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmissionSuccess(null);
                  setActiveForm(null);
                }}
                className="mt-6 w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Return to Forms
              </button>
            </div>
          </div>
        )}
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
         {activeForm === "behavioral" && (
  <BehavioralAssessmentForm
    user={user}
    onClose={(result) => {
      setActiveForm(null);
      showFormSubmissionSuccess(
        "Behavioral Assessment",
        result?.submittedAt || null
      );
    }}
  />
)}
          
      {activeForm === "preDeployment" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Pre-Deployment Questionnaire</h2><button onClick={()=>setActiveForm(null)}><X /></button></div>
            <p className="mt-3 text-sm text-gray-600">This task becomes due once your Embassy interview date is confirmed. Review all eight questions, then record your responses directly in the portal as audio or video and submit them here.</p>
            {preDeployment.embassyInterviewDate && <p className="mt-2 text-sm font-medium">Embassy Interview: {new Date(preDeployment.embassyInterviewDate).toLocaleDateString()}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[['fullLegalName','Full legal name'],['nursingSpecialty','Nursing specialty'],['usEmployer','U.S. employer'],['departmentUnit','Department / unit']].map(([key,label])=><label key={key} className="text-sm">{label}<input className="mt-1 w-full rounded-lg border p-2" value={preDeployment[key]} onChange={e=>setPreDeployment(p=>({...p,[key]:e.target.value}))}/></label>)}
            </div>
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm">
              <li>Provide a brief explanation of your clinical experience in relation to the role you were hired for.</li>
              <li>What is one mistake you have made in the workplace? How did it impact you and your team? What did you do differently to avoid making the same mistake twice?</li>
              <li>Have you ever had to correct a co-worker? If not, explain how you would respond if a co-worker skipped appropriate hospital cleanliness/hand-washing protocols before tending to a patient.</li>
              <li>Describe your experience with a non-compliant patient, or how you would respond to one and the outcome you would hope to achieve.</li>
              <li>Explain in detail what you know about your employer, facility, and community where you were hired to work.</li>
              <li>As you transition into the U.S. healthcare system, what three clinical areas will be most challenging and require additional training or retraining?</li>
              <li>Describe the steps you have taken to integrate into your new U.S. community, including transportation, childcare/schools, coworkers, or community groups.</li>
              <li>Do you have family or friends living in your new community or elsewhere in the United States? Include city and state.</li>
            </ol>
            <div className="mt-5 rounded-xl border p-4 text-sm"><b>Recording instructions:</b> Start by stating your full legal name, nursing specialty, U.S. employer, and department/unit. Keep the questions visible while recording. Audio and video are accepted.</div>
            <div className="mt-4 rounded-xl border bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {!isRecording ? <>
                  <button type="button" onClick={()=>startPreDeploymentRecording("audio")} className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white"><Mic className="h-4 w-4"/>Record Audio</button>
                  <button type="button" onClick={()=>startPreDeploymentRecording("video")} className="inline-flex items-center gap-2 rounded-lg border border-purple-700 bg-white px-4 py-2 text-sm font-semibold text-purple-700"><Video className="h-4 w-4"/>Record Video</button>
                </> : <button type="button" onClick={stopPreDeploymentRecording} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"><Square className="h-4 w-4"/>Stop Recording</button>}
                {isRecording && <span className="text-sm font-semibold text-red-600">Recording {String(Math.floor(recordingSeconds/60)).padStart(2,'0')}:{String(recordingSeconds%60).padStart(2,'0')}</span>}
                {preDeployment.file && !isRecording && <button type="button" onClick={resetPreDeploymentRecording} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RotateCcw className="h-4 w-4"/>Record Again</button>}
              </div>
              {recordingUrl && <div className="mt-4">{recordingMode === "video" ? <video src={recordingUrl} controls className="max-h-80 w-full rounded-lg bg-black"/> : <audio src={recordingUrl} controls className="w-full"/>}</div>}
            </div>
            <button type="button" disabled={!preDeployment.file||preDeployment.submitting||isRecording} onClick={submitPreDeployment} className="mt-4 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{preDeployment.submitting?'Submitting…':preDeployment.submission?'Submit New Recording':'Submit Recording'}</button>
            {preDeployment.submission && (
              <div
                className={`mt-4 rounded-xl border p-4 text-sm ${
                  preDeployment.submission.approval_status === "approved"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : preDeployment.submission.approval_status === "rejected"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {preDeployment.submission.approval_status === "approved"
                        ? "Recording approved by ICP."
                        : preDeployment.submission.approval_status === "rejected"
                          ? "Recording rejected by ICP."
                          : "Recording submitted successfully."}
                    </p>
                    <p className="mt-1">
                      {preDeployment.submission.approval_status === "approved"
                        ? "Your Pre-Deployment Questionnaire has been approved."
                        : preDeployment.submission.approval_status === "rejected"
                          ? "Please record and submit a new response."
                          : "Your recording has been received and is pending ICP review. You do not need to submit it again."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {activeForm === "housing" && (
  <HousingDetailsForm
    user={user}
    setStages={setLocalStages}
    onClose={() => {
      setActiveForm(null);
      showFormSubmissionSuccess("Housing & Transportation Form");
    }}
  />
)}
</div>
      </div>
    );
  }
  return (
    <>
      {preDeployment.submission && preDeployment.submission.approval_status !== "rejected" && (
        <div className="mx-auto mb-4 max-w-5xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                Pre-Deployment Questionnaire recording received
              </p>
              <p className="mt-1">
                {preDeployment.submission.approval_status === "approved"
                  ? "Your recording has been approved by ICP."
                  : "Your recording was submitted successfully and is pending ICP review."}
              </p>
            </div>
          </div>
        </div>
      )}

      {submissionSuccess && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-success-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <h2 id="submission-success-title" className="text-xl font-bold text-gray-900">
                    Submission successful
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {submissionSuccess.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionSuccess(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close success message"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSubmissionSuccess(null)}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
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
          if (item.documentUrl) {
            return (
              <div key={item.key} className="rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-md">
                <a href={item.documentUrl} target="_blank" rel="noreferrer" onClick={() => setOpenedPolicyDocuments(previous => ({ ...previous, [item.key]: true }))} className="block">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold">{item.title}</h2>
                  <p className="mt-2 text-base text-muted-foreground">{item.description}</p>
                  <div className="mt-5 text-sm font-semibold text-primary">Open PDF</div>
                </a>
                <div className="mt-5 border-t pt-4">
                  {policyAcknowledgements[item.key] ? (
                    <p className="text-sm font-semibold text-emerald-700">Electronically signed by {policySignatures[item.key]?.signerName || "you"} on {policySignatures[item.key]?.signedAt ? new Date(policySignatures[item.key].signedAt).toLocaleDateString() : ""}.</p>
                  ) : <>
                    <p className="text-sm font-medium">By typing your full legal name below, you agree to use an electronic signature and confirm that you have read and agree to this document.</p>
                    <input value={signatureInputs[item.key] || ""} onChange={event => setSignatureInputs(previous => ({ ...previous, [item.key]: event.target.value }))} disabled={loadingAcknowledgements || savingAcknowledgement === item.key || !openedPolicyDocuments[item.key]} placeholder="Type your full legal name" className="mt-3 w-full rounded-lg border px-3 py-2" />
                    <button type="button" onClick={() => signPolicy(item.key)} disabled={loadingAcknowledgements || savingAcknowledgement === item.key || !openedPolicyDocuments[item.key]} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingAcknowledgement === item.key ? "Signing…" : "Sign electronically"}</button>
                  </>}
                </div>
              </div>
            );
          }
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
    </>
  );
}