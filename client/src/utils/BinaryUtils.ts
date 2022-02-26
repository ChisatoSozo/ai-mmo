export const staticCastUint8ArrayToFloat32Array = (arr: Uint8Array): Float32Array => {
    const positionBuffer = arr.buffer.slice(arr.byteOffset, arr.byteLength + arr.byteOffset)
    const float32Array = new Float32Array(positionBuffer)
    return float32Array
}

export const staticCastUint8ArrayToUint32Array = (arr: Uint8Array): Uint32Array => {
    const positionBuffer = arr.buffer.slice(arr.byteOffset, arr.byteLength + arr.byteOffset)
    const uint32Array = new Uint32Array(positionBuffer)
    return uint32Array
}
