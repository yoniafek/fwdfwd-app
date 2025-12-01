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

export const TRAVEL_TYPES = {
  flight: { icon: FlightIcon, label: 'Flight', color: 'text-blue-600' },
  hotel: { icon: HotelIcon, label: 'Stay', color: 'text-amber-600' },
  car: { icon: CarIcon, label: 'Rental Car', color: 'text-emerald-600' },
  train: { icon: TrainIcon, label: 'Train', color: 'text-purple-600' },
  bus: { icon: BusIcon, label: 'Bus', color: 'text-orange-600' },
  ferry: { icon: FerryIcon, label: 'Ferry', color: 'text-cyan-600' },
  restaurant: { icon: RestaurantIcon, label: 'Dinner', color: 'text-rose-600' },
  activity: { icon: ActivityIcon, label: 'Activity', color: 'text-indigo-600' }
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

  function formatTime(datetime) {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }

  const startTime = formatTime(step.start_datetime);
  const endTime = step.end_datetime ? formatTime(step.end_datetime) : null;

  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 group relative hover:border-stone-300 transition">
      {/* Action menu - only show for owners */}
      {!isSharedView && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white rounded-lg border border-stone-300 hover:bg-stone-100 transition"
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
                  
                  {trips.length > 0 && (
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
                          onMoveToTrip?.(step.id, null); // Create new trip
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
      )}

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 text-right">
          <div className="text-sm font-semibold text-stone-900">{startTime}</div>
          {endTime && step.type === 'flight' && (
            <div className="text-xs text-stone-500 mt-0.5">→ {endTime}</div>
          )}
        </div>
        
        <div className={`flex-shrink-0 ${typeConfig.color}`}>
          <TypeIcon />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-stone-900 truncate">
              {step.origin_name || typeConfig.label}
            </span>
            {step.destination_name && (
              <>
                <ChevronIcon />
                <span className="font-semibold text-stone-900 truncate">
                  {step.destination_name}
                </span>
              </>
            )}
          </div>
          
          <div className="text-sm text-stone-600 space-y-0.5">
            {step.carrier_name && (
              <div>
                {typeConfig.label} <span className="font-medium">{step.carrier_name}</span>
              </div>
            )}
            
            {/* Only show confirmation to owner */}
            {!isSharedView && step.confirmation_number && (
              <div className="text-xs text-stone-500 mt-1 font-mono">
                Conf: {step.confirmation_number}
              </div>
            )}
            
            {endTime && step.type === 'hotel' && (
              <div className="text-xs text-stone-500 mt-1">
                Check-out: {formatTime(step.end_datetime)} on {formatDate(step.end_datetime)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(datetime) {
  if (!datetime) return '';
  const date = new Date(datetime);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

