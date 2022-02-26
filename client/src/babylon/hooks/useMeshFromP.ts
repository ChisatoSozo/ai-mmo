import { Material, Mesh, Vector3, VertexBuffer } from '@babylonjs/core'
import { useEffect, useState } from 'react'
import { useScene } from 'react-babylonjs'
import { common } from '../../protos/common'
import { staticCastUint8ArrayToFloat32Array, staticCastUint8ArrayToUint32Array } from '../../utils/BinaryUtils'

export const useMeshFromP = (pMesh: common.IPMesh | undefined, material?: Material) => {
    const scene = useScene()

    const [mesh, setMesh] = useState<Mesh>()
    useEffect(() => {
        if (!scene) return
        if (!pMesh) return

        const mesh = new Mesh('mesh', scene)

        console.log(pMesh.positions)

        if (pMesh.positions) {
            const vertexFloat32Array = staticCastUint8ArrayToFloat32Array(pMesh.positions)
            mesh.setVerticesData(VertexBuffer.PositionKind, vertexFloat32Array, false, 3)
        } else {
            console.warn('pMesh.positions is undefined')
        }

        if (pMesh.indices) {
            const indices = staticCastUint8ArrayToUint32Array(pMesh.indices)
            mesh.setIndices(indices)
        }

        mesh.alwaysSelectAsActiveMesh = true
        mesh.scaling = new Vector3(0.1, 0.1, 0.1)

        setMesh((oldMesh) => {
            oldMesh?.dispose()
            return mesh
        })
    }, [pMesh, scene])

    useEffect(() => {
        if (!mesh) return
        if (!material) return

        mesh.material = material
    }, [mesh, material])

    return mesh
}
