import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// Create a theme instance.
const theme = createTheme({
  palette: {
    primary: {
      main: '#06A77D',
    },
    secondary: {
      main: '#052F5F',
    },
    error: {
      main: red.A400,
    },
  },
});

export default theme;