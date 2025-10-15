import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plane, Hotel, Car, Train, Bus, Plus, LogOut, Calendar, MapPin } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TRAVEL_TYPES = {
  flight: { icon: Plane, label: 'Flight', color: 'bg-blue-100 text-blue-700' },
  hotel: { icon: Hotel, label: 'Hotel', color: 'bg-purple-100 text-purple-700' },
  car: { icon: Car, label: 'Rental Car', color: 'bg-green-100 text-green-700' },
  train: { icon: Train, label: 'Train', color: 'bg-orange-100 text-orange-700' },
  bus: { icon: Bus, label: 'Bus', color: 'bg-yellow-100 text-yellow-700' }
};

export default function FwdFwdApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [travelSteps, setTravelSteps] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
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
    }
  }

  function formatDateTime(datetime) {
    if (!datetime) return '';
    return new Date(datetime).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  function TravelStepCard({ step }) {
    const TypeIcon = TRAVEL_TYPES[step.type].icon;
    const colorClass = TRAVEL_TYPES[step.type].color;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <TypeIcon size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{step.carrier_name || TRAVEL_TYPES[step.type].label}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                {TRAVEL_TYPES[step.type].label}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>{formatDateTime(step.start_datetime)}</span>
                {step.end_datetime && (
                  <>
                    <span>→</span>
                    <span>{formatDateTime(step.end_datetime)}</span>
                  </>
                )}
              </div>
              {step.origin_name && step.destination_name && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{step.origin_name} → {step.destination_name}</span>
                </div>
              )}
              {step.confirmation_number && (
                <div className="text-xs text-gray-500 mt-2">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">FwdFwd</h1>
          <p className="text-gray-600 mb-6 text-center">Your travel timeline, organized</p>
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setAuthMode('signin')} 
              className={`flex-1 py-2 rounded-lg font-medium transition ${authMode === 'signin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setAuthMode('signup')} 
              className={`flex-1 py-2 rounded-lg font-medium transition ${authMode === 'signup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Sign Up
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            {authError && <div className="text-red-600 text-sm">{authError}</div>}
            <button 
              onClick={handleAuth} 
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
          {authMode === 'signup' && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              After signing up, check your email for a confirmation link
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FwdFwd</h1>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {travelSteps.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 mb-6 text-white shadow-lg">
            <h2 className="text-xl font-bold mb-2">Your Upcoming Travel</h2>
            <div className="flex items-center gap-2 text-blue-100">
              <Calendar size={16} />
              <span className="text-sm">
                {travelSteps.length} travel {travelSteps.length === 1 ? 'step' : 'steps'} planned
              </span>
            </div>
          </div>
        )}

        <div className="mb-20">
          {travelSteps.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plane size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No travel plans yet</h3>
              <p className="text-gray-600 mb-4">Add your first trip to get started</p>
            </div>
          ) : (
            travelSteps.map((step) => (
              <TravelStepCard key={step.id} step={step} />
            ))
          )}
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
          >
            <Plus size={24} />
          </button>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Add Travel Step</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newStep.type}
                    onChange={(e) => setNewStep({ ...newStep, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(TRAVEL_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newStep.type === 'hotel' ? 'Check-in' : 'Departure'} Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newStep.start_datetime}
                    onChange={(e) => setNewStep({ ...newStep, start_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {newStep.type === 'hotel' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newStep.end_datetime}
                      onChange={(e) => setNewStep({ ...newStep, end_datetime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newStep.type === 'hotel' ? 'Hotel Name *' : 'Origin *'}
                  </label>
                  <input
                    type="text"
                    value={newStep.origin_name}
                    onChange={(e) => setNewStep({ ...newStep, origin_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={newStep.type === 'hotel' ? 'Marriott Times Square' : 'SFO'}
                  />
                </div>

                {newStep.type !== 'hotel' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                    <input
                      type="text"
                      value={newStep.destination_name}
                      onChange={(e) => setNewStep({ ...newStep, destination_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="JFK"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newStep.type === 'hotel' ? 'Hotel' : 'Carrier'} Name
                  </label>
                  <input
                    type="text"
                    value={newStep.carrier_name}
                    onChange={(e) => setNewStep({ ...newStep, carrier_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={newStep.type === 'flight' ? 'United Airlines UA 1234' : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Number</label>
                  <input
                    type="text"
                    value={newStep.confirmation_number}
                    onChange={(e) => setNewStep({ ...newStep, confirmation_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStep}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
```

Click **"Commit changes"**

---

## **Step 3: Deploy to Vercel (2 minutes)**

**1. Go to Vercel Dashboard**
- Go to vercel.com/dashboard
- Click **"Add New..."** → **"Project"**

**2. Import your GitHub repository**
- You'll see a list of your GitHub repos
- Find **"fwdfwd-app"**
- Click **"Import"**

**3. Add Environment Variables**
- Before clicking "Deploy", expand **"Environment Variables"**
- Add these two:
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://rdtmuocrdbtpgkifcqdu.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y3NzeGt3eGtiaG1ub216c3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Njg3MzIsImV4cCI6MjA3NjA0NDczMn0.1b7LtIzgBMHQPn4hwn_XPZ0JfLhiLDJ1hrp8wQ-nkQI
```

**4. Click "Deploy"**

Wait 1-2 minutes... ☕

---

## **Step 4: Your App is Live! 🎉**

Once deployed, Vercel will give you a URL like:
```
https://fwdfwd-app.vercel.app
