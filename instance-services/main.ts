import * as grpc from 'grpc'
import { EntitiesService } from './protos/entities_grpc_pb'
import { ProxyManagerClient } from './protos/proxy_manager_grpc_pb'
import { ProxyReplyList, ProxyRequest, ProxyRequestList } from './protos/proxy_manager_pb'
import { ServerListClient } from './protos/server_list_grpc_pb'
import { Server, Service, Services } from './protos/server_list_pb'
import { EntitiesServer } from './services/entities/main'

const _env: { [key: string]: string } = {
    PROXY_MANAGER_HOSTNAME: process.env.PROXY_MANAGER_HOSTNAME || '',
    PROXY_MANAGER_PORT: process.env.PROXY_MANAGER_PORT || '',
    SERVER_LIST_HOSTNAME: process.env.SERVER_LIST_HOSTNAME || '',
    SERVER_LIST_PORT: process.env.SERVER_LIST_PORT || '',
    INSTANCE_HOSTNAME: process.env.INSTANCE_HOSTNAME || '',
    INSTANCE_BASE_PORT: process.env.INSTANCE_BASE_PORT || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set.`)
    }
})

const env = {
    PROXY_MANAGER_HOSTNAME: _env.PROXY_MANAGER_HOSTNAME,
    PROXY_MANAGER_PORT: parseInt(_env.PROXY_MANAGER_PORT),
    SERVER_LIST_HOSTNAME: _env.SERVER_LIST_HOSTNAME,
    SERVER_LIST_PORT: parseInt(_env.SERVER_LIST_PORT),
    INSTANCE_HOSTNAME: _env.INSTANCE_HOSTNAME,
    INSTANCE_BASE_PORT: parseInt(_env.INSTANCE_BASE_PORT),
}

const serverClassesAndServices = [
    {
        name: 'Entities',
        ServerClass: EntitiesServer,
        serverService: EntitiesService,
    },
]

const main = async () => {
    const PROXY_MANAGER_URI = `${env.PROXY_MANAGER_HOSTNAME}:${env.PROXY_MANAGER_PORT}`
    const proxyManagerClient = new ProxyManagerClient(PROXY_MANAGER_URI, grpc.credentials.createInsecure())

    const request = new ProxyRequestList()
    const requestList = []

    for (let index = 0; index < serverClassesAndServices.length; index++) {
        const proxyRequest = new ProxyRequest()
        proxyRequest.setBackendHostname(env.INSTANCE_HOSTNAME)
        proxyRequest.setBackendPort(env.INSTANCE_BASE_PORT + index)
        requestList.push(proxyRequest)
    }

    request.setProxyList(requestList)
    proxyManagerClient.put(request, (err, response) => {
        if (err) {
            throw err
        }
        if (!response) {
            throw new Error('No response from proxy manager')
        }
        startServers(response)
    })
}

const startServers = async (proxyReplyList: ProxyReplyList) => {
    const servicesDef = new Services()

    const servers: grpc.Server[] = []

    serverClassesAndServices.forEach(({ name, ServerClass, serverService }, index) => {
        const hostname = env.INSTANCE_HOSTNAME
        const port = env.INSTANCE_BASE_PORT + index

        const proxyFromManager = proxyReplyList.getProxyList()[index].toObject()

        const serviceDef = new Service()
        serviceDef.setBackendHostname(hostname)
        serviceDef.setBackendPort(port)
        serviceDef.setFrontendHostname(proxyFromManager.frontendHostname)
        serviceDef.setFrontendPort(proxyFromManager.frontendPort)

        const server = new grpc.Server()
        //@ts-ignore
        server.addService(serverService, new ServerClass())
        server.bindAsync(`${hostname}:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
            if (err) {
                throw err
            }
            console.log(`${name}: Listening on ${hostname}:${port}`)
            server.start()
        })

        servers.push(server)

        //@ts-ignore
        if (!servicesDef[`set${name}`]) throw new Error(`No setter for ${name}`)
        //@ts-ignore
        servicesDef[`set${name}`](serviceDef)
    })

    const serverDef = new Server()
    serverDef.setServices(servicesDef)

    const SERVER_LIST_URI = `${env.SERVER_LIST_HOSTNAME}:${env.SERVER_LIST_PORT}`

    const serverListClient = new ServerListClient(SERVER_LIST_URI, grpc.credentials.createInsecure())
    try {
        await new Promise<void>((resolve, reject) => {
            serverListClient.put(serverDef, (err, response) => {
                if (err) {
                    console.error(
                        `Error while putting server on server list: ${err.code} ${err.message} ${err.details}`
                    )
                    servers.forEach((server) => server.forceShutdown())
                    reject()
                }
                resolve()
            })
        })
    } catch (err) {
        return
    }

    setInterval(async () => {
        try {
            await new Promise<void>((resolve, reject) => {
                serverListClient.heartbeat(serverDef, (err, response) => {
                    if (err) {
                        console.error(
                            `Error while heartbeating server on server list: ${err.code} ${err.message} ${err.details}`
                        )
                        servers.forEach((server) => server.forceShutdown())
                        reject()
                    }
                    resolve()
                })
            })
        } catch (err) {
            return
        }
    }, 1000)
}

main()
