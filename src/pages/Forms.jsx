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
  RotateCcw,
  Loader2,
  Eraser,
  PenLine,
  ExternalLink
} from "lucide-react";
import {
  useAuth
} from "@/lib/AuthContext";
import { tokenStorage } from "@/api/icpClient";
import { toast } from "sonner";
import { HousingDetailsForm } from "./Pipeline";
import BehavioralAssessmentForm from "./BehavioralAssessmentForm";
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL ||
    "https://icpcandidateportal-bve7d5bpdnftfbbc.centralus-01.azurewebsites.net")
    .replace(/\/+$/, "");
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
    key: "statementOfTruth",
    title: "Statement of Truth",
    description:
      "Complete the labeled fields, electronically sign, and submit the completed Statement of Truth.",
    icon: FileText
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

  const [statementTruth, setStatementTruth] = useState({
    loading:true,
    submission:null,
    legalName:user?.name || "",
    currentAddress:"",
    employer:"",
    workAddress:"",
    position:"",
    consent:false,
    submitting:false
  });

  const statementSignatureCanvasRef = useRef(null);
  const statementSignatureDrawingRef = useRef(false);
  const statementSignatureLastPointRef = useRef(null);
  const [statementSignatureHasInk, setStatementSignatureHasInk] = useState(false);

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

  const [formsAccessLoading, setFormsAccessLoading] = useState(true);
  const [formsAccessAllowed] = useState(true);
  const [formsAccessStage] = useState("");
  const [formAccess, setFormAccess] = useState({
    behavioral:{ available:false, triggerValue:null },
    preDeployment:{ available:false, triggerValue:null },
    statementOfTruth:{ available:false, triggerValue:null },
    housing:{ available:true }
  });
  const [formSubmissionStatus, setFormSubmissionStatus] = useState({
    behavioral:null,
    housing:null
  });

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
 const showFormSubmissionSuccess = (
   formTitle,
   submittedAt = null,
   extra = {}
 ) => {
   const timestamp = submittedAt || new Date().toISOString();
   const formattedTimestamp = new Date(timestamp).toLocaleString("en-US", {
     dateStyle:"medium",
     timeStyle:"short"
   });

   toast.success(`${formTitle} was submitted successfully on ${formattedTimestamp}.`);

   if (formTitle === "Behavioral Assessment") {
     setFormSubmissionStatus(previous => ({
       ...previous,
       behavioral:{
         submitted_at:timestamp,
         status:"Submitted"
       }
     }));
   }

   if (formTitle === "Housing & Transportation Form") {
     setFormSubmissionStatus(previous => ({
       ...previous,
       housing:{
         submitted_at:timestamp,
         status:"Submitted"
       }
     }));
   }
 };

  useEffect(() => {
    const token = tokenStorage.get();

    if (!token) {
      setFormsAccessLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`${API_BASE}/api/forms/access`, {
      headers:{ Authorization:`Bearer ${token}`, Accept:"application/json" },
      cache:"no-store"
    })
      .then(response => response.json().then(data => ({ ok:response.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;

        if (!ok || data?.success !== true) {
          throw new Error(data?.error || "Unable to load form access.");
        }

        setFormAccess(previous => ({
          ...previous,
          ...(data.access || {})
        }));

        setFormSubmissionStatus(previous => ({
          ...previous,
          behavioral:data.submissions?.behavioral || previous.behavioral,
          housing:data.submissions?.housing || previous.housing
        }));
      })
      .catch(error => {
        console.warn("[Forms] Access unavailable:", error?.message || error);
      })
      .finally(() => {
        if (!cancelled) setFormsAccessLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.email]);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return setPreDeployment(p => ({...p, loading:false}));
    fetch(`${API_BASE}/api/forms/pre-deployment`, { headers:{Authorization:`Bearer ${token}`}, cache:"no-store" })
      .then(r => r.json().then(data => ({ok:r.ok,data})))
      .then(({ok,data}) => setPreDeployment(p => ({...p, loading:false, due:ok && data?.due===true, priorityDate:data?.priorityDate||null, visaStatus:data?.visaStatus||null, submission:data?.submission||null})))
      .catch(() => setPreDeployment(p => ({...p, loading:false, due:false})));
  }, [user?.email]);

  useEffect(() => {
    const token = tokenStorage.get();

    if (!token) {
      setStatementTruth(previous => ({
        ...previous,
        loading:false
      }));
      return;
    }

    fetch(
      `${API_BASE}/api/forms/statement-of-truth`,
      {
        headers:{
          Authorization:`Bearer ${token}`,
          Accept:"application/json"
        },
        cache:"no-store"
      }
    )
      .then(response =>
        response
          .json()
          .then(data => ({
            ok:response.ok,
            data
          }))
      )
      .then(({ok,data}) => {
        const submission =
          ok && data?.success === true
            ? data.submission || null
            : null;

        setStatementTruth(previous => ({
          ...previous,
          loading:false,
          submission,
          legalName:
            submission?.legal_name ||
            previous.legalName ||
            user?.name ||
            "",
          currentAddress:
            submission?.current_address ||
            previous.currentAddress ||
            "",
          employer:
            submission?.employer ||
            previous.employer ||
            "",
          workAddress:
            submission?.work_address ||
            previous.workAddress ||
            "",
          position:
            submission?.position ||
            previous.position ||
            ""
        }));
      })
      .catch(() => {
        setStatementTruth(previous => ({
          ...previous,
          loading:false
        }));
      });
  }, [user?.email, user?.name]);

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

  const getStatementSignaturePoint = event => {
    const canvas = statementSignatureCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / Math.max(rect.width, 1)),
      y:
        (event.clientY - rect.top) *
        (canvas.height / Math.max(rect.height, 1))
    };
  };

  const beginStatementSignature = event => {
    const canvas = statementSignatureCanvasRef.current;
    const point = getStatementSignaturePoint(event);

    if (!canvas || !point) return;

    event.preventDefault();

    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch (_) {}

    statementSignatureDrawingRef.current = true;
    statementSignatureLastPointRef.current = point;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.lineWidth = 4;

    // Draw a tiny dot so a tap without movement still counts as ink.
    context.beginPath();
    context.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
    context.fillStyle = "#111827";
    context.fill();

    setStatementSignatureHasInk(true);
  };

  const moveStatementSignature = event => {
    if (!statementSignatureDrawingRef.current) return;

    const canvas = statementSignatureCanvasRef.current;
    const point = getStatementSignaturePoint(event);
    const previous = statementSignatureLastPointRef.current;

    if (!canvas || !point || !previous) return;

    event.preventDefault();

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.lineWidth = 4;

    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    statementSignatureLastPointRef.current = point;
    setStatementSignatureHasInk(true);
  };

  const endStatementSignature = event => {
    if (!statementSignatureDrawingRef.current) return;

    event?.preventDefault?.();

    statementSignatureDrawingRef.current = false;
    statementSignatureLastPointRef.current = null;

    try {
      statementSignatureCanvasRef.current?.releasePointerCapture?.(
        event?.pointerId
      );
    } catch (_) {}
  };

  const clearStatementSignature = () => {
    const canvas = statementSignatureCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);

    statementSignatureDrawingRef.current = false;
    statementSignatureLastPointRef.current = null;
    setStatementSignatureHasInk(false);
  };

  const getStatementSignaturePngBase64 = () => {
    const canvas = statementSignatureCanvasRef.current;

    if (!canvas || !statementSignatureHasInk) {
      return "";
    }

    const context = canvas.getContext("2d");
    if (!context) return "";

    const imageData =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const { data, width, height } = imageData;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha =
          data[(y * width + x) * 4 + 3];

        if (alpha > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return "";
    }

    const padding = 14;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth =
      Math.min(width - cropX, maxX - minX + 1 + padding * 2);
    const cropHeight =
      Math.min(height - cropY, maxY - minY + 1 + padding * 2);

    const cropped = document.createElement("canvas");
    cropped.width = cropWidth;
    cropped.height = cropHeight;

    const croppedContext = cropped.getContext("2d");

    croppedContext?.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return String(
      cropped.toDataURL("image/png") || ""
    )
      .split(",")[1] ||
      "";
  };

  const submitStatementOfTruth = async () => {
    const token = tokenStorage.get();

    if (!token) {
      return toast.error(
        "Your session has expired. Please sign in again."
      );
    }

    const required = [
      ["legalName", "Legal Name"],
      ["currentAddress", "Candidate Current Address"],
      ["employer", "Visa Petitioner (Employer)"],
      ["workAddress", "Visa Petitioner Work Address"],
      ["position", "Position"]
    ];

    const missing =
      required.find(
        ([key]) =>
          !String(statementTruth[key] || "").trim()
      );

    if (missing) {
      return toast.error(
        `${missing[1]} is required.`
      );
    }

    if (!statementSignatureHasInk) {
      return toast.error(
        "Please draw your signature in the signature box before submitting."
      );
    }

    if (!statementTruth.consent) {
      return toast.error(
        "Confirm the electronic-signature acknowledgement before submitting."
      );
    }

    setStatementTruth(previous => ({
      ...previous,
      submitting:true
    }));

    try {
      // The master Statement of Truth lives in the frontend public folder.
      // Send the exact displayed PDF to the backend so the backend does not
      // need a second physical copy of the template.
      const templateResponse =
        await fetch(
          "/documents/Statement-of-Truth.pdf",
          {
            cache:"no-store"
          }
        );

      if (!templateResponse.ok) {
        throw new Error(
          "Statement of Truth PDF could not be loaded from the frontend."
        );
      }

      const templateBlob =
        await templateResponse.blob();

      const templateDataUrl =
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(
              new Error(
                "Unable to read the Statement of Truth PDF."
              )
            );
          reader.readAsDataURL(templateBlob);
        });

      const templatePdfBase64 =
        String(templateDataUrl || "")
          .split(",")[1] ||
        "";

      if (!templatePdfBase64) {
        throw new Error(
          "Statement of Truth PDF could not be prepared for submission."
        );
      }

      const signatureImageBase64 =
        getStatementSignaturePngBase64();

      if (!signatureImageBase64) {
        throw new Error(
          "Your drawn signature could not be prepared. Please clear the box and sign again."
        );
      }

      const controller =
        new AbortController();

      const timeoutId =
        window.setTimeout(
          () => controller.abort(),
          45000
        );

      let response;

      try {
        response =
          await fetch(
            `${API_BASE}/api/forms/statement-of-truth`,
            {
              method:"POST",
              credentials:"include",
              signal:controller.signal,
              headers:{
                Authorization:`Bearer ${token}`,
                "Content-Type":"application/json",
                Accept:"application/json"
              },
              body:JSON.stringify({
              legalName:
                String(statementTruth.legalName || "").trim(),
              currentAddress:
                String(statementTruth.currentAddress || "").trim(),
              employer:
                String(statementTruth.employer || "").trim(),
              workAddress:
                String(statementTruth.workAddress || "").trim(),
              position:
                String(statementTruth.position || "").trim(),
              signatureImageBase64,
              signatureMethod:"drawn",
              signerName:
                String(statementTruth.legalName || "").trim(),
              consent:true,
              date:new Date().toLocaleDateString("en-US"),
                templatePdfBase64
              })
            }
          );
      } finally {
        window.clearTimeout(timeoutId);
      }

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
          data.message ||
          "Unable to submit Statement of Truth."
        );
      }

      const submission =
        data.submission || null;

      setStatementTruth(previous => ({
        ...previous,
        submitting:false,
        submission,
        consent:false
      }));

      clearStatementSignature();

      showFormSubmissionSuccess(
        "Statement of Truth",
        submission?.submitted_at ||
        data.receipt?.submittedAt ||
        new Date().toISOString(),
        {
          receiptId:
            submission?.receipt_id ||
            data.receipt?.id ||
            null
        }
      );

      toast.success(
        "Statement of Truth submitted successfully."
      );

      window.dispatchEvent(
        new CustomEvent(
          "candidate-data-updated",
          {
            detail:{
              event:"statement-of-truth-submitted",
              pendingUploadId:
                data.pending_upload_id || null,
              receiptId:
                submission?.receipt_id ||
                data.receipt?.id ||
                null
            }
          }
        )
      );
    } catch (error) {
      console.error(
        "[Statement of Truth] Submission failed:",
        error
      );

      toast.error(
        error?.name === "AbortError"
          ? "Statement of Truth submission took too long. Please try once more; an already-received submission will remain in the Admin document queue."
          : (
              error?.message ||
              "Unable to submit Statement of Truth."
            ),
        { duration:8000 }
      );
    } finally {
      setStatementTruth(previous => ({
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
      showFormSubmissionSuccess(
        "Behavioral Assessment",
        result?.submittedAt || new Date().toISOString()
      );
      setActiveForm(null);
    }}
  />
)}
          
      {activeForm === "statementOfTruth" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-2 lg:p-4">
          <div className="mx-auto w-[98vw] max-w-[1800px] rounded-2xl bg-white p-4 shadow-2xl lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Statement of Truth
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
                  Complete the labeled fields below. When you submit, ICP will place
                  your answers into the corresponding blank sections of the official
                  Statement of Truth PDF and stage the completed document for review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50"
                aria-label="Close Statement of Truth"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.75fr)]">
              <div className="overflow-hidden rounded-xl border bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Official Statement of Truth
                    </p>
                    <p className="text-xs text-gray-500">
                      Your submitted values and drawn signature are stamped into these open lines.
                    </p>
                  </div>
                  <a
                    href="/documents/Statement-of-Truth.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open full-size PDF
                  </a>
                </div>
                <iframe
                  title="Statement of Truth PDF"
                  src="/documents/Statement-of-Truth.pdf"
                  className="h-[82vh] min-h-[760px] w-full bg-white"
                />
              </div>

              <div className="space-y-4 xl:max-h-[82vh] xl:overflow-y-auto xl:pr-2">
                {statementTruth.loading ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-purple-700" />
                      <p className="mt-2 text-sm text-gray-600">
                        Loading Statement of Truth…
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-800">
                      Legal Name (Visa Recipient)
                      <input
                        value={statementTruth.legalName}
                        onChange={event =>
                          setStatementTruth(previous => ({
                            ...previous,
                            legalName:event.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2.5"
                        placeholder="Full legal name"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-800">
                      Candidate Current Address
                      <textarea
                        value={statementTruth.currentAddress}
                        onChange={event =>
                          setStatementTruth(previous => ({
                            ...previous,
                            currentAddress:event.target.value
                          }))
                        }
                        className="mt-1 min-h-[76px] w-full rounded-lg border px-3 py-2.5"
                        placeholder="Current residential address"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-800">
                      Visa Petitioner (Employer)
                      <input
                        value={statementTruth.employer}
                        onChange={event =>
                          setStatementTruth(previous => ({
                            ...previous,
                            employer:event.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2.5"
                        placeholder="Employer / visa petitioner"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-800">
                      Visa Petitioner Work Address
                      <textarea
                        value={statementTruth.workAddress}
                        onChange={event =>
                          setStatementTruth(previous => ({
                            ...previous,
                            workAddress:event.target.value
                          }))
                        }
                        className="mt-1 min-h-[76px] w-full rounded-lg border px-3 py-2.5"
                        placeholder="Employer work address"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-800">
                      Position
                      <input
                        value={statementTruth.position}
                        onChange={event =>
                          setStatementTruth(previous => ({
                            ...previous,
                            position:event.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2.5"
                        placeholder="e.g. Registered Nurse"
                      />
                      <span className="mt-1 block text-xs text-gray-500">
                        This fills the blank in “requirements of this position as a…”
                      </span>
                    </label>

                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 font-semibold text-purple-950">
                            <PenLine className="h-5 w-5" />
                            Electronic Signature
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-purple-800">
                            Draw your signature below using your mouse, finger, or stylus.
                            This handwritten signature will be placed directly on the
                            signature line of the submitted PDF.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={clearStatementSignature}
                          disabled={!statementSignatureHasInk || statementTruth.submitting}
                          className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-semibold text-purple-800 disabled:opacity-50"
                        >
                          <Eraser className="h-4 w-4" />
                          Clear signature
                        </button>
                      </div>

                      <div className="mt-4 rounded-xl border-2 border-dashed border-purple-300 bg-white p-2">
                        <canvas
                          ref={statementSignatureCanvasRef}
                          width={900}
                          height={220}
                          onPointerDown={beginStatementSignature}
                          onPointerMove={moveStatementSignature}
                          onPointerUp={endStatementSignature}
                          onPointerCancel={endStatementSignature}
                          onPointerLeave={endStatementSignature}
                          className="h-44 w-full touch-none cursor-crosshair rounded-lg bg-white"
                          aria-label="Draw electronic signature"
                        />
                        <div className="border-t px-2 pt-2 text-xs text-gray-500">
                          Sign above this line
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                        <span
                          className={`inline-flex h-2.5 w-2.5 rounded-full ${
                            statementSignatureHasInk
                              ? "bg-emerald-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            statementSignatureHasInk
                              ? "text-emerald-700"
                              : "text-gray-500"
                          }
                        >
                          {statementSignatureHasInk
                            ? "Signature captured"
                            : "Signature required"}
                        </span>
                      </div>

                      <label className="mt-4 flex items-start gap-3 text-sm text-purple-950">
                        <input
                          type="checkbox"
                          checked={statementTruth.consent}
                          onChange={event =>
                            setStatementTruth(previous => ({
                              ...previous,
                              consent:event.target.checked
                            }))
                          }
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          I confirm that I have reviewed the Statement of Truth and
                          consent to use the handwritten signature drawn above as my
                          electronic signature.
                        </span>
                      </label>
                    </div>

                    {statementTruth.submission && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                          <div>
                            <p className="font-semibold text-emerald-900">
                              Statement of Truth submitted
                            </p>
                            <p className="mt-1 text-sm text-emerald-800">
                              Status: {statementTruth.submission.status || "Pending ICP Review"}
                            </p>
                            {statementTruth.submission.receipt_id && (
                              <p className="mt-2 text-sm text-emerald-900">
                                Receipt:{" "}
                                <span className="font-mono font-bold">
                                  {statementTruth.submission.receipt_id}
                                </span>
                              </p>
                            )}
                            {statementTruth.submission.submitted_at && (
                              <p className="mt-1 text-xs text-emerald-700">
                                Submitted:{" "}
                                {new Date(
                                  statementTruth.submission.submitted_at
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={
                        statementTruth.submitting ||
                        !statementTruth.consent ||
                        !statementSignatureHasInk
                      }
                      onClick={submitStatementOfTruth}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {statementTruth.submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Statement of Truth…
                        </>
                      ) : (
                        statementTruth.submission
                          ? "Submit Updated Statement of Truth"
                          : "Electronically Sign & Submit"
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeForm === "preDeployment" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Pre-Deployment Questionnaire</h2><button onClick={()=>setActiveForm(null)}><X /></button></div>
            <p className="mt-3 text-sm text-gray-600">This task becomes due once your Embassy interview date is confirmed. Review all eight questions, then record your responses directly in the portal as audio or video and submit them here.</p>
            {preDeployment.priorityDate && <p className="mt-2 text-sm font-medium">I-140 Priority Date: {new Date(preDeployment.priorityDate).toLocaleDateString()}</p>}
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
                    {preDeployment.submission.submitted_at && (
                      <p className="mt-2 text-xs font-semibold opacity-80">
                        Submitted {new Date(preDeployment.submission.submitted_at).toLocaleString()}
                      </p>
                    )}
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
    onClose={(result) => {
      showFormSubmissionSuccess(
        "Housing & Transportation Form",
        result?.submittedAt || new Date().toISOString()
      );
      setActiveForm(null);
    }}
  />
)}
</div>
      </div>
    );
  }
  return (
    <>
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
          const Icon = item.icon;
          const accessRule = formAccess?.[item.key] || { available:true };
          const gated = ["behavioral", "preDeployment", "statementOfTruth"].includes(item.key);
          const available = !gated || accessRule.available === true;
          const triggerLabel =
            item.key === "behavioral"
              ? "Stage 3 Intro Call"
              : item.key === "preDeployment"
                ? "I-140 Priority Date"
                : item.key === "statementOfTruth"
                  ? "Embassy Interview Date"
                  : "";
          const submission =
            item.key === "behavioral"
              ? formSubmissionStatus.behavioral
              : item.key === "preDeployment"
                ? preDeployment.submission
                : item.key === "statementOfTruth"
                  ? statementTruth.submission
                  : item.key === "housing"
                    ? formSubmissionStatus.housing
                    : null;
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
              disabled={!available || formsAccessLoading}
              onClick={() => available && setActiveForm(item.key)}
              className={`rounded-xl border bg-card p-5 text-left transition ${
                available
                  ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  : "cursor-not-allowed opacity-65"
              }`}
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
              <div className={`mt-5 text-sm font-semibold ${available ? "text-primary" : "text-amber-700"}`}>
                {formsAccessLoading
                  ? "Checking availability…"
                  : available
                    ? "Open form"
                    : `${triggerLabel} must be completed before this form is available.`}
              </div>

              {!available && accessRule?.triggerValue ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  CRM trigger: {new Date(accessRule.triggerValue).toLocaleString()}
                </p>
              ) : null}

              {submission && (submission.submitted_at || submission.created_at) ? (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    Submitted successfully on {new Date(
                      submission.submitted_at || submission.created_at
                    ).toLocaleString()}.
                  </p>
                  {submission.receipt_id ? (
                    <p className="mt-1 text-xs font-mono text-emerald-700">
                      Receipt: {submission.receipt_id}
                    </p>
                  ) : null}
                </div>
              ) : null}
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