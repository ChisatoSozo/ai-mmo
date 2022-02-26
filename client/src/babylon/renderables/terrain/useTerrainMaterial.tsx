import { useMemo } from 'react'
import { useScene } from 'react-babylonjs'
import { ProcessedTerrainChunk } from '../../../data-hooks/useTerrainData'
import { common } from '../../../protos/common'
import { glsl, unrollTextureArrayUniform } from '../../../utils/MaterialUtils'
import { CustomMaterial } from '../../forks/CustomMaterial'

export const useTerrainMaterial = (
    currentTerrainChunks: { root: common.IChunk; data: ProcessedTerrainChunk[] } | undefined,
    renderDistance: number,
    chunkSize: number,
    height: number
) => {
    const scene = useScene()

    const terrainMaterial = useMemo(() => {
        if (!scene) return

        if (!currentTerrainChunks) return

        const chunksPerDirection = renderDistance * 2 + 1
        const numChunks = chunksPerDirection * chunksPerDirection

        if (currentTerrainChunks.data.length !== numChunks)
            throw new Error(`expected ${numChunks} chunks but got ${currentTerrainChunks.data.length}`)

        const textures = currentTerrainChunks.data.map((chunk) => chunk.heightmap)

        const terrainMaterial = new CustomMaterial('terrainMaterial', scene) as CustomMaterial
        terrainMaterial.AddUniformArray('heightmaps', 'sampler2D', textures, numChunks)

        terrainMaterial.Vertex_Begin(glsl`
            ${unrollTextureArrayUniform(numChunks)}
            varying vec4 debugColor;
        `)

        terrainMaterial.Vertex_Before_PositionUpdated(glsl`

            float uFull = (positionUpdated.x + (${chunkSize}. * ${numChunks}. / 2.)) / ${chunkSize}.;
            float vFull = (positionUpdated.z + (${chunkSize}. * ${numChunks}. / 2.)) / ${chunkSize}.;

            float u = uFull - floor(uFull);
            float v = vFull - floor(vFull);

            float uIndex = floor(mod(uFull, ${chunkSize}.) - (${chunksPerDirection}.* ${renderDistance}.));
            float vIndex = floor(mod(vFull, ${chunkSize}.) - (${chunksPerDirection}.* ${renderDistance}.));
            
            int textureIndex = int(uIndex + vIndex * ${renderDistance * 2 + 1}.);

            vec4 heightVec = arrayTexture(heightmaps, textureIndex, vec2(u, v));

            //get the height of the current position, heights are packed in xyzw
            int heightIndex = int(floor(u * ${chunkSize}.)) % (${chunkSize} / 4);

            float height = heightVec.x;
            if(heightIndex == 1) {
                height = heightVec.y;
            } else if(heightIndex == 2) {
                height = heightVec.z;
            } else if(heightIndex == 3) {
                height = heightVec.w;
            }

            positionUpdated.y = height * ${height}.;
            debugColor = vec4(height, 0., 0., 1.);
        `)

        terrainMaterial.Fragment_Begin(glsl`
            varying vec4 debugColor;
        `)

        terrainMaterial.Fragment_Before_Fog(glsl`
            color.rgb = debugColor.xyz;
        `)

        return terrainMaterial
    }, [scene, currentTerrainChunks, renderDistance, height, chunkSize])
    return terrainMaterial
}
