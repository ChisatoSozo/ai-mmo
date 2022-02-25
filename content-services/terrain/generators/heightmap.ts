import { TERRAIN_CHUNK_HEIGHT, TERRAIN_CHUNK_LENGTH, TERRAIN_CHUNK_WIDTH } from '../commonConstants'
import { Chunk } from '../protos/common_pb'
import { TerrainChunk } from '../protos/terrain_pb'

const getCoordinate = (chunk: Chunk, i, j) => {
    const x = chunk.getX() * TERRAIN_CHUNK_WIDTH + i
    const z = chunk.getZ() * TERRAIN_CHUNK_LENGTH + j
    return { x, z }
}

const heightFromCoordinate = ({ x, z }: { x: number; z: number }) => {
    return Math.sin(x / 10) * Math.cos(z / 10)
}

const heightToUint16 = (height: number) => {
    //takes height in range [-1, 1] and returns uint16 in range [0, 65535]

    const heightUint16 = Math.floor(((height + 1) / 2) * 65535)
    return heightUint16
}

const cache: { [key: string]: TerrainChunk } = {}

const hashChunk = (request: Chunk) => {
    return `${request.getX()}-${request.getZ()}`
}

export const generateHeightmap = (chunk: Chunk) => {
    const cached = cache[hashChunk(chunk)]
    if (cached) return cached

    const heightmap = new Uint16Array(TERRAIN_CHUNK_WIDTH * TERRAIN_CHUNK_LENGTH)

    for (let i = 0; i < TERRAIN_CHUNK_WIDTH; i++) {
        for (let j = 0; j < TERRAIN_CHUNK_LENGTH; j++) {
            const coordinate = getCoordinate(chunk, i, j)
            const height = heightFromCoordinate(coordinate)
            heightmap[i * TERRAIN_CHUNK_LENGTH + j] = heightToUint16(height)
        }
    }

    const terrain = new TerrainChunk()
    terrain.setChunk(chunk)
    terrain.setData(Buffer.from(heightmap.buffer))
    terrain.setLength(TERRAIN_CHUNK_LENGTH)
    terrain.setWidth(TERRAIN_CHUNK_WIDTH)
    terrain.setHeight(TERRAIN_CHUNK_HEIGHT)

    return terrain
}
