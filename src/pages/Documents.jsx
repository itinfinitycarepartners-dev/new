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
                src={`${objectUrl}#toolbar=1&navpanes=0`}
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
  const { user } = useAuth();
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
  ] = useState("date_desc");

  const {
    data: documentData,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: [
      "approved-documents",
      user?.email
    ],
    enabled: Boolean(user?.email),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const token =
        getAuthToken();

      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }

      const response = await fetch(
        `${API_BASE}/api/documents/my-documents?refresh=true&_=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        if (
          payload.portalAccessBlocked ||
          response.status === 401
        ) {
          localStorage.removeItem(
            "icp_auth_token"
          );
        }
      }

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
        documents,
        total:
          Number(payload.total) ||
          documents.length,
        pendingCount:
          Number(
            payload.pending_count
          ) || 0,
        rejectedCount:
          Number(
            payload.rejected_count
          ) || 0
      };
    }
  });

  const allDocs =
    documentData?.documents || [];

  const sourceCounts =
    useMemo(() => {
      return allDocs.reduce(
        (counts, document) => {
          const source =
            document.source ===
            "recruit"
              ? "recruit"
              : "crm";

          counts[source] += 1;
          return counts;
        },
        {
          crm: 0,
          recruit: 0
        }
      );
    }, [allDocs]);

  const filteredDocs =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      let documents =
        term
          ? allDocs.filter(document =>
              [
                document.document_name,
                document.document_type,
                document.source,
                document.crm_field_api_name
              ].some(value =>
                String(value || "")
                  .toLowerCase()
                  .includes(term)
              )
            )
          : [...allDocs];

      switch (sortBy) {
        case "date_asc":
          documents.sort(
            (a, b) =>
              new Date(
                a.uploaded_at || 0
              ) -
              new Date(
                b.uploaded_at || 0
              )
          );
          break;

        case "name_asc":
          documents.sort(
            (a, b) =>
              a.document_name.localeCompare(
                b.document_name
              )
          );
          break;

        case "name_desc":
          documents.sort(
            (a, b) =>
              b.document_name.localeCompare(
                a.document_name
              )
          );
          break;

        case "date_desc":
        default:
          documents.sort(
            (a, b) =>
              new Date(
                b.uploaded_at || 0
              ) -
              new Date(
                a.uploaded_at || 0
              )
          );
          break;
      }

      return documents;
    }, [
      allDocs,
      searchTerm,
      sortBy
    ]);

  const handleRefresh =
    async () => {
      toast.info(
        "Refreshing documents..."
      );

      try {
        const result =
          await refetch();

        const count =
          result.data
            ?.documents?.length ||
          0;

        toast.success(
          `${count} approved document${
            count === 1 ? "" : "s"
          } available.`
        );
      } catch {
        toast.error(
          "Failed to refresh documents."
        );
      }
    };

  const openViewer = document => {
    if (!document.attachment_id) {
      toast.error(
        "This document cannot be opened because it has no attachment identifier."
      );
      return;
    }

    setSelectedDoc(document);
    setShowViewer(true);
  };

  const closeViewer = () => {
    setShowViewer(false);
    setSelectedDoc(null);
  };

  const renderDocumentItem =
    document => {
      const DocumentIcon =
        getDocumentIcon(document);

      return (
        <div
          key={getDocumentKey(
            document
          )}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
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
                {document.uploaded_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(
                      document.uploaded_at
                    ).toLocaleDateString()}
                  </span>
                )}

                <span className="rounded-full border px-2 py-0.5 uppercase">
                  {document.source}
                </span>

                {document.crm_field_api_name && (
                  <span className="rounded-full border px-2 py-0.5">
                    {document.crm_field_api_name}
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
              openViewer(document)
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
    allDocs.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading approved documents...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentViewerModal
        doc={selectedDoc}
        isOpen={showViewer}
        onClose={closeViewer}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            My Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            {allDocs.length} approved document{allDocs.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={event =>
              setSortBy(
                event.target.value
              )
            }
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="date_desc">
              Newest First
            </option>
            <option value="date_asc">
              Oldest First
            </option>
            <option value="name_asc">
              Name A–Z
            </option>
            <option value="name_desc">
              Name Z–A
            </option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Approved
          </p>
          <p className="mt-1 text-2xl font-bold">
            {allDocs.length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            CRM
          </p>
          <p className="mt-1 text-2xl font-bold">
            {sourceCounts.crm}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Recruit
          </p>
          <p className="mt-1 text-2xl font-bold">
            {sourceCounts.recruit}
          </p>
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

      {documentData?.pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {documentData.pendingCount} document{documentData.pendingCount === 1 ? " is" : "s are"} awaiting administrator approval and will appear here after approval.
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <input
          type="text"
          value={searchTerm}
          onChange={event =>
            setSearchTerm(
              event.target.value
            )
          }
          placeholder="Search by document name, type, source, or CRM field..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() =>
              setSearchTerm("")
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FolderOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />

          <p className="font-medium">
            {searchTerm
              ? "No matching documents"
              : "No approved documents yet"}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm
              ? "Try a different search term."
              : "Documents will appear here after an administrator approves them."}
          </p>

          {searchTerm && (
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2"
              onClick={() =>
                setSearchTerm("")
              }
            >
              <X className="h-4 w-4" />
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDocs.length} document{filteredDocs.length === 1 ? "" : "s"}
          </p>

          {filteredDocs.map(
            renderDocumentItem
          )}
        </div>
      )}
    </div>
  );
}