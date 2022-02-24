import { useEffect, useState } from "react";
import { Empty } from "../protos/common_pb";
import { ServerListClient } from "../protos/server_list_grpc_web_pb";

export const Game = () => {
    const [serverList, setServerList] = useState<any>();
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

    return <>{serverList}</>;
}