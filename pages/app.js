import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  getSupabase, 
  getCurrentUser, 
  signOut as supabaseSignOut, 
  onAuthStateChange 
} from '../lib/supabase';
import { 
  fetchTravelSteps, 
  createTravelStep, 
  updateTravelStep, 
  deleteTravelStep,
  moveTravelStepToTrip 
} from '../lib/travelSteps';
import { fetchTrips, createTrip } from '../lib/trips';

import Header from '../components/Header';
import AuthModal from '../components/AuthModal';
import TimelineView from '../components/TimelineView';
import AddEditStepModal from '../components/AddEditStepModal';
import { PlusIcon } from '../components/Icons';

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Data state
  const [travelSteps, setTravelSteps] = useState([]);
  const [trips, setTrips] = useState([]);

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Check for Google Maps on mount and after a delay
  useEffect(() => {
    function checkGoogleMaps() {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setGoogleMapsLoaded(true);
        return true;
      }
      return false;
    }

    // Check immediately
    if (checkGoogleMaps()) return;

    // Check again after script might have loaded
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 500);

    // Stop checking after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Auth listener
  useEffect(() => {
    checkUser();
    
    const { data: authListener } = onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserData();
        setShowAuthModal(false);
      } else {
        setShowAuthModal(true);
        setTravelSteps([]);
        setTrips([]);
      }
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await loadUserData();
      } else {
        setShowAuthModal(true);
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
      setTravelSteps([]);
      setTrips([]);
      setShowAuthModal(true);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Step CRUD operations
  async function handleSaveStep(stepData) {
    try {
      if (stepData.id) {
        // Update existing
        const updated = await updateTravelStep(stepData.id, stepData);
        
        setTravelSteps(prev => 
          prev.map(s => s.id === updated.id ? updated : s)
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        );
      } else {
        // Create new
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
      alert('Error saving travel step: ' + error.message);
    }
  }

  async function handleDeleteStep(stepId) {
    if (!confirm('Are you sure you want to delete this travel step?')) {
      return;
    }

    try {
      await deleteTravelStep(stepId);
      setTravelSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (error) {
      console.error('Error deleting step:', error);
      alert('Error deleting travel step: ' + error.message);
    }
  }

  async function handleMoveToTrip(stepId, tripId) {
    if (tripId === null) {
      // Create new trip
      const step = travelSteps.find(s => s.id === stepId);
      if (!step) return;

      try {
        const newTrip = await createTrip(user.id, {
          name: `Trip - ${new Date(step.start_datetime).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`,
          start_date: step.start_datetime.split('T')[0],
          destination: step.destination_name || step.origin_name
        });
        
        await moveTravelStepToTrip(stepId, newTrip.id);
        
        setTrips(prev => [...prev, newTrip]);
        setTravelSteps(prev => 
          prev.map(s => s.id === stepId ? { ...s, trip_id: newTrip.id } : s)
        );
      } catch (error) {
        console.error('Error creating trip:', error);
      }
    } else {
      try {
        await moveTravelStepToTrip(stepId, tripId);
        setTravelSteps(prev => 
          prev.map(s => s.id === stepId ? { ...s, trip_id: tripId } : s)
        );
      } catch (error) {
        console.error('Error moving step:', error);
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

  function openAddModal() {
    setEditingStep(null);
    setShowAddModal(true);
  }

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

  return (
    <>
      <Head>
        <title>FWD - Your Travel Timeline</title>
        <meta name="description" content="Forward your travel confirmations to build your timeline" />
      </Head>

      <div className="min-h-screen bg-stone-100">
        <Header user={user} onSignOut={handleSignOut} />

        {user ? (
          <main className="max-w-4xl mx-auto px-4 py-8">
            {/* Email forwarding reminder */}
            {travelSteps.length === 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800 text-sm">
                  <strong>Tip:</strong> Forward your flight, hotel, and car rental confirmations to{' '}
                  <span className="font-mono font-semibold">add@fwdfwd.com</span>{' '}
                  and they'll automatically appear here!
                </p>
              </div>
            )}

            {/* Timeline */}
            <TimelineView
              steps={travelSteps}
              trips={trips}
              onEditStep={handleEditStep}
              onDeleteStep={handleDeleteStep}
              onMoveToTrip={handleMoveToTrip}
            />

            {/* Floating Add Button */}
            <button
              onClick={openAddModal}
              className="fixed bottom-6 right-6 bg-stone-900 text-white p-4 rounded-full shadow-lg hover:bg-stone-800 hover:scale-105 transition-all duration-200 active:scale-95"
              aria-label="Add travel step"
            >
              <PlusIcon />
            </button>
          </main>
        ) : null}

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}

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
