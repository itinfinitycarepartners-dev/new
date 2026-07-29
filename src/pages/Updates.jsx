// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Bell, CheckCircle, Edit, Info, PlaneLanding, Loader2, RefreshCw } from "lucide-react";
import { tokenStorage } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Track ALL fields returned from the backend's getUserComprehensiveDetails function
const FIELD_LABELS = { 
  // Personal & Contact Info
  firstName: "First Name",
  lastName: "Last Name",
  prefferedName: "Preferred Name",
  dateOfBirth: "Date of Birth",
  email: "Email",
  altEmail: "Alternate Email",
  phone: "Phone Number",
  usaddress: "US Mailing Address",
  
  // Professional & Application Info
  applicationStatus: "Application Status",
  professionalSpecialty: "Professional Specialty",
  Education: "Education",
  orderNumber: "Order Number",
  interviewDate: "Interview Date",
  interviewLocation: "Interview Location",
  hospitalName: "Hospital Name",
  initialICPAssessment: "Initial ICP Assessment",
  reliasEnrolledDate: "Relias Enrolled Date",
  reliasExtension: "Relias Extension",

  // Concierge & Relocation
  conciergeName: "Concierge Name",
  conciergePhone: "Concierge Phone",
  conciergeEmail: "Concierge Email",
  conciergePictures: "Concierge Pictures",
  concierge_assigned: "Concierge Assigned",
  client_meet_and_greet: "Client Meet and Greet",
  welcome_packet_emailed: "Welcome Packet Emailed",
  welcomeAppointments: "Welcome Appointments",
  hotel_booked: "Hotel Booked",
  
  // Flights & Travel
  Flight_Booked_Emailed: "Flight Booked/Emailed",
  RN_Flight_Cost: "RN Flight Cost",
  Dependent_Flight_Cost: "Dependent(s) Flight Cost",
  flightConfirmation: "Flight Confirmation",
  primaryairline: "Primary Airline",
  confirmationnumbers: "Confirmation Numbers",
  primaryairlinetrack: "Flight Status Tracker",
  departcity: "Departure City",
  initial_departure_time: "Initial Departure Time",
  scheduleddeparturedate: "Departure Date",
  layover1location: "Layover 1 Location",
  layover2location: "Layover 2 Location",
  layover3location: "Layover 3 Location",
  entryport: "Port of Entry in US",
  scheduledarrivaldate: "Arrival Date",
  final_destination_arrival: "Final Destination Arrival",
  finalflightairline: "Final Flight Airline",
  finalflightnumber: "Final Flight Number",
  fligtnumber1: "Flight Number 1",
  fligtnumber2: "Flight Number 2",
  fligtnumber3: "Flight Number 3",
  fligtnumber4: "Flight Number 4",

  // Attachments
  flightConfirmationAttachmentId: "Flight Confirmation Document",
  welcomeAppointmentsAttachmentId: "Welcome Appointments Document",
  educationAttachmentId: "Education Document",
  conciergeBiographyAttachmentId: "Concierge Biography Document"
};

const normalizeValue = (val) => { 
  if (val === undefined || val === null) return ""; 
  if (typeof val === "object") { 
    if (val.name) return val.name; 
    if (val.id) return String(val.id); 
    return JSON.stringify(val); 
  } 
  return String(val).trim(); 
};

const isEmpty = (v) => !v || v === "—" || v === "";

