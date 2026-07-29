// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { MapPin, Cloud, ExternalLink, Building2, GraduationCap, ShoppingBag, Heart, Bus, Utensils, Loader2, Wifi, Info, Plane, Calendar, Phone, Mail, Thermometer, Wind } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const resourceCategories = [
  { icon: Building2, label: "Housing", query: "apartments for rent" },
  { icon: ShoppingBag, label: "Shopping", query: "grocery stores" },
  { icon: Heart, label: "Healthcare", query: "hospitals and clinics" },
  { icon: Bus, label: "Transit", query: "public transportation" },
  { icon: GraduationCap, label: "Education", query: "schools and libraries" },
  { icon: Utensils, label: "Dining", query: "restaurants" },
];

// Smart API functions to fetch additional city information
const fetchWikipediaInfo = async (cityName, stateName) => {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cityName + " " + stateName + " city")}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (searchData.query.search.length === 0) return null;
    
    const pageId = searchData.query.search[0].pageid;
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts|coordinates|pageimages|info&exintro=1&explaintext=1&format=json&origin=*`;
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();
    
    const page = contentData.query.pages[pageId];
    
    return {
      description: page.extract?.substring(0, 800) || null,
      coordinates: page.coordinates?.[0],
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      title: page.title,
      fullExtract: page.extract
    };
  } catch (err) {
    console.error("Wikipedia API error:", err);
    return null;
  }
};

const fetchGeocodingInfo = async (cityName, stateName) => {
  try {
    // Strip out airport codes if the string looks like "JFK - New York" to help the Geocoding API
    let cleanCityName = cityName.replace(/^[A-Z]{3}\s*-\s*/i, '').trim();
    let query = stateName ? `${cleanCityName}, ${stateName}` : cleanCityName;
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data && data[0]) {
      const address = data[0].address;
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        city: address.city || address.town || address.village || cleanCityName,
        state: address.state || stateName || ""
      };
    }
    return null;
  } catch (err) {
    console.error("Geocoding API error:", err);
    return null;
  }
};

const fetchWeather = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.current_weather) {
      return {
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        winddirection: data.current_weather.winddirection
      };
    }
    return null;
  } catch (err) {
    console.error("Weather API error:", err);
    return null;
  }
};

// USA General Information Component
function USAGeneralInfo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relocation Hub</h1>
        <p className="text-sm text-muted-foreground">General Information about the United States</p>
      </div>

      {/* USA Overview */}
      <div className="bg-gradient-to-r from-primary/10 via-accent to-primary/5 rounded-2xl p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Welcome to the United States</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          The United States of America is a diverse and vast country offering countless opportunities for newcomers. 
          From bustling cities to serene landscapes, the US is a land of possibilities with a rich cultural tapestry 
          and a welcoming spirit for international professionals.
        </p>
      </div>

      {/* Quick Facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Plane className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">50 States</p>
          <p className="text-xs text-muted-foreground">Diverse geography and culture</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">4 Seasons</p>
          <p className="text-xs text-muted-foreground">Varied climate across regions</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Phone className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">+1 Country Code</p>
          <p className="text-xs text-muted-foreground">International dialing</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Mail className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">USPS</p>
          <p className="text-xs text-muted-foreground">Postal service nationwide</p>
        </div>
      </div>

      {/* Regions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-4">Major Regions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-4">
            <p className="font-medium text-sm">Northeast</p>
            <p className="text-xs text-muted-foreground">New York, Boston, Philadelphia</p>
            <p className="text-xs text-muted-foreground mt-1">Historic cities, financial centers</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="font-medium text-sm">South</p>
            <p className="text-xs text-muted-foreground">Atlanta, Miami, Dallas</p>
            <p className="text-xs text-muted-foreground mt-1">Warm climate, growing economies</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="font-medium text-sm">Midwest</p>
            <p className="text-xs text-muted-foreground">Chicago, Detroit, Minneapolis</p>
            <p className="text-xs text-muted-foreground mt-1">Industrial heartland, great lakes</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="font-medium text-sm">West</p>
            <p className="text-xs text-muted-foreground">Los Angeles, Seattle, Denver</p>
            <p className="text-xs text-muted-foreground mt-1">Tech hubs, diverse landscapes</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <p className="font-medium text-sm">Southwest</p>
            <p className="text-xs text-muted-foreground">Phoenix, Las Vegas, Albuquerque</p>
            <p className="text-xs text-muted-foreground mt-1">Desert climate, tourism centers</p>
          </div>
        </div>
      </div>

      {/* National Resources */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-4">National Resources</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {resourceCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.label}
                href={`https://www.google.com/search?q=${encodeURIComponent(cat.query + " in USA")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">Find {cat.label.toLowerCase()} resources</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            );
          })}
        </div>
        
        {/* Helpful US Links */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-sm font-medium mb-2">Essential US Resources</p>
          <a href="https://www.usa.gov/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            USA.gov - Official Government Website
          </a>
          <a href="https://www.visa.gov/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            US Visa & Immigration Information
          </a>
          <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            National Weather Service
          </a>
          <a href="https://www.nps.gov/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            National Parks & Recreation
          </a>
        </div>
      </div>

      {/* Did You Know? - US Facts */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-3">Did You Know About the US?</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm">
            <span className="text-primary mt-0.5">•</span>
            <span className="text-muted-foreground">The US has 50 states, each with its own government, culture, and attractions.</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <span className="text-primary mt-0.5">•</span>
            <span className="text-muted-foreground">The healthcare system varies by state, with both public and private options available.</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <span className="text-primary mt-0.5">•</span>
            <span className="text-muted-foreground">International professionals are welcomed in many sectors, including healthcare, technology, and education.</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <span className="text-primary mt-0.5">•</span>
            <span className="text-muted-foreground">Each state has unique laws, tax rates, and cost of living considerations.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function RelocationHub() {
  const { user, candidateData } = useAuth(); // Fallback to candidateData from AuthContext if Tanstack fails
  const [cityInfo, setCityInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile", user?.email],
    queryFn: () => base44.entities.CandidateProfile.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  // Extract the profile intelligently, falling back to auth context if needed
  const profile = profiles[0] || candidateData || user;

  // Helper to discard em-dash and empty spaces returned by the CRM
  const getValidField = (fieldValue) => {
    if (!fieldValue) return "";
    const cleanStr = String(fieldValue).trim();
    if (cleanStr === "—" || cleanStr === "-" || cleanStr === "") return "";
    return cleanStr;
  };

  // Prioritize "Port of Entry", fallback to "Destination City" or "Hired Location"
  const rawCity = getValidField(profile?.entryport) 
               || getValidField(profile?.destination_city) 
               || getValidField(profile?.hiredlocation) 
               || "";
               
  const rawState = getValidField(profile?.destination_state) || "";

  useEffect(() => {
    if (!rawCity) return;
    
    const fetchAllInfo = async () => {
      setLoadingInfo(true);
      setError(null);
      
      try {
        // Get coordinates and resolved location
        const geoInfo = await fetchGeocodingInfo(rawCity, rawState);
        
        if (!geoInfo) {
          setError("Could not resolve city location. Please check your destination information.");
          setLoadingInfo(false);
          return;
        }
        
        const displayCity = geoInfo.city || rawCity;
        const displayState = geoInfo.state || rawState;
        
        // Fetch Wikipedia info and weather in parallel
        const [wikipedia, weather] = await Promise.all([
          fetchWikipediaInfo(displayCity, displayState),
          fetchWeather(geoInfo.lat, geoInfo.lon)
        ]);
        
        setCityInfo({
          wikipedia,
          weather,
          coordinates: { lat: geoInfo.lat, lon: geoInfo.lon },
          resolvedCity: displayCity,
          resolvedState: displayState
        });
      } catch (err) {
        console.error("Error fetching city info:", err);
        setError("Unable to fetch complete city information. Showing basic details.");
      } finally {
        setLoadingInfo(false);
      }
    };
    
    fetchAllInfo();
  }, [rawCity, rawState]);

  // If no valid city is found (after ignoring the "—"), show the USA view!
  if (!rawCity) {
    return <USAGeneralInfo />;
  }

  const displayCity = cityInfo?.resolvedCity || rawCity;
  const displayState = cityInfo?.resolvedState || rawState;

  if (loadingInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relocation Hub</h1>
          <p className="text-sm text-muted-foreground">Loading info for {displayCity}{displayState ? `, ${displayState}` : ''}...</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Gathering city information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relocation Hub</h1>
        <p className="text-sm text-muted-foreground">Your guide to {displayCity}{displayState ? `, ${displayState}` : ''}</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        </div>
      )}

      {/* City Header */}
      <div className="bg-gradient-to-r from-primary/10 via-accent to-primary/5 rounded-2xl p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{displayCity}{displayState ? `, ${displayState}` : ''}</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {cityInfo?.wikipedia?.description || `${displayCity} is a vibrant destination in the United States. Known for its rich culture and welcoming community, it offers various opportunities for newcomers.`}
        </p>
        
        {/* Current Weather */}
        {cityInfo?.weather && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <span className="bg-card/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Current: {cityInfo.weather.temperature}°F
            </span>
            <span className="bg-card/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Wind: {cityInfo.weather.windspeed} km/h
            </span>
          </div>
        )}
        
        {/* Wikipedia Link */}
        {cityInfo?.wikipedia?.pageUrl && (
          <a 
            href={cityInfo.wikipedia.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
          >
            <Wifi className="h-4 w-4" />
            Read more on Wikipedia →
          </a>
        )}
      </div>

      {/* Map */}
      {cityInfo?.coordinates && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="h-64 lg:h-80">
            <MapContainer center={[cityInfo.coordinates.lat, cityInfo.coordinates.lon]} zoom={11} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
              <Marker position={[cityInfo.coordinates.lat, cityInfo.coordinates.lon]}>
                <Popup>{displayCity}{displayState ? `, ${displayState}` : ''}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

      {/* Weather Section */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Climate & Weather</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {displayCity} experiences varied weather throughout the year. Check local forecasts for current conditions.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground capitalize">Spring</p>
            <p className="font-semibold text-sm mt-1">Variable</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground capitalize">Summer</p>
            <p className="font-semibold text-sm mt-1">Warm</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground capitalize">Fall</p>
            <p className="font-semibold text-sm mt-1">Mild</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground capitalize">Winter</p>
            <p className="font-semibold text-sm mt-1">Cool</p>
          </div>
        </div>
      </div>

      
      {/* Local Resources */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-4">Local Resources</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {resourceCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.label}
                href={`https://www.google.com/search?q=${encodeURIComponent(cat.query + " in " + displayCity + " " + displayState)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">Find {cat.label.toLowerCase()} nearby</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            );
          })}
        </div>
        
        {/* Helpful Links */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-sm font-medium mb-2">Key Resources</p>
          <a href={`https://www.numbeo.com/cost-of-living/in/${encodeURIComponent(displayCity)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Cost of Living in {displayCity}
          </a>
          <a href={`https://www.weather.gov/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Weather Forecast
          </a>
          <a href={`https://www.google.com/maps/search/things+to+do+in+${encodeURIComponent(displayCity)}+${encodeURIComponent(displayState)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Things to Do in {displayCity}
          </a>
          <a href={`https://www.zillow.com/${encodeURIComponent(displayCity)}-${encodeURIComponent(displayState)}/rentals/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Rental Listings
          </a>
        </div>
      </div>

      {/* Fun Facts */}
      {cityInfo?.wikipedia?.description && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-3">Did You Know?</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-muted-foreground">{displayCity} is located in the US, offering a unique blend of local culture and opportunities.</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-muted-foreground">The city has various resources available for newcomers and international professionals.</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-muted-foreground">Local communities often organize welcome events for healthcare professionals.</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}