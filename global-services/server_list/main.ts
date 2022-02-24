import * as grpc from 'grpc';
import { Empty } from './protos/common_pb';
import { ProxyManagerClient } from './protos/proxy_manager_grpc_pb';
import { ProxyRequest, ProxyRequestList } from './protos/proxy_manager_pb';
import { IServerListServer, ServerListService } from './protos/server_list_grpc_pb';
import { ListOfServers, Server } from './protos/server_list_pb';

const _env: { [key: string]: string } = {
    PROXY_MANAGER_HOSTNAME: process.env.PROXY_MANAGER_HOSTNAME || "",
    PROXY_MANAGER_PORT: process.env.PROXY_MANAGER_PORT || "",
    SERVER_LIST_HOSTNAME: process.env.SERVER_LIST_HOSTNAME || "",
    SERVER_LIST_PORT: process.env.SERVER_LIST_PORT || "",
    SERVER_LIST_FRONTEND_PORT: process.env.SERVER_LIST_FRONTEND_PORT || "",
    SERVER_LIST_TIMEOUT: process.env.SERVER_LIST_TIMEOUT || "",
}

Object.keys(_env).forEach(key => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set.`);
    }
});

const env = {
    PROXY_MANAGER_HOSTNAME: _env.PROXY_MANAGER_HOSTNAME,
    PROXY_MANAGER_PORT: parseInt(_env.PROXY_MANAGER_PORT),
    SERVER_LIST_HOSTNAME: _env.SERVER_LIST_HOSTNAME,
    SERVER_LIST_PORT: parseInt(_env.SERVER_LIST_PORT),
    SERVER_LIST_FRONTEND_PORT: parseInt(_env.SERVER_LIST_FRONTEND_PORT),
    SERVER_LIST_TIMEOUT: parseInt(_env.SERVER_LIST_TIMEOUT),
}

const getServerID = (server: Server): string => {
    const id = server.getServices()?.getEntities()?.toObject();
    if (!id) {
        throw new Error(`Server does not have a login service.`);
    }
    return JSON.stringify(id);
}

//@ts-ignore
export class ServerListServer implements IServerListServer {
    servers: { [loginURI: string]: { server: Server, lastUpdateTime: Date } } = {};

    constructor() {
        setInterval(() => {
            const now = new Date();
            for (let loginURI in this.servers) {
                const server = this.servers[loginURI];
                if (now.getTime() - server.lastUpdateTime.getTime() > env.SERVER_LIST_TIMEOUT) {
                    delete this.servers[loginURI];
                }
            }
        }, env.SERVER_LIST_TIMEOUT);
    }


    heartbeat(call: grpc.ServerUnaryCall<Server>, callback: grpc.sendUnaryData<Empty>) {
        const server = call.request;

        const id = getServerID(server);
        if (!this.servers[id]) {
            callback({
                code: grpc.status.NOT_FOUND,
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
                code: grpc.status.ALREADY_EXISTS,
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

const SERVER_LIST_URI = `${env.SERVER_LIST_HOSTNAME}:${env.SERVER_LIST_PORT}`;

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

const PROXY_MANAGER_URI = `${env.PROXY_MANAGER_HOSTNAME}:${env.PROXY_MANAGER_PORT}`;
const proxyManagerClient = new ProxyManagerClient(PROXY_MANAGER_URI, grpc.credentials.createInsecure());

const request = new ProxyRequestList();
const proxyRequest = new ProxyRequest();
proxyRequest.setBackendHostname(env.SERVER_LIST_HOSTNAME);
proxyRequest.setBackendPort(env.SERVER_LIST_PORT);
proxyRequest.setForceFrontendPort(env.SERVER_LIST_FRONTEND_PORT);

request.setProxyList([proxyRequest]);
console.log(PROXY_MANAGER_URI);
proxyManagerClient.put(request, (err, response) => {
    if (err) {
        console.log(`Server List: Failed to register with proxy manager: ${err.message}`);
        throw err;
    }
    console.log(`Successfully Started Proxy on Port ${env.SERVER_LIST_FRONTEND_PORT}`);
});