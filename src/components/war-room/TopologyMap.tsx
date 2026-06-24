import { useEffect, useRef } from 'react';
import { Network } from 'lucide-react';

export function TopologyMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw sample network topology
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw nodes
    const nodes = [
      { x: 100, y: 100, label: 'DC', compromised: true },
      { x: 200, y: 150, label: 'WS-01', compromised: false },
      { x: 300, y: 80, label: 'WS-02', compromised: true },
      { x: 150, y: 200, label: 'SRV-01', compromised: false },
      { x: 250, y: 220, label: 'FW', compromised: false },
    ];

    // Draw edges
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    nodes.forEach((node, i) => {
      nodes.slice(i + 1).forEach((other) => {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      });
    });

    // Draw nodes
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = node.compromised ? '#dc2626' : '#059669';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 35);
    });

    // Draw C2 tunnel
    ctx.strokeStyle = '#dc2626';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 80);
    ctx.bezierCurveTo(350, 50, 380, 150, 400, 200);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#dc2626';
    ctx.fillText('C2', 400, 220);
  }, []);

  return (
    <div className="panel">
      <div className="panel-header flex items-center gap-2">
        <Network className="w-4 h-4" />
        <span>Topology Map</span>
      </div>
      <div className="panel-content">
        <canvas
          ref={canvasRef}
          width={500}
          height={280}
          className="w-full rounded"
        />
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-kryptonite-DEFAULT" />
            Secure
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-weapon-DEFAULT" />
            Compromised
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-weapon-DEFAULT animate-pulse" />
            C2 Tunnel
          </span>
        </div>
      </div>
    </div>
  );
}
