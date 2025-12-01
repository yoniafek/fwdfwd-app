import React from 'react';
import TravelStepCard from './TravelStepCard';
import { FlightIcon } from './Icons';

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
            <div className="flex items-center gap-3 mb-3">
              <div className="text-sm font-semibold text-stone-700">
                {dateLabel}
              </div>
              <div className="flex-1 h-px bg-stone-200" />
            </div>
            
            <div className="space-y-3">
              {daySteps.map((step) => (
                <TravelStepCard
                  key={step.id}
                  step={step}
                  trips={trips}
                  onEdit={onEditStep}
                  onDelete={onDeleteStep}
                  onMoveToTrip={onMoveToTrip}
                  isSharedView={isSharedView}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to group steps by date
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

