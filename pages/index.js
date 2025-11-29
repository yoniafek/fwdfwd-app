import React, { useState } from 'react';
import Link from 'next/link';
import { FlightIcon, HotelIcon, CarIcon, ChevronIcon, CircleIcon } from '../components/Icons';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signup');

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">FWD</h1>
          <div className="flex gap-3">
            <Link href="/app" className="px-4 py-2 text-stone-700 hover:text-stone-900 font-medium">
              Log in
            </Link>
            <Link href="/app" className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-medium">
              Sign up
            </Link>
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

        {/* Demo Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8">
          <div className="mb-8">
            <div className="text-sm text-stone-500 mb-2">SAMPLE TRIP</div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              Yoni's Trip to Teaneck & Brooklyn
            </h3>
            <div className="text-stone-600">
              13 nights • Nov 19 to Dec 2 '25
            </div>
          </div>

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

              <div className="flex items-center justify-center my-3">
                <div className="text-sm text-stone-500 flex items-center gap-1">
                  30 min drive
                  <ChevronIcon />
                </div>
              </div>

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

        <div className="text-center">
          <Link href="/app" className="inline-block px-8 py-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold text-lg">
            Start organizing your trips
          </Link>
          <p className="text-sm text-stone-500 mt-3">Free to use • No credit card required</p>
        </div>
      </div>
    </div>
  );
}
