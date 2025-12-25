import React, { useState } from 'react';
import { 
  FlightIcon, 
  HotelIcon, 
  CarIcon, 
  TrainIcon, 
  BusIcon, 
  ChevronIcon,
  EditIcon,
  TrashIcon,
  MoreIcon
} from './Icons';
import { getLocationUrl } from '../lib/distance';

export const TRAVEL_TYPES = {
  flight: { icon: FlightIcon, label: 'Flight' },
  hotel: { icon: HotelIcon, label: 'Stay' },
  car: { icon: CarIcon, label: 'Rental Car' },
  train: { icon: TrainIcon, label: 'Train' },
  bus: { icon: BusIcon, label: 'Bus' },
  ferry: { icon: FerryIcon, label: 'Ferry' },
  restaurant: { icon: RestaurantIcon, label: 'Dinner' },
  activity: { icon: ActivityIcon, label: 'Activity' }
};

// Additional icons
function FerryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.63.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
    </svg>
  );
}

function RestaurantIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="6"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  );
}

function SmallChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
  );
}

// Generate Google Maps search URL for an airport
function getAirportUrl(airportCode, cityName) {
  if (airportCode) {
    return `https://www.google.com/maps/search/${encodeURIComponent(airportCode + ' airport')}`;
  }
  if (cityName) {
    return `https://www.google.com/maps/search/${encodeURIComponent(cityName + ' airport')}`;
  }
  return null;
}

// Extract flight code from carrier name
function extractFlightCode(carrierName) {
  if (!carrierName) return null;
  
  const cleaned = carrierName.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/([A-Z]{2})\s*(\d{1,4})/i);
  
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }
  
  return null;
}

// Generate flight tracking URL - uses Flightradar24 which has better direct linking
function getFlightTrackingUrl(carrierName, departureDate) {
  const flightCode = extractFlightCode(carrierName);
  if (!flightCode) return null;
  
  // Flightradar24 format: https://www.flightradar24.com/data/flights/ua2011
  // This shows all recent flights for that flight number
  return `https://www.flightradar24.com/data/flights/${flightCode.toLowerCase()}`;
}

// Alternative: Google Flights for searching
function getGoogleFlightsUrl(originCode, destCode, departureDate) {
  if (!originCode || !destCode) return null;
  
  let dateStr = '';
  if (departureDate) {
    const dateMatch = departureDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      dateStr = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
    }
  }
  
  return `https://www.google.com/travel/flights?q=flights%20${originCode}%20to%20${destCode}${dateStr ? `%20${dateStr}` : ''}`;
}

// Check flight timing status
function getFlightTimingStatus(departureDate, arrivalDate) {
  if (!departureDate) return { canShowStatus: false, isLanded: false, isWithin48Hours: false, isPast: false };
  
  const now = new Date();
  const departure = new Date(departureDate);
  const arrival = arrivalDate ? new Date(arrivalDate) : null;
  
  // Check if flight has landed (arrival time has passed)
  if (arrival && arrival < now) {
    return { canShowStatus: true, isLanded: true, isWithin48Hours: false, isPast: true };
  }
  
  // Check if departure has passed but no arrival (in flight or past)
  if (departure < now) {
    return { canShowStatus: true, isLanded: false, isWithin48Hours: true, isPast: true };
  }
  
  // Check if within 48 hours of departure
  const hoursToDeparture = (departure - now) / (1000 * 60 * 60);
  const isWithin48Hours = hoursToDeparture <= 48;
  
  return { 
    canShowStatus: isWithin48Hours, 
    isLanded: false, 
    isWithin48Hours,
    isPast: false
  };
}

// Clickable location link for flights (links to airport)
function AirportLink({ name, code, className = '' }) {
  const url = getAirportUrl(code, name);
  
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-semibold text-stone-900">{name}</span>
      {code && <span className="text-xs text-stone-500 font-mono uppercase">{code}</span>}
      <ChevronIcon />
    </span>
  );
  
  if (url) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:text-stone-600 transition-colors"
      >
        {content}
      </a>
    );
  }
  
  return content;
}

// Clickable location link for non-flights
function LocationLink({ name, lat, lng, address, className = '' }) {
  // Pass both name and address to get better Maps results
  const url = getLocationUrl(lat, lng, name, address);
  
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-semibold text-stone-900">{name}</span>
      <ChevronIcon />
    </span>
  );
  
  if (url) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:text-stone-600 transition-colors"
      >
        {content}
      </a>
    );
  }
  
  return content;
}

