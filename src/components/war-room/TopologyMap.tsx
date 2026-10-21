import { Network } from 'lucide-react';

export function TopologyMap() {
  return (
    <div className="panel">
      <div className="panel-header flex items-center gap-2">
        <Network className="w-4 h-4" />
        <span>Range Topology</span>
        <span className="ml-auto text-xs text-amber-300">NOT CONNECTED</span>
      </div>
      <div className="panel-content min-h-64 flex flex-col items-center justify-center text-center p-6">
        <div className="grid grid-cols-3 gap-3 max-w-sm w-full">
          <div className="border border-border p-3"><span className="block text-xs text-muted-foreground">SOURCE</span><strong className="text-sm">Synthetic logs</strong></div>
          <div className="border border-red-800 p-3"><span className="block text-xs text-muted-foreground">ENGINE</span><strong className="text-sm">Scenario runner</strong></div>
          <div className="border border-border p-3"><span className="block text-xs text-muted-foreground">OUTPUT</span><strong className="text-sm">Scorecard</strong></div>
        </div>
        <p className="text-sm text-muted-foreground mt-5 max-w-md">This is a component map, not a live network topology. Real host discovery and sensor topology are not connected.</p>
      </div>
    </div>
  );
}
