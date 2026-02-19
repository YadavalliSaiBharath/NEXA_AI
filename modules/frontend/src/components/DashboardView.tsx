import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  AccountBalance,
  SwapHoriz,
  Warning,
  Security,
  Refresh,
  Download,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Line
} from 'recharts';

interface DashboardViewProps {
  data: any;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle: string;
  trend?: number;
  color?: string;
}

interface RiskLevel {
  name: string;
  value: number;
  color: string;
}

interface ActivityData {
  time: string;
  transactions: number;
  amount: number;
}

interface WeeklyData {
  day: string;
  transactions: number;
  amount: number;
}

interface TopAccount {
  account: string;
  total_score: number;
  risk_level: string;
  transactions: number;
  volume: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  // Sample data if no real data yet
  const summary = data?.summary || {
    total_transactions: 1247,
    total_amount: 1250000,
    unique_accounts: 342,
    cycles_found: 3,
    fan_patterns_found: 12,
    critical_risk: 5,
    high_risk: 15,
    medium_risk: 28,
    low_risk: 294
  };

  const riskLevels: RiskLevel[] = [
    { name: 'Critical', value: summary.critical_risk, color: '#ef4444' },
    { name: 'High', value: summary.high_risk, color: '#f59e0b' },
    { name: 'Medium', value: summary.medium_risk, color: '#eab308' },
    { name: 'Low', value: summary.low_risk, color: '#10b981' },
  ];

  const recentActivity: ActivityData[] = [
    { time: '00:00', transactions: 45, amount: 25000 },
    { time: '04:00', transactions: 62, amount: 31000 },
    { time: '08:00', transactions: 120, amount: 89000 },
    { time: '12:00', transactions: 180, amount: 145000 },
    { time: '16:00', transactions: 155, amount: 112000 },
    { time: '20:00', transactions: 98, amount: 67000 },
  ];

  const topAccounts: TopAccount[] = data?.risk_scores?.slice(0, 5) || [
    { account: 'ACC_023', total_score: 95, risk_level: 'CRITICAL', transactions: 12, volume: 25000 },
    { account: 'ACC_089', total_score: 88, risk_level: 'CRITICAL', transactions: 8, volume: 150000 },
    { account: 'ACC_156', total_score: 82, risk_level: 'HIGH', transactions: 15, volume: 75000 },
    { account: 'ACC_045', total_score: 79, risk_level: 'HIGH', transactions: 6, volume: 120000 },
    { account: 'ACC_234', total_score: 75, risk_level: 'HIGH', transactions: 10, volume: 50000 },
  ];

  const weeklyData: WeeklyData[] = [
    { day: 'Mon', transactions: 145, amount: 125000 },
    { day: 'Tue', transactions: 132, amount: 118000 },
    { day: 'Wed', transactions: 164, amount: 142000 },
    { day: 'Thu', transactions: 158, amount: 135000 },
    { day: 'Fri', transactions: 182, amount: 168000 },
    { day: 'Sat', transactions: 98, amount: 89000 },
    { day: 'Sun', transactions: 76, amount: 65000 },
  ];

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtitle, trend = 0 }) => (
    <Card sx={{ 
      height: '100%', 
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      transition: 'transform 0.3s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 24px rgba(99, 102, 241, 0.3)'
      }
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="rgba(255,255,255,0.7)" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography color="white" variant="h3" component="div" sx={{ fontWeight: 700, mb: 1 }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {trend !== 0 && (
                <Chip
                  icon={trend > 0 ? <ArrowUpward /> : <ArrowDownward />}
                  label={`${Math.abs(trend)}%`}
                  size="small"
                  sx={{ 
                    bgcolor: trend > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: trend > 0 ? '#ef4444' : '#10b981',
                    '& .MuiChip-icon': { color: 'inherit' }
                  }}
                />
              )}
              <Typography color="rgba(255,255,255,0.7)" variant="body2">
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getRiskColor = (level: string): "error" | "warning" | "info" | "success" => {
    switch(level) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'success';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Real-time money muling detection and risk analysis
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Refresh Data">
            <IconButton sx={{ mr: 1, bgcolor: '#1e293b', '&:hover': { bgcolor: '#334155' } }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download Report">
            <IconButton sx={{ bgcolor: '#1e293b', '&:hover': { bgcolor: '#334155' } }}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Transactions"
            value={summary.total_transactions}
            icon={<SwapHoriz />}
            subtitle={`$${summary.total_amount.toLocaleString()} volume`}
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Unique Accounts"
            value={summary.unique_accounts}
            icon={<AccountBalance />}
            subtitle={`${summary.cycles_found} cycles detected`}
            trend={-3}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Critical Risk"
            value={summary.critical_risk}
            icon={<Warning />}
            subtitle={`${summary.high_risk} high risk accounts`}
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Patterns Found"
            value={summary.fan_patterns_found}
            icon={<Security />}
            subtitle={`${summary.cycles_found} cycles, ${summary.fan_patterns_found} fans`}
            trend={5}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        {/* Risk Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Risk Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={riskLevels}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {riskLevels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Activity Timeline */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Transaction Activity (24h)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={recentActivity}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  name="Amount ($)"
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#f59e0b"
                  name="Transactions"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Weekly Activity Bar Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Weekly Transaction Volume
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis yAxisId="left" stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="transactions" fill="#6366f1" name="Transactions" />
                <Bar yAxisId="right" dataKey="amount" fill="#f59e0b" name="Amount ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Risk Accounts */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Top Risk Accounts
            </Typography>
            <Grid container spacing={2}>
              {topAccounts.map((account, index) => (
                <Grid item xs={12} key={index}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2,
                      bgcolor: '#0f172a',
                      borderColor: account.risk_level === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                      transition: 'all 0.3s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transform: 'translateX(4px)'
                      }
                    }}
                  >
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={1}>
                        <Avatar 
                          sx={{ 
                            bgcolor: account.risk_level === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                            fontWeight: 'bold',
                            width: 40,
                            height: 40
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      </Grid>
                      <Grid item xs={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {account.account}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Account ID
                        </Typography>
                      </Grid>
                      <Grid item xs={1}>
                        <Typography 
                          variant="h6" 
                          color={account.risk_level === 'CRITICAL' ? 'error' : 'warning.main'}
                          fontWeight={700}
                        >
                          {account.total_score}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Risk Score
                        </Typography>
                      </Grid>
                      <Grid item xs={2}>
                        <Box display="flex" alignItems="center">
                          <Chip
                            label={account.risk_level}
                            color={getRiskColor(account.risk_level)}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box display="flex" gap={1}>
                          <Chip
                            icon={<SwapHoriz />}
                            label={`${account.transactions || 0} txns`}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: '#334155' }}
                          />
                          <Chip
                            icon={<AccountBalance />}
                            label={`$${(account.volume || 0).toLocaleString()}`}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: '#334155' }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(account.total_score || 0, 100)} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#334155',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: account.risk_level === 'CRITICAL' ? '#ef4444' : '#f59e0b'
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardView;