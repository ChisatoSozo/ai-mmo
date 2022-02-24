import { createTheme, ThemeProvider } from '@mui/material/styles';
import React from 'react';
import {
  BrowserRouter as Router, Route, Routes
} from "react-router-dom";
import { Game } from './pages/Game';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/game" element={<Game />} />
          <Route path="/register" element={<Register />} />

        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
