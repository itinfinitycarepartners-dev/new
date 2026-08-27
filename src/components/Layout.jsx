import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Bell, 
  MapPin, 
  Briefcase, 
  LogOut, 
  GitBranch, 
  HeartHandshake,
  BookOpen,
  ClipboardList,
  MessageCircle,
  Megaphone,
  Home,
  ArrowLeft,
  Send
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { messaging, websocket, tokenStorage } from "@/api/icpClient";
// Import the image
import logoImage from "./logo.png";
import userImage from "./user1.png";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://fictional-carnival-3inv.onrender.com";

// Webhooks remain the primary instant path. This visible-tab heartbeat is the
// deterministic fallback for CRM Deals only, so Profile/Dashboard do not wait
// for long candidate caches if a Zoho callback is delayed or missed.
const GLOBAL_CRM_SYNC_INTERVAL_MS =
  10 * 1000;

const normalizeLeadStatus = value =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Define all possible nav items with a condition for licensure
const getNavItems = (licensureUrl) => {
  const items = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/profile", label: "My Profile", icon: User },
    { path: "/documents", label: "Document Library", icon: FileText },
    { path: "/forms", label: "Forms", icon: ClipboardList },
    { path: "/make-request", label: "Submit an Inquiry", icon: Send },
    { path: "/messages", label: "Messages", icon: MessageCircle },
    { path: "/updates", label: "Updates", icon: Bell },
    { path: "/pipeline", label: "My Pipeline", icon: GitBranch },
    { path: "/relocation", label: "Relocation Hub", icon: MapPin },
    { path: "/resource", label: "My Resources", icon: BookOpen },
  ];

  // Only add Licensure if it has a URL
  if (licensureUrl) {
    items.push({ path: licensureUrl, label: "Licensure", icon: BookOpen });
  }

  return items;
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [licensureUrl, setLicensureUrl] = useState(undefined);
  const stageRiskToastRef = useRef("");

  // ─── Load licensure URL ──────────────────────────────────────────────────────
  useEffect(() => {
    const checkLicensure = async () => {
      try {
        // Replace with your actual logic
        const storedUrl = localStorage.getItem('licensureUrl');
        if (storedUrl) {
          setLicensureUrl(storedUrl);
        }
      } catch (error) {
        console.error('Failed to load licensure URL:', error);
      }
    };

    checkLicensure();
  }, [user]);

  // Get nav items based on licensure URL availability
  const navItems = getNavItems(licensureUrl);

  // ─── Transfer to ICP USRN School branch redirect ───────────────────────────
  // Applications.Application_Status is the canonical Hiring source.
  // Redirect only once per authenticated session so the user can still visit
  // Forms, Documents, Submit an Inquiry, etc. after the NCLEX branch opens.
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    const checkTransferBranch =
      async () => {
        const authToken =
          tokenStorage.get();

        if (!authToken) {
          return;
        }

        const redirectKey =
          `icp_usrn_redirected:${String(
            user.email
          ).trim().toLowerCase()}`;

        if (
          sessionStorage.getItem(
            redirectKey
          ) === "1"
        ) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE}/api/zoho/source-map?refresh=true`,
              {
                headers: {
                  Authorization:
                    `Bearer ${authToken}`
                },
                cache:
                  "no-store"
              }
            );

          const data =
            await response
              .json()
              .catch(() => ({}));

          if (
            !response.ok ||
            data.success !==
              true
          ) {
            return;
          }

          const status =
            normalizeLeadStatus(
              data.applicationStatus
            );

          if (
            status ===
            "transfer to icp usrn school"
          ) {
            sessionStorage.setItem(
              redirectKey,
              "1"
            );

            if (
              location.pathname !==
              "/pipeline" ||
              !location.search.includes(
                "branch=nclex"
              )
            ) {
              navigate(
                "/pipeline?branch=nclex",
                {
                  replace: true
                }
              );
            }
          }
        } catch (error) {
          console.warn(
            "[Layout] ICP USRN redirect check failed:",
            error.message
          );
        }
      };

    checkTransferBranch();
  }, [
    user?.email,
    location.pathname,
    location.search,
    navigate
  ]);

  // ─── Global fast CRM freshness sync ────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;

    let active = true;
    let inFlight = false;

    const syncLiveCrm =
      async () => {
        if (
          !active ||
          inFlight ||
          document.visibilityState !==
            "visible"
        ) {
          return;
        }

        const authToken =
          tokenStorage.get();

        if (!authToken) return;

        inFlight = true;

        try {
          const response =
            await fetch(
              `${API_BASE}/api/pipeline/live-crm-state?_=${Date.now()}`,
              {
                cache:
                  "no-store",
                headers: {
                  Authorization:
                    `Bearer ${authToken}`,
                  "Cache-Control":
                    "no-cache",
                  Pragma:
                    "no-cache"
                }
              }
            );

          const payload =
            await response
              .json()
              .catch(() => ({}));

          if (
            !active ||
            !response.ok ||
            payload?.success !==
              true ||
            payload?.changed !==
              true
          ) {
            return;
          }

          const detail = {
            event:
              "global-live-crm",
            source:
              "crm",
            candidateEmail:
              payload.candidateEmail ||
              user.email,
            changedFields:
              payload.changedFields ||
              {},
            fetchedAt:
              payload.fetchedAt ||
              new Date()
                .toISOString()
          };

          // Candidate pages already know how to refresh on these browser events.
          // The backend clears the shared candidate cache before this event is
          // emitted, so each page receives fresh CRM-backed data.
          window.dispatchEvent(
            new CustomEvent(
              "candidate-data-updated",
              { detail }
            )
          );

          window.dispatchEvent(
            new CustomEvent(
              "pipeline-updated",
              { detail }
            )
          );

          window.dispatchEvent(
            new CustomEvent(
              "crm-recruit-updated",
              { detail }
            )
          );
        } catch (error) {
          if (active) {
            console.warn(
              "[Layout] Fast CRM sync failed:",
              error?.message ||
              error
            );
          }
        } finally {
          inFlight = false;
        }
      };

    syncLiveCrm();

    const interval =
      window.setInterval(
        syncLiveCrm,
        GLOBAL_CRM_SYNC_INTERVAL_MS
      );

    const onFocus = () =>
      syncLiveCrm();

    const onVisibility = () => {
      if (
        document.visibilityState ===
          "visible"
      ) {
        syncLiveCrm();
      }
    };

    window.addEventListener(
      "focus",
      onFocus
    );
    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    return () => {
      active = false;
      window.clearInterval(
        interval
      );
      window.removeEventListener(
        "focus",
        onFocus
      );
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
    };
  }, [user?.email]);

  // ─── Global current-stage risk notifications ────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;

    let active = true;

    const checkCurrentStageRisk = async () => {
      try {
        const authToken =
          tokenStorage.get();

        if (!authToken) return;

        const response = await fetch(
          `${API_BASE}/api/pipeline/get?email=${encodeURIComponent(
            user.email
          )}&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${authToken}`,
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
            .catch(() => ({}));

        if (
          !active ||
          !response.ok ||
          data.success !== true
        ) {
          return;
        }

        const stages =
          (Array.isArray(data.stages)
            ? data.stages
            : []
          )
            .filter(stage =>
              stage &&
              stage.is_deleted !== true
            )
            .sort(
              (a, b) =>
                Number(a.stage_order || 0) -
                Number(b.stage_order || 0)
            );

        const currentStage =
          stages.find(stage =>
            stage.status ===
              "In Progress" &&
            stage.status !==
              "Completed"
          ) ||
          stages.find(stage =>
            !(
              stage.status ===
                "Completed" ||
              stage.completed ===
                true ||
              stage.is_completed ===
                true
            )
          );

        if (!currentStage) {
          stageRiskToastRef.current =
            "";
          return;
        }

        let riskStatus =
          String(
            currentStage.timing_status ||
            currentStage.timingStatus ||
            ""
          ).trim();

        if (
          ![
            "At Risk",
            "Late"
          ].includes(riskStatus)
        ) {
          const target =
            currentStage.target_date ||
            currentStage.targetDate ||
            null;

          if (target) {
            const deadline =
              new Date(target);

            if (
              !Number.isNaN(
                deadline.getTime()
              )
            ) {
              const hoursRemaining =
                (
                  deadline.getTime() -
                  Date.now()
                ) /
                3600000;

              riskStatus =
                hoursRemaining < 0
                  ? "Late"
                  : hoursRemaining <= 24
                    ? "At Risk"
                    : "Good Standing";
            }
          }
        }

        if (
          ![
            "At Risk",
            "Late"
          ].includes(riskStatus)
        ) {
          stageRiskToastRef.current =
            "";
          return;
        }

        const stageName =
          currentStage.display_name ||
          currentStage.stage_name ||
          "Current stage";

        const toastKey =
          `${stageName}:${riskStatus}:${
            currentStage.target_date ||
            currentStage.targetDate ||
            "no-target"
          }`;

        if (
          stageRiskToastRef.current ===
          toastKey
        ) {
          return;
        }

        stageRiskToastRef.current =
          toastKey;

        if (riskStatus === "Late") {
          toast.error(
            `Current stage late: ${stageName}`,
            {
              description:
                "This stage is past its required target date. Please complete the required action or contact ICP as soon as possible.",
              duration: 9000
            }
          );
        } else {
          toast.warning(
            `Current stage at risk: ${stageName}`,
            {
              description:
                "This stage is approaching its target date. Please complete the required action to keep your pipeline on track.",
              duration: 9000
            }
          );
        }
      } catch (error) {
        console.warn(
          "[Layout] Stage risk check failed:",
          error?.message || error
        );
      }
    };

    checkCurrentStageRisk();

    const interval =
      window.setInterval(
        checkCurrentStageRisk,
        60 * 1000
      );

    const refresh = () =>
      checkCurrentStageRisk();

    window.addEventListener(
      "candidate-data-updated",
      refresh
    );
    window.addEventListener(
      "pipeline-updated",
      refresh
    );

    return () => {
      active = false;
      window.clearInterval(
        interval
      );
      window.removeEventListener(
        "candidate-data-updated",
        refresh
      );
      window.removeEventListener(
        "pipeline-updated",
        refresh
      );
    };
  }, [user?.email]);

  // ─── Load unread count ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const token = tokenStorage.get();
        if (!token) return;
        
        const response = await messaging.getUnreadCount();
        if (response.success) {
          setUnreadCount(response.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to load unread count:', error);
      }
    };

    loadUnreadCount();

    const handleNewMessage = () => {
      setUnreadCount(prev => prev + 1);
    };

    websocket.on('new_message', handleNewMessage);

    return () => {
      websocket.off('new_message', handleNewMessage);
    };
  }, []);

  // ─── Candidate notification popups on every portal/dashboard page ──────────
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    let cancelled = false;
    let timer = null;

    const showUnreadNotificationPopups = async () => {
      try {
        const authToken = tokenStorage.get();
        if (!authToken || cancelled) {
          return;
        }

        const response = await fetch(
          `${API_BASE}/api/updates?limit=20&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache"
            }
          }
        );

        const data = await response.json().catch(() => ({}));
        if (cancelled || !response.ok || data.success !== true) {
          return;
        }

        const userEmailKey = String(user.email).trim().toLowerCase();
        const updates = Array.isArray(data.updates) ? data.updates : [];

        updates
          .filter(item => item && item.is_read !== true)
          .slice(0, 12)
          .forEach(item => {
            const notificationKey =
              `dashboard_notification_seen:${userEmailKey}:${item.id || item._id || item.notification_key || item.title || item.message}`;

            if (sessionStorage.getItem(notificationKey)) {
              return;
            }

            const title = String(item.title || "Pipeline update").trim();
            const text = String(item.message || item.text || item.title || "").trim();
            const combined = `${title} ${text}`.toLowerCase();
            const updateType = String(item.update_type || item.type || "")
              .trim()
              .toLowerCase();

            const urgent =
              combined.includes("request for evidence") ||
              combined.includes("request for further evidence") ||
              combined.includes("rfe") ||
              [
                "urgent",
                "rfe",
                "expiry",
                "expired",
                "document-required",
                "access"
              ].includes(updateType);

            if (urgent) {
              toast.warning(title || "Important update", {
                description: text || "Your candidate record has an important update.",
                duration: 10000
              });
            } else {
              toast.info(title || "Pipeline update", {
                description: text || "Your candidate record has changed.",
                duration: 7000
              });
            }

            // Do not mark the backend notification read just because a popup was
            // displayed. This only prevents duplicate popups during this session.
            sessionStorage.setItem(notificationKey, "1");
          });
      } catch (error) {
        console.warn(
          "[Layout] Notification popup refresh failed:",
          error?.message || error
        );
      }
    };

    const refreshNotificationPopups = () => {
      showUnreadNotificationPopups();
    };

    showUnreadNotificationPopups();
    timer = window.setInterval(showUnreadNotificationPopups, 10000);

    websocket.on("pipeline-updated", refreshNotificationPopups);
    websocket.on("candidate-data-updated", refreshNotificationPopups);
    websocket.on("crm-recruit-updated", refreshNotificationPopups);

    window.addEventListener("pipeline-updated", refreshNotificationPopups);
    window.addEventListener("candidate-data-updated", refreshNotificationPopups);
    window.addEventListener("crm-recruit-updated", refreshNotificationPopups);
    window.addEventListener("documents-updated", refreshNotificationPopups);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }

      websocket.off("pipeline-updated", refreshNotificationPopups);
      websocket.off("candidate-data-updated", refreshNotificationPopups);
      websocket.off("crm-recruit-updated", refreshNotificationPopups);

      window.removeEventListener("pipeline-updated", refreshNotificationPopups);
      window.removeEventListener("candidate-data-updated", refreshNotificationPopups);
      window.removeEventListener("crm-recruit-updated", refreshNotificationPopups);
      window.removeEventListener("documents-updated", refreshNotificationPopups);
    };
  }, [user?.email]);

  // ─── Portal access enforcement ─────────────────────────────────────────────
            
          
  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;
    let timer = null;

    const enforceAccess = async () => {
      try {
        const authToken = tokenStorage.get();
        if (!authToken) return;

        const response = await fetch(
          `${API_BASE}/api/pipeline/field-status?refresh=false&_=${Date.now()}`,
          {
            cache:"no-store",
            headers:{
              Authorization:`Bearer ${authToken}`
            }
          }
        );

        const data = await response.json().catch(() => ({}));
        if (
          cancelled ||
          !response.ok ||
          data.success !== true
        ) {
          return;
        }

        const policy = data.accessPolicy || {};

        // "locked" only controls which pipeline sections are available during
        // a restricted/grace-period state. It must NOT terminate the login.
        // The candidate should be signed out only after the backend confirms
        // the actual portal-access deadline has been reached.
        if (
          policy.portal_locked === true
        ) {
          sessionStorage.setItem(
            "candidate-access-message",
            policy.message ||
            "Your candidate portal access period has ended."
          );
          await logout();
          navigate("/login");
        }
      } catch {
      }
    };

    enforceAccess();
    timer = window.setInterval(enforceAccess, 30000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [user?.email, logout, navigate]);

  // Check if we're on the home/dashboard page
  const isHomePage = location.pathname === "/";
  
  // Check if we're on a page that should show the back button
  // You can customize this list based on your routes
  const showBackButton = !isHomePage && location.pathname !== "/profile";

  // Get the page title based on current route
  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    return currentItem?.label || "Page";
  };

  // Handle back navigation - goes to previous page or dashboard
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── TOP NAVBAR (Blue) ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full shadow-lg" style={{ background: 'linear-gradient(90deg, #A78BFA 0%, #6D28D9 48%, #24104F 100%)' }}>
        <div className="max-w-[90rem] mx-auto px-5 h-16 flex items-center justify-between">
          
          {/* Left side - Back button + Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center gap-1"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-xs hidden sm:inline">Back</span>
              </button>
            )}
            
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {!imageError ? (
                <img 
                  src={logoImage} 
                  alt="Infinity Care Partners logo" 
                  className="h-14 w-[min(220px,42vw)] object-cover object-center block mix-blend-screen"
                  onError={(e) => {
                    console.error('Logo failed to load:', e);
                    setImageError(true);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => console.log('Logo loaded successfully!')}
                />
              ) : (
                <div className="h-10 w-10 flex items-center justify-center bg-white/10 rounded-full">
                  <Home className="h-5 w-5 text-white" />
                </div>
              )}
            </Link>
          </div>

          {/* Center - Page title or Brand name */}
          <div className="flex-1 flex items-center justify-center px-4 hidden md:flex">
            {showBackButton ? (
              <span className="text-white font-semibold text-lg md:text-xl tracking-wide truncate">
                {getPageTitle()}
              </span>
            ) : (
              <span className="text-white font-semibold text-lg md:text-xl tracking-wide truncate">
                Candidate Portal
              </span>
            )}
          </div>

          {/* Right side - User info and actions */}
          <div className="flex-shrink-0 flex items-center gap-3 md:gap-4">
            <Link to="/messages" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
              <MessageCircle className="h-5 w-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C026D3] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile bottom nav ──────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#E8E1F2] z-50 flex justify-around py-2 px-1">
        {navItems.slice(0, 7).map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          const isMessages = item.path === "/messages";
          
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors relative ${
                active ? "text-[#6D28D9] bg-[#F5F0FF]" : "text-[#64748B]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              {isMessages && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C026D3] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/95 backdrop-blur-sm border-r border-[#E8E1F2] h-screen fixed left-0 top-16">
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            const isMessages = item.path === "/messages";

  return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                  active
                    ? "bg-[#F5F0FF] text-[#6D28D9]"
                    : "text-[#64748B] hover:bg-[#FDF2F8] hover:text-[#3B0764]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {isMessages && unreadCount > 0 && (
                  <span className="ml-auto bg-[#C026D3] text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E8E1F2] p-4 flex-shrink-0">
          <div className="mb-4 rounded-xl bg-[#F5F0FF] p-4">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-16 w-16 shrink-0 items-center justify-center text-[#6D28D9]">
                <img
                  src={userImage}
                  alt=""
                  aria-hidden="true"
                  className="h-16 w-16 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#111827]">
                  Need help?
                </p>
                <p className="mt-1 text-sm text-[#64748B]">
                  Our team is here for you.
                </p>
                <Link
                  to="/messages"
                  className="mt-3 inline-flex text-sm font-semibold text-[#6D28D9] hover:text-[#3B0764]"
                >
                  Contact Support <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="h-8 w-8 rounded-full bg-[#F5F0FF] flex items-center justify-center">
              <span className="text-xs font-medium text-[#6D28D9]">{user?.full_name?.[0] || "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Candidate"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#64748B] hover:text-[#3B0764] transition-colors w-full rounded-lg hover:bg-[#FDF2F8]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:min-h-screen pb-20 lg:pb-0 lg:ml-64 bg-[#F5F0FF]">
        <div className="mx-auto w-full max-w-[90rem] p-4 lg:p-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}