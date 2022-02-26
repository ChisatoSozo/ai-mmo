import { Mesh, TransformNode } from '@babylonjs/core'
import { useEffect, useRef } from 'react'

interface MeshOnTransformProps {
    mesh: Mesh | undefined
}

export const MeshOnTransform: React.FC<MeshOnTransformProps> = ({ mesh }) => {
    const transformNodeRef = useRef<TransformNode>(null)

    useEffect(() => {
        if (!transformNodeRef.current) return
        if (!mesh) return
        console.log(mesh)
        mesh.parent = transformNodeRef.current
    }, [mesh])

    return <transformNode name={mesh?.name + '-parent'} ref={transformNodeRef} />
}
