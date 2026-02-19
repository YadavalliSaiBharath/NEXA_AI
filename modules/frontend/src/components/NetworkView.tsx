import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Chip, TextField, FormControl, InputLabel, Select,
  MenuItem, Button, Divider, LinearProgress, Alert
} from '@mui/material';
import { Search, Refresh, ZoomIn, ZoomOut } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';

interface NetworkViewProps {
  data: any;
}

interface Node {
  id: string;
  score: number;
  color: string;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  in_degree: number;
  out_degree: number;
  ring_id: string;
  patterns: string[];
}

interface Link {
  source: string;
  target: string;
  amount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const scoreColor = (s: number) => {
  if (s >= 70) return '#ef4444';
  if (s >= 50) return '#f97316';
  if (s >= 30) return '#3b82f6';
  return '#22c55e';
};

const scoreLabel = (s: number) => {
  if (s >= 70) return 'CRITICAL';
  if (s >= 50) return 'HIGH';
  if (s >= 30) return 'MEDIUM';
  return 'LOW';
};

const ringColor = (ringId: string) => {
  const palette = ['#6366f1','#f59e0b','#10b981','#ec4899','#8b5cf6','#14b8a6'];
  if (!ringId) return null;
  const idx = parseInt(ringId.replace('RING_','')) - 1;
  return palette[idx % palette.length];
};

// ── Component ─────────────────────────────────────────────────────────────────

const NetworkView: React.FC<NetworkViewProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number | null>(null);
  const physRef   = useRef<Record<string, { x: number; y: number; vx: number; vy: number }>>({});

  const [nodes,    setNodes]    = useState<Node[]>([]);
  const [links,    setLinks]    = useState<Link[]>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  // ── Build graph — ONLY suspicious accounts ─────────────────────────────────
  useEffect(() => {
    if (!data?.suspicious_accounts?.length) return;

    const suspicious: Node[] = (data.suspicious_accounts as any[]).map(a => ({
      id:         a.account_id,
      score:      a.suspicion_score,
      color:      scoreColor(a.suspicion_score),
      size:       10 + (a.suspicion_score / 100) * 14,
      x:          Math.random() * 600 + 150,
      y:          Math.random() * 400 + 100,
      vx: 0, vy: 0,
      in_degree:  0,
      out_degree: 0,
      ring_id:    a.ring_id ?? '',
      patterns:   a.detected_patterns ?? [],
    }));

    // Enrich with degree info from graph_data if available
    if (data.graph_data?.nodes) {
      const degMap = new Map(
        data.graph_data.nodes.map((n: any) => [n.id, { in: n.in_degree ?? 0, out: n.out_degree ?? 0 }])
      );
      suspicious.forEach(n => {
        const deg = degMap.get(n.id) as any;
        if (deg) { n.in_degree = deg.in; n.out_degree = deg.out; }
      });
    }

    // Only keep links between suspicious accounts
    const suspIds = new Set(suspicious.map(n => n.id));
    const builtLinks: Link[] = (data.graph_data?.links ?? [])
      .filter((l: any) => suspIds.has(l.source) && suspIds.has(l.target))
      .map((l: any) => ({ source: l.source, target: l.target, amount: l.amount ?? 0 }));

    // Init physics
    physRef.current = {};
    suspicious.forEach(n => {
      physRef.current[n.id] = { x: n.x, y: n.y, vx: 0, vy: 0 };
    });

    setNodes(suspicious);
    setLinks(builtLinks);
    setSelected(null);
  }, [data]);

  // ── Physics ───────────────────────────────────────────────────────────────
  const tick = () => {
    const ph = physRef.current;
    const W  = canvasRef.current?.width  ?? 900;
    const H  = canvasRef.current?.height ?? 550;

    nodes.forEach(n => {
      if (!ph[n.id]) return;
      let fx = 0, fy = 0;

      // Repulsion from all other nodes
      nodes.forEach(o => {
        if (o.id === n.id || !ph[o.id]) return;
        const dx = ph[n.id].x - ph[o.id].x;
        const dy = ph[n.id].y - ph[o.id].y;
        const d2 = dx * dx + dy * dy + 1;
        const d  = Math.sqrt(d2);
        fx += (dx / d) * (1200 / d2);
        fy += (dy / d) * (1200 / d2);
      });

      // Same-ring nodes attract each other more
      nodes.forEach(o => {
        if (o.id === n.id || !n.ring_id || n.ring_id !== o.ring_id) return;
        const dx = ph[o.id].x - ph[n.id].x;
        const dy = ph[o.id].y - ph[n.id].y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        fx += (dx / d) * 0.8;
        fy += (dy / d) * 0.8;
      });

      // Spring attraction along edges
      links.forEach(l => {
        const other = l.source === n.id ? l.target : l.target === n.id ? l.source : null;
        if (!other || !ph[other]) return;
        const dx = ph[other].x - ph[n.id].x;
        const dy = ph[other].y - ph[n.id].y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        const f  = (d - 100) * 0.03;
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      });

      // Gentle centre pull
      fx += (W / 2 - ph[n.id].x) * 0.002;
      fy += (H / 2 - ph[n.id].y) * 0.002;

      ph[n.id].vx = (ph[n.id].vx + fx) * 0.88;
      ph[n.id].vy = (ph[n.id].vy + fy) * 0.88;

      const spd = Math.hypot(ph[n.id].vx, ph[n.id].vy);
      if (spd > 5) { ph[n.id].vx *= 5 / spd; ph[n.id].vy *= 5 / spd; }

      ph[n.id].x = Math.max(40, Math.min(ph[n.id].x + ph[n.id].vx, W - 40));
      ph[n.id].y = Math.max(40, Math.min(ph[n.id].y + ph[n.id].vy, H - 40));
    });
  };

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Visible nodes after filter/search
    const visible = nodes.filter(n => {
      if (search && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'critical' && n.score < 70) return false;
      if (filter === 'high'     && (n.score < 50 || n.score >= 70)) return false;
      if (filter === 'medium'   && (n.score < 30 || n.score >= 50)) return false;
      if (filter === 'low'      && n.score >= 30) return false;
      return true;
    });
    const visIds = new Set(visible.map(n => n.id));