// Flight info row - clickable to Flightradar24
function FlightInfoRow({ carrierName, departureDate, arrivalDate, isSharedView }) {
  const trackingUrl = getFlightTrackingUrl(carrierName, departureDate);
  const { isLanded, isWithin48Hours, isPast } = getFlightTimingStatus(departureDate, arrivalDate);
  
  // Can link if within 48 hours OR if in the past (Flightradar24 shows historical data too)
  const canLink = isWithin48Hours || isPast;
  
  // Show "Landed" for past flights
  const showLanded = isLanded;
  
  function handleClick(e) {
    if (!canLink) {
      e.preventDefault();
      alert('Flight tracking is not yet available. Check back when it\'s less than 2 days away.');
    }
  }

  const content = (
    <div className="flex items-center gap-3">
      <span>
        Flight <span className="font-medium">{carrierName}</span>
      </span>
      <span className="flex items-center gap-1.5">
        {showLanded && (
          <span className="font-medium text-stone-500">Landed</span>
        )}
        <SmallChevronIcon />
      </span>
    </div>
  );
  
  if (trackingUrl) {
    return (
      <a 
        href={canLink ? trackingUrl : '#'}
        target={canLink ? '_blank' : undefined}
        rel={canLink ? 'noopener noreferrer' : undefined}
        onClick={handleClick}
        className={`block hover:bg-stone-100 -mx-1 px-1 rounded transition-colors ${!canLink ? 'cursor-pointer' : ''}`}
      >
        {content}
      </a>
    );
  }
  
  return <div>{content}</div>;
}

export default function TravelStepCard({ 
  step, 
  onEdit, 
  onDelete, 
  onMoveToTrip,
  trips = [],
  isSharedView = false 
}) {
  const [showMenu, setShowMenu] = useState(false);
  const typeConfig = TRAVEL_TYPES[step.type] || TRAVEL_TYPES.activity;
  const TypeIcon = typeConfig.icon;

  if (step.type === 'flight') {
    return (
      <FlightCard 
        step={step}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveToTrip={onMoveToTrip}
        trips={trips}
        isSharedView={isSharedView}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
      />
    );
  }

  if (step.type === 'hotel') {
    return (
      <StayCard 
        step={step}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveToTrip={onMoveToTrip}
        trips={trips}
        isSharedView={isSharedView}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
      />
    );
  }

  return (
    <DefaultCard 
      step={step}
      typeConfig={typeConfig}
      TypeIcon={TypeIcon}
      onEdit={onEdit}
      onDelete={onDelete}
      onMoveToTrip={onMoveToTrip}
      trips={trips}
      isSharedView={isSharedView}
      showMenu={showMenu}
      setShowMenu={setShowMenu}
    />
  );
}

