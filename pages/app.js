import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FlightIcon, HotelIcon, CarIcon, TrainIcon, BusIcon, ChevronIcon, PlusIcon, LogoutIcon } from '../components/Icons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TRAVEL_TYPES = {
  flight: { icon: FlightIcon, label: 'Flight' },
  hotel: { icon: HotelIcon, label: 'Stay' },
  car: { icon: CarIcon, label: 'Rental Car' },
  train: { icon: TrainIcon, label: 'Train' },
  bus: { icon: BusIcon, label: 'Bus' }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [travelSteps, setTravelSteps] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [newStep, setNewStep] = useState({
    type: 'flight',
    start_datetime: '',
    end_datetime: '',
    origin_name: '',
    destination_name: '',
    carrier_name: '',
    confirmation_number: ''
  });
  const [selectedAddress, setSelectedAddress] = useState('');

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchTravelSteps();
        setShowAuthModal(false);
      } else {
        setShowAuthModal(true);
      }
    });
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (session?.user) {
      await fetchTravelSteps();
    } else {
      setShowAuthModal(true);
    }
    setLoading(false);
  }

  async function fetchTravelSteps() {
    const { data, error } = await supabase
      .from('travel_steps')
      .select('*')
      .order('start_datetime', { ascending: true });
    if (!error) setTravelSteps(data || []);
  }

  async function handleAuth() {
    setAuthError('');
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setTravelSteps([]);
    setShowAuthModal(true);
  }

  async function handleAddStep() {
    if (!newStep.start_datetime || !newStep.origin_name) {
      alert('Please fill in required fields');
      return;
    }

    const { data, error } = await supabase
      .from('travel_steps')
      .insert([{ ...newStep, user_id: user.id }])
      .select();
    
    if (!error) {
      setTravelSteps([...travelSteps, ...data].sort((a, b) => 
        new Date(a.start_datetime) - new Date(b.start_datetime)
      ));
      setShowAddForm(false);
      setSelectedAddress('');
      setNewStep({
        type: 'flight',
        start_datetime: '',
        end_datetime: '',
        origin_name: '',
        destination_name: '',
        carrier_name: '',
        confirmation_number: ''
      });
    } else {
      alert('Error adding travel step: ' + error.message);
    }
  }

  function initAutocomplete(inputRef) {
    if (!inputRef || !window.google) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef, {
      types: ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'address_components', 'place_id']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setNewStep({ 
          ...newStep, 
          origin_name: place.name || place.formatted_address 
        });
        setSelectedAddress(place.formatted_address);
      }
    });
  }

  function formatDate(datetime) {
    if (!datetime) return '';
    const date = new Date(datetime);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  }

  function TravelStepCard({ step }) {
    const TypeIcon = TRAVEL_TYPES[step.type].icon;
    const startDate = new Date(step.start_datetime);
    const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 text-right">
            <div className="text-sm font-medium text-stone-900">{time}</div>
          </div>
          <div className="flex-shrink-0 text-stone-700">
            <TypeIcon />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-stone-900">
                {step.origin_name || TRAVEL_TYPES[step.type].label}
              </span>
              {step.destination_name && (
                <>
                  <ChevronIcon />
                  <span className="font-semibold text-stone-900">{step.destination_name}</span>
                </>
              )}
            </div>
            <div className="text-sm text-stone-600 space-y-0.5">
              {step.carrier_name && <div>{TRAVEL_TYPES[step.type].label} <span className="font-medium">{step.carrier_name}</span></div>}
              {step.confirmation_number && (
                <div className="text-xs text-stone-500 mt-1">
                  Confirmation: {step.confirmation_number}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">FWD</h1>
            {user && <p className="text-sm text-stone-600">{user.email}</p>}
          </div>
          {user && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 transition"
            >
              <LogoutIcon />
              <span className="text-sm font-medium">Log out</span>
            </button>
          )}
        </div>
      </header>

      {user ? (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {travelSteps.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-stone-900 mb-2">Your Timeline</h3>
                <div className="text-stone-600">
                  {travelSteps.length} {travelSteps.length === 1 ? 'step' : 'steps'}
                </div>
              </div>
              <div className="space-y-6">
                {travelSteps.reduce((acc, step, index) => {
                  const stepDate = formatDate(step.start_datetime);
                  const prevDate = index > 0 ? formatDate(travelSteps[index - 1].start_datetime) : null;
                  
                  if (stepDate !== prevDate) {
                    acc.push(
                      <div key={`date-${index}`}>
                        <div className="text-sm font-semibold text-stone-700 mb-3">{stepDate}</div>
                      </div>
                    );
                  }
                  
                  acc.push(
                    <div key={step.id || index}>
                      <TravelStepCard step={step} />
                    </div>
                  );
                  
                  return acc;
                }, [])}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-12 text-center">
              <div className="text-stone-400 mb-4 flex justify-center">
                <FlightIcon />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">No travel plans yet</h3>
              <p className="text-stone-600 mb-6">
                Forward your travel confirmations to:<br/>
                <span className="font-mono font-semibold text-stone-900">add@fwdfwd.com</span>
              </p>
              <p className="text-sm text-stone-500">or add them manually below</p>
            </div>
          )}

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="fixed bottom-6 right-6 bg-stone-900 text-white p-4 rounded-full shadow-lg hover:bg-stone-800 transition"
            >
              <PlusIcon />
            </button>
          )}

          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-stone-900">Add Travel Step</h2>
                <div className="space-y-4">
                  {/* Type Selector - Pill Tabs */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Type</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(TRAVEL_TYPES).map(([key, { label, icon: Icon }]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setNewStep({ ...newStep, type: key });
                            setSelectedAddress('');
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition ${
                            newStep.type === key
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

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      {newStep.type === 'hotel' ? 'Check-in' : 'Departure'} Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newStep.start_datetime}
                      onChange={(e) => setNewStep({ ...newStep, start_datetime: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                    />
                  </div>

                  {newStep.type === 'hotel' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Check-out Date & Time</label>
                      <input
                        type="datetime-local"
                        value={newStep.end_datetime}
                        onChange={(e) => setNewStep({ ...newStep, end_datetime: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Google Places Autocomplete Input for Hotel/Stay */}
                  {newStep.type === 'hotel' ? (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Where are you staying? *
                      </label>
                      <input
                        ref={(ref) => {
                          if (ref && showAddForm) {
                            initAutocomplete(ref);
                          }
                        }}
                        type="text"
                        value={newStep.origin_name}
                        onChange={(e) => {
                          setNewStep({ ...newStep, origin_name: e.target.value });
                          setSelectedAddress('');
                        }}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                        placeholder="Search for hotels or enter address..."
                      />
                      {selectedAddress && (
                        <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                          <div className="text-xs text-stone-500 mb-1">Address:</div>
                          <div className="text-sm text-stone-700">{selectedAddress}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Origin *</label>
                      <input
                        type="text"
                        value={newStep.origin_name}
                        onChange={(e) => setNewStep({ ...newStep, origin_name: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                        placeholder="SFO"
                      />
                    </div>
                  )}

                  {newStep.type !== 'hotel' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Destination</label>
                      <input
                        type="text"
                        value={newStep.destination_name}
                        onChange={(e) => setNewStep({ ...newStep, destination_name: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                        placeholder="JFK"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      {newStep.type === 'hotel' ? 'Hotel' : 'Carrier'} Name
                    </label>
                    <input
                      type="text"
                      value={newStep.carrier_name}
                      onChange={(e) => setNewStep({ ...newStep, carrier_name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                      placeholder={newStep.type === 'flight' ? 'United Airlines UA 1234' : ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Confirmation Number</label>
                    <input
                      type="text"
                      value={newStep.confirmation_number}
                      onChange={(e) => setNewStep({ ...newStep, confirmation_number: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedAddress('');
                      }}
                      className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddStep}
                      className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition"
                    >
                      Add Step
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">
              {authMode === 'signin' ? 'Log in' : 'Sign up'}
            </h2>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  authMode === 'signin' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  authMode === 'signup' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              {authError && <div className="text-red-600 text-sm">{authError}</div>}
              <button onClick={handleAuth} className="w-full bg-stone-900 text-white py-3 rounded-lg font-semibold hover:bg-stone-800">
                {authMode === 'signin' ? 'Log in' : 'Create account'}
              </button>
            </div>

            {authMode === 'signup' && (
              <p className="text-xs text-stone-500 mt-4 text-center">
                After signing up, check your email for a confirmation link
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
