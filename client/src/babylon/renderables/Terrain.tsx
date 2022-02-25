import { TransformNode } from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { ProcessedTerrainChunk } from "../../data-hooks/useTerrain";
import { common } from "../../protos/common";
import { hashChunk } from "../../utils/HashFunctions";

interface TerrainProps {
    chunk: common.IChunk;
    renderDistance: number;
    terrainData: { [key: string]: ProcessedTerrainChunk }
    chunkSize: number;
}

export const Terrain: React.FC<TerrainProps> = ({ chunk, renderDistance, terrainData, chunkSize }) => {
    const [currentTerrainChunks, setCurrentTerrainChunks] = useState<ProcessedTerrainChunk[]>();
    useEffect(() => {
        const chunks = [];

        const chunkX = chunk.x || 0;
        const chunkZ = chunk.z || 0;

        for (let x = chunkX - renderDistance; x <= chunkX + renderDistance; x++) {
            for (let z = chunkZ - renderDistance; z <= chunkZ + renderDistance; z++) {
                const key = hashChunk({ x, z });
                if (terrainData[key]) {
                    chunks.push(terrainData[key]);
                }
            }
        }

        setCurrentTerrainChunks(chunks);
    }, [chunk, renderDistance, terrainData]);

    const terrainRootRef = useRef<TransformNode>(null);

    return (
        <transformNode name="terrainRoot" ref={terrainRootRef}>
            {currentTerrainChunks?.map((terrainChunk, index) => {
                const chunkX = terrainChunk.chunk.x || 0;
                const chunkZ = terrainChunk.chunk.z || 0;

                return <ground
                    key={hashChunk(terrainChunk.chunk)}
                    name={hashChunk(terrainChunk.chunk)}
                    position-x={chunkX * chunkSize}
                    position-z={chunkZ * chunkSize}
                    width={chunkSize}
                    height={chunkSize}
                />
            })}
        </transformNode>
    );
}