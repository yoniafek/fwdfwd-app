import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FlightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);

const HotelIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>
  </svg>
);

const CarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
  </svg>
);

const TrainIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z"/>
  </svg>
);

const BusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
);

const CircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
);

const TRAVEL_TYPES = {
  flight: { icon: FlightIcon, label: 'Flight' },
  hotel: { icon: HotelIcon, label: 'Hotel' },
  car: { icon: CarIcon, label: 'Rental Car' },
  train: { icon: TrainIcon, label: 'Train' },
  bus: { icon: BusIcon, label: 'Bus' }
};

export default function FwdFwdApp() {
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

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchTravelSteps();
      }
    });
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (session?.user) await fetchTravelSteps();
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

  function formatDateTime(datetime) {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
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

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100">
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-stone-900">FWD</h1>
            <div className="flex gap-3">
              <button
                onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                className="px-4 py-2 text-stone-700 hover:text-stone-900 font-medium"
              >
                Log in
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium"
              >
                Sign up
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-stone-900 mb-4">
              Your travel itinerary,<br />automatically organized
            </h2>
            <p className="text-xl text-stone-600 mb-8">
              Forward your booking confirmations to get a beautiful timeline of your trip
            </p>
            <div className="inline-block bg-white px-6 py-3 rounded-lg border border-stone-200">
              <span className="text-stone-500">Forward emails to:</span>
              <span className="ml-2 font-mono font-semibold text-stone-900">add@fwdfwd.com</span>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
              className="px-8 py-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold text-lg"
            >
              Start organizing your trips
            </button>
            <p className="text-sm text-stone-500 mt-3">Free to use • No credit card required</p>
          </div>
        </div>

        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-stone-900">
                  {authMode === 'signin' ? 'Log in' : 'Sign up'}
                </h2>
                <button onClick={() => setShowAuthModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
              </div>

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

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">FWD</h1>
            <p className="text-sm text-stone-600">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 transition"
          >
            <LogoutIcon />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {travelSteps.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Your Timeline</h3>
              <div className="text-stone-600">{travelSteps.length} travel steps</div>
            </div>

            <div className="space-y-6">
              {travelSteps.map((step, idx) => {
                const showDate = idx === 0 || 
                  formatDate(step.start_datetime) !== formatDate(travelSteps[idx - 1].start_datetime);
                
                return (
                  <div key={step.id}>
                    {showDate && (
                      <div className="text-sm font-semibold text-stone-700 mb-3">
                        {formatDate(step.start_datetime)}
                      </div>
                    )}
                    <TravelStepCard step={step} />
                  </div>
                );
              })}
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
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
                  <select
                    value={newStep.type}
                    onChange={(e) => setNewStep({ ...newStep, type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  >
                    {Object.entries(TRAVEL_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {newStep.type === 'hotel' ? 'Check-in' : 'Departure'} Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newStep.start_datetime}
                    onChange={(e) => setNewStep({ ...newStep, start_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>

                {newStep.type === 'hotel' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Check-out Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newStep.end_datetime}
                      onChange={(e) => setNewStep({ ...newStep, end_datetime: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {newStep.type === 'hotel' ? 'Hotel Name *' : 'Origin *'}
                  </label>
                  <input
                    type="text"
                    value={newStep.origin_name}
                    onChange={(e) => setNewStep({ ...newStep, origin_name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    placeholder={newStep.type === 'hotel' ? 'Marriott Times Square' : 'SFO'}
                  />
                </div>

                {newStep.type !== 'hotel' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Destination</label>
                    <input
                      type="text"
                      value={newStep.destination_name}
                      onChange={(e) => setNewStep({ ...newStep, destination_name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    placeholder={newStep.type === 'flight' ? 'United Airlines UA 1234' : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Confirmation Number</label>
                  <input
                    type="text"
                    value={newStep.confirmation_number}
                    onChange={(e) => setNewStep({ ...newStep, confirmation_number: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStep}
                    className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                  >
                    Add Step
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
