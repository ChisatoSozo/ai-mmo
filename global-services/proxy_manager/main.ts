import * as grpc from 'grpc'
import { launchWebProxies } from './launchWebProxy'
import { IProxyManagerServer, ProxyManagerService } from './protos/proxy_manager_grpc_pb'
import { ProxyReplyList, ProxyRequestList } from './protos/proxy_manager_pb'

const _env: { [key: string]: string } = {
    PROXY_MANAGER_PORT: process.env.PROXY_MANAGER_PORT || '',
    PROXY_MANAGER_HOSTNAME: process.env.PROXY_MANAGER_HOSTNAME || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set`)
    }
})

const env = {
    PROXY_MANAGER_PORT: parseInt(_env.PROXY_MANAGER_PORT),
    PROXY_MANAGER_HOSTNAME: _env.PROXY_MANAGER_HOSTNAME,
}

//@ts-ignore
export class ProxyManagerServer implements IProxyManagerServer {
    put(call: grpc.ServerUnaryCall<ProxyRequestList>, callback: grpc.sendUnaryData<ProxyReplyList>) {
        try {
            const proxies = launchWebProxies(call.request)
            const response = new ProxyReplyList()
            response.setProxyList(proxies)
            callback(null, response)
        } catch (e: any) {
            console.error(e)
            callback(
                {
                    code: grpc.status.INTERNAL,
                    name: 'INTERNAL',
                    message: e.message,
                },
                null
            )
        }
    }
}

const PROXY_MANAGER_URI = `${env.PROXY_MANAGER_HOSTNAME}:${env.PROXY_MANAGER_PORT}`

const server = new grpc.Server()
//@ts-ignore
server.addService(ProxyManagerService, new ProxyManagerServer())
server.bindAsync(PROXY_MANAGER_URI, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err
    }
    console.log(`Proxy Manager: Listening on ${env.PROXY_MANAGER_HOSTNAME}:${port}`)
    try {
        server.start()
    } catch (e) {
        console.error(e)
    }
})
