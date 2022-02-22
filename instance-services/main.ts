import grpc from "grpc";
import { ServerListClient } from "./protos/server_list_grpc_pb";
import { Server, Service, Services } from "./protos/server_list_pb";
import { EntitiesServer } from "./services/entities/main";
import { EntitiesService } from "./services/entities/protos/entities_grpc_pb";
import { LoginServer } from "./services/login/main";
import { LoginService } from "./services/login/protos/login_grpc_pb";
import { TerrainServer } from "./services/terrain/main";
import { TerrainService } from "./services/terrain/protos/terrain_grpc_pb";

const HOSTNAME = process.env.HOSTNAME;
const _BASE_PORT = process.env.BASE_PORT;
const SERVER_LIST_URI = process.env.SERVER_LIST_URI;

if (!HOSTNAME) {
    throw new Error('Environment variable HOSTNAME is not set.');
}
if (!_BASE_PORT) {
    throw new Error('Environment variable BASE_PORT is not set.');
}
const BASE_PORT = parseInt(_BASE_PORT);

if (!SERVER_LIST_URI) {
    throw new Error('Environment variable SERVER_LIST_URI is not set.');
}

const serverClassesAndServices = [{
    name: 'Terrain',
    ServerClass: TerrainServer,
    serverService: TerrainService,
}, {
    name: 'Entities',
    ServerClass: EntitiesServer,
    serverService: EntitiesService,
}, {
    name: 'Login',
    ServerClass: LoginServer,
    serverService: LoginService,
}];

const main = async () => {
    const servicesDef = new Services();

    const servers: grpc.Server[] = [];

    serverClassesAndServices.forEach(({ name, ServerClass, serverService }, index) => {
        const hostname = HOSTNAME;
        const port = BASE_PORT + index;

        const serviceDef = new Service();
        serviceDef.setHostname(hostname);
        serviceDef.setPort(port);

        const server = new grpc.Server();
        server.addService(serverService, new ServerClass());
        server.bindAsync(`${HOSTNAME}:${BASE_PORT + index}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
            if (err) {
                throw err;
            }
            console.log(`${name}: Listening on ${BASE_PORT + index}`);
            server.start();
        });

        servers.push(server);

        //@ts-ignore
        if (!servicesDef[`set${name}`]) throw new Error(`No setter for ${name}`);
        //@ts-ignore
        servicesDef[`set${name}`](serviceDef);
    })

    const serverDef = new Server();
    serverDef.setServices(servicesDef);
    serverDef.setMaxPlayers(100);
    serverDef.setPlayers(0);

    const serverListClient = new ServerListClient(SERVER_LIST_URI, grpc.credentials.createInsecure());
    try {
        await new Promise<void>((resolve, reject) => {
            serverListClient.put(serverDef, (err, response) => {
                if (err) {
                    console.error(`Error while putting server on server list: ${err.code} ${err.message} ${err.details}`);
                    servers.forEach(server => server.forceShutdown());
                    reject();
                }
                resolve();
            });
        });
    }
    catch (err) {
        return;
    }

    setInterval(async () => {
        try {
            await new Promise<void>((resolve, reject) => {
                serverListClient.heartbeat(serverDef, (err, response) => {
                    if (err) {
                        console.error(`Error while heartbeating server on server list: ${err.code} ${err.message} ${err.details}`);
                        servers.forEach(server => server.forceShutdown());
                        reject();
                    }
                    resolve();
                });
            });
        }
        catch (err) {
            return;
        }
    }, 1000);
}

main();
