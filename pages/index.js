import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FlightIcon, HotelIcon, CarIcon, ChevronIcon, CircleIcon } from '../components/Icons';
import { getSupabase, getCurrentUser, onAuthStateChange } from '../lib/supabase';
import { fetchTravelSteps } from '../lib/travelSteps';
import { fetchTrips, updateTrip, deleteTrip, updateTripNameFromSteps } from '../lib/trips';
import TimelineView from '../components/TimelineView';
import TripsDashboard from '../components/TripsDashboard';
import Header from '../components/Header';
import AuthModal from '../components/AuthModal';
import AddEditStepModal from '../components/AddEditStepModal';
import { createTravelStep, updateTravelStep, deleteTravelStep, moveTravelStepToTrip } from '../lib/travelSteps';
import { createTrip } from '../lib/trips';
import { signOut as supabaseSignOut } from '../lib/supabase';

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [travelSteps, setTravelSteps] = useState([]);
  const [trips, setTrips] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  
  // Navigation state: 'dashboard' or { tripId: string, tripName: string }
  const [currentView, setCurrentView] = useState('dashboard');

  // Check for Google Maps
  useEffect(() => {
    function checkGoogleMaps() {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setGoogleMapsLoaded(true);
        return true;
      }
      return false;
    }

    if (checkGoogleMaps()) return;

    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 500);

    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Handle auth state and magic link callback
  useEffect(() => {
    // First, check if there's a hash in the URL (magic link callback)
    if (typeof window !== 'undefined' && window.location.hash) {
      // Supabase will automatically handle the hash and set the session
      // We just need to wait for it
    }

    // Check initial auth state
    checkUser();

    // Listen for auth changes
    const { data: authListener } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        loadUserData();
        // Clear any hash from URL after successful auth
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        setUser(null);
        setTravelSteps([]);
        setTrips([]);
      }
      setLoading(false);
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await loadUserData();
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserData() {
    try {
      const [stepsData, tripsData] = await Promise.all([
        fetchTravelSteps(),
        fetchTrips().catch(() => [])
      ]);
      
      setTravelSteps(stepsData);
      setTrips(tripsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleSignOut() {
    try {
      await supabaseSignOut();
      setUser(null);
      setTravelSteps([]);
      setTrips([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Step CRUD operations
  async function handleSaveStep(stepData) {
    try {
      if (stepData.id) {
        const updated = await updateTravelStep(stepData.id, stepData);
        setTravelSteps(prev => 
          prev.map(s => s.id === updated.id ? updated : s)
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        );
      } else {
        const created = await createTravelStep(user.id, stepData);
        setTravelSteps(prev => 
          [...prev, created].sort((a, b) => 
            new Date(a.start_datetime) - new Date(b.start_datetime)
          )
        );
      }
      closeModal();
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Error saving travel step: ' + (error.message || 'Unknown error'));
    }
  }

  async function handleDeleteStep(stepId) {
    if (!confirm('Are you sure you want to delete this travel step?')) return;
    try {
      await deleteTravelStep(stepId);
      setTravelSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (error) {
      console.error('Error deleting step:', error);
      alert('Error deleting travel step: ' + error.message);
    }
  }

  async function handleMoveToTrip(stepId, tripId) {
    const step = travelSteps.find(s => s.id === stepId);
    if (!step) return;
    
    // Save the source trip ID before moving (for updating/cleanup)
    const oldTripId = step.trip_id;
    
    if (tripId === null) {
      // Create a new trip for this step
      try {
        // Create trip with placeholder name (will be updated immediately)
        const newTrip = await createTrip(user.id, {
          name: 'New Trip',
          start_date: step.start_datetime.split('T')[0],
          destination: step.destination_name || step.origin_name
        });
        await moveTravelStepToTrip(stepId, newTrip.id);
        
        // Auto-update the trip name based on its new contents
        const updatedTrip = await updateTripNameFromSteps(newTrip.id);
        
        setTrips(prev => [...prev, updatedTrip || newTrip]);
        setTravelSteps(prev => prev.map(s => s.id === stepId ? { ...s, trip_id: newTrip.id } : s));
      } catch (error) {
        console.error('Error creating trip:', error);
        return; // Don't continue to source trip cleanup on error
      }
    } else {
      // Move to existing trip
      try {
        await moveTravelStepToTrip(stepId, tripId);
        setTravelSteps(prev => prev.map(s => s.id === stepId ? { ...s, trip_id: tripId } : s));
        
        // Auto-update the destination trip name based on its new contents
        const updatedTrip = await updateTripNameFromSteps(tripId);
        if (updatedTrip) {
          setTrips(prev => prev.map(t => t.id === tripId ? { ...t, name: updatedTrip.name } : t));
        }
      } catch (error) {
        console.error('Error moving step:', error);
        return; // Don't continue to source trip cleanup on error
      }
    }
    
    // Handle the source trip (if step was moved FROM a trip)
    if (oldTripId) {
      try {
        // Check how many steps remain in the source trip
        const remainingSteps = travelSteps.filter(s => s.trip_id === oldTripId && s.id !== stepId);
        
        if (remainingSteps.length === 0) {
          // Trip is now empty - delete it
          await deleteTrip(oldTripId);
          setTrips(prev => prev.filter(t => t.id !== oldTripId));
          
          // If viewing the deleted trip, redirect to dashboard
          if (currentView !== 'dashboard' && currentView.tripId === oldTripId) {
            setCurrentView('dashboard');
          }
        } else {
          // Trip still has steps - update its name
          const updatedSourceTrip = await updateTripNameFromSteps(oldTripId);
          if (updatedSourceTrip) {
            setTrips(prev => prev.map(t => t.id === oldTripId ? { ...t, name: updatedSourceTrip.name } : t));
          }
        }
      } catch (error) {
        console.error('Error updating source trip:', error);
      }
    }
  }

  function handleEditStep(step) {
    setEditingStep(step);
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingStep(null);
  }

  // Trip navigation handlers
  function handleSelectTrip(trip) {
    setCurrentView({ tripId: trip.id, tripName: trip.name });
  }

  function handleBackToDashboard() {
    setCurrentView('dashboard');
  }

  // Trip management handlers
  async function handleDeleteTrip(trip) {
    if (!confirm(`Delete "${trip.name || 'this trip'}"? The travel steps will be kept but unassigned.`)) return;
    try {
      await deleteTrip(trip.id);
      setTrips(prev => prev.filter(t => t.id !== trip.id));
      // Unassign steps locally
      setTravelSteps(prev => prev.map(s => s.trip_id === trip.id ? { ...s, trip_id: null } : s));
      // If viewing this trip, go back to dashboard
      if (currentView.tripId === trip.id) {
        setCurrentView('dashboard');
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error deleting trip: ' + error.message);
    }
  }

  function handleShareTrip(trip) {
    // TODO: Implement share modal
    const shareUrl = `${window.location.origin}/trip/${trip.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  }

  // Get ungrouped steps (no trip_id)
  const ungroupedSteps = travelSteps.filter(s => !s.trip_id);

  // Get steps for current trip view
  const currentTripSteps = currentView !== 'dashboard' 
    ? travelSteps.filter(s => s.trip_id === currentView.tripId)
    : [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-stone-600">Loading...</div>
        </div>
      </div>
    );
  }

  // LOGGED IN - Show Dashboard or Trip Detail
  if (user) {
    const isViewingTrip = currentView !== 'dashboard';
    
    return (
      <>
        <div className="min-h-screen bg-stone-100">
          <Header user={user} onSignOut={handleSignOut} />
          
          <main className="max-w-2xl mx-auto px-4 py-6">
            {/* Back button when viewing a trip */}
            {isViewingTrip && (
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-4 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                <span className="font-medium">All Trips</span>
              </button>
            )}

            {/* Trip header when viewing a trip */}
            {isViewingTrip && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-stone-900">
                  {currentView.tripName || 'Trip'}
                </h1>
                <p className="text-stone-500">
                  {currentTripSteps.length} item{currentTripSteps.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Dashboard view */}
            {!isViewingTrip && (
              <TripsDashboard
                trips={trips}
                ungroupedSteps={ungroupedSteps}
                onSelectTrip={handleSelectTrip}
                onDeleteTrip={handleDeleteTrip}
                onShareTrip={handleShareTrip}
              />
            )}

            {/* Trip detail view */}
            {isViewingTrip && (
              <TimelineView 
                steps={currentTripSteps}
                trips={trips}
                onEditStep={handleEditStep}
                onDeleteStep={handleDeleteStep}
                onMoveToTrip={handleMoveToTrip}
              />
            )}

            {/* Floating Add Button */}
            <button
              onClick={() => { setEditingStep(null); setShowAddModal(true); }}
              className="fixed bottom-6 right-6 bg-stone-900 text-white p-4 rounded-full shadow-lg hover:bg-stone-800 hover:scale-105 transition-all duration-200 active:scale-95"
              aria-label="Add travel step"
            >
              <PlusIcon />
            </button>
          </main>

          {/* Add/Edit Modal */}
          {showAddModal && (
            <AddEditStepModal
              step={editingStep}
              onSave={handleSaveStep}
              onClose={closeModal}
              googleMapsLoaded={googleMapsLoaded}
            />
          )}

        </div>
      </>
    );
  }

  // LOGGED OUT - Show Landing Page
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">FWD</h1>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 text-stone-700 hover:text-stone-900 font-medium"
            >
              Log in
            </button>
            <button 
              onClick={() => setShowAuthModal(true)}
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

        {/* Demo Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8">
          <div className="mb-8">
            <div className="text-sm text-stone-500 mb-2">SAMPLE TRIP</div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              Trip to New York
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
            </div>

            {/* Nov 20 - Hotel */}
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">Thu Nov 20</div>
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 text-right">
                    <span className="text-sm text-stone-600">7 nights</span>
                  </div>
                  <div className="flex-shrink-0 text-stone-700">
                    <HotelIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-stone-900">Aloft New York Brooklyn</span>
                      <ChevronIcon />
                    </div>
                    <div className="text-sm text-stone-500">Brooklyn, NY</div>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setShowAuthModal(true)}
            className="inline-block px-8 py-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold text-lg"
          >
            Start organizing your trips
          </button>
          <p className="text-sm text-stone-500 mt-3">Free to use • No credit card required</p>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
