import * as grpc from 'grpc'
import { ProxyManagerClient } from './protos/proxy_manager_grpc_pb'
import { ProxyRequest, ProxyRequestList } from './protos/proxy_manager_pb'

export const constructProxy = (PROXY_MANAGER_URI: string, HOSTNAME: string, PORT: number, FRONTEND_PORT: number) => {
    return new Promise<void>((resolve, reject) => {
        const proxyManagerClient = new ProxyManagerClient(PROXY_MANAGER_URI, grpc.credentials.createInsecure())

        const request = new ProxyRequestList()
        const proxyRequest = new ProxyRequest()
        proxyRequest.setBackendHostname(HOSTNAME)
        proxyRequest.setBackendPort(PORT)
        proxyRequest.setForceFrontendPort(FRONTEND_PORT)

        request.setProxyList([proxyRequest])
        console.log(PROXY_MANAGER_URI)
        proxyManagerClient.put(request, (err, response) => {
            if (err) {
                console.log(`Server List: Failed to register with proxy manager: ${err.message}`)
                reject(err)
            }
            console.log(`Successfully Started Proxy on Port ${FRONTEND_PORT}`)
            resolve()
        })
    })
}
