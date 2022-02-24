import { Box, Button, Container, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useUsername } from "../hooks/useUsername";
import { Empty } from "../protos/common_pb";
import { ServerListClient } from "../protos/server_list_grpc_web_pb";
import { ListOfServers, Server } from "../protos/server_list_pb";

export const ServerList = () => {
    const username = useUsername();
    const [serverList, setServerList] = useState<ListOfServers.AsObject>();
    useEffect(() => {
        const SERVER_LIST_URI = `http://${process.env.REACT_APP_SERVER_LIST_HOSTNAME}:${process.env.REACT_APP_SERVER_LIST_FRONTEND_PORT}`;
        const serverListClient = new ServerListClient(SERVER_LIST_URI, null, null);
        serverListClient.get(new Empty(), undefined, (err, response) => {
            if (err) {
                console.log(err);
                return;
            }
            setServerList(response.toObject());
        })
    }, [])

    const handleJoinServer = (server: Server.AsObject) => {
        localStorage.setItem('server', JSON.stringify(server));
        window.location.href = `${process.env.PUBLIC_URL}/game`;
    }

    return <Container component="main" maxWidth="sm">
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
                    {serverList && serverList.serversList.map(server => {
                        return <TableRow key={`${server.services?.entities?.frontendHostname}${server.services?.entities?.frontendPort}`}>
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
                    })}
                </TableBody>
            </Table>
        </Box>
    </Container>
}