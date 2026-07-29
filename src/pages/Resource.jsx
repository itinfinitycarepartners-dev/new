// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  GraduationCap,
  Users,
  BookOpen,
  FileText,
  ExternalLink,
  Phone,
  Mail,
  Shield,
  Award,
  Clock,
  Heart,
  Briefcase,
  Calendar,
  CheckCircle2,
  MapPin,
  Globe,
  Book,
  Video,
  Headphones,
  Star,
  ChevronRight,
  Sparkles,
  Target,
  Lightbulb,
  UserCircle,
  Building2,
  Home,
  Car,
  Wallet,
  Stethoscope,
  Syringe,
  Pill,
  Activity,
  FileCheck,
  UserCheck,
  CalendarDays,
  GraduationCap as GradCap2,
  TrendingUp,
  BarChart,
  PieChart,
  BookMarked,
  Link2,
  Newspaper,
  ArrowRight,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://deploy-3or5.onrender.com';

// Tab configuration with colors and icons - Trainings removed
const tabs = [
  { 
    id: "licensure", 
    label: "Licensure", 
    icon: GraduationCap,
    color: "purple",
    description: "Licensing & Credentialing"
  },
  { 
    id: "lifecycles", 
    label: "Life Cycles", 
    icon: Calendar,
    color: "blue",
    description: "Relocation Journey"
  },
  { 
    id: "articles", 
    label: "Articles", 
    icon: Newspaper,
    color: "amber",
    description: "News & Updates"
  },
];

