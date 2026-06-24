import { TopologyMap } from '@/components/war-room/TopologyMap';
import { TelemetryStream } from '@/components/war-room/TelemetryStream';
import { OperationsPanel } from '@/components/war-room/OperationsPanel';
import { CommandLine } from '@/components/war-room/CommandLine';

export function WarRoom() {
  return (
    <div className="war-room-grid">
      <TopologyMap />
      <TelemetryStream />
      <OperationsPanel />
      <CommandLine />
    </div>
  );
}
