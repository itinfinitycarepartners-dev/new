// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Plane,
  MapPin,
  Clock,
  Phone,
  Mail,
  User,
  Calendar,
  Luggage,
  CheckCircle2,
  FileText,
  Building2,
  Briefcase,
  GraduationCap,
  Landmark,
  Shield,
  AlertCircle,
  ClipboardList
} from "lucide-react";
import moment from "moment";
import { useState, useEffect } from "react";

export default function WelcomePacket() {
  const { user, isAuthenticated } = useAuth();

  const [dealsData, setDealsData] = useState(null);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [socialSecurityInfo, setSocialSecurityInfo] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Fetch profile data
  const { data: profiles = [], isLoading: profileLoading } = useQuery({
    queryKey: ["candidateProfile", user?.email],
    queryFn: () => base44.entities.CandidateProfile.filter({ email: user?.email }),
    enabled: !!user?.email && isAuthenticated,
  });

  // Fetch deals data using direct fetch
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const token = localStorage.getItem("icp_auth_token");

        if (!token) {
          setDealsLoading(false);
          return;
        }

        const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://deploy-3or5.onrender.com';

        const response = await fetch(`${BASE_URL}/api/zoho/my-deals`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const json = await response.json();

        if (json.success && json.data) {
          setDealsData(json.data);
        } else {
          setError("No data received");
        }
      } catch (error) {
        console.error("Error fetching deals:", error);
        setError(error.message);
      } finally {
        setDealsLoading(false);
      }
    };

    if (user?.email && isAuthenticated) {
      fetchDeals();
    } else {
      setDealsLoading(false);
    }
  }, [user?.email, isAuthenticated]);

  // Smart location-based bank and social security finder
  useEffect(() => {
    const findNearbyLocations = async () => {
      if (!dealsData) return;
      const city = dealsData?.destination_city || dealsData?.entryport || "Nashville";
      const state = dealsData?.destination_state || "TN";
      const queryCity = city.split(',')[0].trim();
      
      setLoadingLocation(true);
      try {
        setBankInfo({
          name: `${queryCity} Area Banks`,
          address: `${queryCity}, ${state}`,
          phone: "Check local listings",
          searchUrl: `https://www.google.com/maps/search/banks+${encodeURIComponent(queryCity)}+${encodeURIComponent(state)}`
        });
        
        setSocialSecurityInfo({
          address: `Social Security Administration - ${queryCity} Office`,
          phone: "1-800-772-1213",
          website: "https://www.ssa.gov",
          searchUrl: `https://www.google.com/maps/search/social+security+office+${encodeURIComponent(queryCity)}+${encodeURIComponent(state)}`,
          process: "1. Call to schedule an appointment\n2. Bring your passport and visa documents\n3. Complete the SS-5 application form\n4. Receive your SSN card within 2-4 weeks"
        });
      } catch (err) {
        console.error("Error finding locations:", err);
      } finally {
        setLoadingLocation(false);
      }
    };
    
    if (dealsData) {
      findNearbyLocations();
    }
  }, [dealsData]);

  const profile = profiles?.[0];
  const deal = dealsData || {};
  const isLoading = profileLoading || dealsLoading;

  // Helper function to format datetime
  const formatDateTime = (datetime) => {
    if (!datetime || datetime === '—' || datetime === '') return null;
    if (typeof datetime === 'object') return null;
    try {
      const parsed = moment(datetime);
      if (parsed.isValid()) {
        return parsed.format("MMM D, YYYY [at] h:mm A");
      }
      return datetime;
    } catch (e) {
      return datetime;
    }
  };

  // Helper to safely convert any value to string
  const safeString = (value, fallback = "") => {
    if (value === undefined || value === null || value === "—" || value === "") return fallback;
    if (typeof value === 'object') {
      if (value.name) return value.name;
      if (value.id) return value.id;
      return fallback;
    }
    return String(value);
  };

  // ─── Plan Your Travel fields ─────────────────────────────────────────────
  const departureDate = formatDateTime(deal?.scheduleddeparturedate) || "";
  const departureAirport = safeString(deal?.departure_airport || deal?.departureAirport || deal?.departcity, "");
  const layoverLocation = safeString(deal?.layover1location);
  const portOfEntry = safeString(deal?.entryport, "");
  const arrivalDate = formatDateTime(deal?.scheduledarrivaldate) || "";
  const arrivalAirport = safeString(deal?.arrival_airport || deal?.arrivalAirport || deal?.entryport, "");
  const totalInParty = safeString(deal?.total_in_party || deal?.totalParty, "");
  const agesOfChildren = safeString(deal?.ages_of_children || deal?.childrenAges, "");
  const conciergeName = safeString(deal?.conciergeName, "") || safeString(deal?.Concierge_Name, "");
  const totalBagCount = safeString(deal?.total_bag_count || deal?.bagCount, "");
  const conciergePhone = safeString(deal?.conciergePhone, "") || safeString(deal?.Concierge_Phone, "");

  // ─── Employer Information (from database) ────────────────────────────────
  const employerName = safeString(deal?.hospitalName || deal?.employer_name, "");
  const employerAddress = safeString(deal?.usaddress || deal?.employer_address, "");
  const employerContact = safeString(deal?.employer_contact || deal?.hospital_contact, "");
  const employerPhone = safeString(deal?.employer_phone || deal?.hospital_phone, "");
  const employerEmail = safeString(deal?.employer_email || deal?.hospital_email, "");
  const employerWebsite = safeString(deal?.employer_website || deal?.hospital_website, "");
  const uniformRequirement = safeString(deal?.uniform_requirement, "Business professional attire. Specific uniform details provided upon arrival.");

  // ─── License Information ────────────────────────────────────────────────
  const licenseState = safeString(deal?.license_state || deal?.licenseState, "");
  const boardOfNursing = safeString(deal?.board_of_nursing || deal?.boardOfNursing, "");
  const boardAddress = safeString(deal?.board_address, "");
  const boardPhone = safeString(deal?.board_phone, "");

  const destinationCity = safeString(deal?.destination_city || deal?.entryport, "your destination");
  const destinationState = safeString(deal?.destination_state, "");

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">Error loading data: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome Packet</h1>
        <p className="text-sm text-muted-foreground">Your deployment itinerary and welcome information</p>
      </div>

      {/* Plan Your Travel Table - 2 Column Layout */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Plan Your Travel</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Column */}
          <div className="divide-y divide-border">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Departure Date:</span>
              </div>
              <p className="text-sm">{departureDate || "Not scheduled"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Layover Location:</span>
              </div>
              <p className="text-sm">{layoverLocation || "None"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Arrival Date:</span>
              </div>
              <p className="text-sm">{arrivalDate || "Not scheduled"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Total in Party:</span>
              </div>
              <p className="text-sm">{totalInParty || "1"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Concierge Name:</span>
              </div>
              <p className="text-sm">{conciergeName || "Not assigned"}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="divide-y divide-border">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Departure Airport:</span>
              </div>
              <p className="text-sm">{departureAirport || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Port of Entry:</span>
              </div>
              <p className="text-sm">{portOfEntry || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Arrival Airport:</span>
              </div>
              <p className="text-sm">{arrivalAirport || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Ages of Children:</span>
              </div>
              <p className="text-sm">{agesOfChildren || "None"}</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Luggage className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Total Bag Count:</span>
                  </div>
                  <p className="text-sm">{totalBagCount || "Not specified"}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Concierge Phone:</span>
                </div>
                {conciergePhone ? (
                  <a href={`tel:${conciergePhone}`} className="text-sm text-primary hover:underline block mt-1">
                    {conciergePhone}
                  </a>
                ) : (
                  <p className="text-sm mt-1">Not available</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Important Note */}
        <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
          <p className="text-sm text-amber-700 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            Please remember to turn in your VISA Packet to Customs or Border Control at Port of Entry
          </p>
        </div>
      </div>

      {/* Work Expectations & Tasks */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Work Expectations</h2>
            </div>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>You have been issued an EB-3 VISA which allows employment to begin as soon as possible. <strong>Coordinate with your employer prior to any travel outside of your employer's city.</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>Teamwork makes the dream work! – <strong>Integrate, learn, and ask questions.</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>Questions are encouraged, welcomed, and expected from your new team.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Tasks Post Arrival</h2>
            </div>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span><strong>Employer Tasks:</strong> Drug Test, Background Check, Online Job Offer</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span><strong>Infinity Care Partners Tasks:</strong> Email copy of SSN and Green Card and send physical card via USPS</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span><strong>Nurse Tasks:</strong> Complete nursing license endorsement with SSN, Fill out HR Packet / Schedule Trainings</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Employer Information - From Database */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Employer Information</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="divide-y divide-border">
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Employer Name:</span>
              <p className="text-sm">{employerName || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Address:</span>
              <p className="text-sm">{employerAddress || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Contact:</span>
              <p className="text-sm">{employerContact || "Not specified"}</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Phone:</span>
              <p className="text-sm">{employerPhone ? (
                <a href={`tel:${employerPhone}`} className="text-primary hover:underline">{employerPhone}</a>
              ) : "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Email:</span>
              <p className="text-sm">{employerEmail ? (
                <a href={`mailto:${employerEmail}`} className="text-primary hover:underline">{employerEmail}</a>
              ) : "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Website:</span>
              <p className="text-sm">{employerWebsite ? (
                <a href={employerWebsite.startsWith('http') ? employerWebsite : `https://${employerWebsite}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {employerWebsite}
                </a>
              ) : "Not specified"}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border">
          <span className="font-medium text-sm block mb-1">Uniform Requirement:</span>
          <p className="text-sm">{uniformRequirement}</p>
        </div>
      </div>

      {/* License Information */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">License</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="divide-y divide-border">
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">State of License Required:</span>
              <p className="text-sm">{licenseState || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Board of Nursing:</span>
              <p className="text-sm">{boardOfNursing || "Not specified"}</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Address:</span>
              <p className="text-sm">{boardAddress || "Not specified"}</p>
            </div>
            <div className="px-6 py-4">
              <span className="font-medium text-sm block mb-1">Phone:</span>
              <p className="text-sm">{boardPhone ? (
                <a href={`tel:${boardPhone}`} className="text-primary hover:underline">{boardPhone}</a>
              ) : "Not specified"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Local Bank Branch - Smart Location Based */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Your Local Bank Branch</h2>
          </div>
        </div>
        {loadingLocation ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Banks near {destinationCity}, {destinationState}
            </p>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-sm block mb-1">Name:</span>
                <p className="text-sm">{bankInfo?.name || `Banks in ${destinationCity}`}</p>
              </div>
              <div>
                <span className="font-medium text-sm block mb-1">Address:</span>
                <p className="text-sm">{bankInfo?.address || `${destinationCity}, ${destinationState}`}</p>
              </div>
              <div>
                <span className="font-medium text-sm block mb-1">Phone:</span>
                <p className="text-sm">{bankInfo?.phone || "Check local listings"}</p>
              </div>
              <div className="pt-2">
                <a 
                  href={bankInfo?.searchUrl || `https://www.google.com/maps/search/banks+${encodeURIComponent(destinationCity)}+${encodeURIComponent(destinationState)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  Find Banks Near {destinationCity} →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Your Local Social Security Branch - Smart Location Based */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Your Local Social Security Branch</h2>
          </div>
        </div>
        {loadingLocation ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-sm block mb-1">Address:</span>
                <p className="text-sm">{socialSecurityInfo?.address || `Social Security Administration - ${destinationCity} Office`}</p>
              </div>
              <div>
                <span className="font-medium text-sm block mb-1">Phone:</span>
                <p className="text-sm">
                  <a href="tel:18007721213" className="text-primary hover:underline">1-800-772-1213</a>
                </p>
              </div>
              <div className="pt-2">
                <a 
                  href={socialSecurityInfo?.searchUrl || `https://www.google.com/maps/search/social+security+office+${encodeURIComponent(destinationCity)}+${encodeURIComponent(destinationState)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  Find SSA Office Near {destinationCity} →
                </a>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <span className="font-medium text-sm block mb-2">Process:</span>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">1. Call to schedule an appointment</li>
                  <li className="flex items-start gap-2">2. Bring your passport and visa documents</li>
                  <li className="flex items-start gap-2">3. Complete the SS-5 application form</li>
                  <li className="flex items-start gap-2">4. Receive your SSN card within 2-4 weeks</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}