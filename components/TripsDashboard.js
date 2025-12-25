import React, { useState } from 'react';
import { FlightIcon, HotelIcon, CarIcon, ChevronIcon, MoreIcon, TrashIcon, ShareIcon } from './Icons';

// Trip card component
function TripCard({ trip, onSelect, onDelete, onShare }) {
  const [showMenu, setShowMenu] = useState(false);
  
  // Calculate trip stats
  const stepCount = trip.travel_steps?.length || 0;
  const flightCount = trip.travel_steps?.filter(s => s.type === 'flight').length || 0;
  const hotelCount = trip.travel_steps?.filter(s => s.type === 'hotel').length || 0;
  
  // Format date range
  const formatDateRange = () => {
    if (!trip.start_date) return '';
    
    const start = new Date(trip.start_date);
    const end = trip.end_date ? new Date(trip.end_date) : start;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startMonth = months[start.getMonth()];
    const startDay = start.getDate();
    const endMonth = months[end.getMonth()];
    const endDay = end.getDate();
    const year = start.getFullYear().toString().slice(-2);
    
    if (startMonth === endMonth && startDay === endDay) {
      return `${startMonth} ${startDay} '${year}`;
    }
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay} '${year}`;
    }
    
    return `${startMonth} ${startDay} - ${endMonth} ${endDay} '${year}`;
  };
  
  // Calculate nights
  const calculateNights = () => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : null;
  };
  
  const nights = calculateNights();

  return (
    <div 
      className="bg-white rounded-2xl border border-stone-200 p-5 hover:border-stone-300 hover:shadow-md transition-all cursor-pointer group relative"
      onClick={() => onSelect(trip)}
    >
      {/* Action menu */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 bg-stone-100 rounded-lg hover:bg-stone-200 transition"
          >
            <MoreIcon />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }} 
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-stone-200 shadow-lg py-1 z-20 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onShare?.(trip);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                >
                  <ShareIcon />
                  Share
                </button>
                <div className="border-t border-stone-100 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete?.(trip);
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

      {/* Trip name */}
      <h3 className="text-lg font-semibold text-stone-900 mb-1 pr-10">
        {trip.name || 'Untitled Trip'}
      </h3>
      
      {/* Date range and nights */}
      <div className="text-sm text-stone-500 mb-4">
        {nights && <span>{nights} night{nights !== 1 ? 's' : ''} • </span>}
        {formatDateRange()}
      </div>
      
      {/* Step type indicators */}
      <div className="flex items-center gap-3 text-stone-400">
        {flightCount > 0 && (
          <div className="flex items-center gap-1">
            <FlightIcon />
            <span className="text-xs font-medium">{flightCount}</span>
          </div>
        )}
        {hotelCount > 0 && (
          <div className="flex items-center gap-1">
            <HotelIcon />
            <span className="text-xs font-medium">{hotelCount}</span>
          </div>
        )}
        {stepCount === 0 && (
          <span className="text-xs text-stone-400">No items yet</span>
        )}
      </div>
      
      {/* View indicator */}
      <div className="absolute bottom-5 right-5 text-stone-300 group-hover:text-stone-500 transition-colors">
        <ChevronIcon />
      </div>
    </div>
  );
}

// Ungrouped steps section
function UngroupedSection({ steps, onSelectStep }) {
  if (!steps || steps.length === 0) return null;
  
  return (
    <div className="bg-stone-50 rounded-2xl border border-dashed border-stone-300 p-5">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
        Ungrouped Items ({steps.length})
      </h3>
      <div className="space-y-2">
        {steps.slice(0, 5).map(step => (
          <div 
            key={step.id}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-200 hover:border-stone-300 cursor-pointer transition"
            onClick={() => onSelectStep?.(step)}
          >
            <div className="text-stone-400">
              {step.type === 'flight' && <FlightIcon />}
              {step.type === 'hotel' && <HotelIcon />}
              {step.type === 'car' && <CarIcon />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-stone-900 truncate">
                {step.origin_name || step.destination_name || 'Unknown'}
              </div>
              <div className="text-xs text-stone-500">
                {formatStepDate(step.start_datetime)}
              </div>
            </div>
          </div>
        ))}
        {steps.length > 5 && (
          <div className="text-sm text-stone-500 text-center pt-2">
            +{steps.length - 5} more items
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format date
function formatStepDate(datetime) {
  if (!datetime) return '';
  const date = new Date(datetime);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Empty state
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
      <div className="text-stone-300 mb-4 flex justify-center">
        <FlightIcon />
      </div>
      <h3 className="text-lg font-medium text-stone-900 mb-2">
        No trips yet
      </h3>
      <p className="text-stone-600 mb-4">
        Forward your travel confirmations to:<br/>
        <span className="font-mono font-semibold text-stone-900">add@fwdfwd.com</span>
      </p>
      <p className="text-sm text-stone-500">
        We'll automatically organize them into trips
      </p>
    </div>
  );
}

// Main TripsDashboard component
export default function TripsDashboard({ 
  trips = [], 
  ungroupedSteps = [],
  onSelectTrip,
  onDeleteTrip,
  onShareTrip,
  onSelectUngroupedStep
}) {
  // Sort trips by start date (most recent first)
  const sortedTrips = [...trips].sort((a, b) => {
    const dateA = new Date(a.start_date || 0);
    const dateB = new Date(b.start_date || 0);
    return dateB - dateA;
  });

  // Separate upcoming and past trips
  const now = new Date();
  const upcomingTrips = sortedTrips.filter(t => {
    const endDate = t.end_date ? new Date(t.end_date) : new Date(t.start_date);
    return endDate >= now;
  });
  const pastTrips = sortedTrips.filter(t => {
    const endDate = t.end_date ? new Date(t.end_date) : new Date(t.start_date);
    return endDate < now;
  });

  if (trips.length === 0 && ungroupedSteps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      {/* Upcoming trips */}
      {upcomingTrips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Upcoming Trips
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onSelect={onSelectTrip}
                onDelete={onDeleteTrip}
                onShare={onShareTrip}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ungrouped items */}
      {ungroupedSteps.length > 0 && (
        <UngroupedSection 
          steps={ungroupedSteps} 
          onSelectStep={onSelectUngroupedStep}
        />
      )}

      {/* Past trips */}
      {pastTrips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Past Trips
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pastTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onSelect={onSelectTrip}
                onDelete={onDeleteTrip}
                onShare={onShareTrip}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

