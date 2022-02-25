import * as grpc from 'grpc'
import { authUsernameDuplex, constructProxy } from 'utils'
import { TERRAIN_CHUNK_HEIGHT_DIVISOR, TERRAIN_CHUNK_LENGTH, TERRAIN_CHUNK_WIDTH } from './constants'
import { Chunk } from './protos/common_pb'
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

//@ts-ignore
export class TerrainServer implements ITerrainServer {
    get(call: grpc.ServerDuplexStream<Chunk, TerrainChunk>) {
        const username = authUsernameDuplex(call, env.TOKEN_KEY)
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

constructProxy(PROXY_MANAGER_URI, env.TERRAIN_HOSTNAME, env.TERRAIN_PORT, env.TERRAIN_FRONTEND_PORT).catch((err) => {
    console.log(`Server List: Failed to register with proxy manager: ${err.message}`)
    server.forceShutdown()
})
