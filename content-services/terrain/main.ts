import * as grpc from 'grpc'
import { authUsername, authUsernameDuplex, constructProxy } from './commonUtils'
import { generateHeightmap } from './generators/heightmap'
import { generateTerrainMesh } from './generators/terrainMesh'
import { Chunk } from './protos/common_pb'
import { ITerrainServer, TerrainService } from './protos/terrain_grpc_pb'
import { PMesh, TerrainChunk, TerrainMeshRequest } from './protos/terrain_pb'

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
            const terrain = generateHeightmap(chunk)
            call.write(terrain)
        })
    }

    getMesh: grpc.handleUnaryCall<TerrainMeshRequest, PMesh> = (call, callback) => {
        const username = authUsername(call, callback, env.TOKEN_KEY)
        if (!username) return

        const mesh = generateTerrainMesh(call.request)
        callback(null, mesh)
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
