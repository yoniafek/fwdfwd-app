import React, { useState, useEffect, useRef } from 'react';
import { TRAVEL_TYPES } from './TravelStepCard';
import { 
  FlightIcon, 
  HotelIcon, 
  CarIcon, 
  TrainIcon, 
  BusIcon 
} from './Icons';

const TYPE_OPTIONS = [
  { key: 'flight', label: 'Flight', icon: FlightIcon },
  { key: 'hotel', label: 'Stay', icon: HotelIcon },
  { key: 'car', label: 'Car', icon: CarIcon },
  { key: 'train', label: 'Train', icon: TrainIcon },
  { key: 'bus', label: 'Bus', icon: BusIcon },
];

export default function AddEditStepModal({ 
  step = null, 
  onSave, 
  onClose,
  googleMapsLoaded = false 
}) {
  const isEditing = !!step;
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    type: 'flight',
    start_datetime: '',
    end_datetime: '',
    origin_name: '',
    origin_address: '',
    origin_lat: null,
    origin_lng: null,
    origin_terminal: '',
    origin_gate: '',
    destination_name: '',
    destination_address: '',
    destination_lat: null,
    destination_lng: null,
    destination_terminal: '',
    destination_gate: '',
    carrier_name: '',
    confirmation_number: ''
  });

  useEffect(() => {
    if (step) {
      setFormData({
        type: step.type || 'flight',
        start_datetime: step.start_datetime || '',
        end_datetime: step.end_datetime || '',
        origin_name: step.origin_name || '',
        origin_address: step.origin_address || '',
        origin_lat: step.origin_lat || null,
        origin_lng: step.origin_lng || null,
        origin_terminal: step.origin_terminal || '',
        origin_gate: step.origin_gate || '',
        destination_name: step.destination_name || '',
        destination_address: step.destination_address || '',
        destination_lat: step.destination_lat || null,
        destination_lng: step.destination_lng || null,
        destination_terminal: step.destination_terminal || '',
        destination_gate: step.destination_gate || '',
        carrier_name: step.carrier_name || '',
        confirmation_number: step.confirmation_number || ''
      });
    }
  }, [step]);

  // Initialize Google Places autocomplete for origin
  useEffect(() => {
    if (!googleMapsLoaded || !window.google || !originInputRef.current) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(originInputRef.current, {
      types: formData.type === 'flight' ? ['airport'] : ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry', 'place_id']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.geometry) {
        setFormData(prev => ({ 
          ...prev, 
          origin_name: place.name || place.formatted_address,
          origin_address: place.formatted_address || '',
          origin_lat: place.geometry.location.lat(),
          origin_lng: place.geometry.location.lng()
        }));
      }
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [googleMapsLoaded, formData.type]);

  // Initialize Google Places autocomplete for destination
  useEffect(() => {
    if (!googleMapsLoaded || !window.google || !destInputRef.current) return;
    if (formData.type === 'hotel' || formData.type === 'restaurant') return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(destInputRef.current, {
      types: formData.type === 'flight' ? ['airport'] : ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry', 'place_id']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.geometry) {
        setFormData(prev => ({ 
          ...prev, 
          destination_name: place.name || place.formatted_address,
          destination_address: place.formatted_address || '',
          destination_lat: place.geometry.location.lat(),
          destination_lng: place.geometry.location.lng()
        }));
      }
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [googleMapsLoaded, formData.type]);

  function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.start_datetime || !formData.origin_name) {
      alert('Please fill in required fields');
      return;
    }

    onSave({
      ...formData,
      id: step?.id
    });
  }

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleTypeChange(newType) {
    setFormData(prev => ({ 
      ...prev, 
      type: newType,
      // Clear destination for types that don't use it
      ...(newType === 'hotel' && {
        destination_name: '',
        destination_address: '',
        destination_lat: null,
        destination_lng: null,
        destination_terminal: '',
        destination_gate: ''
      }),
      // Clear terminal/gate for non-flights
      ...(newType !== 'flight' && {
        origin_terminal: '',
        origin_gate: '',
        destination_terminal: '',
        destination_gate: ''
      })
    }));
  }

  const showEndDateTime = ['hotel', 'flight', 'car'].includes(formData.type);
  const showDestination = !['hotel', 'restaurant', 'activity'].includes(formData.type);
  const showTerminalGate = formData.type === 'flight';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-stone-900">
          {isEditing ? 'Edit Travel Step' : 'Add Travel Step'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTypeChange(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition ${
                    formData.type === key
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date/Time */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {formData.type === 'hotel' ? 'Check-in' : 
               formData.type === 'restaurant' ? 'Reservation' :
               'Departure'} Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.start_datetime}
              onChange={(e) => updateField('start_datetime', e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              required
            />
          </div>

          {/* End Date/Time */}
          {showEndDateTime && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {formData.type === 'hotel' ? 'Check-out' : 
                 formData.type === 'car' ? 'Return' :
                 'Arrival'} Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.end_datetime}
                onChange={(e) => updateField('end_datetime', e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              />
            </div>
          )}

          {/* Origin / Location */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {formData.type === 'hotel' ? 'Hotel / Address' :
               formData.type === 'restaurant' ? 'Restaurant' :
               formData.type === 'activity' ? 'Location' :
               formData.type === 'flight' ? 'Departure Airport' :
               'Origin'} *
            </label>
            <input
              ref={originInputRef}
              type="text"
              value={formData.origin_name}
              onChange={(e) => {
                updateField('origin_name', e.target.value);
                updateField('origin_lat', null);
                updateField('origin_lng', null);
                updateField('origin_address', '');
              }}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              placeholder={
                formData.type === 'flight' ? 'Search airports...' :
                formData.type === 'hotel' ? 'Search hotels...' :
                'Search location...'
              }
              required
            />
            {formData.origin_address && formData.origin_address !== formData.origin_name && (
              <div className="mt-1.5 px-3 py-2 bg-stone-50 rounded-lg border border-stone-200">
                <div className="text-xs text-stone-500 mb-0.5">Address</div>
                <div className="text-sm text-stone-700">{formData.origin_address}</div>
              </div>
            )}
          </div>

          {/* Origin Terminal & Gate (flights only) */}
          {showTerminalGate && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Terminal
                </label>
                <input
                  type="text"
                  value={formData.origin_terminal}
                  onChange={(e) => updateField('origin_terminal', e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="A"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Gate
                </label>
                <input
                  type="text"
                  value={formData.origin_gate}
                  onChange={(e) => updateField('origin_gate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="12"
                />
              </div>
            </div>
          )}

          {/* Destination */}
          {showDestination && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {formData.type === 'flight' ? 'Arrival Airport' : 'Destination'}
              </label>
              <input
                ref={destInputRef}
                type="text"
                value={formData.destination_name}
                onChange={(e) => {
                  updateField('destination_name', e.target.value);
                  updateField('destination_lat', null);
                  updateField('destination_lng', null);
                  updateField('destination_address', '');
                }}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                placeholder={
                  formData.type === 'flight' ? 'Search airports...' :
                  'Search destination...'
                }
              />
              {formData.destination_address && formData.destination_address !== formData.destination_name && (
                <div className="mt-1.5 px-3 py-2 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="text-xs text-stone-500 mb-0.5">Address</div>
                  <div className="text-sm text-stone-700">{formData.destination_address}</div>
                </div>
              )}
            </div>
          )}

          {/* Destination Terminal & Gate (flights only) */}
          {showTerminalGate && showDestination && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Arrival Terminal
                </label>
                <input
                  type="text"
                  value={formData.destination_terminal}
                  onChange={(e) => updateField('destination_terminal', e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="B"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Arrival Gate
                </label>
                <input
                  type="text"
                  value={formData.destination_gate}
                  onChange={(e) => updateField('destination_gate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="5"
                />
              </div>
            </div>
          )}

          {/* Carrier / Provider */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {formData.type === 'flight' ? 'Airline & Flight Number' :
               formData.type === 'hotel' ? 'Hotel Chain' :
               formData.type === 'car' ? 'Rental Company' :
               formData.type === 'train' ? 'Train Service' :
               formData.type === 'bus' ? 'Bus Company' :
               'Provider'}
            </label>
            <input
              type="text"
              value={formData.carrier_name}
              onChange={(e) => updateField('carrier_name', e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              placeholder={
                formData.type === 'flight' ? 'United • UA 1234' :
                formData.type === 'hotel' ? 'Marriott' :
                formData.type === 'car' ? 'Enterprise' :
                formData.type === 'train' ? 'Amtrak' :
                ''
              }
            />
          </div>

          {/* Confirmation Number */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Confirmation Number
            </label>
            <input
              type="text"
              value={formData.confirmation_number}
              onChange={(e) => updateField('confirmation_number', e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent font-mono"
              placeholder="ABC123"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium transition"
            >
              {isEditing ? 'Update' : 'Add Step'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
