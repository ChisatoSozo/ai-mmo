import { useState } from 'react'
import { useBeforeRender } from 'react-babylonjs'
import { common } from '../../protos/common'

export const useCurrentChunk = (chunkSize: number) => {
    const [currentChunk, setCurrentChunk] = useState<common.IChunk>({ x: 0, z: 0 })

    useBeforeRender((scene) => {
        const camera = scene.activeCamera
        if (!camera) return
        const chunk = {
            x: Math.floor(camera.position.x / chunkSize),
            z: Math.floor(camera.position.z / chunkSize),
        }
        if (currentChunk && currentChunk.x === chunk.x && currentChunk.z === chunk.z) return
        setCurrentChunk(chunk)
    })

    return currentChunk
}
