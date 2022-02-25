import * as grpc from 'grpc'
import * as jwt from 'jsonwebtoken'
import { ProxyManagerClient } from './protos/proxy_manager_grpc_pb'
import { ProxyRequest, ProxyRequestList } from './protos/proxy_manager_pb'

export const authUsernameDuplex = <T, S>(call: grpc.ServerDuplexStream<T, S>, TOKEN_KEY: string): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        console.log(err)
        call.destroy(new Error('UNAUTHENTICATED'))
        return false
    }
}

export const authUsernameServerStream = <T, S>(
    call: grpc.ServerReadableStream<T>,
    callback: grpc.sendUnaryData<S>,
    TOKEN_KEY: string
): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        callback(
            {
                code: grpc.status.UNAUTHENTICATED,
                name: 'UNAUTHENTICATED',
                message: err.message,
            },
            null
        )
        return false
    }
}

export const authUsername = <T, S>(
    call: grpc.ServerUnaryCall<T>,
    callback: grpc.sendUnaryData<S>,
    TOKEN_KEY: string
): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        callback(
            {
                code: grpc.status.UNAUTHENTICATED,
                name: 'UNAUTHENTICATED',
                message: err.message,
            },
            null
        )
        return false
    }
}

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
