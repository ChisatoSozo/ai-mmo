import * as grpc from "grpc";
import { ServerListClient } from "./protos/server_list_grpc_pb";
import { Server, Service, Services } from "./protos/server_list_pb";
import { EntitiesServer } from "./services/entities/main";
import { EntitiesService } from "./services/entities/protos/entities_grpc_pb";
import { LoginServer } from "./services/login/main";
import { LoginService } from "./services/login/protos/login_grpc_pb";
import { TerrainServer } from "./services/terrain/main";
import { TerrainService } from "./services/terrain/protos/terrain_grpc_pb";

const _env = {
    _TERRAIN_HOSTNAME: process.env.TERRAIN_HOSTNAME,
    _TERRAIN_PORT: process.env.TERRAIN_PORT,
    _ENTITIES_HOSTNAME: process.env.ENTITIES_HOSTNAME,
    _ENTITIES_PORT: process.env.ENTITIES_PORT,
    _LOGIN_HOSTNAME: process.env.LOGIN_HOSTNAME,
    _LOGIN_PORT: process.env.LOGIN_PORT,
    _SERVER_LIST_URI
}

if (!SERVER_LIST_URI) {
    throw new Error('Environment variable SERVER_LIST_URI is not set.');
}

const serverClassesAndServices = [{
    name: 'Terrain',
    hostname: process.env.TERRAIN_HOSTNAME,
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
        const hostname = BASE_HOSTNAME;
        const port = BASE_PORT + index;

        const serviceDef = new Service();
        serviceDef.setHostname(hostname);
        serviceDef.setPort(port);

        const server = new grpc.Server();
        server.addService(serverService, new ServerClass());
        server.bindAsync(`${BASE_HOSTNAME}:${BASE_PORT + index}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
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
