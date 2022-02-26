import { grpc } from '@improbable-eng/grpc-web'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useMemo } from 'react'
import { login } from '../protos/login'
import { AuthenticationForm } from '../protos/login_pb'
import { LoginClient } from '../protos/login_pb_service'
import { staticCastToGoogle } from '../utils/PBUtils'

const _env: { [key: string]: string } = {
    REACT_APP_LOGIN_HOSTNAME: window.location.hostname || '',
    REACT_APP_LOGIN_FRONTEND_PORT: process.env.REACT_APP_LOGIN_FRONTEND_PORT || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Missing environment variable ${key}`)
    }
})

const env = {
    REACT_APP_LOGIN_HOSTNAME: _env.REACT_APP_LOGIN_HOSTNAME,
    REACT_APP_LOGIN_FRONTEND_PORT: parseInt(_env.REACT_APP_LOGIN_FRONTEND_PORT),
}

export const Register: React.FC = () => {
    const loginClient = useMemo(() => {
        const LOGIN_URI = `http://${env.REACT_APP_LOGIN_HOSTNAME}:${env.REACT_APP_LOGIN_FRONTEND_PORT}`
        console.log(LOGIN_URI)
        return new LoginClient(LOGIN_URI)
    }, [])

    const [error, setError] = React.useState<string | null>(null)

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        // eslint-disable-next-line no-console

        if (data.get('password') !== data.get('confirm-password')) {
            setError('Passwords do not match')
            return
        }

        const authenticationForm = new login.AuthenticationForm()
        authenticationForm.username = data.get('username') as string
        authenticationForm.password = data.get('password') as string

        const message = staticCastToGoogle<AuthenticationForm>(authenticationForm, AuthenticationForm)

        loginClient.register(message, new grpc.Metadata(), (err, response) => {
            if (err) {
                setError(err.message)
                return
            }
            if (!response) {
                throw new Error('No response from server')
            }
            const loginResponse = response.toObject()
            localStorage.setItem('token', loginResponse.token)
            window.location.href = `${process.env.PUBLIC_URL}/serverList`
        })
    }

    return (
        <Container component="main" maxWidth="xs">
            <Box
                component="div"
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Register
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Username"
                        name="username"
                        autoComplete="username"
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirm-password"
                        label="Confirm Password"
                        type="password"
                        id="confirm-password"
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Register
                    </Button>
                    <Grid container>
                        <Grid item xs>
                            {error && (
                                <Typography variant="body2" color="error">
                                    {error}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item></Grid>
                    </Grid>
                </Box>
            </Box>
        </Container>
    )
}
