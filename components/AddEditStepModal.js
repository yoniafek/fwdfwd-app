import React, { useState, useEffect, useRef } from 'react';
import { TRAVEL_TYPES } from './TravelStepCard';

export default function AddEditStepModal({ 
  step = null, 
  onSave, 
  onClose,
  googleMapsLoaded = false 
}) {
  const isEditing = !!step;
  const inputRef = useRef(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'flight',
    start_datetime: '',
    end_datetime: '',
    origin_name: '',
    destination_name: '',
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
        destination_name: step.destination_name || '',
        carrier_name: step.carrier_name || '',
        confirmation_number: step.confirmation_number || ''
      });
    }
  }, [step]);

  // Initialize Google Places autocomplete for hotel type
  useEffect(() => {
    if (formData.type === 'hotel' && googleMapsLoaded && inputRef.current && window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['name', 'formatted_address', 'address_components', 'place_id']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          setFormData(prev => ({ 
            ...prev, 
            origin_name: place.name || place.formatted_address 
          }));
          setSelectedAddress(place.formatted_address);
        }
      });
    }
  }, [formData.type, googleMapsLoaded]);

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
    if (field === 'type') {
      setSelectedAddress('');
    }
  }

  const typeConfig = TRAVEL_TYPES[formData.type];
  const showEndDateTime = ['hotel', 'flight', 'car'].includes(formData.type);
  const showDestination = !['hotel', 'restaurant', 'activity'].includes(formData.type);

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
              {Object.entries(TRAVEL_TYPES).slice(0, 5).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField('type', key)}
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
               'Origin'} *
            </label>
            {formData.type === 'hotel' ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.origin_name}
                  onChange={(e) => {
                    updateField('origin_name', e.target.value);
                    setSelectedAddress('');
                  }}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="Search for hotels or enter address..."
                  required
                />
                {selectedAddress && (
                  <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <div className="text-xs text-stone-500 mb-0.5">Address:</div>
                    <div className="text-sm text-stone-700">{selectedAddress}</div>
                  </div>
                )}
              </>
            ) : (
              <input
                type="text"
                value={formData.origin_name}
                onChange={(e) => updateField('origin_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                placeholder={formData.type === 'flight' ? 'SFO' : 'Enter location...'}
                required
              />
            )}
          </div>

          {/* Destination */}
          {showDestination && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Destination
              </label>
              <input
                type="text"
                value={formData.destination_name}
                onChange={(e) => updateField('destination_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                placeholder={formData.type === 'flight' ? 'JFK' : 'Enter destination...'}
              />
            </div>
          )}

          {/* Carrier / Provider */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {formData.type === 'hotel' ? 'Hotel Chain' :
               formData.type === 'car' ? 'Rental Company' :
               formData.type === 'restaurant' ? 'Cuisine Type' :
               'Carrier / Provider'}
            </label>
            <input
              type="text"
              value={formData.carrier_name}
              onChange={(e) => updateField('carrier_name', e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              placeholder={
                formData.type === 'flight' ? 'United Airlines UA 1234' :
                formData.type === 'hotel' ? 'Marriott' :
                formData.type === 'car' ? 'Enterprise' :
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

