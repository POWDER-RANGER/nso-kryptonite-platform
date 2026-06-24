import { Link } from 'react-router';
import { AlertTriangle, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <AlertTriangle className="w-16 h-16 text-weapon-DEFAULT" />
      <h1 className="text-3xl font-bold">404 — Out of Scope</h1>
      <p className="text-muted-foreground max-w-md text-center">
        This page is outside your authorization scope. This attempt has been logged.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-4 py-2 bg-kryptonite-DEFAULT text-white rounded-lg hover:bg-kryptonite-dark transition-colors"
      >
        <Home className="w-4 h-4" /> Return to War Room
      </Link>
    </div>
  );
}
