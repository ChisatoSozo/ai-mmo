import fs from 'fs';
import { sendUnaryData, ServerUnaryCall, ServerWritableStream } from 'grpc';
import { ITerrainServer } from './protos/terrain_grpc_pb';
import { TerrainChunk} from './protos/terrain_pb';
import { Chunk } from './protos/common_pb';

//@ts-ignore
export class TerrainServer implements ITerrainServer {
    get(call: ServerUnaryCall<Chunk>, callback: sendUnaryData<TerrainChunk>) {
        const terrainArray = new Uint16Array(TERRAIN_CHUNK_WIDTH * TERRAIN_CHUNK_LENGTH);
        const terrainBytes = Buffer.from(terrainArray.buffer);
        const terrain = new TerrainChunk();
        terrain.setData(terrainBytes);
        terrain.setLength(TERRAIN_CHUNK_LENGTH);
        terrain.setWidth(TERRAIN_CHUNK_WIDTH);
        terrain.setHeightDivisor(TERRAIN_CHUNK_HEIGHT_DIVISOR);
        callback(null, terrain);
    }
}