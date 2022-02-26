import { PMesh } from '../protos/common_pb'
import { TerrainMeshRequest } from '../protos/terrain_pb'

type SquareType =
    | 'bottomLeftCorner'
    | 'topLeftCorner'
    | 'bottomRightCorner'
    | 'topRightCorner'
    | 'bottomEdge'
    | 'leftEdge'
    | 'topEdge'
    | 'rightEdge'
    | 'none'

const tesselations: { [key in SquareType]: number[][] } = {
    bottomLeftCorner: [
        [0, 0],
        [1, 0],
        [1, 0.5],
        [0, 0],
        [1, 0.5],
        [1, 1],
        [0, 0],
        [1, 1],
        [0.5, 1],
        [0, 0],
        [0.5, 1],
        [0, 1],
    ],
    topLeftCorner: [
        [0, 1],
        [0, 0],
        [0.5, 0],
        [0, 1],
        [0.5, 0],
        [1, 0],
        [0, 1],
        [1, 0],
        [1, 0.5],
        [0, 1],
        [1, 0.5],
        [1, 1],
    ],
    bottomRightCorner: [
        [1, 0],
        [1, 1],
        [0.5, 1],
        [1, 0],
        [0.5, 1],
        [0, 1],
        [1, 0],
        [0, 1],
        [0, 0.5],
        [1, 0],
        [0, 0.5],
        [0, 0],
    ],
    topRightCorner: [
        [1, 0],
        [1, 1],
        [0.5, 0],
        [0.5, 0],
        [1, 1],
        [0, 0],
        [0, 0],
        [1, 1],
        [0, 0.5],
        [0, 0.5],
        [1, 1],
        [0, 1],
    ],
    bottomEdge: [
        [0, 0],
        [1, 0],
        [0.5, 0.5],
        [0, 0],
        [0.5, 0.5],
        [0, 0.5],
        [0, 0.5],
        [0.5, 0.5],
        [0, 1],
        [0, 1],
        [0.5, 0.5],
        [0.5, 1],
        [0.5, 1],
        [0.5, 0.5],
        [1, 1],
        [1, 1],
        [0.5, 0.5],
        [1, 0.5],
        [1, 0.5],
        [0.5, 0.5],
        [1, 0],
    ],
    leftEdge: [
        [0, 1],
        [0, 0],
        [0.5, 0.5],
        [0, 1],
        [0.5, 0.5],
        [0.5, 1],
        [0.5, 1],
        [0.5, 0.5],
        [1, 1],
        [1, 1],
        [0.5, 0.5],
        [1, 0.5],
        [1, 0.5],
        [0.5, 0.5],
        [1, 0],
        [1, 0],
        [0.5, 0.5],
        [0.5, 0],
        [0.5, 0],
        [0.5, 0.5],
        [0, 0],
    ],
    topEdge: [
        [1, 1],
        [0, 1],
        [0.5, 0.5],
        [1, 1],
        [0.5, 0.5],
        [1, 0.5],
        [1, 0.5],
        [0.5, 0.5],
        [1, 0],
        [1, 0],
        [0.5, 0.5],
        [0.5, 0],
        [0.5, 0],
        [0.5, 0.5],
        [0, 0],
        [0, 0],
        [0.5, 0.5],
        [0, 0.5],
        [0, 0.5],
        [0.5, 0.5],
        [0, 1],
    ],
    rightEdge: [
        [1, 0],
        [1, 1],
        [0.5, 0.5],
        [1, 0],
        [0.5, 0.5],
        [0.5, 0],
        [0.5, 0],
        [0.5, 0.5],
        [0, 0],
        [0, 0],
        [0.5, 0.5],
        [0, 0.5],
        [0, 0.5],
        [0.5, 0.5],
        [0, 1],
        [0, 1],
        [0.5, 0.5],
        [0.5, 1],
        [0.5, 1],
        [0.5, 0.5],
        [1, 1],
    ],
    none: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
        [1, 1],
        [0, 1],
    ],
}

