import * as grpc from 'grpc'
import * as jwt from 'jsonwebtoken'
import { TERRAIN_CHUNK_HEIGHT_DIVISOR, TERRAIN_CHUNK_LENGTH, TERRAIN_CHUNK_WIDTH } from './constants'
import { Chunk } from './protos/common_pb'
import { ProxyManagerClient } from './protos/proxy_manager_grpc_pb'
import { ProxyRequest, ProxyRequestList } from './protos/proxy_manager_pb'
import { ITerrainServer, TerrainService } from './protos/terrain_grpc_pb'
import { TerrainChunk } from './protos/terrain_pb'

const _env: { [key: string]: string } = {
    PROXY_MANAGER_HOSTNAME: process.env.PROXY_MANAGER_HOSTNAME || '',
    PROXY_MANAGER_PORT: process.env.PROXY_MANAGER_PORT || '',
    TERRAIN_HOSTNAME: process.env.TERRAIN_HOSTNAME || '',
    TERRAIN_PORT: process.env.TERRAIN_PORT || '',
    TERRAIN_FRONTEND_PORT: process.env.TERRAIN_FRONTEND_PORT || '',
    TOKEN_KEY: process.env.TOKEN_KEY || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set.`)
    }
})

const env = {
    PROXY_MANAGER_HOSTNAME: _env.PROXY_MANAGER_HOSTNAME,
    PROXY_MANAGER_PORT: parseInt(_env.PROXY_MANAGER_PORT),
    TERRAIN_HOSTNAME: _env.TERRAIN_HOSTNAME,
    TERRAIN_PORT: parseInt(_env.TERRAIN_PORT),
    TERRAIN_FRONTEND_PORT: parseInt(_env.TERRAIN_FRONTEND_PORT),
    TOKEN_KEY: _env.TOKEN_KEY,
}

const authUsernameDuplex = <T, S>(call: grpc.ServerDuplexStream<T, S>): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, env.TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        console.log(err)
        call.destroy(new Error('UNAUTHENTICATED'))
        return false
    }
}

//@ts-ignore
export class TerrainServer implements ITerrainServer {
    get(call: grpc.ServerDuplexStream<Chunk, TerrainChunk>) {
        console.log('GET')
        const username = authUsernameDuplex(call)
        if (!username) return

        call.on('data', (chunk) => {
            const terrainArray = new Uint16Array(TERRAIN_CHUNK_WIDTH * TERRAIN_CHUNK_LENGTH)
            const terrainBytes = Buffer.from(terrainArray.buffer)
            const terrain = new TerrainChunk()
            terrain.setChunk(chunk)
            terrain.setData(terrainBytes)
            terrain.setLength(TERRAIN_CHUNK_LENGTH)
            terrain.setWidth(TERRAIN_CHUNK_WIDTH)
            terrain.setHeight(TERRAIN_CHUNK_HEIGHT_DIVISOR)
            call.write(terrain)
        })
    }
}

const TERRAIN_URI = `${env.TERRAIN_HOSTNAME}:${env.TERRAIN_PORT}`

const server = new grpc.Server()
//@ts-ignore
server.addService(TerrainService, new TerrainServer())
server.bindAsync(TERRAIN_URI, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err
    }
    console.log(`Server List: Listening on ${TERRAIN_URI}`)
    server.start()
})

const PROXY_MANAGER_URI = `${env.PROXY_MANAGER_HOSTNAME}:${env.PROXY_MANAGER_PORT}`
const proxyManagerClient = new ProxyManagerClient(PROXY_MANAGER_URI, grpc.credentials.createInsecure())

const request = new ProxyRequestList()
const proxyRequest = new ProxyRequest()
proxyRequest.setBackendHostname(env.TERRAIN_HOSTNAME)
proxyRequest.setBackendPort(env.TERRAIN_PORT)
proxyRequest.setForceFrontendPort(env.TERRAIN_FRONTEND_PORT)

request.setProxyList([proxyRequest])
console.log(PROXY_MANAGER_URI)
proxyManagerClient.put(request, (err, response) => {
    if (err) {
        console.log(`Server List: Failed to register with proxy manager: ${err.message}`)
        throw err
    }
    console.log(`Successfully Started Proxy on Port ${env.TERRAIN_FRONTEND_PORT}`)
})
