import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button,
  Alert, Divider, Tooltip,
} from '@mui/material';
import { Download, Warning, CheckCircle, Group, Shield } from '@mui/icons-material';

interface SuspiciousAccount {
  account_id: string;
  suspicion_score: number;
  risk_level: string;
  detected_patterns: string[];
  ring_id?: string;
}

interface FraudRing {
  ring_id: string;
  member_accounts: string[];
  pattern_type: string;
  risk_score: number;
}

interface ReportsViewProps {
  data: any | null;
}

const scoreColor = (score: number) => {
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#3b82f6';
  return '#10b981';
};

const riskColor = (level: string): any => {
  switch (level?.toLowerCase()) {
    case 'critical': return 'error';
    case 'high':     return 'warning';
    case 'medium':   return 'info';
    default:         return 'success';
  }
};

const ReportsView: React.FC<ReportsViewProps> = ({ data }) => {
  const [downloaded, setDownloaded] = useState(false);

  if (!data) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>
          No analysis data yet. Upload a transaction CSV in the <strong>Upload Data</strong> tab.
        </Alert>
      </Box>
    );
  }

  const suspiciousAccounts: SuspiciousAccount[] = data.suspicious_accounts ?? [];
  const fraudRings: FraudRing[] = data.fraud_rings ?? [];
  const summary = data.summary ?? {};

  const handleDownload = () => {
    const psOutput = {
      suspicious_accounts: suspiciousAccounts,
      fraud_rings: fraudRings,
      summary: {
        total_accounts_analyzed:     summary.total_accounts_analyzed ?? 0,
        suspicious_accounts_flagged: summary.suspicious_accounts_flagged ?? 0,
        fraud_rings_detected:        summary.fraud_rings_detected ?? 0,
        processing_time_seconds:     summary.processing_time_seconds ?? 0,
      },
    };
    const blob = new Blob([JSON.stringify(psOutput, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `nexa_results_${(data.analysis_id ?? 'export').slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            {suspiciousAccounts.length} suspicious accounts · {fraudRings.length} fraud rings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={downloaded ? <CheckCircle /> : <Download />}
          onClick={handleDownload}
          color={downloaded ? 'success' : 'primary'}
          sx={{ minWidth: 200 }}
        >
          {downloaded ? 'Downloaded!' : 'Download JSON Report'}
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Analyzed',  value: summary.total_accounts_analyzed ?? 0,     color: '#6366f1' },
          { label: 'Flagged',         value: summary.suspicious_accounts_flagged ?? 0,  color: '#ef4444' },
          { label: 'Fraud Rings',     value: summary.fraud_rings_detected ?? 0,         color: '#f59e0b' },
          { label: 'Processing (s)',  value: summary.processing_time_seconds ?? 0,      color: '#10b981' },
        ].map(({ label, value, color }) => (
          <Paper key={label} sx={{ p: 2, flex: '1 1 140px', borderTop: `3px solid ${color}` }}>
            <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Fraud Ring Summary Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Group color="warning" />
          <Typography variant="h6" fontWeight={600}>Fraud Ring Summary</Typography>
        </Box>
        <Divider />
        {fraudRings.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography color="text.secondary">No fraud rings detected.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: '#1a2740' } }}>
                  <TableCell>Ring ID</TableCell>
                  <TableCell>Pattern</TableCell>
                  <TableCell align="center">Members</TableCell>
                  <TableCell align="right">Risk Score</TableCell>
                  <TableCell>Member Accounts</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fraudRings.map((ring) => (
                  <TableRow key={ring.ring_id} hover>
                    <TableCell>
                      <Chip
                        label={ring.ring_id}
                        size="small"
                        icon={<Shield style={{ fontSize: 14 }} />}
                        sx={{ fontWeight: 700, backgroundColor: '#312e81', color: '#c7d2fe' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ring.pattern_type.replace(/_/g, ' ').toUpperCase()}
                        size="small"
                        color={
                          ring.pattern_type === 'cycle' ? 'error' :
                          ring.pattern_type === 'smurfing' ? 'warning' : 'info'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={600}>{ring.member_accounts.length}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700} color={scoreColor(ring.risk_score)}>
                        {ring.risk_score.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {ring.member_accounts.slice(0, 4).map((acct) => (
                          <Chip key={acct} label={acct} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                        ))}
                        {ring.member_accounts.length > 4 && (
                          <Chip label={`+${ring.member_accounts.length - 4} more`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Suspicious Accounts Table */}
      <Paper>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" />
          <Typography variant="h6" fontWeight={600}>Suspicious Accounts</Typography>
        </Box>
        <Divider />
        {suspiciousAccounts.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography color="text.secondary">No suspicious accounts detected.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: '#1a2740' } }}>
                  <TableCell>Account ID</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>Ring</TableCell>
                  <TableCell>Detected Patterns</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suspiciousAccounts.map((acct) => (
                  <TableRow key={acct.account_id} hover>
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={600} fontSize={13}>
                        {acct.account_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700} color={scoreColor(acct.suspicion_score)}>
                        {acct.suspicion_score.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={acct.risk_level?.toUpperCase()}
                        color={riskColor(acct.risk_level)}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      {acct.ring_id
                        ? <Chip label={acct.ring_id} size="small" sx={{ backgroundColor: '#312e81', color: '#c7d2fe' }} />
                        : <Typography variant="body2" color="text.disabled">—</Typography>
                      }
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {acct.detected_patterns.map((p) => (
                          <Tooltip key={p} title={p}>
                            <Chip label={p.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                          </Tooltip>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default ReportsView;