export default function Resource() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("licensure");
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Fetch user's destination from profile
  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile", user?.email],
    queryFn: () => base44.entities.CandidateProfile.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const profile = profiles[0];
  const destinationCity = profile?.destination_city || "your destination";
  const destinationState = profile?.destination_state || "";

  // Fetch articles from the news page
  useEffect(() => {
    if (activeTab === "articles") {
      fetchArticles();
    }
  }, [activeTab]);

  const fetchArticles = async () => {
    setLoadingArticles(true);
    try {
      // Try to fetch from an API endpoint if available
      const response = await fetch(`${API_BASE}/api/news/articles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      } else {
        // Fallback to static articles from the news page
        setArticles(getStaticArticles());
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
      // Fallback to static articles
      setArticles(getStaticArticles());
    } finally {
      setLoadingArticles(false);
    }
  };

  // Static articles from the news page
  const getStaticArticles = () => {
    return [
      {
        id: 1,
        title: "NCLEX Coaching & Preparation Program – Start Your U.S. Nursing Career",
        excerpt: "For many internationally trained nurses, the dream of working in the United States begins with years of education, clinical experience, and a passion for patient care.",
        category: "Education",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 2,
        title: "Introducing Deploymate: A Smarter Way to Navigate Global Healthcare Recruitment",
        excerpt: "At Infinity Care Partners, we've always believed that successful international recruitment doesn't stop at placement—it's about the full journey.",
        category: "Technology",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 3,
        title: "Are Skilled Nursing and Long-Term Care Facilities a Hidden Gem for International Nurses?",
        excerpt: "When most nurses dream about working in the United States, they picture large hospitals with busy emergency rooms or high-tech surgical units.",
        category: "Career",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 4,
        title: "Preventing International Nurse Burnout: What Healthcare Leaders Must Prioritize in 2025",
        excerpt: "International nurses are the backbone of today's global healthcare workforce. They cross oceans, leave families, and rebuild their lives.",
        category: "Wellness",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 5,
        title: "Infinity Care Partners Expands Global Reach with Nairobi Office to Meet Growing Healthcare Recruitment Needs",
        excerpt: "As the demand for skilled healthcare professionals continues to rise, Infinity Care Partners has taken a bold step forward in expanding its global presence.",
        category: "Company News",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 6,
        title: "Embracing Your First Winter in the U.S.: Tips for Staying Warm, Safe, and Joyful",
        excerpt: "For many international nurses and newcomers to the United States, experiencing a winter season for the first time can be both exciting and daunting.",
        category: "Lifestyle",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 7,
        title: "Why Dialysis Nursing is a Growing Field: Job Outlook for International Nurses in the US",
        excerpt: "As the global demand for skilled healthcare professionals continues to rise, dialysis nursing has emerged as a critical and fast-growing specialty.",
        category: "Career",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 8,
        title: "Celebrating Immigrant Heritage Month 2024: Honoring Diversity and Unity in the USA",
        excerpt: "June is here, and with it comes the celebration of Immigrant Heritage Month—a time to recognize and honor the diverse contributions of immigrants.",
        category: "Culture",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 9,
        title: "Navigating Mental Health as an International Nurse in America: Tips and Resources",
        excerpt: "As an international nurse embarking on a journey to work in the United States, the excitement of new opportunities can be overwhelming.",
        category: "Wellness",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      },
      {
        id: 10,
        title: "Demystifying the H1B Visa Process: A Comprehensive Guide",
        excerpt: "The H1B visa is a non-immigrant visa that allows U.S. employers to temporarily employ foreign workers in specialty occupations.",
        category: "Immigration",
        url: "https://www.infinitycarepartners.com/news-happenings/"
      }
    ];
  };

  // Content for each tab - Trainings section removed
  const content = {
    licensure: {
      icon: GraduationCap,
      color: "purple",
      title: "Nursing Licensure",
      subtitle: "Everything you need to know about licensing and credentialing",
      stats: [
        { label: "States", value: "50", icon: MapPin },
        { label: "Compact States", value: "39", icon: Globe },
        { label: "Avg. Processing", value: "4-6 weeks", icon: Clock },
      ],
      sections: [
        {
          title: "License Endorsement Process",
          icon: FileCheck,
          items: [
            "Complete nursing license endorsement with your SSN",
            "Submit official transcripts to state board of nursing",
            "Pass NCLEX-RN examination (if not already completed)",
            "Complete fingerprinting and background check",
            "Pay state licensing fees",
            "Receive temporary license (typically 2-4 weeks)",
            "Receive permanent license (typically 6-8 weeks)"
          ]
        },
        {
          title: "State Requirements",
          icon: Building2,
          items: [
            `${destinationState} Board of Nursing requirements`,
            "Continuing Education Units (CEU) requirements",
            "License renewal cycles and fees",
            "Compact state licensure information"
          ]
        },
        {
          title: "Helpful Resources",
          icon: Link2,
          links: [
            { name: `${destinationState} Board of Nursing`, url: `https://www.google.com/search?q=${encodeURIComponent(destinationState)}+Board+of+Nursing` },
            { name: "National Council of State Boards of Nursing (NCSBN)", url: "https://www.ncsbn.org" },
            { name: "NCLEX Registration & Results", url: "https://www.ncsbn.org/nclex.htm" },
            { name: "Nursing Licensure Compact (NLC)", url: "https://www.ncsbn.org/compacts/nlc.htm" },
            { name: "Find Fingerprinting Services Near You", url: `https://www.google.com/maps/search/fingerprinting+${encodeURIComponent(destinationCity)}+${encodeURIComponent(destinationState)}` }
          ]
        }
      ]
    },
    lifecycles: {
      icon: Calendar,
      color: "blue",
      title: "Life Cycles - Relocation Journey",
      subtitle: "Your complete guide to transitioning to the US",
      stats: [
        { label: "Phases", value: "4", icon: Target },
        { label: "Avg. Time", value: "6-12 months", icon: Clock },
        { label: "Steps", value: "15+", icon: CheckCircle2 },
      ],
      sections: [
        {
          title: "Pre-Arrival Phase",
          icon: CalendarDays,
          items: [
            "Complete visa processing and documentation",
            "Arrange housing and temporary accommodation",
            "Pack and prepare for international move",
            "Notify current employer and handle resignation",
            "Arrange for dependent school enrollment (if applicable)",
            "Set up international phone plan"
          ]
        },
        {
          title: "Arrival & First Week",
          icon: Home,
          items: [
            "Clear customs and immigration at Port of Entry",
            "Travel to final destination",
            "Check into housing",
            "Apply for Social Security Number (SSN)",
            "Open a bank account",
            "Get a local phone number",
            "Register with local transportation"
          ]
        },
        {
          title: "First Month",
          icon: UserCheck,
          items: [
            "Complete employer onboarding and HR paperwork",
            "Complete nursing license endorsement",
            "Set up utilities (electricity, water, internet)",
            "Find a primary care physician",
            "Register children in school",
            "Get a driver's license (if needed)",
            "Build credit history"
          ]
        },
        {
          title: "Long-term Integration",
          icon: TrendingUp,
          items: [
            "Understand US tax system",
            "Plan for retirement (401k, IRA)",
            "Path to permanent residency (Green Card)",
            "Path to US citizenship",
            "Buying a home",
            "Investing and financial planning"
          ]
        },
        {
          title: "Useful Resources",
          icon: BookMarked,
          links: [
            { name: "Apply for SSN", url: "https://www.ssa.gov/ssnumber" },
            { name: "Find Local DMV", url: `https://www.google.com/maps/search/DMV+${encodeURIComponent(destinationCity)}+${encodeURIComponent(destinationState)}` },
            { name: "School Enrollment Information", url: `https://www.google.com/search?q=school+enrollment+${encodeURIComponent(destinationCity)}+${encodeURIComponent(destinationState)}` },
            { name: "USCIS - Green Card Information", url: "https://www.uscis.gov/greencard" }
          ]
        }
      ]
    },
    articles: {
      icon: Newspaper,
      color: "amber",
      title: "News & Happenings",
      subtitle: "Stay informed with the latest news and updates from Infinity Care Partners",
      stats: [
        { label: "Articles", value: articles.length.toString(), icon: Book },
        { label: "Categories", value: "8", icon: Tag },
        { label: "Updated", value: "Monthly", icon: Clock },
      ]
    }
  };

  const currentContent = content[activeTab];
  const currentTab = tabs.find(t => t.id === activeTab);

  const getColorClasses = (color) => {
    const colors = {
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        light: "bg-purple-100",
        gradient: "from-purple-50 to-purple-100",
        icon: "text-purple-600",
        badge: "bg-purple-100 text-purple-700",
        hover: "hover:bg-purple-50",
        ring: "ring-purple-500",
        primary: "bg-purple-600 hover:bg-purple-700",
      },
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        light: "bg-blue-100",
        gradient: "from-blue-50 to-blue-100",
        icon: "text-blue-600",
        badge: "bg-blue-100 text-blue-700",
        hover: "hover:bg-blue-50",
        ring: "ring-blue-500",
        primary: "bg-blue-600 hover:bg-blue-700",
      },
      emerald: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        light: "bg-emerald-100",
        gradient: "from-emerald-50 to-emerald-100",
        icon: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-700",
        hover: "hover:bg-emerald-50",
        ring: "ring-emerald-500",
        primary: "bg-emerald-600 hover:bg-emerald-700",
      },
      amber: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        light: "bg-amber-100",
        gradient: "from-amber-50 to-amber-100",
        icon: "text-amber-600",
        badge: "bg-amber-100 text-amber-700",
        hover: "hover:bg-amber-50",
        ring: "ring-amber-500",
        primary: "bg-amber-600 hover:bg-amber-700",
      },
    };
    return colors[color] || colors.purple;
  };

  const colorClasses = getColorClasses(currentTab?.color || "purple");

  // Render articles content
  const renderArticlesContent = () => {
    if (loadingArticles) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="ml-3 text-amber-600">Loading articles...</span>
        </div>
      );
    }

    if (articles.length === 0) {
      return (
        <div className="text-center py-12">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No articles available at the moment.</p>
          <a 
            href="https://www.infinitycarepartners.com/news-happenings/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-amber-600 hover:text-amber-700 font-medium"
          >
            Visit News Page <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {articles.length} articles
          </p>
          <a 
            href="https://www.infinitycarepartners.com/news-happenings/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            View All News <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-4">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700`}>
                        {article.category || "General"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg group-hover:text-amber-600 transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 group-hover:text-amber-700">
                      <span>Read more</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="flex-shrink-0 p-2 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                    <ExternalLink className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a 
            href="https://www.infinitycarepartners.com/news-happenings/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
          >
            <Newspaper className="h-5 w-5" />
            Visit Full News Page
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resource Center</h1>
        <p className="text-sm text-muted-foreground">
          Resources for your nursing journey in {destinationCity}, {destinationState}
        </p>
      </div>

      {/* Tabs with improved styling */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-wrap border-b border-border bg-slate-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const tabColors = getColorClasses(tab.color);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all ${
                  isActive
                    ? `${tabColors.bg} ${tabColors.text} border-b-2 border-current shadow-sm`
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tabColors.icon : ""}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tabColors.badge}`}>
                    {tab.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "articles" ? (
            // Articles tab with news content
            <div>
              {/* Header with stats */}
              <div className={`mb-6 p-5 rounded-xl ${colorClasses.bg} border ${colorClasses.border}`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses.light}`}>
                        <Newspaper className={`h-6 w-6 ${colorClasses.icon}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{currentContent.title}</h2>
                        <p className="text-sm text-muted-foreground">{currentContent.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {currentContent.stats?.map((stat, idx) => (
                      <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border ${colorClasses.border}`}>
                        <stat.icon className={`h-4 w-4 ${colorClasses.icon}`} />
                        <div>
                          <div className="text-lg font-bold">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Articles List */}
              {renderArticlesContent()}
            </div>
          ) : (
            // Other tabs content (Licensure & Life Cycles)
            <>
              {/* Header with stats */}
              <div className={`mb-6 p-5 rounded-xl ${colorClasses.bg} border ${colorClasses.border}`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses.light}`}>
                        {currentContent.icon && <currentContent.icon className={`h-6 w-6 ${colorClasses.icon}`} />}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{currentContent.title}</h2>
                        <p className="text-sm text-muted-foreground">{currentContent.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {currentContent.stats?.map((stat, idx) => (
                      <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border ${colorClasses.border}`}>
                        <stat.icon className={`h-4 w-4 ${colorClasses.icon}`} />
                        <div>
                          <div className="text-lg font-bold">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="grid gap-4">
                {currentContent.sections.map((section, idx) => {
                  const SectionIcon = section.icon;
                  return (
                    <div key={idx} className={`group rounded-xl border ${colorClasses.border} ${colorClasses.hover} transition-all hover:shadow-md`}>
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          {SectionIcon && (
                            <div className={`p-2 rounded-lg ${colorClasses.light}`}>
                              <SectionIcon className={`h-5 w-5 ${colorClasses.icon}`} />
                            </div>
                          )}
                          <h3 className="font-semibold text-lg">{section.title}</h3>
                          <div className={`ml-auto px-2 py-0.5 rounded-full text-xs ${colorClasses.badge}`}>
                            {section.items?.length || section.articles?.length || section.links?.length} items
                          </div>
                        </div>

                        {section.items && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {section.items.map((item, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors">
                                <CheckCircle2 className={`h-4 w-4 ${colorClasses.icon} flex-shrink-0 mt-0.5`} />
                                <span className="text-sm text-muted-foreground">{item}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {section.articles && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {section.articles.map((article, i) => (
                              <a
                                key={i}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-lg ${colorClasses.hover} transition-colors text-sm group`}
                              >
                                <FileText className={`h-4 w-4 ${colorClasses.icon}`} />
                                <span className="text-foreground group-hover:text-primary transition-colors">{article.title}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors ml-auto flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}

                        {section.links && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {section.links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-lg ${colorClasses.hover} transition-colors text-sm group`}
                              >
                                <Link2 className={`h-4 w-4 ${colorClasses.icon}`} />
                                <span className="text-foreground group-hover:text-primary transition-colors">{link.name}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors ml-auto flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Support Section */}
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  Need Help? We're Here for You
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Contact our support team for any assistance with your relocation journey
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="tel:6158815321" 
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-amber-200"
                >
                  <Phone className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">615-881-5321</span>
                </a>
                <a 
                  href="mailto:customerservice@infinitycarepartners.com" 
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-amber-200"
                >
                  <Mail className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Email Support</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}