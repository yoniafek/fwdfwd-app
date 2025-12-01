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

// Additional icons for new types
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

// Clickable location link component
function LocationLink({ name, code, lat, lng, className = '' }) {
  const url = getLocationUrl(lat, lng, name);
  
  const content = (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
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

  // Render flight card with connected departure/arrival
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

  // Render stay card (hotel)
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

  // Default card for other types
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

// Flight card with connected departure/arrival design
function FlightCard({ step, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  const startTime = formatTime(step.start_datetime);
  const endTime = step.end_datetime ? formatTime(step.end_datetime) : null;
  
  // Parse origin/destination for airport codes
  const { name: originName, code: originCode } = parseLocationWithCode(step.origin_name);
  const { name: destName, code: destCode } = parseLocationWithCode(step.destination_name);

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 group relative hover:border-stone-300 transition overflow-hidden">
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
            <LocationLink 
              name={originName} 
              code={originCode}
              lat={step.origin_lat}
              lng={step.origin_lng}
            />
            <div className="text-sm text-stone-600 space-y-0.5 mt-1">
              {step.carrier_name && (
                <div>Flight <span className="font-medium">{step.carrier_name}</span></div>
              )}
              <div className="flex gap-4">
                {step.origin_terminal && (
                  <span>Terminal <span className="font-medium">{step.origin_terminal}</span></span>
                )}
                {step.origin_gate && (
                  <span>Gate <span className="font-medium">{step.origin_gate}</span></span>
                )}
              </div>
              {step.duration && (
                <div>Duration <span className="font-medium">{step.duration}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arrival */}
      {step.destination_name && (
        <div className="p-4 pt-0 border-t border-stone-200 mt-0">
          <div className="flex items-start gap-4 pt-4">
            <div className="flex-shrink-0 w-16 text-right">
              <div className="text-sm font-semibold text-stone-900">{endTime || '–'}</div>
            </div>
            <div className="flex-shrink-0 text-stone-500">
              <CircleIcon />
            </div>
            <div className="flex-1 min-w-0 ml-1">
              <LocationLink 
                name={destName} 
                code={destCode}
                lat={step.destination_lat}
                lng={step.destination_lng}
              />
              <div className="text-sm text-stone-600 mt-0.5">
                <div className="flex gap-4">
                  {step.destination_terminal && (
                    <span>Terminal <span className="font-medium">{step.destination_terminal}</span></span>
                  )}
                  {step.destination_gate && (
                    <span>Gate <span className="font-medium">{step.destination_gate || '–'}</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation (owner only) */}
      {!isSharedView && step.confirmation_number && (
        <div className="px-4 pb-3 pt-0">
          <div className="text-xs text-stone-400 font-mono ml-20">
            Conf: {step.confirmation_number}
          </div>
        </div>
      )}
    </div>
  );
}

// Stay card (hotel) design
function StayCard({ step, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  const nights = calculateNights(step.start_datetime, step.end_datetime);

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
        <div className="flex-shrink-0 w-16"></div>
        <div className="flex-shrink-0 text-stone-700">
          <HotelIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {nights && (
              <span className="text-sm text-stone-600">{nights} night{nights !== 1 ? 's' : ''}</span>
            )}
            <LocationLink 
              name={step.origin_name} 
              lat={step.origin_lat}
              lng={step.origin_lng}
            />
          </div>
          {step.origin_address && (
            <div className="text-sm text-stone-500 mt-0.5">{step.origin_address}</div>
          )}
          {!isSharedView && step.confirmation_number && (
            <div className="text-xs text-stone-400 font-mono mt-1">
              Conf: {step.confirmation_number}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Default card for other travel types
function DefaultCard({ step, typeConfig, TypeIcon, onEdit, onDelete, onMoveToTrip, trips, isSharedView, showMenu, setShowMenu }) {
  const startTime = formatTime(step.start_datetime);

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
            />
            {step.destination_name && (
              <>
                <span className="text-stone-400">→</span>
                <LocationLink 
                  name={step.destination_name} 
                  lat={step.destination_lat}
                  lng={step.destination_lng}
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
                Conf: {step.confirmation_number}
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
                  {trips.map(trip => (
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
function formatTime(datetime) {
  if (!datetime) return '';
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  }).replace(' ', '').toUpperCase();
}

function parseLocationWithCode(locationStr) {
  if (!locationStr) return { name: '', code: '' };
  
  // Try to extract airport code like "San Francisco (SFO)" or "Newark EWR"
  const parenMatch = locationStr.match(/^(.+?)\s*\(([A-Z]{3})\)$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), code: parenMatch[2] };
  }
  
  const spaceMatch = locationStr.match(/^(.+?)\s+([A-Z]{3})$/);
  if (spaceMatch) {
    return { name: spaceMatch[1].trim(), code: spaceMatch[2] };
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