// Flight card with connected departure/arrival
function FlightCard({ step, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  const startTime = formatTimeRaw(step.start_datetime);
  const dayDiff = calculateDayDifference(step.start_datetime, step.end_datetime);
  const endTime = step.end_datetime ? formatTimeWithDayOffset(step.end_datetime, dayDiff) : null;
  
  const { name: originName, code: originCode } = parseLocationWithCode(step.origin_name);
  const { name: destName, code: destCode } = parseLocationWithCode(step.destination_name);
  
  const { duration, timezoneOffset } = calculateFlightDuration(step.start_datetime, step.end_datetime);

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 group relative hover:border-stone-300 transition">
      <ActionMenu 
        step={step}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveToTrip={onMoveToTrip}
        trips={trips}
        isSharedView={isSharedView}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
      />

      {/* Departure */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 text-right">
            <div className="text-sm font-semibold text-stone-900">{startTime}</div>
          </div>
          <div className="flex-shrink-0 text-stone-700">
            <FlightIcon />
          </div>
          <div className="flex-1 min-w-0">
            <AirportLink name={originName} code={originCode} />
            
            <div className="text-sm text-stone-600 space-y-0.5 mt-1">
              {/* Confirmation first */}
              {!isSharedView && step.confirmation_number && (
                <div>Confirmation <span className="font-medium">{step.confirmation_number}</span></div>
              )}
              {/* Flight carrier and number - clickable row */}
              {step.carrier_name && (
                <FlightInfoRow 
                  carrierName={step.carrier_name}
                  departureDate={step.start_datetime}
                  arrivalDate={step.end_datetime}
                  isSharedView={isSharedView}
                />
              )}
              {/* Terminal and Gate */}
              <div className="flex gap-4">
                <span>Terminal <span className="font-medium">{step.origin_terminal || '–'}</span></span>
                <span>Gate <span className="font-medium">{step.origin_gate || '–'}</span></span>
              </div>
              {/* Duration with timezone offset */}
              {duration && (
                <div>
                  Duration <span className="font-medium">{duration}{timezoneOffset && ` (${timezoneOffset})`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arrival */}
      {step.destination_name && (
        <div className="px-4 pb-4 pt-4 border-t border-stone-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 text-right">
              <div className="text-sm font-semibold text-stone-900">{endTime || '–'}</div>
            </div>
            <div className="flex-shrink-0 text-stone-500">
              <CircleIcon />
            </div>
            <div className="flex-1 min-w-0 ml-1">
              <AirportLink name={destName} code={destCode} />
              
              <div className="text-sm text-stone-600 mt-0.5">
                <div className="flex gap-4">
                  <span>Terminal <span className="font-medium">{step.destination_terminal || '–'}</span></span>
                  <span>Gate <span className="font-medium">{step.destination_gate || '–'}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stay card - for hotels and homes (uses same icon for all stays)
function StayCard({ step, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  const nights = calculateNights(step.start_datetime, step.end_datetime);
  
  const displayTitle = step.custom_title || step.origin_name || extractStreetAddress(step.origin_address);
  const addressSubtitle = getAddressSubtitle(step.origin_address, step.origin_name);

  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 group relative hover:border-stone-300 transition">
      <ActionMenu 
        step={step}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveToTrip={onMoveToTrip}
        trips={trips}
        isSharedView={isSharedView}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
      />

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-16 text-right">
          {nights && (
            <div className="text-sm text-stone-600">{nights} night{nights !== 1 ? 's' : ''}</div>
          )}
        </div>
        <div className="flex-shrink-0 text-stone-700">
          <HotelIcon />
        </div>
        <div className="flex-1 min-w-0">
          <LocationLink 
            name={displayTitle} 
            lat={step.origin_lat}
            lng={step.origin_lng}
            address={step.origin_address}
          />
          {addressSubtitle && (
            <div className="text-sm text-stone-500 mt-0.5">{addressSubtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Default card for other travel types
function DefaultCard({ step, typeConfig, TypeIcon, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  const startTime = formatTimeRaw(step.start_datetime);

  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 group relative hover:border-stone-300 transition">
      <ActionMenu 
        step={step}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveToTrip={onMoveToTrip}
        trips={trips}
        isSharedView={isSharedView}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
      />

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-16 text-right">
          <div className="text-sm font-semibold text-stone-900">{startTime}</div>
        </div>
        <div className="flex-shrink-0 text-stone-700">
          <TypeIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <LocationLink 
              name={step.origin_name || typeConfig.label} 
              lat={step.origin_lat}
              lng={step.origin_lng}
              address={step.origin_address}
            />
            {step.destination_name && (
              <>
                <span className="text-stone-400">→</span>
                <LocationLink 
                  name={step.destination_name} 
                  lat={step.destination_lat}
                  lng={step.destination_lng}
                  address={step.destination_address}
                />
              </>
            )}
          </div>
          <div className="text-sm text-stone-600 space-y-0.5">
            {step.carrier_name && (
              <div>{typeConfig.label} <span className="font-medium">{step.carrier_name}</span></div>
            )}
            {step.origin_address && (
              <div className="text-stone-500">{step.origin_address}</div>
            )}
            {!isSharedView && step.confirmation_number && (
              <div className="text-xs text-stone-400 font-mono mt-1">
                Confirmation: {step.confirmation_number}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Action menu component
function ActionMenu({ step, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  if (isSharedView) return null;

  return (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 bg-white rounded-lg border border-stone-300 hover:bg-stone-100 transition shadow-sm"
          title="More options"
        >
          <MoreIcon />
        </button>
        
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)} 
            />
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-stone-200 shadow-lg py-1 z-20 min-w-[160px]">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEdit?.(step);
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 flex items-center gap-2"
              >
                <EditIcon />
                Edit
              </button>
              
              {trips && trips.length > 0 && (
                <div className="border-t border-stone-100 my-1">
                  <div className="px-4 py-1 text-xs text-stone-400 uppercase tracking-wide">
                    Move to trip
                  </div>
                  {/* Filter out the step's current trip - moving to same trip does nothing */}
                  {trips.filter(t => t.id !== step.trip_id).map(trip => (
                    <button
                      key={trip.id}
                      onClick={() => {
                        setShowMenu(false);
                        onMoveToTrip?.(step.id, trip.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                    >
                      {trip.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onMoveToTrip?.(step.id, null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
                  >
                    + New trip
                  </button>
                </div>
              )}
              
              <div className="border-t border-stone-100 my-1" />
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete?.(step.id);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatTimeRaw(datetime) {
  if (!datetime) return '';
  
  if (typeof datetime === 'string') {
    const timeMatch = datetime.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${hours}:${minutes}${ampm}`;
    }
  }
  
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  }).replace(' ', '').toLowerCase();
}

function parseLocationWithCode(locationStr) {
  if (!locationStr) return { name: '', code: '' };
  
  const parenMatch = locationStr.match(/^(.+?)\s*\(([A-Z]{3})\)$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), code: parenMatch[2] };
  }
  
  const spaceMatch = locationStr.match(/^(.+?)\s+([A-Z]{3})$/);
  if (spaceMatch) {
    return { name: spaceMatch[1].trim(), code: spaceMatch[2] };
  }
  
  if (/^[A-Z]{3}$/.test(locationStr.trim())) {
    return { name: locationStr.trim(), code: locationStr.trim() };
  }
  
  return { name: locationStr, code: '' };
}

function calculateNights(startDatetime, endDatetime) {
  if (!startDatetime || !endDatetime) return null;
  
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : null;
}

function calculateFlightDuration(startDatetime, endDatetime) {
  if (!startDatetime || !endDatetime) {
    return { duration: null, timezoneOffset: null };
  }
  
  const startTz = extractTimezoneOffset(startDatetime);
  const endTz = extractTimezoneOffset(endDatetime);
  
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  
  const diffMs = end - start;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  
  if (diffMinutes <= 0) {
    return { duration: null, timezoneOffset: null };
  }
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  let duration;
  if (minutes === 0) {
    duration = `${hours}hr`;
  } else {
    duration = `${hours}hr${minutes.toString().padStart(2, '0')}`;
  }
  
  let timezoneOffset = null;
  if (startTz !== null && endTz !== null && startTz !== endTz) {
    const tzDiff = endTz - startTz;
    const sign = tzDiff >= 0 ? '+' : '';
    timezoneOffset = `${sign}${tzDiff}hr`;
  }
  
  return { duration, timezoneOffset };
}

function extractTimezoneOffset(datetimeStr) {
  if (!datetimeStr || typeof datetimeStr !== 'string') return null;
  
  const tzMatch = datetimeStr.match(/([+-])(\d{2}):(\d{2})$/);
  if (tzMatch) {
    const sign = tzMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(tzMatch[2], 10);
    const minutes = parseInt(tzMatch[3], 10);
    return sign * (hours + minutes / 60);
  }
  
  if (datetimeStr.endsWith('Z')) {
    return 0;
  }
  
  return null;
}

// Calculate how many days later the arrival is compared to departure
function calculateDayDifference(startDatetime, endDatetime) {
  if (!startDatetime || !endDatetime) return 0;
  
  // Extract just the date portion (YYYY-MM-DD) from both datetimes
  const startDate = startDatetime.split('T')[0];
  const endDate = endDatetime.split('T')[0];
  
  if (!startDate || !endDate) return 0;
  
  // Calculate difference in days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Format time with optional +N day indicator
function formatTimeWithDayOffset(datetime, dayOffset) {
  const time = formatTimeRaw(datetime);
  if (!time) return '–';
  
  if (dayOffset > 0) {
    const superscript = dayOffset === 1 ? '⁺¹' : dayOffset === 2 ? '⁺²' : `⁺${dayOffset}`;
    return `${time}${superscript}`;
  }
  
  return time;
}

function detectIfHotel(name, address) {
  if (!name && !address) return false;
  
  const hotelKeywords = [
    'hotel', 'inn', 'suites', 'resort', 'motel', 'lodge', 
    'marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 
    'courtyard', 'hampton', 'holiday inn', 'best western',
    'radisson', 'wyndham', 'doubletree', 'embassy', 'aloft',
    'fairfield', 'la quinta', 'comfort inn', 'days inn'
  ];
  
  const searchText = ((name || '') + ' ' + (address || '')).toLowerCase();
  return hotelKeywords.some(keyword => searchText.includes(keyword));
}

function extractStreetAddress(fullAddress) {
  if (!fullAddress) return 'Stay';
  
  const parts = fullAddress.split(',');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  
  return fullAddress;
}

function getAddressSubtitle(fullAddress, originName) {
  if (!fullAddress) return null;
  
  const parts = fullAddress.split(',').map(p => p.trim());
  
  if (parts.length >= 2) {
    return parts.slice(1).join(', ');
  }
  
  if (fullAddress === originName) return null;
  
  return fullAddress;
}
