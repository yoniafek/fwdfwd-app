import React, { useState } from 'react';

// Material Icons as inline SVG components
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

export default function FwdFwdLanding() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">FWD</h1>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowAuth(true); setAuthMode('signin'); }}
              className="px-4 py-2 text-stone-700 hover:text-stone-900 font-medium"
            >
              Log in
            </button>
            <button
              onClick={() => { setShowAuth(true); setAuthMode('signup'); }}
              className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium"
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
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

        {/* Demo Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8">
          {/* Trip Header */}
          <div className="mb-8">
            <div className="text-sm text-stone-500 mb-2">SAMPLE TRIP</div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              Yoni's Trip to Teaneck & Brooklyn
            </h3>
            <div className="text-stone-600">
              13 nights • Nov 19 to Dec 2 '25
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {/* Nov 19 - Flight */}
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">Wed Nov 19</div>
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 text-right">
                    <div className="text-sm font-medium text-stone-900">1:00pm</div>
                  </div>
                  <div className="flex-shrink-0 text-stone-700">
                    <FlightIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-stone-900">San Francisco</span>
                      <span className="text-xs text-stone-500 font-mono">SFO</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600 space-y-0.5">
                      <div>Flight <span className="font-medium">United • UA 2011</span></div>
                      <div className="flex gap-4">
                        <span>Terminal <span className="font-medium">3</span></span>
                        <span>Gate <span className="font-medium">A4</span></span>
                      </div>
                      <div>Duration <span className="font-medium">5hr29 (+3hr)</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 mt-4 pt-4 border-t border-stone-200">
                  <div className="flex-shrink-0 w-12 text-right">
                    <div className="text-sm font-medium text-stone-900">9:29pm</div>
                  </div>
                  <div className="flex-shrink-0 text-stone-700">
                    <CircleIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">Newark</span>
                      <span className="text-xs text-stone-500 font-mono">EWR</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600 mt-0.5">
                      <div className="flex gap-4">
                        <span>Terminal <span className="font-medium">A</span></span>
                        <span>Gate <span className="font-medium">5</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Travel time */}
              <div className="flex items-center justify-center my-3">
                <div className="text-sm text-stone-500 flex items-center gap-1">
                  30 min drive
                  <ChevronIcon />
                </div>
              </div>

              {/* Hotel - 1 night */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12"></div>
                  <div className="flex-shrink-0 text-stone-700">
                    <HotelIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-stone-600">1 night</span>
                      <span className="font-semibold text-stone-900">Home</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600">Teaneck, NJ</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nov 20 - Hotel */}
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">Thu Nov 20</div>
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12"></div>
                  <div className="flex-shrink-0 text-stone-700">
                    <HotelIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-stone-600">7 nights</span>
                      <span className="font-semibold text-stone-900">Aloft New York Broo...</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600">Brooklyn, NY</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nov 27 - Rental Car */}
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">Thu Nov 27</div>
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 text-right">
                    <div className="text-sm font-medium text-stone-900">10:00am</div>
                  </div>
                  <div className="flex-shrink-0 text-stone-700">
                    <CarIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-stone-900">Enterprise Rent-A-Car</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600 space-y-0.5">
                      <div>Pickup: <span className="font-medium">Brooklyn, NY</span></div>
                      <div>Vehicle: <span className="font-medium">Compact SUV or similar</span></div>
                      <div>Confirmation: <span className="font-medium">ABC123XYZ</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dec 2 - Return Flight */}
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">Tue Dec 2</div>
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 text-right">
                    <div className="text-sm font-medium text-stone-900">6:10pm</div>
                  </div>
                  <div className="flex-shrink-0 text-stone-700">
                    <FlightIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-stone-900">Newark</span>
                      <span className="text-xs text-stone-500 font-mono">EWR</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600 space-y-0.5">
                      <div>Flight <span className="font-medium">Alaska • AS 293</span></div>
                      <div className="flex gap-4">
                        <span>Terminal <span className="font-medium">A</span></span>
                        <span>Gate <span className="font-medium">–</span></span>
                      </div>
                      <div>Duration <span className="font-medium">6hr32 (-3hr)</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 mt-4 pt-4 border-t border-stone-200">
                  <div className="flex-shrink-0 w-12 text-right">
                    <div className="text-sm font-medium text-stone-900">9:50pm</div>
                  </div>
                  <div className="flex-shrink-0 text-stone-700">
                    <CircleIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">San Francisco</span>
                      <span className="text-xs text-stone-500 font-mono">SFO</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-600 mt-0.5">
                      <div className="flex gap-4">
                        <span>Terminal <span className="font-medium">3</span></span>
                        <span>Gate <span className="font-medium">–</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => { setShowAuth(true); setAuthMode('signup'); }}
            className="px-8 py-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold text-lg"
          >
            Start organizing your trips
          </button>
          <p className="text-sm text-stone-500 mt-3">Free to use • No credit card required</p>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-stone-900">
                {authMode === 'signin' ? 'Log in' : 'Sign up'}
              </h2>
              <button
                onClick={() => setShowAuth(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  authMode === 'signin'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  authMode === 'signup'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600'
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
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <button className="w-full bg-stone-900 text-white py-3 rounded-lg font-semibold hover:bg-stone-800 transition">
                {authMode === 'signin' ? 'Log in' : 'Create account'}
              </button>
            </div>

            {authMode === 'signup' && (
              <p className="text-xs text-stone-500 mt-4 text-center">
                After signing up, check your email for a confirmation link
              </p>
            )}

            <p className="text-sm text-stone-600 mt-6 text-center">
              Your forwarding email will be: <br/>
              <span className="font-mono font-semibold text-stone-900">add@fwdfwd.com</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
