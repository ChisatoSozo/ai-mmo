import { Engine, RawTexture, Texture } from '@babylonjs/core'
import { grpc } from '@improbable-eng/grpc-web'
import { useEffect, useMemo, useState } from 'react'
import { useScene } from 'react-babylonjs'
import { common } from '../protos/common'
import { Chunk } from '../protos/common_pb'
import { terrain } from '../protos/terrain'
import { TerrainMeshRequest } from '../protos/terrain_pb'
import { TerrainClient } from '../protos/terrain_pb_service'
import { staticCastUint8ArrayToUint16Array } from '../utils/BinaryUtils'
import { hashChunk } from '../utils/HashFunctions'
import { makeBidi, pFetch } from '../utils/NetworkTransformers'
import { ensureProps, requestAllStream, staticCastFromGoogle, staticCastToGoogle } from '../utils/PBUtils'

const _env: { [key: string]: string } = {
    REACT_APP_TERRAIN_HOSTNAME: window.location.hostname || '',
    REACT_APP_TERRAIN_FRONTEND_PORT: process.env.REACT_APP_TERRAIN_FRONTEND_PORT || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Missing environment variable ${key}`)
    }
})

const env = {
    REACT_APP_TERRAIN_HOSTNAME: _env.REACT_APP_TERRAIN_HOSTNAME,
    REACT_APP_TERRAIN_FRONTEND_PORT: parseInt(_env.REACT_APP_TERRAIN_FRONTEND_PORT),
}

const TERRAIN_URI = `http://${env.REACT_APP_TERRAIN_HOSTNAME}:${env.REACT_APP_TERRAIN_FRONTEND_PORT}`

export interface ProcessedTerrainChunk {
    chunk: common.IChunk
    heightmap: Texture
    array: Uint16Array
    width: number
    length: number
    height: number
}

export interface TerrainData {
    processedTerrainChunks: { [key: string]: ProcessedTerrainChunk }
    terrainMesh: common.IPMesh | undefined
}

export const useTerrainData = (
    chunk: common.IChunk,
    renderDistance: number,
    terrainResolution: number,
    lods: number[]
): TerrainData => {
    const scene = useScene()

    const client = useMemo(
        () =>
            new TerrainClient(TERRAIN_URI, {
                transport: grpc.WebsocketTransport(),
            }),
        []
    )

    const [terrainChunks, setTerrainChunks] = useState<{ [key: string]: terrain.ITerrainChunk }>({})

    useEffect(() => {
        const getTerrainChunks = async () => {
            const inputs: common.IChunk[] = []

            const chunkX = chunk.x || 0
            const chunkZ = chunk.z || 0

            for (let x = chunkX - renderDistance; x <= chunkX + renderDistance; x++) {
                for (let z = chunkZ - renderDistance; z <= chunkZ + renderDistance; z++) {
                    const key = hashChunk({ x, z })
                    if (!terrainChunks[key]) {
                        inputs.push({ x, z })
                    }
                }
            }

            if (inputs.length === 0) {
                return
            }

            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No token found')
            }
            const stream = client.get(new grpc.Metadata({ authorization: token }))
            const terrainGetBidi = makeBidi(stream)

            const messages = inputs
                .map((input) => new common.Chunk(input))
                .map((input) => staticCastToGoogle<Chunk>(input, Chunk))
            const results = await requestAllStream(messages, terrainGetBidi)
            const terrainChunksFromNetwork = results.map((result) =>
                staticCastFromGoogle<terrain.TerrainChunk>(result, terrain.TerrainChunk)
            )

            setTerrainChunks((prevTerrainChunks) => {
                const newTerrainChunks = { ...prevTerrainChunks }
                terrainChunksFromNetwork.forEach((terrainChunk) => {
                    if (!terrainChunk.chunk) {
                        throw new Error('Chunk must have chunk property')
                    }
                    const key = hashChunk(terrainChunk.chunk)
                    newTerrainChunks[key] = terrainChunk
                })
                return newTerrainChunks
            })
        }

        getTerrainChunks()
    }, [chunk, client, renderDistance, terrainChunks])

    const [processedTerrainChunks, setProcessedTerrainChunks] = useState<{ [key: string]: ProcessedTerrainChunk }>({})

    useEffect(() => {
        if (!scene) return

        setProcessedTerrainChunks((prevProcessedTerrainChunks) => {
            const justProcessedTerrainChunks: ProcessedTerrainChunk[] = []
            for (let key in terrainChunks) {
                if (!prevProcessedTerrainChunks[key]) {
                    const terrainChunk = ensureProps(terrainChunks[key], ['chunk', 'data', 'width', 'length', 'height'])

                    const array = staticCastUint8ArrayToUint16Array(terrainChunk.data)
                    const heightmap = new RawTexture(
                        new Float32Array(array),
                        terrainChunk.width,
                        terrainChunk.length,
                        Engine.TEXTUREFORMAT_R,
                        scene,
                        false,
                        undefined,
                        undefined,
                        Engine.TEXTURETYPE_FLOAT
                    )
                    const processedTerrainChunk: ProcessedTerrainChunk = {
                        chunk: terrainChunk.chunk,
                        heightmap,
                        array,
                        width: terrainChunk.width,
                        length: terrainChunk.length,
                        height: terrainChunk.height,
                    }
                    justProcessedTerrainChunks.push(processedTerrainChunk)
                }
            }

            const newProcessedTerrainChunks = { ...prevProcessedTerrainChunks }
            for (let justProcessedTerrainChunk of justProcessedTerrainChunks) {
                newProcessedTerrainChunks[hashChunk(justProcessedTerrainChunk.chunk)] = justProcessedTerrainChunk
            }
            return newProcessedTerrainChunks
        })
    }, [terrainChunks, scene])

    const [terrainMesh, setTerrainMesh] = useState<common.IPMesh>()

    useEffect(() => {
        const getTerrainMesh = async () => {
            const terrainMeshRequest = new terrain.TerrainMeshRequest()
            terrainMeshRequest.resolution = terrainResolution * (1 + renderDistance * 2)
            console.log(terrainMeshRequest.resolution)
            terrainMeshRequest.lods = lods

            const message = staticCastToGoogle<TerrainMeshRequest>(terrainMeshRequest, TerrainMeshRequest)
            const reply = await pFetch(message, client.getMesh.bind(client))
            if (!reply) {
                throw new Error('No reply from terrain server for mesh request')
            }
            const terrainMeshFromNetwork = staticCastFromGoogle<common.PMesh>(reply, common.PMesh)
            setTerrainMesh(terrainMeshFromNetwork)
        }

        getTerrainMesh()
    }, [client, lods, renderDistance, terrainResolution])

    return { processedTerrainChunks, terrainMesh }
}
