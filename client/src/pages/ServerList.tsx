import { grpc } from '@improbable-eng/grpc-web'
import { Box, Button, Container, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useUsername } from '../hooks/useUsername'
import { Empty } from '../protos/common_pb'
import { ListOfServers, Server } from '../protos/server_list_pb'
import { ServerListClient } from '../protos/server_list_pb_service'

const _env: { [key: string]: string } = {
    REACT_APP_SERVER_LIST_HOSTNAME: window.location.hostname || '',
    REACT_APP_SERVER_LIST_FRONTEND_PORT: process.env.REACT_APP_SERVER_LIST_FRONTEND_PORT || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Missing environment variable ${key}`)
    }
})

const env = {
    REACT_APP_SERVER_LIST_HOSTNAME: _env.REACT_APP_SERVER_LIST_HOSTNAME,
    REACT_APP_SERVER_LIST_FRONTEND_PORT: parseInt(_env.REACT_APP_SERVER_LIST_FRONTEND_PORT),
}

export const ServerList = () => {
    const username = useUsername()
    const [serverList, setServerList] = useState<ListOfServers.AsObject>()
    useEffect(() => {
        const SERVER_LIST_URI = `http://${env.REACT_APP_SERVER_LIST_HOSTNAME}:${env.REACT_APP_SERVER_LIST_FRONTEND_PORT}`
        const serverListClient = new ServerListClient(SERVER_LIST_URI)
        serverListClient.get(new Empty(), new grpc.Metadata(), (err, response) => {
            if (err) {
                console.log(err)
                return
            }
            if (!response) {
                throw new Error('No response from server')
            }
            setServerList(response.toObject())
        })
    }, [])

    const handleJoinServer = (server: Server.AsObject) => {
        localStorage.setItem('server', JSON.stringify(server))
        window.location.href = `${process.env.PUBLIC_URL}/game`
    }

    return (
        <Container component="main" maxWidth="sm">
            <Box
                component="div"
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Welcome {username}
                </Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Typography>Server IP</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography>Server Port</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography>Join</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {serverList &&
                            serverList.serversList.map((server) => {
                                return (
                                    <TableRow
                                        key={`${server.services?.entities?.frontendHostname}${server.services?.entities?.frontendPort}`}
                                    >
                                        <TableCell>
                                            <Typography>{server.services?.entities?.frontendHostname}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography>{server.services?.entities?.frontendPort}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Button onClick={() => handleJoinServer(server)}>Join</Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                    </TableBody>
                </Table>
            </Box>
        </Container>
    )
}
