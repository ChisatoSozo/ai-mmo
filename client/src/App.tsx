import { CssBaseline } from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Game } from './babylon/Game'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ServerList } from './pages/ServerList'

const theme = createTheme()

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Routes>
                    <Route path={`${process.env.PUBLIC_URL}/`} element={<Login />} />
                    <Route path={`${process.env.PUBLIC_URL}/serverList`} element={<ServerList />} />
                    <Route path={`${process.env.PUBLIC_URL}/register`} element={<Register />} />
                    <Route path={`${process.env.PUBLIC_URL}/game`} element={<Game />} />
                </Routes>
            </Router>
        </ThemeProvider>
    )
}

export default App
