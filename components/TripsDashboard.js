import React, { useState } from 'react';
import { FlightIcon, HotelIcon, CarIcon, TrainIcon, BusIcon, EditIcon, TrashIcon, MoreIcon } from './Icons';
import { updateTrip, deleteTrip } from '../lib/trips';

const TRAVEL_TYPE_ICONS = {
  flight: FlightIcon,
  hotel: HotelIcon,
  car: CarIcon,
  train: TrainIcon,
  bus: BusIcon
};

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
    </svg>
  );
}

function TripIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
    </svg>
  );
}

export default function TripsDashboard({ 
  trips = [], 
  unassignedSteps = [],
  onSelectTrip,
  onReorganizeTrips,
  onTripsUpdated
}) {
  const [showMenu, setShowMenu] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingTrip, setRenamingTrip] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  function formatDateRange(startDate, endDate) {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startStr = `${months[start.getMonth()]} ${start.getDate()}`;
    const endStr = `${months[end.getMonth()]} ${end.getDate()}`;
    const year = end.getFullYear().toString().slice(-2);
    
    if (startStr === endStr) {
      return `${startStr} '${year}`;
    }
    return `${startStr} - ${endStr} '${year}`;
  }

  function getTripTypeIcons(trip) {
    const steps = trip.travel_steps || [];
    const types = [...new Set(steps.map(s => s.type))];
    return types.slice(0, 3);
  }

  function getNightCount(trip) {
    if (!trip.start_date || !trip.end_date) return 0;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  async function handleRenameTrip() {
    if (!renamingTrip || !renameValue.trim()) return;
    
    try {
      await updateTrip(renamingTrip.id, { name: renameValue.trim() });
      onTripsUpdated?.();
      setShowRenameModal(false);
      setRenamingTrip(null);
    } catch (error) {
      console.error('Error renaming trip:', error);
      alert('Failed to rename trip');
    }
  }

  async function handleDeleteTrip(tripId) {
    if (!confirm('Delete this trip? The travel steps will be unassigned but not deleted.')) return;
    
    try {
      await deleteTrip(tripId);
      onTripsUpdated?.();
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
    setShowMenu(null);
  }

  function TripCard({ trip }) {
    const steps = trip.travel_steps || [];
    const typeIcons = getTripTypeIcons(trip);
    const nights = getNightCount(trip);
    
    return (
      <button
        onClick={() => onSelectTrip?.(trip)}
        className="bg-white rounded-2xl border border-stone-200 p-6 text-left hover:border-stone-400 hover:shadow-md transition-all w-full group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-stone-500">
            {typeIcons.map((type, i) => {
              const Icon = TRAVEL_TYPE_ICONS[type];
              return Icon ? <Icon key={i} /> : null;
            })}
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(showMenu === trip.id ? null : trip.id);
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-stone-100 rounded transition"
            >
              <MoreIcon />
            </button>
            {showMenu === trip.id && (
              <div className="absolute right-0 top-8 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingTrip(trip);
                    setRenameValue(trip.name);
                    setShowRenameModal(true);
                    setShowMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2"
                >
                  <EditIcon /> Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTrip(trip.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <TrashIcon /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-stone-900 mb-2">{trip.name}</h3>
        
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <span className="flex items-center gap-1">
            <CalendarIcon />
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
          {nights > 0 && (
            <span className="text-stone-400">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          )}
        </div>
        
        <div className="mt-3 text-sm text-stone-500">
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        </div>
      </button>
    );
  }

  // Empty state
  if (trips.length === 0 && unassignedSteps.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-12 text-center">
        <div className="text-stone-300 mb-4 flex justify-center">
          <TripIcon />
        </div>
        <h3 className="text-lg font-medium text-stone-900 mb-2">
          No trips yet
        </h3>
        <p className="text-stone-600 mb-6">
          Forward your travel confirmations to:<br/>
          <span className="font-mono font-semibold text-stone-900">add@fwdfwd.com</span>
        </p>
        <p className="text-sm text-stone-500">or add them manually below</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Trips Grid */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

        {/* Unassigned Steps Alert */}
        {unassignedSteps.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800">
              You have {unassignedSteps.length} travel step{unassignedSteps.length !== 1 ? 's' : ''} not assigned to any trip.
            </p>
            <button
              onClick={onReorganizeTrips}
              className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
            >
              Organize into Trips
            </button>
          </div>
        )}

        {/* No trips but has steps */}
        {trips.length === 0 && unassignedSteps.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 text-center">
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              Ready to organize your travel?
            </h3>
            <p className="text-stone-600 mb-4">
              We found {unassignedSteps.length} travel steps. Let us group them into trips automatically.
            </p>
            <button
              onClick={onReorganizeTrips}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition font-medium"
            >
              Create Trips
            </button>
          </div>
        )}

        {/* Reorganize button for existing trips */}
        {trips.length > 0 && (
          <div className="text-center">
            <button
              onClick={onReorganizeTrips}
              className="text-sm text-stone-500 hover:text-stone-700 transition"
            >
              Reorganize trips automatically →
            </button>
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-stone-900">Rename Trip</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg mb-4"
              placeholder="Trip name"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenamingTrip(null);
                }}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameTrip}
                className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

