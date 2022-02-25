import { Vector3 } from '@babylonjs/core'
import { TERRAIN_CHUNK_WIDTH } from '../../commonConstants'
import { useTerrain } from '../../data-hooks/useTerrain'
import { useCurrentChunk } from '../hooks/useCurrentChunk'
import { TerrainRenderable } from '../renderables/TerrainRenderable'

const renderDistance = 2

export const World = () => {
    const currentChunk = useCurrentChunk(TERRAIN_CHUNK_WIDTH)
    const terrainData = useTerrain(currentChunk, renderDistance, TERRAIN_CHUNK_WIDTH, [0.1, 0.2, 0.3, 0.4])

    return (
        <>
            <arcRotateCamera
                name="camera1"
                target={new Vector3(0, 10, 0)}
                alpha={0}
                beta={0}
                radius={10}
                wheelPrecision={100}
                panningSensibility={100}
            />
            <hemisphericLight name="HemisphericLight" intensity={0.7} direction={new Vector3(0, 1, 0)} />
            <box name="box1" size={1} position={new Vector3(0, 0, 0)} />
            <TerrainRenderable
                chunk={currentChunk}
                renderDistance={2}
                terrainData={terrainData}
                chunkSize={TERRAIN_CHUNK_WIDTH}
            />
        </>
    )
}
