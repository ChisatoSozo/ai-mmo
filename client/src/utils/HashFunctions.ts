import { common } from "../protos/common";

export const hashChunk = (chunk: common.IChunk): string => {
    return `${chunk.x || 0}-${chunk.z || 0}`;
}
