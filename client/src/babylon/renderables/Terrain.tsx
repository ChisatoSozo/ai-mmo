import { TransformNode, Vector3 } from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { ProcessedTerrainChunk } from "../../data-hooks/useTerrain";
import { common } from "../../protos/common";
import { hashChunk } from "../../utils/HashFunctions";
import { ensureNotNullE } from "../../utils/PBUtils";

interface TerrainProps {
    chunk: common.IChunk;
    renderDistance: number;
    terrainData: { [key: string]: ProcessedTerrainChunk }
    chunkSize: number;
}

export const Terrain: React.FC<TerrainProps> = ({ chunk: _chunk, renderDistance, terrainData, chunkSize }) => {
    const [currentTerrainChunks, setCurrentTerrainChunks] = useState<ProcessedTerrainChunk[]>();
    useEffect(() => {
        const chunks = [];
        const chunk = ensureNotNullE(_chunk)

        for (let x = chunk.x - renderDistance; x <= chunk.x + renderDistance; x++) {
            for (let z = chunk.z - renderDistance; z <= chunk.z + renderDistance; z++) {
                const key = hashChunk(chunk);
                if (terrainData[key]) {
                    chunks.push(terrainData[key]);
                }
                else {
                    return;
                }
            }
        }
        setCurrentTerrainChunks(chunks);
    }, [_chunk, renderDistance, terrainData]);

    const terrainRootRef = useRef<TransformNode>(null);

    return (
        <transformNode name="terrainRoot" ref={terrainRootRef}>
            {currentTerrainChunks?.map((terrainChunk, index) => {
                const chunk = ensureNotNullE(terrainChunk.chunk)
                return <ground
                    key={hashChunk(terrainChunk.chunk)}
                    name={hashChunk(terrainChunk.chunk)}
                    position={new Vector3(chunk.x * chunkSize, 0, chunk.z * chunkSize)}
                    width={chunkSize}
                    height={chunkSize}
                />
            })}
        </transformNode>
    );
}