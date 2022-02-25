import { Vector3 } from '@babylonjs/core'
import { useTerrain } from '../../data-hooks/useTerrain'
import { useCurrentChunk } from '../hooks/useCurrentChunk'
import { Terrain } from '../renderables/Terrain'
import { CHUNK_SIZE } from '../utils/Constants'

const renderDistance = 2

export const World = () => {
    const currentChunk = useCurrentChunk(CHUNK_SIZE)
    const terrainData = useTerrain(currentChunk, renderDistance)

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
            <Terrain chunk={currentChunk} renderDistance={2} terrainData={terrainData} chunkSize={CHUNK_SIZE} />
        </>
    )
}
