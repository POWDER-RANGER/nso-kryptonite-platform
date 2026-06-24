import { useState } from 'react';
import { Lock, Hash } from 'lucide-react';

export function AuditTrail() {
  const [hash] = useState('0x7a3f...e9d2');
  const [scope] = useState('ENFORCED');

  return (
    <footer className="audit-trail flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          <span>Audit: {hash}</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>Scope: {scope}</span>
        </div>
      </div>
      <div className="text-kryptonite-DEFAULT">LOGGED</div>
    </footer>
  );
}