export default function Updates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef(null);
  const lastDataRef = useRef(null);

  // Function to fetch and compare data
  const fetchAndCompareData = useCallback(async (showToast = false) => {
    try {
      const token = tokenStorage.get();
      if (!token) {
        setLoading(false);
        return;
      }

      const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://deploy-3or5.onrender.com';
      const res = await fetch(`${BASE_URL}/api/zoho/my-deals`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const json = await res.json();
      
      if (!json.success || !json.data) {
        return;
      }
      
      const currentData = json.data;
      
      // If we have previous data to compare
      if (lastDataRef.current) {
        const previousData = lastDataRef.current;
        const newUpdates = [];
        
        for (const [field, label] of Object.entries(FIELD_LABELS)) {
          const newVal = normalizeValue(currentData[field]);
          const oldVal = normalizeValue(previousData[field]);

          if (newVal === oldVal) continue;

          const dateStr = new Date().toISOString();

          // Custom arrival notification
          if (field === "final_destination_arrival" && isEmpty(oldVal) && !isEmpty(newVal)) {
            const update = { 
              id: Date.now() + Math.random(), 
              type: 'arrival', 
              title: "Arrival Confirmed", 
              text: `🛬 You have arrived! Portal access active for 48 hours.`, 
              date: dateStr 
            };
            newUpdates.unshift(update);
            if (showToast) toast.success("Arrival confirmed!");
            continue;
          }

          // Standard field notifications
          if (isEmpty(oldVal) && !isEmpty(newVal)) {
            const update = { 
              id: Date.now() + Math.random(), 
              type: 'add', 
              title: `${label} Added`, 
              text: `${newVal}`, 
              date: dateStr 
            };
            newUpdates.unshift(update);
            if (showToast) toast.info(`${label} added`);
          } else if (!isEmpty(oldVal) && isEmpty(newVal)) {
            const update = { 
              id: Date.now() + Math.random(), 
              type: 'clear', 
              title: `${label} Cleared`, 
              text: `This field has been removed.`, 
              date: dateStr 
            };
            newUpdates.unshift(update);
            if (showToast) toast.warning(`${label} removed`);
          } else if (!isEmpty(oldVal) && !isEmpty(newVal)) {
            const update = { 
              id: Date.now() + Math.random(), 
              type: 'edit', 
              title: `${label} Updated`, 
              text: `Changed from "${oldVal}" to "${newVal}"`, 
              date: dateStr 
            };
            newUpdates.unshift(update);
            if (showToast) toast.info(`${label} updated`);
          }
        }
        
        if (newUpdates.length > 0) {
          // Add new updates to the top of the list
          setUpdates(prev => [...newUpdates, ...prev].slice(0, 100));
          
          // Save to localStorage
          const storedUpdates = JSON.parse(localStorage.getItem("deploymate_updates") || "[]");
          const combinedUpdates = [...newUpdates, ...storedUpdates].slice(0, 100);
          localStorage.setItem("deploymate_updates", JSON.stringify(combinedUpdates));
          
          // Play a sound notification (optional - you can add a beep)
          // new Audio('/notification.mp3').play().catch(e => console.log('Audio not supported'));
        }
      }
      
      // Update the stored data
      lastDataRef.current = currentData;
      localStorage.setItem("deploymate_snapshot", JSON.stringify(currentData));
      
    } catch (error) {
      console.error("Failed to fetch updates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and setup polling
  useEffect(() => {
    // Load existing updates from localStorage
    const storedUpdates = JSON.parse(localStorage.getItem("deploymate_updates") || "[]");
    const storedSnapshot = JSON.parse(localStorage.getItem("deploymate_snapshot") || "null");
    
    if (storedUpdates.length > 0) {
      setUpdates(storedUpdates);
    }
    
    if (storedSnapshot) {
      lastDataRef.current = storedSnapshot;
    }
    
    // Initial fetch
    fetchAndCompareData();
    
    // Set up polling every 5 seconds for real-time updates
    if (isPolling) {
      pollingIntervalRef.current = setInterval(() => {
        fetchAndCompareData(true);
      }, 5000); // Check every 5 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchAndCompareData, isPolling]);

  // Manual refresh function
  const handleManualRefresh = () => {
    setLoading(true);
    fetchAndCompareData(true);
    setTimeout(() => setLoading(false), 1000);
    toast.success("Checking for updates...");
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString("en-US", { 
        month: "short", day: "numeric", year: "numeric"
      });
    } catch (e) {
      return "Just now";
    }
  };

  const getUpdateIcon = (type) => {
    switch (type) {
      case 'arrival': return <PlaneLanding className="h-5 w-5 text-blue-500" />;
      case 'add': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'edit': return <Edit className="h-5 w-5 text-amber-500" />;
      case 'clear': return <Info className="h-5 w-5 text-gray-400" />;
      default: return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          <p className="text-sm text-muted-foreground">
            Real-time notifications and changes to your profile
            <span className="inline-flex items-center ml-2 text-xs text-green-600">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </span>
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleManualRefresh}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {loading && updates.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="font-medium text-lg">No updates yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Updates will appear here in real-time when your profile changes in the database.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            The page automatically checks for changes every 5 seconds
          </p>
          <p className="text-sm text-primary mt-6 font-medium bg-primary/5 inline-block px-4 py-2 rounded-full">
            📞 615-881-5321 &nbsp;|&nbsp; ✉️ customerservice@infinitycarepartners.com
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update, index) => (
            <div 
              key={update.id} 
              className={`bg-card flex items-start gap-4 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                index === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="bg-muted/50 p-2 rounded-full mt-1">
                {getUpdateIcon(update.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-sm">{update.title}</h3>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(update.date)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {update.text}
                </p>
              </div>
            </div>
          ))}
          
          <div className="pt-6 text-center">
            
          </div>
        </div>
      )}
    </div>
  );
}