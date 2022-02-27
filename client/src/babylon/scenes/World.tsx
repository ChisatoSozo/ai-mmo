import { Color3, Vector3 } from '@babylonjs/core'
import { TERRAIN_CHUNK_HEIGHT, TERRAIN_CHUNK_WIDTH } from '../../commonConstants'
import { useTerrainData } from '../../data-hooks/useTerrainData'
import { useCurrentChunk } from '../hooks/useCurrentChunk'
import { TerrainRenderable } from '../renderables/terrain/TerrainRenderable'

const renderDistance = 2
const lods = [0.01, 0.02, 0.04, 0.08]

export const World = () => {
    const currentChunk = useCurrentChunk(TERRAIN_CHUNK_WIDTH)
    const terrainData = useTerrainData(currentChunk, renderDistance, TERRAIN_CHUNK_WIDTH, lods)

    return (
        <>
            <universalCamera
                position={new Vector3(0, 0, 512)}
                name="camera1"
                // target={new Vector3(0, 10, 0)}
                // alpha={0}
                // beta={0}
                // radius={10}
                // wheelPrecision={100}
                // panningSensibility={100}
            />
            <hemisphericLight name="HemisphericLight" intensity={0.7} direction={new Vector3(0, 1, 0)} />
            <box name="box1" size={1} position={new Vector3(0, 0, 0)} />
            <TerrainRenderable
                chunk={currentChunk}
                renderDistance={2}
                terrainData={terrainData}
                chunkSize={TERRAIN_CHUNK_WIDTH}
                chunkHeight={TERRAIN_CHUNK_HEIGHT}
                lods={lods}
            />
            <ground name="water" width={10000} height={10000} position={new Vector3(0, 500, 0)}>
                <standardMaterial name="water" diffuseColor={new Color3(0, 0.3, 0.7)} useLogarithmicDepth />
            </ground>
        </>
    )
}
