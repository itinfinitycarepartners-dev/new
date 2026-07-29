// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { 
  FileText, Upload, Loader2, X, CheckCircle, AlertCircle, 
  Clock, Search, Eye, ArrowLeft, Calendar, RefreshCw, 
  FolderOpen, WifiOff, File, Download, ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const API_BASE = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch (e) {
    // Fall through to default
  }
  return "https://fictional-carnival-3inv.onrender.com";
})();

// PDF Viewer Modal Component
function PDFViewerModal({ doc, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("icp_auth_token");
  
  useEffect(() => {
    if (isOpen && doc && doc.attachment_id) {
      setLoading(true);
      setError(null);
      fetchPDF();
    }
  }, [isOpen, doc]);

  const fetchPDF = async () => {
    try {
      let url = `${API_BASE}/api/documents/download/${doc.attachment_id}?token=${token}`;
      if (doc.source) {
        url += `&source=${doc.source}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch document: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.base64) {
          const byteCharacters = atob(data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else {
          throw new Error('Invalid document data');
        }
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching PDF:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl flex flex-col w-full max-w-6xl max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Back to Documents</span>
            </button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold truncate max-w-[200px] sm:max-w-[400px]">
                {doc.document_name || 'Document'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-600">
            📄 {doc.document_name || 'Unnamed Document'}
          </span>
          {doc.source && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              doc.source === "recruit" 
                ? "bg-blue-100 text-blue-700 border border-blue-200" 
                : "bg-green-100 text-green-700 border border-green-200"
            }`}>
              {doc.source === "recruit" ? "📊 Recruit" : "📤 CRM"}
            </span>
          )}
          {(doc.uploaded_at || doc.created_at) && (
            <span className="text-xs text-gray-500">
              Uploaded: {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
            <Eye className="h-3 w-3" />
            View-only - PDF
          </span>
        </div>
        
        <div className="flex-1 p-2 bg-gray-100" style={{ minHeight: '500px' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-gray-500">Loading PDF document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <AlertCircle className="h-12 w-12 mb-2 text-red-500" />
              <p className="text-red-500 font-medium">Failed to load document</p>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchPDF();
                }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : pdfUrl ? (
            <embed
              src={pdfUrl}
              type="application/pdf"
              className="w-full h-full rounded-lg"
              style={{ minHeight: '500px' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="h-12 w-12 mb-2" />
              <p>Unable to display PDF document</p>
            </div>
          )}
        </div>
        
        <div className="p-3 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              <span>View-only mode - PDF document cannot be downloaded</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="text-primary hover:underline font-medium"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showViewer, setShowViewer] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [connectionStatus, setConnectionStatus] = useState({ crm: false, recruit: false });
  const [recruitCount, setRecruitCount] = useState(0);
  const [crmCount, setCrmCount] = useState(0);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH ALL DOCUMENTS - Unified API
  // ============================================
  const { data: allDocs = [], isLoading, refetch } = useQuery({
    queryKey: ["all-documents", user?.email],
    queryFn: async () => {
      try {
        if (!user?.email) {
          setConnectionStatus({ recruit: false, crm: false });
          setRecruitCount(0);
          setCrmCount(0);
          setError("No user email found");
          return [];
        }

        const token = localStorage.getItem("icp_auth_token");
        if (!token) {
          setConnectionStatus({ recruit: false, crm: false });
          setRecruitCount(0);
          setCrmCount(0);
          setError("Authentication token not found");
          return [];
        }

        const response = await fetch(`${API_BASE}/api/documents/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          let errorMessage = `Server error (${response.status})`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            if (errorText) {
              errorMessage = errorText.substring(0, 100);
            }
          }
          
          setError(errorMessage);
          setConnectionStatus({ recruit: false, crm: false });
          setRecruitCount(0);
          setCrmCount(0);
          return [];
        }

        const data = await response.json();
        
        const docs = data.documents || [];
        
        // Update counts and connection status
        if (data.sources) {
          setRecruitCount(data.sources.recruit || 0);
          setCrmCount(data.sources.crm || 0);
        }
        
        if (data.connected) {
          setConnectionStatus({
            recruit: data.connected.recruit || false,
            crm: data.connected.crm || false
          });
        } else {
          // Fallback: infer from documents
          const hasRecruit = docs.some(d => d.source === "recruit");
          const hasCrm = docs.some(d => d.source === "crm");
          setConnectionStatus({
            recruit: hasRecruit || docs.length > 0,
            crm: hasCrm || docs.length > 0
          });
        }
        
        setError(null);
        
        // Process and normalize documents
        const processed = docs.map((doc, index) => {
          const name = doc.document_name || doc.File_Name || doc.name || doc.file_name || `Document ${index + 1}`;
          
          return {
            ...doc,
            source: doc.source || "unknown",
            sourceLabel: doc.source === "recruit" ? "Recruit" : doc.source === "crm" ? "CRM" : "Unknown",
            sourceIcon: doc.source === "recruit" ? "📊" : doc.source === "crm" ? "📤" : "📄",
            sourceColor: doc.source === "recruit" ? "bg-blue-100 text-blue-700 border-blue-200" : 
                         doc.source === "crm" ? "bg-green-100 text-green-700 border-green-200" : 
                         "bg-gray-100 text-gray-700 border-gray-200",
            attachment_id: doc.attachment_id || doc.id || doc.attachment_Id || doc._id,
            document_name: name,
            uploaded_at: doc.uploaded_at || doc.Created_Time || doc.created_at || new Date().toISOString()
          };
        });

        return processed;
      } catch (error) {
        setError(error.message || "Network error");
        setConnectionStatus({ recruit: false, crm: false });
        setRecruitCount(0);
        setCrmCount(0);
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 0,
    cacheTime: 0,
    retry: 2,
    retryDelay: 3000,
  });

  const filteredDocs = (() => {
    let docs = allDocs;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      docs = docs.filter(doc => 
        (doc.document_name || '').toLowerCase().includes(term) ||
        (doc.sourceLabel || '').toLowerCase().includes(term) ||
        (doc.source || '').toLowerCase().includes(term)
      );
    }
    
    switch(sortBy) {
      case "date_desc":
        return [...docs].sort((a, b) => 
          new Date(b.uploaded_at || b.created_at || 0) - new Date(a.uploaded_at || a.created_at || 0)
        );
      case "date_asc":
        return [...docs].sort((a, b) => 
          new Date(a.uploaded_at || a.created_at || 0) - new Date(b.uploaded_at || b.created_at || 0)
        );
      case "name_asc":
        return [...docs].sort((a, b) => 
          (a.document_name || '').localeCompare(b.document_name || '')
        );
      case "name_desc":
        return [...docs].sort((a, b) => 
          (b.document_name || '').localeCompare(a.document_name || '')
        );
      default:
        return docs;
    }
  })();

  const totalDocs = allDocs.length;

  const renderDocumentItem = (doc) => {
    return (
      <div 
        key={doc.attachment_id || doc.id || doc._id || Math.random()} 
        className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-50">
            <FileText className="h-5 w-5 text-gray-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">
              {doc.document_name || doc.name || doc.file_name || 'Unnamed Document'}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.sourceColor || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {doc.sourceIcon || '📄'} {doc.sourceLabel || 'Unknown'}
              </span>
              {(doc.uploaded_at || doc.created_at) && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {doc.attachment_id && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewDocument(doc)}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              View PDF
            </Button>
          )}
        </div>
      </div>
    );
  };

  const handleViewDocument = (doc) => {
    setSelectedDoc(doc);
    setShowViewer(true);
  };

  const handleRefresh = async () => {
    toast.info("Refreshing documents...");
    try {
      setError(null);
      await refetch();
      const total = allDocs.length;
      toast.success(`Documents refreshed! Total: ${total}`);
    } catch (error) {
      toast.error("Failed to refresh documents");
    }
  };

  if (isLoading && allDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PDFViewerModal 
        doc={selectedDoc}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          setSelectedDoc(null);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Documents</h1>
          <p className="text-sm text-muted-foreground">
            {totalDocs} total documents
          </p>
          <div className="flex items-center gap-4 mt-1 text-xs">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${
              connectionStatus.recruit ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {connectionStatus.recruit ? "✅" : "❌"} Recruit {connectionStatus.recruit ? "Connected" : "Offline"}
            </span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${
              connectionStatus.crm ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {connectionStatus.crm ? "✅" : "❌"} CRM {connectionStatus.crm ? "Connected" : "Offline"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-8"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">▼</span>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="gap-2"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error Loading Documents</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
              <button 
                onClick={handleRefresh} 
                className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRM Warning - Only show if CRM is not connected but Recruit is */}
      {!connectionStatus.crm && connectionStatus.recruit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">CRM Documents Unavailable</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Unable to fetch CRM documents.
              </p>
              <button 
                onClick={handleRefresh} 
                className="mt-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-lg font-medium transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search documents by name or source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Source Info */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">📌 Showing:</span>
          <span className="text-muted-foreground">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} found
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {connectionStatus.recruit ? '✅ Recruit' : '❌ Recruit'} · 
            {connectionStatus.crm ? '✅ CRM' : '❌ CRM'}
          </span>
        </div>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          {connectionStatus.recruit || connectionStatus.crm ? (
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          ) : (
            <WifiOff className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          )}
          <p className="font-medium">
            {connectionStatus.recruit || connectionStatus.crm ? "No documents found" : "Both sources are offline"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchTerm 
              ? "Try adjusting your search criteria." 
              : connectionStatus.recruit || connectionStatus.crm 
                ? "No documents available from either source."
                : "Unable to connect to sources. Please try again later."}
          </p>
          {searchTerm && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setSearchTerm("")}>
              <X className="h-4 w-4" />
              Clear Search
            </Button>
          )}
          {(!connectionStatus.recruit || !connectionStatus.crm) && (
            <Button 
              variant="outline" 
              className="mt-4 gap-2" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Retry Connection
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredDocs.map(doc => renderDocumentItem(doc))}
        </div>
      )}
    </div>
  );
}