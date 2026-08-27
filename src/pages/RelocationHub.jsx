// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { MapPin, Cloud, CloudSun, CloudRain, Snowflake, Sun, ExternalLink, Building2, GraduationCap, ShoppingBag, Heart, Bus, Utensils, Loader2, Wifi, Info, Plane, Calendar, Phone, Mail, Thermometer, Wind } from "lucide-react";
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
        state: address.state || stateName || "",
        countryCode: String(address.country_code || "").toLowerCase(),
        country: address.country || ""
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
    <div className="-mx-2 -my-2 space-y-4 lg:-mx-3 lg:-my-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relocation Hub</h1>
        <p className="text-sm text-muted-foreground">General Information about the United States</p>
      </div>

      {/* USA Overview */}
      <div className="rounded-2xl border border-[#E9D5FF] bg-gradient-to-br from-[#F5F0FF] via-[#FFF1F8] to-[#E0F2FE] p-6 shadow-sm lg:p-8">
        <div className="mb-2 flex items-center gap-3">
          <MapPin className="h-7 w-7 text-[#8B0764]" />
          <h2 className="text-2xl font-bold text-[#3B0764]">Welcome to the United States</h2>
        </div>
        <p className="max-w-[80%] text-lg leading-8 text-black">
          The United States of America is a diverse and vast country offering countless opportunities for newcomers. 
          From bustling cities to serene landscapes, the US is a land of possibilities with a rich cultural tapestry 
          and a welcoming spirit for international professionals.
        </p>
      </div>

      {/* Quick Facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Plane className="mx-auto mb-2 h-6 w-6 text-[#8B0764]" />
          <p className="text-sm font-medium">50 States</p>
          <p className="text-xs text-muted-foreground">Diverse geography and culture</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Calendar className="mx-auto mb-2 h-6 w-6 text-[#2563EB]" />
          <p className="text-sm font-medium">4 Seasons</p>
          <p className="text-xs text-muted-foreground">Varied climate across regions</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Phone className="mx-auto mb-2 h-6 w-6 text-[#0891B2]" />
          <p className="text-sm font-medium">+1 Country Code</p>
          <p className="text-xs text-muted-foreground">International dialing</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Mail className="mx-auto mb-2 h-6 w-6 text-[#DB2777]" />
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

  // Helper to discard em-dash and empty spaces returned by CRM / Recruit.
  const getValidField = (fieldValue) => {
    if (!fieldValue) return "";
    const cleanStr = String(fieldValue).trim();
    if (cleanStr === "—" || cleanStr === "-" || cleanStr === "") return "";
    return cleanStr;
  };

  // Read a CRM value by API name first, then by legacy aliases already used by the portal.
  const getProfileField = (...names) => {
    for (const name of names) {
      const value = getValidField(profile?.[name]);
      if (value) return value;
    }
    return "";
  };

  // Compare locations loosely so values such as "JFK - New York", "New York (JFK)"
  // and "New York, NY" can still be recognized as referring to the same stop.
  const normalizeLocation = (value) =>
    getValidField(value)
      .toLowerCase()
      .replace(/\([^)]*\)/g, " " )
      .replace(/\b(airport|international|intl|terminal|united states|united states of america|usa|u\.?s\.?a\.?|us)\b/g, " " )
      .replace(/[^a-z0-9]+/g, " " )
      .trim();

  const locationsAreSimilar = (left, right) => {
    const a = normalizeLocation(left);
    const b = normalizeLocation(right);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;

    const aWords = new Set(a.split(/\s+/).filter(word => word.length > 1));
    const bWords = new Set(b.split(/\s+/).filter(word => word.length > 1));
    const common = [...aWords].filter(word => bWords.has(word));
    return common.length >= Math.min(2, aWords.size, bWords.size);
  };

  // CRM flight fields used by the Relocation Hub.
  const layover1 = getProfileField(
    "Layover_1_Location",
    "layover_1_location",
    "layover1location",
    "layover1"
  );
  const layover2 = getProfileField(
    "Layover_2_Location",
    "layover_2_location",
    "layover2location",
    "layover2"
  );
  const layover3 = getProfileField(
    "Layover_3_Location",
    "layover_3_location",
    "layover3location",
    "layover3"
  );
  const portOfEntry = getProfileField(
    "Port_of_Entry_in_US",
    "port_of_entry_in_us",
    "entryport",
    "PortOfEntryInUS"
  );

  const destinationState = getProfileField(
    "destination_state",
    "Destination_State",
    "state"
  );

  const fallbackDestination = getProfileField(
    "destination_city",
    "Destination_City",
    "hiredlocation",
    "Hired_Location"
  );

  const [selectedLocation, setSelectedLocation] = useState({ city: "", state: "" });

  // Resolve the relocation city from the candidate's actual travel sequence.
  // Rules:
  // 1. Layover 3 is the relocation city when Layover 2 is the Port of Entry.
  // 2. Layover 2 is the relocation city when Layover 1 is the Port of Entry,
  //    Layover 2 is in the USA, and there is no Layover 3.
  // 3. Layover 1 is used when it is the Port of Entry and no later layovers exist.
  // 4. Port of Entry is used when it matches the final available layover.
  useEffect(() => {
    let cancelled = false;

    const resolveRelocationLocation = async () => {
      setLoadingInfo(true);
      setError(null);

      let chosenCity = "";
      let chosenState = destinationState;

      const layover1MatchesPort = locationsAreSimilar(layover1, portOfEntry);
      const layover2MatchesPort = locationsAreSimilar(layover2, portOfEntry);
      const layover3MatchesPort = locationsAreSimilar(layover3, portOfEntry);

      // If the traveler enters the U.S. at Layover 2, the next stop (Layover 3)
      // is the relocation city. Layover 1 is intentionally ignored in this case.
      if (layover3 && layover2MatchesPort) {
        chosenCity = layover3;
      }

      // If the traveler enters the U.S. at Layover 1 and there is one later stop,
      // use Layover 2 only when geocoding confirms that it is a U.S. location.
      if (!chosenCity && !layover3 && layover2 && layover1MatchesPort) {
        const layover2Geo = await fetchGeocodingInfo(layover2, "");
        if (layover2Geo?.countryCode === "us") {
          chosenCity = layover2;
          chosenState = layover2Geo.state || chosenState;
        }
      }

      // If Port of Entry is also the only/final stop, either value refers to the
      // same place; keep the CRM Layover 1 wording when it is available.
      if (!chosenCity && layover1 && layover1MatchesPort && !layover2 && !layover3) {
        chosenCity = layover1;
      }

      // Explicit Port-of-Entry fallback rules from CRM.
      if (!chosenCity && portOfEntry) {
        const portMatchesFinalAvailableStop =
          (layover1MatchesPort && !layover2 && !layover3) ||
          (layover2MatchesPort && !layover3) ||
          layover3MatchesPort;

        if (portMatchesFinalAvailableStop) {
          chosenCity = portOfEntry;
        }
      }

      // Preserve the existing destination fallback when flight routing is not yet populated.
      if (!chosenCity) {
        chosenCity = portOfEntry || fallbackDestination || "";
      }

      if (!chosenCity) {
        if (!cancelled) {
          setSelectedLocation({ city: "", state: "" });
          setCityInfo(null);
          setLoadingInfo(false);
        }
        return;
      }

      try {
        const geoInfo = await fetchGeocodingInfo(chosenCity, chosenState);

        if (!geoInfo) {
          if (!cancelled) {
            setSelectedLocation({ city: chosenCity, state: chosenState });
            setCityInfo(null);
            setError("Could not resolve city location. Please check your destination information.");
          }
          return;
        }

        const displayCity = geoInfo.city || chosenCity;
        const displayState = geoInfo.state || chosenState;

        const [wikipedia, weather] = await Promise.all([
          fetchWikipediaInfo(displayCity, displayState),
          fetchWeather(geoInfo.lat, geoInfo.lon)
        ]);

        if (!cancelled) {
          setSelectedLocation({ city: chosenCity, state: chosenState });
          setCityInfo({
            wikipedia,
            weather,
            coordinates: { lat: geoInfo.lat, lon: geoInfo.lon },
            resolvedCity: displayCity,
            resolvedState: displayState
          });
        }
      } catch (err) {
        console.error("Error fetching city info:", err);
        if (!cancelled) {
          setSelectedLocation({ city: chosenCity, state: chosenState });
          setCityInfo(null);
          setError("Unable to fetch complete city information. Showing basic details.");
        }
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    };

    resolveRelocationLocation();

    return () => {
      cancelled = true;
    };
  }, [
    layover1,
    layover2,
    layover3,
    portOfEntry,
    destinationState,
    fallbackDestination
  ]);

  const rawCity = selectedLocation.city;
  const rawState = selectedLocation.state;

  // If no valid city is found (after ignoring the "—"), show the USA view.
  if (!loadingInfo && !rawCity) {
    return <USAGeneralInfo />;
  }

  const displayCity = cityInfo?.resolvedCity || rawCity;
  const displayState = cityInfo?.resolvedState || rawState;

  if (loadingInfo) {
    return (
      <div className="-mx-2 -my-2 space-y-4 lg:-mx-3 lg:-my-3">
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
    <div className="-mx-2 -my-2 space-y-4 lg:-mx-3 lg:-my-3">
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
      <div className="rounded-2xl border border-[#E9D5FF] bg-gradient-to-br from-[#F5F0FF] via-[#FFF1F8] to-[#E0F2FE] p-6 shadow-sm lg:p-8">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-7 w-7 text-[#8B0764]" />
          <h2 className="text-2xl font-bold text-[#3B0764]">{displayCity}{displayState ? `, ${displayState}` : ''}</h2>
        </div>
        <p className="max-w-[80%] text-lg leading-8 text-black">
          {cityInfo?.wikipedia?.description || `${displayCity} is a vibrant destination in the United States. Known for its rich culture and welcoming community, it offers various opportunities for newcomers.`}
        </p>
        
        {/* Current Weather */}
        {cityInfo?.weather && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <span className="flex items-center gap-2 rounded-lg border border-white/70 bg-white/75 px-3 py-1.5 text-[#3B0764] shadow-sm backdrop-blur">
              <Thermometer className="h-4 w-4 text-[#DB2777]" />
              Current: {cityInfo.weather.temperature}°F
            </span>
            <span className="flex items-center gap-2 rounded-lg border border-white/70 bg-white/75 px-3 py-1.5 text-[#3B0764] shadow-sm backdrop-blur">
              <Wind className="h-4 w-4 text-[#0891B2]" />
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
            className="mt-4 flex w-full items-center justify-end gap-2 text-sm font-medium text-[#8B0764] hover:underline"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FDE68A] via-[#FBCFE8] to-[#BAE6FD] shadow-sm">
            <Cloud className="h-8 w-8 text-[#6D28D9]" strokeWidth={2.5} />
          </div>
          <h3 className="font-semibold">Climate & Weather</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {displayCity} experiences varied weather throughout the year. Check local forecasts for current conditions.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex min-h-36 items-center justify-center gap-3 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] p-4 text-left">
            <CloudSun className="h-10 w-10 shrink-0 text-[#0284C7]" />
            <div>
              <p className="text-sm capitalize text-muted-foreground">Spring</p>
              <p className="mt-1 text-base font-semibold">Variable</p>
            </div>
          </div>
          <div className="flex min-h-36 items-center justify-center gap-3 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-4 text-left">
            <Sun className="h-10 w-10 shrink-0 text-[#EA580C]" />
            <div>
              <p className="text-sm capitalize text-muted-foreground">Summer</p>
              <p className="mt-1 text-base font-semibold">Warm</p>
            </div>
          </div>
          <div className="flex min-h-36 items-center justify-center gap-3 rounded-lg border border-[#FBCFE8] bg-[#FFF1F8] p-4 text-left">
            <CloudRain className="h-10 w-10 shrink-0 text-[#DB2777]" />
            <div>
              <p className="text-sm capitalize text-muted-foreground">Fall</p>
              <p className="mt-1 text-base font-semibold">Mild</p>
            </div>
          </div>
          <div className="flex min-h-36 items-center justify-center gap-3 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] p-4 text-left">
            <Snowflake className="h-10 w-10 shrink-0 text-[#4F46E5]" />
            <div>
              <p className="text-sm capitalize text-muted-foreground">Winter</p>
              <p className="mt-1 text-base font-semibold">Cool</p>
            </div>
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