import { Color3, TransformNode } from '@babylonjs/core'
import { useEffect, useRef, useState } from 'react'
import { ProcessedTerrainChunk, TerrainData } from '../../data-hooks/useTerrain'
import { common } from '../../protos/common'
import { hashChunk } from '../../utils/HashFunctions'

interface TerrainProps {
    chunk: common.IChunk
    renderDistance: number
    terrainData: TerrainData
    chunkSize: number
}

const hashFloat = (x?: number | null) => {
    // returns a psudo-random number between 0 and 1

    const number = 321461246124.25712836582
    const hash = (Math.abs(Math.sin(x || 0)) * number) % 1
    console.log(hash)
    return hash
}

export const TerrainRenderable: React.FC<TerrainProps> = ({ chunk, renderDistance, terrainData, chunkSize }) => {
    const [currentTerrainChunks, setCurrentTerrainChunks] =
        useState<{ root: common.IChunk; data: ProcessedTerrainChunk[] }>()

    useEffect(() => {
        const chunks = []

        const chunkX = chunk.x || 0
        const chunkZ = chunk.z || 0

        for (let x = chunkX - renderDistance; x <= chunkX + renderDistance; x++) {
            for (let z = chunkZ - renderDistance; z <= chunkZ + renderDistance; z++) {
                const key = hashChunk({ x, z })
                if (terrainData.processedTerrainChunks[key]) {
                    chunks.push(terrainData.processedTerrainChunks[key])
                } else {
                    return
                }
            }
        }

        setCurrentTerrainChunks({ root: chunk, data: chunks })
    }, [chunk, renderDistance, terrainData])

    const terrainRootRef = useRef<TransformNode>(null)

    return (
        <transformNode name="terrainRoot" ref={terrainRootRef}>
            {currentTerrainChunks?.map((terrainChunk, index) => {
                const chunkX = terrainChunk.chunk.x || 0
                const chunkZ = terrainChunk.chunk.z || 0

                return (
                    <ground
                        key={hashChunk(terrainChunk.chunk)}
                        name={hashChunk(terrainChunk.chunk)}
                        position-x={chunkX * chunkSize}
                        position-z={chunkZ * chunkSize}
                        width={chunkSize}
                        height={chunkSize}
                    >
                        <standardMaterial
                            name={'material' + hashChunk(terrainChunk.chunk)}
                            diffuseColor={
                                new Color3(hashFloat(terrainChunk.chunk.x), 1, hashFloat(terrainChunk.chunk.z))
                            }
                        />
                    </ground>
                )
            })}
        </transformNode>
    )
}
