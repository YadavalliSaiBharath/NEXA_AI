import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  InputAdornment
} from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';

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
}

interface Link {
  source: string;
  target: string;
}

const scoreColor = (s: number) => {
  if (s >= 70) return '#ef4444';
  if (s >= 50) return '#f97316';
  if (s >= 30) return '#3b82f6';
  return '#22c55e';
};

const NetworkView: React.FC<NetworkViewProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!data?.suspicious_accounts) return;

    const builtNodes: Node[] = data.suspicious_accounts.map((a: any) => ({
      id: a.account_id,
      score: a.suspicion_score,
      color: scoreColor(a.suspicion_score),
      size: 12 + a.suspicion_score / 10,
      x: Math.random() * 800,
      y: Math.random() * 500
    }));

    const suspiciousIds = new Set(builtNodes.map(n => n.id));

    const builtLinks: Link[] =
      data.graph_data?.links?.filter((l: any) =>
        suspiciousIds.has(l.source) && suspiciousIds.has(l.target)
      ) || [];

    setNodes(builtNodes);
    setLinks(builtLinks);
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.clientWidth;
    canvas.height = 550;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    links.forEach(l => {
      const s = nodes.find(n => n.id === l.source);
      const t = nodes.find(n => n.id === l.target);
      if (!s || !t) return;

      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    });

    nodes
      .filter(n =>
        n.id.toLowerCase().includes(search.toLowerCase())
      )
      .forEach(n => {
        ctx.beginPath();
        ctx.fillStyle = n.color;
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(n.score).toString(), n.x, n.y);
      });

  }, [nodes, links, search]);

  if (!nodes.length) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Alert severity="info">
          Upload CSV to visualize fraud network
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Fraud Network Graph
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => setSearch('')}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ bgcolor: '#0b1120', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', display: 'block' }}
        />
      </Paper>
    </Box>
  );
};

export default NetworkView;
