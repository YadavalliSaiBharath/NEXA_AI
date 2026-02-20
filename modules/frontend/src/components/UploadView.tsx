import React, { useState, useCallback, useRef } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  LinearProgress,
  Alert,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Timeline,
  Security,
  Analytics,
  AttachFile,
  Info,
  ExpandMore,
  ExpandLess,
  CheckCircleOutline
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
}

interface FileWithPreview extends File {
  preview?: string;
}

const UploadView: React.FC<UploadViewProps> = ({ onAnalysisComplete }) => {
  const [file, setFile] = useState<FileWithPreview | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [expanded, setExpanded] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setActiveStep(1);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 104857600 // 100MB
  });

  const clearIntervalFn = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress for better UX
      intervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearIntervalFn();
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/analyze/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(Math.min(percent, 90));
            }
          }
        }
      );

      clearIntervalFn();
      setProgress(100);
      setAnalysisResult(response.data);
      onAnalysisComplete(response.data);
      setActiveStep(2);
      
      setTimeout(() => {
        setUploading(false);
      }, 500);

    } catch (err: any) {
      clearIntervalFn();
      setError(err.response?.data?.detail || err.message || 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisResult(null);
    setError(null);
    setActiveStep(0);
    setProgress(0);
    clearIntervalFn();
  };

  const steps = [
    {
      label: 'Upload CSV File',
      description: 'Select a transaction CSV file with the required columns',
      icon: <CloudUpload />
    },
    {
      label: 'AI Analysis',
      description: 'Our AI engine analyzes patterns, detects cycles, and calculates risk scores',
      icon: <Security />
    },
    {
      label: 'View Results',
      description: 'Explore the interactive dashboard with detected patterns and risk assessments',
      icon: <Analytics />
    },
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadSampleCSV = () => {
    const sample = "transaction_id,sender_id,receiver_id,amount,timestamp\nT001,ACC_A,ACC_B,1000,2024-01-01 09:00:00\nT002,ACC_B,ACC_C,1000,2024-01-01 10:00:00\nT003,ACC_C,ACC_A,1000,2024-01-01 11:00:00";
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700 }}>
        Upload Transaction Data
      </Typography>

      <Grid container spacing={3}>
        {/* Main Upload Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, bgcolor: '#1e293b' }}>
            {/* Stepper */}
            <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel StepIconComponent={() => (
                    <Box 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: activeStep > index ? '#10b981' : activeStep === index ? '#6366f1' : '#334155',
                        color: 'white',
                        mr: 2
                      }}
                    >
                      {activeStep > index ? <CheckCircle sx={{ fontSize: 20 }} /> : step.icon}
                    </Box>
                  )}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {step.label}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography color="textSecondary" gutterBottom sx={{ ml: 5 }}>
                      {step.description}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {/* Dropzone */}
            {activeStep === 0 && (
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : '#334155',
                  borderRadius: 3,
                  p: 6,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  backgroundColor: isDragActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)'
                  }
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                {isDragActive ? (
                  <Typography variant="h5" gutterBottom>Drop the file here</Typography>
                ) : (
                  <>
                    <Typography variant="h5" gutterBottom>
                      Drag & drop a CSV file here
                    </Typography>
                    <Typography variant="body1" color="textSecondary" paragraph>
                      or click to browse
                    </Typography>
                  </>
                )}
                <Chip 
                  label="Supports CSV up to 100MB" 
                  size="small" 
                  variant="outlined"
                  sx={{ mt: 2 }}
                />
              </Box>
            )}

            {/* File Info & Upload */}
            {file && activeStep === 1 && (
              <Box>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3, 
                    bgcolor: '#0f172a',
                    border: '1px solid #334155',
                    '& .MuiAlert-icon': { color: '#6366f1' }
                  }} 
                  icon={<AttachFile />}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{file.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Size: {formatFileSize(file.size)} | Type: {file.type || 'text/csv'}
                    </Typography>
                  </Box>
                </Alert>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleUpload}
                  disabled={uploading}
                  fullWidth
                  sx={{ 
                    py: 1.5,
                    fontSize: '1.1rem',
                    background: 'linear-gradient(45deg, #6366f1 30%, #8b5cf6 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #4f52e0 30%, #7c3aed 90%)',
                    }
                  }}
                >
                  {uploading ? 'Processing...' : '🚀 Start AI Analysis'}
                </Button>

                {uploading && (
                  <Box sx={{ mt: 3 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: '#334155',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#6366f1'
                        }
                      }}
                    />
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                      {progress}% - Analyzing transactions...
                    </Typography>
                  </Box>
                )}

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ mt: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={handleReset}>
                        Try Again
                      </Button>
                    }
                  >
                    {error}
                  </Alert>
                )}

                <Button 
                  variant="text" 
                  onClick={handleReset}
                  sx={{ mt: 2 }}
                  disabled={uploading}
                >
                  Cancel and choose different file
                </Button>
              </Box>
            )}

            {/* Success */}
            {analysisResult && activeStep === 2 && (
              <Alert
                severity="success"
                icon={<CheckCircleOutline />}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={handleReset}
                  >
                    Upload New
                  </Button>
                }
                sx={{ 
                  mt: 2,
                  bgcolor: '#0f172a',
                  border: '1px solid #10b981'
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Analysis Complete!
                </Typography>
                <Typography variant="body2">
                  Found {analysisResult.summary?.cycles_found || 0} cycles,{' '}
                  {analysisResult.summary?.fan_patterns_found || 0} fan patterns, and{' '}
                  {analysisResult.summary?.critical_risk || 0} critical risk accounts.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Info Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b', position: 'sticky', top: 90 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Requirements
              </Typography>
              <IconButton onClick={() => setExpanded(!expanded)} size="small">
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Required Columns:
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip label="transaction_id" size="small" sx={{ mr: 1, mb: 1, bgcolor: '#334155' }} />
                <Chip label="sender_id" size="small" sx={{ mr: 1, mb: 1, bgcolor: '#334155' }} />
                <Chip label="receiver_id" size="small" sx={{ mr: 1, mb: 1, bgcolor: '#334155' }} />
                <Chip label="amount" size="small" sx={{ mr: 1, mb: 1, bgcolor: '#334155' }} />
                <Chip label="timestamp" size="small" sx={{ mr: 1, mb: 1, bgcolor: '#334155' }} />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Sample Format:
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  bgcolor: '#0f172a', 
                  mb: 2,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  borderColor: '#334155',
                  overflowX: 'auto'
                }}
              >
                transaction_id,sender_id,receiver_id,amount,timestamp{'\n'}
                T001,ACC_A,ACC_B,1000,2024-01-01 09:00:00{'\n'}
                T002,ACC_B,ACC_C,1000,2024-01-01 10:00:00{'\n'}
                T003,ACC_C,ACC_A,1000,2024-01-01 11:00:00
              </Paper>

              <Typography variant="subtitle2" gutterBottom>
                What We Detect:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Timeline sx={{ color: '#ef4444', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Money muling cycles" 
                    secondary="Circular transaction patterns"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Security sx={{ color: '#f59e0b', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Fan-in / Fan-out patterns" 
                    secondary="Distribution and collection hubs"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Analytics sx={{ color: '#10b981', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Risk scoring (0-100)" 
                    secondary="ML-based anomaly detection"
                  />
                </ListItem>
              </List>

              <Alert 
                severity="info" 
                icon={<Info />}
                sx={{ 
                  mt: 2,
                  bgcolor: '#0f172a',
                  border: '1px solid #334155'
                }}
              >
                <Typography variant="caption">
                  Maximum file size: 100MB. Processing time depends on file size.
                </Typography>
              </Alert>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="textSecondary">
                  Need sample data?
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  fullWidth
                  onClick={downloadSampleCSV}
                >
                  Download Sample CSV
                </Button>
              </Box>
            </Collapse>

            {!expanded && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                  Click expand to see full requirements
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UploadView;