interface SquareDef {
    squareType: SquareType
    bottomLeft: number[]
}

const constructRing = (ring: number, ringSize: number) => {
    const squares: SquareDef[] = []

    if (ring !== 0) {
        //leftEdge
        for (let y = -ring; y < ring; y += ringSize) {
            const x = -ring - ringSize
            squares.push({
                squareType: 'leftEdge',
                bottomLeft: [x, y],
            })
        }
        //rightEdge
        for (let y = -ring; y < ring; y += ringSize) {
            const x = ring
            squares.push({
                squareType: 'rightEdge',
                bottomLeft: [x, y],
            })
        }
        //bottomEdge
        for (let x = -ring; x < ring; x += ringSize) {
            const y = -ring - ringSize
            squares.push({
                squareType: 'bottomEdge',
                bottomLeft: [x, y],
            })
        }
        //topEdge
        for (let x = -ring; x < ring; x += ringSize) {
            const y = ring
            squares.push({
                squareType: 'topEdge',
                bottomLeft: [x, y],
            })
        }
    }

    //bottomLeft
    squares.push({
        squareType: 'bottomLeftCorner',
        bottomLeft: [-ring - ringSize, -ring - ringSize],
    })
    //bottomRight
    squares.push({
        squareType: 'bottomRightCorner',
        bottomLeft: [ring, -ring - ringSize],
    })
    //topLeft
    squares.push({
        squareType: 'topLeftCorner',
        bottomLeft: [-ring - ringSize, ring],
    })
    //bottomRight
    squares.push({
        squareType: 'topRightCorner',
        bottomLeft: [ring, ring],
    })
    return squares
}

const cache: { [key: string]: PMesh } = {}

const hashTerrainMeshRequest = (request: TerrainMeshRequest) => {
    return `${request.getResolution()},${request.getLodsList().join('-')}`
}

export const generateTerrainMesh = (request: TerrainMeshRequest) => {
    const cached = cache[hashTerrainMeshRequest(request)]
    if (cached) {
        return cached
    }

    const { resolution, lodsList: lods } = request.toObject()

    const positions: number[] = []
    const indicies: number[] = []
    let curIndex = 0
    const positionsMap: { [key: string]: number } = {}

    let lastLod = 0
    let ring = 0
    while (ring < (resolution - 1) / 2) {
        const ringPerc = ring / (resolution / 2)
        let curLod = 0
        lods.forEach((lod, i) => {
            if (ringPerc >= lod) {
                curLod = i + 1
            }
        })

        if (curLod - lastLod > 1) {
            curLod = lastLod + 1
        }

        const ringSize = Math.pow(2, curLod)
        const squares = constructRing(ring, ringSize)

        squares.forEach((square) => {
            const [x, y] = square.bottomLeft
            const squareCoords = curLod === lastLod ? tesselations.none : tesselations[square.squareType]
            squareCoords.forEach((coord) => {
                if (!resolution) throw new Error('terrainData not set')
                const i = coord[0] * ringSize + x
                const j = coord[1] * ringSize + y
                const positionLookup = `${i},${j}`
                const index = positionsMap[positionLookup]
                if (index) {
                    indicies.push(index)
                } else {
                    positionsMap[positionLookup] = curIndex
                    indicies.push(curIndex)
                    positions.push(i, 0, j)
                    curIndex++
                }
            })
        })

        ring += ringSize
        lastLod = curLod
    }

    const positionsFloat32 = new Float32Array(positions)
    const indiciesUint32 = new Uint32Array(indicies)

    const positionsBytes = new Uint8Array(positionsFloat32.buffer)
    const indiciesBytes = new Uint8Array(indiciesUint32.buffer)

    const mesh = new PMesh()
    mesh.setPositions(positionsBytes)
    mesh.setIndices(indiciesBytes)

    return mesh
}
