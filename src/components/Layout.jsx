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
  ArrowLeft
} from "lucide-react";
import { useState, useEffect } from "react";
import { messaging, websocket, tokenStorage } from "@/api/icpClient";
// Import the image
import logoImage from "./logo.jpg";

// Define all possible nav items with a condition for licensure
const getNavItems = (licensureUrl) => {
  const items = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/profile", label: "My Profile", icon: User },
    { path: "/documents", label: "Document Library", icon: FileText },
    { path: "/pipeline?form=hub", label: "Forms", icon: ClipboardList },
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
      <header className="sticky top-0 z-50 w-full shadow-sm" style={{ background: '#81348d' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          
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
                  alt="Infinity Care Partners" 
                  className="h-10 w-auto max-w-[150px] object-contain block"
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
                Infinity Care Partners
              </span>
            )}
          </div>

          {/* Right side - User info and actions */}
          <div className="flex-shrink-0 flex items-center gap-3 md:gap-4">
            <Link to="/messages" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
              <MessageCircle className="h-5 w-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around py-2 px-1">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          const isMessages = item.path === "/messages";
          
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors relative ${
                active ? "text-[#6a8fcc]" : "text-gray-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              {isMessages && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200 h-screen fixed left-0 top-14">
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                    ? "bg-[#6a8fcc]/10 text-[#6a8fcc]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {isMessages && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="h-8 w-8 rounded-full bg-[#6a8fcc]/10 flex items-center justify-center">
              <span className="text-xs font-medium text-[#6a8fcc]">{user?.full_name?.[0] || "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Candidate"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full rounded-lg hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:min-h-screen pb-20 lg:pb-0 lg:ml-64 bg-gray-50">
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}