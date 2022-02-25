import { Engine, RawTexture, Texture } from '@babylonjs/core';
import { useEffect, useMemo, useState } from 'react';
import { useScene } from 'react-babylonjs';
import { common } from '../protos/common';
import { Chunk } from '../protos/common_pb';
import { terrain } from '../protos/terrain';
import { TerrainPromiseClient } from '../protos/terrain_grpc_web_pb';
import { hashChunk } from '../utils/HashFunctions';
import { ensureProps, requestAll, staticCastFromGoogle, staticCastToGoogle } from '../utils/PBUtils';

const _env: { [key: string]: string } = {
    REACT_APP_TERRAIN_HOSTNAME: process.env.REACT_APP_TERRAIN_HOSTNAME || "",
    REACT_APP_TERRAIN_FRONTEND_PORT: process.env.REACT_APP_TERRAIN_FRONTEND_PORT || ""
}

Object.keys(_env).forEach(key => {
    if (!_env[key]) {
        throw new Error(`Missing environment variable ${key}`);
    }
});

const env = {
    REACT_APP_TERRAIN_HOSTNAME: _env.REACT_APP_TERRAIN_HOSTNAME,
    REACT_APP_TERRAIN_FRONTEND_PORT: parseInt(_env.REACT_APP_TERRAIN_FRONTEND_PORT)
}

const TERRAIN_URI = `http://${env.REACT_APP_TERRAIN_HOSTNAME}:${env.REACT_APP_TERRAIN_FRONTEND_PORT}`;

export interface ProcessedTerrainChunk {
    chunk: common.IChunk
    heightmap: Texture
    array: Uint16Array
    width: number
    length: number
    height: number
}

export const useTerrain = (chunk: common.IChunk, renderDistance: number) => {
    const scene = useScene();

    const client = useMemo(() => new TerrainPromiseClient(TERRAIN_URI, null, null), []);
    const terrainGetStream = useMemo(() => client., []);

    const [terrainChunks, setTerrainChunks] = useState<{ [key: string]: terrain.ITerrainChunk }>({});

    useEffect(() => {

        const getTerrainChunks = async () => {
            const inputs: common.IChunk[] = [];

            const chunkX = chunk.x || 0;
            const chunkZ = chunk.z || 0;

            for (let x = chunkX - renderDistance; x <= chunkX + renderDistance; x++) {
                for (let z = chunkZ - renderDistance; z <= chunkZ + renderDistance; z++) {
                    const key = hashChunk(chunk);
                    if (!terrainChunks[key]) {
                        inputs.push({ x, z });
                    }
                }
            }

            const messages = inputs.map(input => new common.Chunk(input)).map(input => staticCastToGoogle<Chunk>(input, Chunk));
            const results = await requestAll(messages, client.get.bind(client));
            const terrainChunksFromNetwork = results.map(result => staticCastFromGoogle<terrain.TerrainChunk>(result, terrain.TerrainChunk));

            setTerrainChunks(prevTerrainChunks => {
                const newTerrainChunks = { ...prevTerrainChunks };
                terrainChunksFromNetwork.forEach(terrainChunk => {
                    if (!terrainChunk.chunk) {
                        throw new Error("Chunk must have chunk property");
                    }
                    const key = hashChunk(terrainChunk.chunk);
                    newTerrainChunks[key] = terrainChunk;
                });
                return newTerrainChunks;
            });
        }

        getTerrainChunks();
    }, [chunk, renderDistance])

    const [processedTerrainChunks, setProcessedTerrainChunks] = useState<{ [key: string]: ProcessedTerrainChunk }>({});

    useEffect(() => {
        if (!scene) return;
        const justProcessedTerrainChunks: ProcessedTerrainChunk[] = [];
        for (let key in terrainChunks) {
            if (!processedTerrainChunks[key]) {

                const terrainChunk = ensureProps(terrainChunks[key], ["chunk", "data", "width", "length", "height"]);

                const array = new Uint16Array(terrainChunk.data);
                const heightmap = new RawTexture(array, terrainChunk.width / 4, terrainChunk.length, Engine.TEXTUREFORMAT_RGBA, scene, undefined, undefined, undefined, Engine.TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4)
                const processedTerrainChunk: ProcessedTerrainChunk = {
                    chunk: terrainChunk.chunk,
                    heightmap,
                    array,
                    width: terrainChunk.width,
                    length: terrainChunk.length,
                    height: terrainChunk.height
                }
                justProcessedTerrainChunks.push(processedTerrainChunk);
            }
        }
        setProcessedTerrainChunks(prevProcessedTerrainChunks => {
            const newProcessedTerrainChunks = { ...prevProcessedTerrainChunks };
            for (let justProcessedTerrainChunk of justProcessedTerrainChunks) {
                newProcessedTerrainChunks[hashChunk(justProcessedTerrainChunk.chunk)] = justProcessedTerrainChunk;
            }
            return newProcessedTerrainChunks;
        });
    }, [terrainChunks, scene]);

    return processedTerrainChunks;
}