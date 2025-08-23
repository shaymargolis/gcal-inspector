import { createTheme } from '@mui/material/styles'

// Create a dark theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7cc2ff',
    },
    background: {
      default: '#0b0d10',
      paper: '#151a1f',
    },
    text: {
      primary: '#e8e8e8',
      secondary: '#97a3af',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #26303a',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #26303a',
        },
      },
    },
  },
})
