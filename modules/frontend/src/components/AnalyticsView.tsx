import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Line,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  WarningAmber,
  CheckCircle
} from '@mui/icons-material';

interface AnalyticsViewProps {
  data: any;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const summary = data?.summary || {
    total_transactions: 0,
    total_amount: 0,
    unique_accounts: 0,
    cycles_found: 0,
    fan_patterns_found: 0,
    chains_found: 0,
    critical_risk: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0
  };

  // Enhanced hourly data with cumulative
  const hourlyData = [
    { hour: '00-03', transactions: 120, amount: 45000, cumulative: 120 },
    { hour: '03-06', transactions: 80, amount: 32000, cumulative: 200 },
    { hour: '06-09', transactions: 250, amount: 89000, cumulative: 450 },
    { hour: '09-12', transactions: 420, amount: 156000, cumulative: 870 },
    { hour: '12-15', transactions: 380, amount: 142000, cumulative: 1250 },
    { hour: '15-18', transactions: 350, amount: 128000, cumulative: 1600 },
    { hour: '18-21', transactions: 290, amount: 98000, cumulative: 1890 },
    { hour: '21-24', transactions: 180, amount: 67000, cumulative: 2070 }
  ];

  // Risk trend data
  const riskTrendData = [
    { day: 'Mon', critical: 3, high: 8, medium: 20, low: 120 },
    { day: 'Tue', critical: 4, high: 10, medium: 22, low: 125 },
    { day: 'Wed', critical: 5, high: 12, medium: 25, low: 130 },
    { day: 'Thu', critical: 6, high: 14, medium: 28, low: 135 },
    { day: 'Fri', critical: 8, high: 16, medium: 30, low: 140 },
    { day: 'Sat', critical: 6, high: 13, medium: 26, low: 133 },
    { day: 'Sun', critical: 5, high: 11, medium: 23, low: 128 }
  ];

  // Accounts by risk score
  const riskScoreDistribution = [
    { range: '90-100', count: summary.critical_risk * 0.3 || 2 },
    { range: '70-90', count: summary.critical_risk * 0.7 || 3 },
    { range: '50-70', count: summary.high_risk * 0.5 || 6 },
    { range: '30-50', count: summary.medium_risk * 0.6 || 15 },
    { range: '0-30', count: summary.low_risk * 0.7 || 41 }
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#10b981'];

  const StatMetric = ({ title, value, icon, color, trend }: any) => (
    <Card sx={{ bgcolor: '#1e293b', border: `2px solid ${color}30` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                {trend > 0 ? <TrendingUp fontSize="small" color="error" /> : <TrendingDown fontSize="small" color="success" />}
                <Typography variant="caption" sx={{ color: trend > 0 ? '#ef4444' : '#10b981' }}>
                  {Math.abs(trend)}% vs last period
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ opacity: 0.7 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700 }}>
        📊 Advanced Analytics & Insights
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatMetric 
            title="Total Transactions" 
            value={summary.total_transactions}
            icon={<TrendingUp sx={{ fontSize: 32, color: '#6366f1' }} />}
            color="#6366f1"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatMetric 
            title="Total Volume" 
            value={`$${(summary.total_amount / 1000000)?.toFixed(2)}M`}
            icon={<TrendingUp sx={{ fontSize: 32, color: '#f59e0b' }} />}
            color="#f59e0b"
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatMetric 
            title="Unique Accounts" 
            value={summary.unique_accounts}
            icon={<CheckCircle sx={{ fontSize: 32, color: '#10b981' }} />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatMetric 
            title="Risk Alerts" 
            value={summary.critical_risk + summary.high_risk}
            icon={<WarningAmber sx={{ fontSize: 32, color: '#ef4444' }} />}
            color="#ef4444"
            trend={15}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Transaction Volume Over Time */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              📈 Transaction Volume & Cumulative Trend
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis yAxisId="left" stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Bar yAxisId="left" dataKey="transactions" fill="#6366f1" name="Hourly Txns" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#f59e0b" strokeWidth={3} name="Cumulative" dot={{ fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Risk Distribution Pie */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              🎯 Risk Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Critical', value: summary.critical_risk || 5 },
                    { name: 'High', value: summary.high_risk || 12 },
                    { name: 'Medium', value: summary.medium_risk || 25 },
                    { name: 'Low', value: summary.low_risk || 58 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} accounts`} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Risk Trend Over Time */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              📉 Risk Escalation Trend (Weekly)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.7} name="Critical" />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.7} name="High" />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.7} name="Medium" />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} name="Low" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Risk Score Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              📊 Score Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={riskScoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="range" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pattern Statistics */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              🔍 Detected Patterns
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Cycles (Money Rings)</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef4444' }}>
                          {summary.cycles_found || 0}
                        </Typography>
                      </Box>
                      <Chip label="High Risk" color="error" size="small" />
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min((summary.cycles_found || 0) * 20, 100)} sx={{ height: 6, borderRadius: 3 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Fan Patterns (Hubs)</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                          {summary.fan_patterns_found || 0}
                        </Typography>
                      </Box>
                      <Chip label="Medium Risk" color="warning" size="small" />
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min((summary.fan_patterns_found || 0) * 5, 100)} sx={{ height: 6, borderRadius: 3 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Transaction Chains</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                          {summary.chains_found || 0}
                        </Typography>
                      </Box>
                      <Chip label="Monitor" size="small" />
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min((summary.chains_found || 0) * 10, 100)} sx={{ height: 6, borderRadius: 3 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Network Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              🕸️ Network Infrastructure Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#0f172a' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Network Density
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#6366f1' }}>
                      {((data?.network_stats?.density || 0) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">Connection Concentration</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#0f172a' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Clustering Coefficient
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      {((data?.network_stats?.avg_clustering || 0) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">Triangle Formation</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#0f172a' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Components
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                      {data?.network_stats?.num_components || 1}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">Isolated Groups</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: '#0f172a' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Avg Degree
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                      {(data?.network_stats?.avg_in_degree || 0).toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">Connections/Node</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsView;