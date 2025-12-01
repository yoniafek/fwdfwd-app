import React from 'react';
import TravelStepCard from './TravelStepCard';
import { FlightIcon, ChevronIcon } from './Icons';
import { calculateDistance, formatDistance, getDirectionsUrl } from '../lib/distance';

export default function TimelineView({ 
  steps = [],
  trips = [],
  onEditStep,
  onDeleteStep,
  onMoveToTrip,
  isSharedView = false,
  emptyMessage = null
}) {
  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-12 text-center">
        <div className="text-stone-300 mb-4 flex justify-center">
          <FlightIcon />
        </div>
        {emptyMessage || (
          <>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              No travel plans yet
            </h3>
            <p className="text-stone-600 mb-6">
              Forward your travel confirmations to:<br/>
              <span className="font-mono font-semibold text-stone-900">add@fwdfwd.com</span>
            </p>
            <p className="text-sm text-stone-500">or add them manually below</p>
          </>
        )}
      </div>
    );
  }

  // Group steps by date
  const groupedSteps = groupStepsByDate(steps);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-stone-900 mb-1">
          {isSharedView ? 'Trip Timeline' : 'Your Timeline'}
        </h3>
        <div className="text-stone-500">
          {steps.length} {steps.length === 1 ? 'item' : 'items'}
          {!isSharedView && (
            <span className="text-stone-400"> • </span>
          )}
          {!isSharedView && calculateDuration(steps)}
        </div>
      </div>
      
      <div className="space-y-6">
        {groupedSteps.map(({ date, dateLabel, steps: daySteps }) => (
          <div key={date}>
            <div className="text-sm font-semibold text-stone-700 mb-3">
              {dateLabel}
            </div>
            
            <div className="space-y-0">
              {daySteps.map((step, index) => (
                <div key={step.id}>
                  <TravelStepCard
                    step={step}
                    trips={trips}
                    onEdit={onEditStep}
                    onDelete={onDeleteStep}
                    onMoveToTrip={onMoveToTrip}
                    isSharedView={isSharedView}
                  />
                  
                  {/* Distance connector between same-day events */}
                  {index < daySteps.length - 1 && (
                    <DistanceConnector 
                      fromStep={step} 
                      toStep={daySteps[index + 1]} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Distance connector between two events
function DistanceConnector({ fromStep, toStep }) {
  // Get the "end" location of the from step (destination for flights, origin for stays)
  const fromLat = fromStep.destination_lat || fromStep.origin_lat;
  const fromLng = fromStep.destination_lng || fromStep.origin_lng;
  const fromName = fromStep.destination_name || fromStep.origin_name;
  
  // Get the "start" location of the to step
  const toLat = toStep.origin_lat;
  const toLng = toStep.origin_lng;
  const toName = toStep.origin_name;
  
  // Calculate distance
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  const distanceText = formatDistance(distance);
  
  // Generate directions URL
  const directionsUrl = getDirectionsUrl(fromLat, fromLng, toLat, toLng, fromName, toName);
  
  // Don't show if we can't calculate distance or if locations are the same
  if (distance === null || distance < 0.05) {
    return <div className="h-3" />; // Small spacer
  }
  
  const isShortWalk = distance < 0.3;
  
  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex-1 h-px bg-stone-200 ml-20" />
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors flex items-center gap-1"
      >
        {isShortWalk ? (
          <span>Short walk</span>
        ) : (
          <span>{distanceText} • view directions</span>
        )}
        <ChevronIcon />
      </a>
      <div className="flex-1 h-px bg-stone-200 mr-4" />
    </div>
  );
}

// Helper to group steps by date with proper sorting
function groupStepsByDate(steps) {
  const groups = new Map();
  
  steps.forEach(step => {
    const date = new Date(step.start_datetime);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dateKey,
        dateLabel: formatDateLabel(date),
        steps: []
      });
    }
    
    groups.get(dateKey).steps.push(step);
  });
  
  // Sort steps within each day:
  // 1. By time (earliest first)
  // 2. Stays (hotels) always go last in the day
  groups.forEach(group => {
    group.steps.sort((a, b) => {
      // Stays go last
      const aIsStay = a.type === 'hotel';
      const bIsStay = b.type === 'hotel';
      
      if (aIsStay && !bIsStay) return 1;  // a goes after b
      if (!aIsStay && bIsStay) return -1; // a goes before b
      
      // Otherwise sort by time
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });
  });
  
  return Array.from(groups.values());
}

// Format date as "Wed Nov 19"
function formatDateLabel(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

// Calculate trip duration summary
function calculateDuration(steps) {
  if (steps.length === 0) return '';
  
  const sorted = [...steps].sort(
    (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
  );
  
  const startDate = new Date(sorted[0].start_datetime);
  const endStep = sorted[sorted.length - 1];
  const endDate = new Date(endStep.end_datetime || endStep.start_datetime);
  
  const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  if (nights === 0) return 'same day';
  if (nights === 1) return '1 night';
  return `${nights} nights`;
}

// Export for use in trip cards
export function TripSummary({ steps }) {
  if (!steps || steps.length === 0) return null;
  
  const sorted = [...steps].sort(
    (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
  );
  
  const startDate = new Date(sorted[0].start_datetime);
  const endStep = sorted[sorted.length - 1];
  const endDate = new Date(endStep.end_datetime || endStep.start_datetime);
  
  const formatShortDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };
  
  const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  return (
    <span className="text-stone-600">
      {nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : 'Day trip'} • {formatShortDate(startDate)} - {formatShortDate(endDate)}
    </span>
  );
}
