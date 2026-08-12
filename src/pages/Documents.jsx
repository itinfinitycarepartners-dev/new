





// @ts-nocheck
import {
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import {
  FileText,
  Loader2,
  X,
  AlertCircle,
  Search,
  Eye,
  ArrowLeft,
  Calendar,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileType2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useEffect,
  useMemo,
  useState
} from "react";

const API_BASE = (() => {
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL
    ) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch {
    // Use deployed API fallback.
  }

  return "https://fictional-carnival-3inv.onrender.com";
})();

const getAuthToken = () =>
  localStorage.getItem("icp_auth_token") || "";

const REQUIRED_PROFILE_DOCUMENT_TYPES = [
  { key: "candidate-passport-picture", label: "Candidate Passport Picture", section: "Profile", order: 1, defaultDestination: "crm" },
  { key: "dependent-passport", label: "Dependent Passport", section: "Dependants", order: 2, defaultDestination: "crm" },
  { key: "dependent-resume", label: "Dependent Resume", section: "Dependants", order: 3, defaultDestination: "crm" },
  { key: "dependent-work-experience", label: "Dependent Work Experience (if applicable)", section: "Dependants", order: 4, defaultDestination: "crm" }
];


const normalizeDocument = (document, index) => {
  const attachmentId =
    document.attachment_id ||
    document.id ||
    document.attachment_Id ||
    document.document_id ||
    document._id ||
    "";

  return {
    ...document,
    attachment_id: String(attachmentId),
    document_name:
      document.document_name ||
      document.File_Name ||
      document.name ||
      document.file_name ||
      document.original_name ||
      `Document ${index + 1}`,
    document_type:
      document.document_type ||
      document.File_Type ||
      document.file_type ||
      "Document",
    uploaded_at:
      document.uploaded_at ||
      document.Created_Time ||
      document.created_at ||
      document.Modified_Time ||
      null,
    source:
      String(document.source || "crm")
        .trim()
        .toLowerCase(),
    approval_status:
      document.approval_status || "approved"
  };
};

const getDocumentKey = document =>
  document.approval_key ||
  [
    document.source || "unknown",
    document.crm_field_api_name || "",
    document.attachment_id ||
      document.id ||
      document.document_id ||
      document.document_name
  ].join(":");

const getFileExtension = documentName => {
  const name = String(documentName || "");
  const index = name.lastIndexOf(".");

  return index >= 0
    ? name.slice(index + 1).toLowerCase()
    : "";
};

const inferContentCategory = (
  contentType,
  documentName
) => {
  const type = String(contentType || "")
    .toLowerCase();

  const extension =
    getFileExtension(documentName);

  if (
    type.includes("application/pdf") ||
    extension === "pdf"
  ) {
    return "pdf";
  }

  if (
    type.startsWith("image/") ||
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "bmp",
      "svg"
    ].includes(extension)
  ) {
    return "image";
  }

  if (
    type.includes("text/") ||
    [
      "txt",
      "csv",
      "json",
      "xml",
      "md"
    ].includes(extension)
  ) {
    return "text";
  }

  return "other";
};

const getDocumentIcon = document => {
  const extension =
    getFileExtension(
      document.document_name
    );

  if (
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "bmp",
      "svg"
    ].includes(extension)
  ) {
    return ImageIcon;
  }

  if (
    [
      "xls",
      "xlsx",
      "csv"
    ].includes(extension)
  ) {
    return FileSpreadsheet;
  }

  if (
    [
      "zip",
      "rar",
      "7z"
    ].includes(extension)
  ) {
    return FileArchive;
  }

  if (
    [
      "doc",
      "docx",
      "rtf"
    ].includes(extension)
  ) {
    return FileType2;
  }

  return FileText;
};

