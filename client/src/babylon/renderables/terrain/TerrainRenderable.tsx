import { useEffect, useState } from 'react'
import { ProcessedTerrainChunk, TerrainData } from '../../../data-hooks/useTerrainData'
import { common } from '../../../protos/common'
import { hashChunk } from '../../../utils/HashFunctions'
import { useMeshFromP } from '../../hooks/useMeshFromP'
import { useTerrainMaterial } from './useTerrainMaterial'

interface TerrainProps {
    chunk: common.IChunk
    renderDistance: number
    terrainData: TerrainData
    chunkSize: number
    chunkHeight: number
    lods: number[]
}

export const TerrainRenderable: React.FC<TerrainProps> = ({
    chunk,
    renderDistance,
    terrainData,
    chunkSize,
    chunkHeight,
    lods,
}) => {
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

    const terrainMaterial = useTerrainMaterial(currentTerrainChunks, renderDistance, chunkSize, chunkHeight, lods)
    const terrainMesh = useMeshFromP(terrainData.terrainMesh, terrainMaterial)

    return <mesh name="terrain" source={terrainMesh} />
}
