import SimplexNoise from 'simplex-noise'
import { TERRAIN_CHUNK_HEIGHT, TERRAIN_CHUNK_LENGTH, TERRAIN_CHUNK_WIDTH } from '../commonConstants'
import { Chunk } from '../protos/common_pb'
import { TerrainChunk } from '../protos/terrain_pb'

const simplex = new SimplexNoise()

const heightFromCoordinate = ({ x, z }: { x: number; z: number }, octaves: number) => {
    let value = 0
    let totalAmplitude = 0
    for (let octave = 0; octave < octaves; octave++) {
        let period = 1024 / 4 ** octave
        let amplitude = 1 / 4 ** octave

        value += simplex.noise2D(x / period, z / period) * amplitude
        totalAmplitude += amplitude
    }

    return value / totalAmplitude
}

const getCoordinate = (chunk: Chunk, i, j) => {
    const x = chunk.getX() * TERRAIN_CHUNK_WIDTH + i
    const z = chunk.getZ() * TERRAIN_CHUNK_LENGTH + j
    return { x, z }
}

const heightToUint16 = (height: number) => {
    //takes height in range [-1, 1] and returns uint16 in range [0, 65535]

    let heightCubed = height * height * height
    const heightUint16 = Math.floor(((heightCubed + 1) / 2) * 65535)
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

    console.log(`generating heightmap for chunk ${chunk.getX()}, ${chunk.getZ()}`)

    for (let i = 0; i < TERRAIN_CHUNK_WIDTH; i++) {
        for (let j = 0; j < TERRAIN_CHUNK_LENGTH; j++) {
            const coordinate = getCoordinate(chunk, i, j)
            const height = heightFromCoordinate(coordinate, 8)
            heightmap[i * TERRAIN_CHUNK_LENGTH + j] = heightToUint16(height)
        }
    }

    const terrain = new TerrainChunk()
    terrain.setChunk(chunk)
    terrain.setData(new Uint8Array(heightmap.buffer))
    terrain.setLength(TERRAIN_CHUNK_LENGTH)
    terrain.setWidth(TERRAIN_CHUNK_WIDTH)
    terrain.setHeight(TERRAIN_CHUNK_HEIGHT)

    cache[hashChunk(chunk)] = terrain

    return terrain
}