    // ── Draw ring halos (background circles grouping ring members) ────────
    const ringGroups: Record<string, string[]> = {};
    visible.forEach(n => {
      if (n.ring_id) {
        ringGroups[n.ring_id] = ringGroups[n.ring_id] ?? [];
        ringGroups[n.ring_id].push(n.id);
      }
    });

    Object.entries(ringGroups).forEach(([ringId, members]) => {
      if (members.length < 2) return;
      const col = ringColor(ringId)!;
      // Find centroid
      let cx = 0, cy = 0;
      members.forEach(id => { cx += physRef.current[id]?.x ?? 0; cy += physRef.current[id]?.y ?? 0; });
      cx /= members.length; cy /= members.length;
      // Find max radius
      let maxR = 0;
      members.forEach(id => {
        const p = physRef.current[id];
        if (p) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.y - cy));
      });
      const haloR = maxR + 30;

      // Draw soft ring halo
      const g = ctx.createRadialGradient(cx, cy, maxR - 10, cx, cy, haloR);
      g.addColorStop(0, col + '22');
      g.addColorStop(1, col + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Ring label
      ctx.fillStyle = col + 'cc';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ringId, cx, cy - haloR - 6);
    });

    // ── Draw edges ────────────────────────────────────────────────────────
    links.forEach(l => {
      if (!visIds.has(l.source) || !visIds.has(l.target)) return;
      const sp = physRef.current[l.source];
      const tp = physRef.current[l.target];
      if (!sp || !tp) return;

      const tNode = visible.find(n => n.id === l.target);
      const col   = tNode ? tNode.color + '66' : '#33415566';

      ctx.strokeStyle = col;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(tp.y - sp.y, tp.x - sp.x);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(tp.x, tp.y);
      ctx.lineTo(tp.x - 12 * Math.cos(angle - Math.PI / 6), tp.y - 12 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(tp.x - 12 * Math.cos(angle + Math.PI / 6), tp.y - 12 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    });

    // ── Draw nodes ────────────────────────────────────────────────────────
    visible.forEach(n => {
      const p = physRef.current[n.id];
      if (!p) return;

      const isSel = selected?.id === n.id;
      const isHov = hovered === n.id;
      const dim   = !!selected && !isSel;
      const sz    = n.size * (isSel ? 1.8 : isHov ? 1.4 : 1);

      ctx.globalAlpha = dim ? 0.2 : 1;

      // Glow
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 2.8);
      g.addColorStop(0, n.color + '55');
      g.addColorStop(1, n.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Node
      ctx.fillStyle   = n.color;
      ctx.strokeStyle = isSel ? '#ffffff' : n.color + 'bb';
      ctx.lineWidth   = isSel ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Score badge inside node
      ctx.fillStyle    = '#fff';
      ctx.font         = `bold ${Math.max(9, sz * 0.7)}px monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(n.score).toString(), p.x, p.y);

      // Account label below
      ctx.font      = '10px monospace';
      ctx.fillStyle = '#cbd5e1';
      const lbl = n.id.length > 16 ? n.id.slice(0, 15) + '…' : n.id;
      ctx.fillText(lbl, p.x, p.y + sz + 12);

      ctx.globalAlpha = 1;
    });

    tick();
    animRef.current = requestAnimationFrame(draw);
  };

  // Start animation
  useEffect(() => {
    if (nodes.length === 0 || !canvasRef.current) return;
    canvasRef.current.width  = canvasRef.current.clientWidth;
    canvasRef.current.height = 550;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, selected, hovered, search, filter]);

  // ── Canvas events ─────────────────────────────────────────────────────────
  const getNodeAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return nodes.find(n => {
      const p = physRef.current[n.id];
      return p && Math.hypot(p.x - x, p.y - y) < n.size * 1.8;
    }) ?? null;
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const n = getNodeAt(e);
    setHovered(n?.id ?? null);
    if (canvasRef.current) canvasRef.current.style.cursor = n ? 'pointer' : 'default';
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setSelected(getNodeAt(e) ?? null);
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (nodes.length === 0) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>
          Upload a transaction CSV to visualize the fraud network.
        </Alert>
      </Box>
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const critical = nodes.filter(n => n.score >= 70).length;
  const high     = nodes.filter(n => n.score >= 50 && n.score < 70).length;
  const rings = nodes.map(n => n.ring_id).filter((r): r is string => !!r)
    .filter((r, i, arr) => arr.indexOf(r) === i);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Fraud Network Graph</Typography>
        <Typography variant="body2" color="text.secondary">
          Showing {nodes.length} suspicious accounts · {rings.length} fraud rings · {links.length} connections between them
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#1e293b' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth size="small"
              placeholder="Search account..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Filter by Risk</InputLabel>
              <Select value={filter} label="Filter by Risk" onChange={e => setFilter(e.target.value)}>
                <MenuItem value="all">All Suspicious</MenuItem>
                <MenuItem value="critical">🔴 Critical (70+)</MenuItem>
                <MenuItem value="high">🟠 High (50–69)</MenuItem>
                <MenuItem value="medium">🔵 Medium (30–49)</MenuItem>
                <MenuItem value="low">🟢 Low (0–29)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth size="small" variant="outlined"
              startIcon={<Refresh />}
              onClick={() => setSelected(null)}
            >
              Clear Selection
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Canvas */}
      <Paper sx={{ mb: 2, overflow: 'hidden', bgcolor: '#0b1120', border: '1px solid #1e293b' }}>
        <canvas
          ref={canvasRef}
          onClick={onClick}
          onMouseMove={onMouseMove}
          style={{ display: 'block', width: '100%' }}
        />
      </Paper>

      {/* Stats + Legend */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1e293b' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Detection Summary</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={1}>
                {[
                  { label: 'Suspicious Accounts', value: nodes.length,  color: '#6366f1' },
                  { label: 'Fraud Rings',          value: rings.length,  color: '#f59e0b' },
                  { label: 'Critical Risk',        value: critical,      color: '#ef4444' },
                  { label: 'High Risk',            value: high,          color: '#f97316' },
                  { label: 'Internal Connections', value: links.length,  color: '#8b5cf6' },
                  { label: 'Processing (s)',       value: data?.summary?.processing_time_seconds ?? '—', color: '#10b981' },
                ].map(s => (
                  <Grid item xs={4} key={s.label}>
                    <Box sx={{ p: 1.5, bgcolor: '#0f172a', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1e293b', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Legend</Typography>
              <Divider sx={{ mb: 2 }} />
              {[
                { color: '#ef4444', label: 'Critical  (70–100)' },
                { color: '#f97316', label: 'High  (50–69)' },
                { color: '#3b82f6', label: 'Medium  (30–49)' },
                { color: '#22c55e', label: 'Low  (0–29)' },
              ].map(item => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: item.color }} />
                  <Typography variant="body2">{item.label}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                Number inside node = risk score. Colored halos group fraud rings. Click any node for details.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Selected node details */}
      {selected && (
        <Card sx={{ mt: 2, bgcolor: '#1e293b', border: `2px solid ${selected.color}55` }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700} fontFamily="monospace">
                {selected.id}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={scoreLabel(selected.score)}
                  size="small"
                  sx={{ bgcolor: selected.color, color: '#fff', fontWeight: 700 }}
                />
                {selected.ring_id && (
                  <Chip
                    label={selected.ring_id}
                    size="small"
                    sx={{ bgcolor: ringColor(selected.ring_id) ?? '#334155', color: '#fff', fontWeight: 700 }}
                  />
                )}
              </Box>
            </Box>

            {/* Score bar */}
            <Typography variant="caption" color="text.secondary">Risk Score</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={selected.score}
                sx={{ flex: 1, height: 10, borderRadius: 5,
                  '& .MuiLinearProgress-bar': { bgcolor: selected.color } }}
              />
              <Typography fontWeight={700} color={selected.color} minWidth={40}>
                {selected.score.toFixed(1)}
              </Typography>
            </Box>

            {/* Degree + patterns */}
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ p: 1.5, bgcolor: '#0f172a', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h5" color="#3b82f6">{selected.in_degree}</Typography>
                  <Typography variant="caption" color="text.secondary">Incoming</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1.5, bgcolor: '#0f172a', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h5" color="#ef4444">{selected.out_degree}</Typography>
                  <Typography variant="caption" color="text.secondary">Outgoing</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1.5, bgcolor: '#0f172a', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h5" color="#10b981">{selected.patterns.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Signals</Typography>
                </Box>
              </Grid>
              {selected.patterns.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>Detected Patterns</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selected.patterns.map(p => (
                      <Chip
                        key={p}
                        label={p.replace(/_/g, ' ')}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default NetworkView;