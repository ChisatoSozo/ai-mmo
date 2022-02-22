import * as grpc from 'grpc';
import { Empty } from './protos/common_pb';
import { IServerListServer, ServerListService } from './protos/server_list_grpc_pb';
import { ListOfServers, Server } from './protos/server_list_pb';

const _SERVER_TIMEOUT = process.env.SERVER_TIMEOUT;
if (!_SERVER_TIMEOUT) {
    throw new Error('Environment variable SERVER_TIMEOUT is not set.');
}
const SERVER_TIMEOUT = parseInt(_SERVER_TIMEOUT);

const SERVER_LIST_URI = process.env.SERVER_LIST_URI;
if (!SERVER_LIST_URI) {
    throw new Error('Environment variable SERVER_LIST_URI is not set.');
}

const getServerID = (server: Server): string => {
    return server.getServices()?.getLogin()?.getHostname() + ':' + server.getServices()?.getLogin()?.getPort()
}

//@ts-ignore
export class ServerListServer implements IServerListServer {
    servers: { [loginURI: string]: { server: Server, lastUpdateTime: Date } } = {};

    constructor() {
        setInterval(() => {
            const now = new Date();
            for (let loginURI in this.servers) {
                const server = this.servers[loginURI];
                if (now.getTime() - server.lastUpdateTime.getTime() > SERVER_TIMEOUT) {
                    delete this.servers[loginURI];
                }
            }
        }, SERVER_TIMEOUT);
    }


    heartbeat(call: grpc.ServerUnaryCall<Server>, callback: grpc.sendUnaryData<Empty>) {
        const server = call.request;

        const id = getServerID(server);
        if (!this.servers[id]) {
            callback({
                code: -1,
                name: 'NOT_FOUND',
                message: 'Server not found',
            }, null);
            return;
        }

        this.servers[id] = {
            server: server,
            lastUpdateTime: new Date()
        };
        callback(null, new Empty());
    }

    put(call: grpc.ServerUnaryCall<Server>, callback: grpc.sendUnaryData<Empty>) {
        const id = getServerID(call.request);

        if (this.servers[id]) {
            callback({
                code: -1,
                name: 'ALREADY_EXISTS',
                message: 'Server already exists',
            }, null);
            return;
        }

        this.servers[id] = { server: call.request, lastUpdateTime: new Date() };

        callback(null, new Empty());
    }

    get(call: grpc.ServerUnaryCall<Empty>, callback: grpc.sendUnaryData<ListOfServers>) {
        const response = new ListOfServers();
        response.setServersList(Object.values(this.servers).map(server => server.server));
        callback(null, response);
    }
}

const server = new grpc.Server();
//@ts-ignore
server.addService(ServerListService, new ServerListServer());
server.bindAsync(SERVER_LIST_URI, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log(`Server List: Listening on ${SERVER_LIST_URI}`);
    server.start();
});