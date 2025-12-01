import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Redirect /app to home page
// The home page now handles both logged in (timeline) and logged out (landing) states
export default function AppRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-4" />
        <div className="text-stone-600">Redirecting...</div>
      </div>
    </div>
  );
}
