import { Outlet } from 'react-router';
import { StatusBar } from './StatusBar';
import { AuditTrail } from './AuditTrail';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <StatusBar />
      <main className="p-4">
        <Outlet />
      </main>
      <AuditTrail />
    </div>
  );
}