function DocumentViewerModal({
  doc,
  isOpen,
  onClose
}) {
  const [loading, setLoading] =
    useState(false);
  const [objectUrl, setObjectUrl] =
    useState("");
  const [contentType, setContentType] =
    useState("");
  const [category, setCategory] =
    useState("");
  const [textContent, setTextContent] =
    useState("");
  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!isOpen || !doc) {
      return undefined;
    }

    let active = true;
    let createdUrl = "";

    const fetchDocument = async () => {
      setLoading(true);
      setError("");
      setObjectUrl("");
      setTextContent("");
      setContentType("");
      setCategory("");

      try {
        const token = getAuthToken();

        if (!token) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        if (!doc.attachment_id) {
          throw new Error(
            "This document has no attachment identifier."
          );
        }

        const query = new URLSearchParams();

        if (doc.source) {
          query.set(
            "source",
            doc.source
          );
        }

        if (doc.crm_field_api_name) {
          query.set(
            "field",
            doc.crm_field_api_name
          );
        }

        query.set("_", String(Date.now()));

        const response = await fetch(
          `${API_BASE}/api/documents/download/${encodeURIComponent(
            doc.attachment_id
          )}?${query.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          const payload = await response
            .clone()
            .json()
            .catch(() => ({}));

          throw new Error(
            payload.error ||
            payload.message ||
            `Document request failed (${response.status}).`
          );
        }

        const responseType =
          response.headers.get(
            "content-type"
          ) || "";

        let blob;

        if (
          responseType.includes(
            "application/json"
          )
        ) {
          const payload =
            await response.json();

          if (!payload.base64) {
            throw new Error(
              "The server did not return document content."
            );
          }

          const bytes = Uint8Array.from(
            atob(payload.base64),
            character =>
              character.charCodeAt(0)
          );

          blob = new Blob(
            [bytes],
            {
              type:
                payload.contentType ||
                payload.content_type ||
                doc.file_type ||
                "application/octet-stream"
            }
          );
        } else {
          blob = await response.blob();
        }

        if (!active) return;

        const resolvedType =
          blob.type ||
          responseType ||
          doc.file_type ||
          doc.document_type ||
          "application/octet-stream";

        const resolvedCategory =
          inferContentCategory(
            resolvedType,
            doc.document_name
          );

        setContentType(resolvedType);
        setCategory(resolvedCategory);

        if (
          resolvedCategory === "text"
        ) {
          setTextContent(
            await blob.text()
          );
        } else {
          createdUrl =
            URL.createObjectURL(blob);
          setObjectUrl(createdUrl);
        }
      } catch (requestError) {
        console.error(
          "[Documents] Viewer error:",
          requestError
        );

        if (active) {
          setError(
            requestError.message ||
            "The document could not be loaded."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDocument();

    return () => {
      active = false;

      if (createdUrl) {
        URL.revokeObjectURL(
          createdUrl
        );
      }
    };
  }, [
    isOpen,
    doc?.attachment_id,
    doc?.source,
    doc?.crm_field_api_name
  ]);

  if (!isOpen || !doc) {
    return null;
  }

  const DocumentIcon =
    getDocumentIcon(doc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 md:p-5">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden text-sm font-medium sm:inline">
                Back to Documents
              </span>
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <DocumentIcon className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="truncate font-semibold">
                {doc.document_name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-200"
            aria-label="Close document viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b bg-gray-50 px-4 py-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {doc.document_type ||
              "Document"}
          </span>

          {doc.source && (
            <span className="rounded-full border bg-white px-2 py-1 uppercase">
              {doc.source}
            </span>
          )}

          {doc.crm_field_api_name && (
            <span className="rounded-full border bg-white px-2 py-1">
              {doc.crm_field_api_name}
            </span>
          )}

          {doc.uploaded_at && (
            <span className="ml-auto">
              {new Date(
                doc.uploaded_at
              ).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="min-h-[520px] flex-1 overflow-auto bg-gray-100 p-2">
          {loading && (
            <div className="flex min-h-[520px] flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-gray-500">
                Loading document...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="mt-3 font-semibold text-red-600">
                Failed to load document
              </p>
              <p className="mt-1 max-w-xl text-sm text-gray-500">
                {error}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            category === "pdf" &&
            objectUrl && (
              <iframe
                src={`${objectUrl}#toolbar=${canDownload ? 1 : 0}&navpanes=0`}
                title={doc.document_name}
                className="min-h-[70vh] w-full rounded-lg border-0 bg-white"
              />
            )}

          {!loading &&
            !error &&
            category === "image" &&
            objectUrl && (
              <div className="flex min-h-[520px] items-center justify-center rounded-lg bg-white p-4">
                <img
                  src={objectUrl}
                  alt={doc.document_name}
                  className="max-h-[72vh] max-w-full object-contain"
                />
              </div>
            )}

          {!loading &&
            !error &&
            category === "text" && (
              <pre className="min-h-[520px] whitespace-pre-wrap rounded-lg bg-white p-5 text-sm text-gray-800">
                {textContent}
              </pre>
            )}

          {!loading &&
            !error &&
            category === "other" &&
            objectUrl && (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-lg bg-white px-6 text-center">
                <DocumentIcon className="h-14 w-14 text-gray-400" />
                <p className="mt-4 font-semibold text-gray-800">
                  Preview is not available for this file type.
                </p>
                <p className="mt-2 max-w-lg text-sm text-gray-500">
                  The document was loaded successfully, but this browser cannot display {contentType || "this format"} inside the portal.
                </p>
                <a
                  href={objectUrl}
                  download={doc.document_name}
                  className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Download Document
                </a>
              </div>
            )}
        </div>

        <div className="flex justify-end border-t bg-gray-50 p-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close Document
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const { user } =
    useAuth();

  const queryClient =
    useQueryClient();

  const [
    showViewer,
    setShowViewer
  ] = useState(false);

  const [
    selectedDoc,
    setSelectedDoc
  ] = useState(null);

  const [
    searchTerm,
    setSearchTerm
  ] = useState("");

  const [
    sortBy,
    setSortBy
  ] = useState(
    "workflow"
  );

  const [
    showUpload,
    setShowUpload
  ] = useState(false);

  const [
    selectedDepartment,
    setSelectedDepartment
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile
  ] = useState(null);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const {
    data: documentData,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: [
      "document-library",
      user?.email
    ],
    enabled:
      Boolean(
        user?.email
      ),
    staleTime:
      5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus:
      false,
    queryFn:
      async () => {
        const token =
          getAuthToken();

        if (!token) {
          throw new Error(
            "Authentication token not found."
          );
        }

        const response =
          await fetch(
            `${API_BASE}/api/documents/library`,
            {
              method:
                "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            payload.error ||
            payload.message ||
            `Unable to load documents (${response.status}).`
          );
        }

        const documents =
          Array.isArray(
            payload.documents
          )
            ? payload.documents.map(
                normalizeDocument
              )
            : [];

        return {
          ...payload,
          documents
        };
      }
  });

  const allDocs =
    documentData?.documents ||
    [];

  const categories =
    Array.isArray(
      documentData?.categories
    )
      ? documentData.categories
      : [];

  const categoryByKey =
    useMemo(
      () =>
        new Map(
          categories.map(
            category => [
              category.key,
              category
            ]
          )
        ),
      [categories]
    );

  const activeCategory =
    categoryByKey.get(
      selectedCategory
    ) ||
    null;

  const WORKFLOW_SECTION_ORDER = [
    "Recruiting",
    "Immigration",
    "Deployment",
    "Aftercare"
  ];

  const departments = useMemo(
    () => WORKFLOW_SECTION_ORDER.filter(section => categories.some(category => category.section === section)),
    [categories]
  );

  const departmentCategories =
    useMemo(
      () =>
        categories.filter(
          category =>
            category.section ===
            selectedDepartment
        ),
      [
        categories,
        selectedDepartment
      ]
    );

  const filteredDocs =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      const docs =
        term
          ? allDocs.filter(
              document =>
                [
                  document.document_name,
                  document.document_type,
                  document.category_label,
                  document.library_section
                ].some(
                  value =>
                    String(
                      value ||
                      ""
                    )
                      .toLowerCase()
                      .includes(
                        term
                      )
                )
            )
          : [
              ...allDocs
            ];

      switch (sortBy) {
        case "date_desc":
          return docs.sort(
            (a, b) =>
              new Date(
                b.uploaded_at ||
                0
              ) -
              new Date(
                a.uploaded_at ||
                0
              )
          );

        case "date_asc":
          return docs.sort(
            (a, b) =>
              new Date(
                a.uploaded_at ||
                0
              ) -
              new Date(
                b.uploaded_at ||
                0
              )
          );

        case "name_asc":
          return docs.sort(
            (a, b) =>
              String(
                a.document_name ||
                ""
              ).localeCompare(
                String(
                  b.document_name ||
                  ""
                )
              )
          );

        case "workflow":
        default:
          return docs.sort(
            (a, b) =>
              Number(
                a.library_section_order ??
                999
              ) -
                Number(
                  b.library_section_order ??
                  999
                ) ||
              Number(
                a.document_order ??
                999
              ) -
                Number(
                  b.document_order ??
                  999
                ) ||
              new Date(
                b.uploaded_at ||
                0
              ) -
                new Date(
                  a.uploaded_at ||
                  0
                )
          );
      }
    }, [
      allDocs,
      searchTerm,
      sortBy
    ]);

  const workflowSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const documentsByCategory = new Map();

    for (const document of filteredDocs) {
      const key = document.document_category || "";
      if (!documentsByCategory.has(key)) documentsByCategory.set(key, []);
      documentsByCategory.get(key).push(document);
    }

    return WORKFLOW_SECTION_ORDER.map((section, sectionIndex) => {
      const sectionCategories = categories
        .filter(category => category.section === section)
        .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
        .filter(category => {
          if (!term) return true;
          const categoryMatches = [category.label, category.key, category.pipelineStage, category.crmFieldApiName]
            .some(value => String(value || "").toLowerCase().includes(term));
          const docsMatch = (documentsByCategory.get(category.key) || []).length > 0;
          return categoryMatches || docsMatch;
        });

      const slots = sectionCategories.map(category => ({
        category,
        documents: (documentsByCategory.get(category.key) || []).sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0))
      }));

      return {
        section, sectionIndex, slots,
        documentCount: slots.reduce((total, slot) => total + slot.documents.length, 0),
        completedSlotCount: slots.filter(slot => slot.documents.length > 0).length
      };
    });
  }, [categories, filteredDocs, searchTerm]);

  const visibleWorkflowSections = useMemo(
    () => searchTerm.trim() ? workflowSections.filter(group => group.slots.length > 0) : workflowSections,
    [workflowSections, searchTerm]
  );

  const totalDocumentTypes = workflowSections.reduce((total, group) => total + group.slots.length, 0);

  const openViewer =
    document => {
      if (
        !document.attachment_id
      ) {
        toast.error(
          "This document has no attachment identifier."
        );
        return;
      }

      setSelectedDoc(
        document
      );

      setShowViewer(
        true
      );
    };

  const closeViewer =
    () => {
      setShowViewer(
        false
      );
      setSelectedDoc(
        null
      );
    };

  const resetUpload =
    () => {
      setSelectedDepartment(
        ""
      );
      setSelectedCategory(
        ""
      );
      setSelectedFile(
        null
      );
      setShowUpload(
        false
      );
    };

  const uploadDocument =
    async event => {
      event.preventDefault();

      if (
        !selectedDepartment ||
        !selectedCategory ||
        !selectedFile
      ) {
        toast.error(
          "Choose a department, document type, and file."
        );
        return;
      }

      const token =
        getAuthToken();

      if (!token) {
        toast.error(
          "Your session has expired."
        );
        return;
      }

      const category =
        categoryByKey.get(
          selectedCategory
        );

      const resolvedDestination =
        selectedDepartment ===
        "Recruiting"
          ? "recruit"
          : "crm";

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      formData.append(
        "candidate_email",
        user?.email ||
        ""
      );

      formData.append(
        "document_category",
        selectedCategory
      );

      formData.append(
        "document_type",
        category?.label ||
        selectedCategory
      );

      formData.append(
        "document_name",
        selectedFile.name
      );

      formData.append(
        "destination",
        resolvedDestination
      );

      formData.append(
        "document_library_upload",
        "true"
      );

      formData.append(
        "document_department",
        selectedDepartment
      );

      formData.append(
        "pipeline_section",
        selectedDepartment ===
          "Recruiting"
          ? "hiring"
          : selectedDepartment
      );

      if (
        category
          ?.requirementKey
      ) {
        formData.append(
          "requirement_key",
          category.requirementKey
        );
      }

      if (
        category
          ?.crmFieldApiName
      ) {
        formData.append(
          "crm_field_api_name",
          category.crmFieldApiName
        );
      }

      setUploading(
        true
      );

      try {
        const response =
          await fetch(
            `${API_BASE}/api/documents/upload`,
            {
              method:
                "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`
              },
              body:
                formData
            }
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          payload.success !==
            true
        ) {
          throw new Error(
            payload.error ||
            "Document upload failed."
          );
        }

        toast.success(
          `${category?.label || "Document"} uploaded successfully.`
        );

        resetUpload();

        await refetch();

        queryClient.invalidateQueries({
          queryKey: [
            "dashboard-summary",
            user?.email
          ]
        });

        window.dispatchEvent(
          new CustomEvent(
            "documents-updated"
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            "pipeline-updated"
          )
        );
      } catch (uploadError) {
        toast.error(
          uploadError.message ||
          "Unable to upload the document."
        );
      } finally {
        setUploading(
          false
        );
      }
    };

  const handleRefresh =
    async () => {
      try {
        const result =
          await refetch();

        toast.success(
          `${result.data?.documents?.length || 0} document(s) available.`
        );
      } catch {
        toast.error(
          "Failed to refresh documents."
        );
      }
    };

  const renderDocumentItem =
    document => {
      const DocumentIcon =
        getDocumentIcon(
          document
        );

      return (
        <div
          key={
            getDocumentKey(
              document
            )
          }
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
              <DocumentIcon className="h-5 w-5 text-gray-600" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {document.document_name}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border px-2 py-0.5">
                  {document.category_label ||
                    document.document_type ||
                    "Document"}
                </span>

                {document.uploaded_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(
                      document.uploaded_at
                    ).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              openViewer(
                document
              )
            }
            className="shrink-0 gap-1.5"
            disabled={
              !document.attachment_id
            }
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
      );
    };

  if (
    isLoading &&
    allDocs.length ===
      0
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading document library...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentViewerModal
        doc={selectedDoc}
        isOpen={showViewer}
        onClose={
          closeViewer
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Document Library
          </h1>

          <p className="text-sm text-muted-foreground">
            All recruiting, immigration, deployment and aftercare documents are kept here in pipeline order. {allDocs.length} approved document{allDocs.length === 1 ? "" : "s"} currently available.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              setShowUpload(
                previous =>
                  !previous
              )
            }
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Upload Document
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={
              handleRefresh
            }
            disabled={
              isFetching
            }
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isFetching
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {showUpload && (
        <form
          onSubmit={
            uploadDocument
          }
          className="rounded-xl border border-primary/20 bg-primary/5 p-5"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">
                Department
              </label>
              <select
                value={
                  selectedDepartment
                }
                onChange={
                  event => {
                    setSelectedDepartment(
                      event.target.value
                    );
                    setSelectedCategory(
                      ""
                    );
                  }
                }
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">
                  Select department
                </option>
                {departments.map(
                  department => (
                    <option
                      key={
                        department
                      }
                      value={
                        department
                      }
                    >
                      {department}
                    </option>
                  )
                )}
              </select>

              {selectedDepartment && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedDepartment ===
                  "Recruiting"
                    ? "Recruiting documents are submitted to Recruit."
                    : "This department submits documents to CRM."}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">
                Document Type
              </label>
              <select
                value={
                  selectedCategory
                }
                onChange={
                  event =>
                    setSelectedCategory(
                      event.target.value
                    )
                }
                disabled={
                  !selectedDepartment
                }
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
                required
              >
                <option value="">
                  Select document type
                </option>
                {departmentCategories.map(
                  category => (
                    <option
                      key={
                        category.key
                      }
                      value={
                        category.key
                      }
                    >
                      {category.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                File
              </label>
              <input
                type="file"
                onChange={
                  event =>
                    setSelectedFile(
                      event.target.files
                        ?.[0] ||
                      null
                    )
                }
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={
                resetUpload
              }
              disabled={
                uploading
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                uploading ||
                !selectedDepartment ||
                !selectedCategory ||
                !selectedFile
              }
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}

              {uploading
                ? "Uploading..."
                : "Upload"}
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Documents
          </p>
          <p className="mt-1 text-2xl font-bold">
            {allDocs.length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Awaiting Approval
          </p>
          <p className="mt-1 text-2xl font-bold">
            {Number(documentData?.pending_count || 0)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Workflow Sections
          </p>
          <p className="mt-1 text-2xl font-bold">
            {WORKFLOW_SECTION_ORDER.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{totalDocumentTypes} document types</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Error loading documents
              </p>
              <p className="mt-1 text-xs text-red-700">
                {error.message ||
                  "Documents could not be loaded."}
              </p>
            </div>
          </div>
        </div>
      )}

      {Number(
        documentData?.pending_count ||
        0
      ) > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {Number(documentData.pending_count)} document{Number(documentData.pending_count) === 1 ? " is" : "s are"} awaiting administrator approval.
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            value={
              searchTerm
            }
            onChange={
              event =>
                setSearchTerm(
                  event.target.value
                )
            }
            placeholder="Search document library..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm(
                  ""
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={
            sortBy
          }
          onChange={
            event =>
              setSortBy(
                event.target.value
              )
          }
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="workflow">
            Pipeline Order
          </option>
          <option value="date_desc">
            Newest First
          </option>
          <option value="date_asc">
            Oldest First
          </option>
          <option value="name_asc">
            Name A–Z
          </option>
        </select>
      </div>

      {visibleWorkflowSections.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FolderOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">No matching document types found</p>
          <p className="mt-1 text-sm text-muted-foreground">Clear the search to see all document types in pipeline order.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleWorkflowSections.map(group => (
            <section key={group.section} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{group.sectionIndex + 1}</span>
                    <h2 className="text-lg font-bold">{group.section}</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.completedSlotCount} of {group.slots.length} document types currently on file • {group.documentCount} approved file{group.documentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">Pipeline order</span>
              </div>

              <div className="divide-y">
                {group.slots.map((slot, slotIndex) => {
                  const hasDocuments = slot.documents.length > 0;
                  return (
                    <div key={slot.category.key} className="p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${hasDocuments ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{slotIndex + 1}</span>
                          <div>
                            <h3 className="font-semibold">{slot.category.label}</h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {slot.category.pipelineStage && <span>Pipeline: {slot.category.pipelineStage}</span>}
                              {slot.category.crmFieldApiName && <span className="rounded-full border px-2 py-0.5">{slot.category.crmFieldApiName}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${hasDocuments ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                          {hasDocuments ? `${slot.documents.length} on file` : "Not submitted"}
                        </span>
                      </div>

                      {hasDocuments ? (
                        <div className="space-y-3 pl-10">{slot.documents.map(renderDocumentItem)}</div>
                      ) : (
                        <div className="ml-10 rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">No approved document is currently available for this item.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}