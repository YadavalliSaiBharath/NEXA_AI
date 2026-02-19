import React, { useState } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Upload,
  Assessment,
  NetworkCheck,
  Analytics,
} from '@mui/icons-material';
import DashboardView from './components/DashboardView';
import UploadView from './components/UploadView';
import NetworkView from './components/NetworkView';
import ReportsView from './components/ReportsView';
import AnalyticsView from './components/AnalyticsView';

// Define theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#8b5cf6',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
    success: {
      main: '#10b981',
    },
    info: {
      main: '#3b82f6',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1e293b',
          borderRight: '1px solid #334155',
        },
      },
    },
  },
});

// Define types for analysis data
interface AnalysisData {
  analysis_id: string;
  timestamp: string;
  summary: {
    total_transactions: number;
    total_amount: number;
    unique_accounts: number;
    cycles_found: number;
    fan_patterns_found: number;
    chains_found: number;
    critical_risk: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  cycles: string[][];
  fan_patterns: {
    fan_out: Array<{
      account: string;
      recipient_count: number;
      total_amount: number;
    }>;
    fan_in: Array<{
      account: string;
      sender_count: number;
      total_amount: number;
    }>;
  };
  chains: Array<{
    path: string;
    length: number;
    accounts: string[];
  }>;
  risk_scores: Array<{
    account: string;
    total_score: number;
    risk_level: string;
    risk_factors: string[];
    component_scores: {
      cycle: number;
      fan: number;
      ml_anomaly: number;
      network_position: number;
      temporal: number;
      flow_imbalance: number;
    };
  }>;
  network_stats: {
    density: number;
    avg_clustering: number;
    num_components: number;
    avg_in_degree: number;
    avg_out_degree: number;
  };
}

// Define menu item type
interface MenuItem {
  text: string;
  icon: React.ReactNode;
  view: string;
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const menuItems: MenuItem[] = [
    { text: 'Dashboard', icon: <Dashboard />, view: 'dashboard' },
    { text: 'Upload Data', icon: <Upload />, view: 'upload' },
    { text: 'Network Graph', icon: <NetworkCheck />, view: 'network' },
    { text: 'Analytics', icon: <Analytics />, view: 'analytics' },
    { text: 'Reports', icon: <Assessment />, view: 'reports' },
  ];

  const renderView = (): React.ReactNode => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView data={analysisData} />;
      case 'upload':
        return <UploadView onAnalysisComplete={setAnalysisData} />;
      case 'network':
        return <NetworkView data={analysisData} />;
      case 'analytics':
        return <AnalyticsView data={analysisData} />;
      case 'reports':
        return <ReportsView data={analysisData} />;
      default:
        return <DashboardView data={analysisData} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            boxShadow: 'none'
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 40, 
                  height: 40,
                  mr: 2
                }}
              >
                N
              </Avatar>
              <Typography variant="h6" component="div">
                NEXA AI
              </Typography>
              <Chip 
                label="Money Mule Detection" 
                size="small" 
                sx={{ ml: 2, backgroundColor: '#334155' }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'secondary.main',
                  width: 35,
                  height: 35
                }}
              >
                U
              </Avatar>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Sidebar Drawer */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            width: 280,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: 280, 
              boxSizing: 'border-box',
              backgroundColor: '#1e293b',
              borderRight: '1px solid #334155',
              pt: 8
            },
          }}
        >
          <Box sx={{ overflow: 'auto', mt: 2 }}>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => setCurrentView(item.view)}
                    selected={currentView === item.view}
                    sx={{
                      mx: 2,
                      mb: 0.5,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: currentView === item.view ? 'white' : '#94a3b8' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{
                        fontWeight: currentView === item.view ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3,
            pt: 10,
            backgroundColor: '#0f172a',
            minHeight: '100vh',
            transition: 'margin-left 0.3s',
            ml: drawerOpen ? 0 : -28,
          }}
        >
          <Container maxWidth="xl">
            {renderView()}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;