import { grpc } from '@improbable-eng/grpc-web'
import { Message as MessageGrpc } from 'google-protobuf'
import { globalObject } from './Global'
import { Bidi } from './NetworkTransformers'
import { MessageBase, MessageClass, PromiseClientMethod } from './UtilTypes'

export type Status = { details: string; code: number; metadata: grpc.Metadata }

interface ResponseStream<T> {
    cancel(): void
    on(type: 'data', handler: (message: T) => void): ResponseStream<T>
    on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>
    on(type: 'status', handler: (status: Status) => void): ResponseStream<T>
}

interface BidirectionalStream<ReqT, ResT> {
    write(message: ReqT): BidirectionalStream<ReqT, ResT>
    end(): void
    cancel(): void
    on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>
    on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>
    on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>
}

export const base64ToUint8Array = (base64: string) => {
    var binary_string = window.atob(base64)
    var len = binary_string.length
    var bytes = new Uint8Array(len)
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes
}

export const streamToGenerator = <S extends MessageGrpc, T extends MessageGrpc>(
    stream: BidirectionalStream<S, T> | ResponseStream<T>
) => {
    async function* generator() {
        const data: T[] = []

        let nextDataResolve: (going: boolean) => void
        let nextDataPromise = new Promise<boolean>((resolve) => (nextDataResolve = resolve))

        stream.on('data', (newData: T) => {
            data.push(newData)
            if (nextDataResolve) {
                nextDataResolve(true)
            }

            nextDataPromise = new Promise((resolve) => (nextDataResolve = resolve))
        })

        stream.on('end', () => {
            nextDataResolve(false)
        })

        while (true) {
            const trialListEntry = data.shift()
            if (trialListEntry) {
                yield trialListEntry
            } else {
                const doContinue = await nextDataPromise
                if (!doContinue) {
                    break
                }
            }
        }
    }
    return generator
}

export const streamToQueue = <S extends MessageGrpc, T extends MessageGrpc>(
    stream: BidirectionalStream<S, T> | ResponseStream<T>,
    requestQueue?: AsyncQueue<S>
) => {
    if ((stream as BidirectionalStream<S, T>).write && requestQueue) {
        const writeableStream = stream as BidirectionalStream<S, T>
        const inputStream = async () => {
            let going = true
            while (going) {
                const request = await requestQueue.get()
                if (!request) {
                    going = false
                } else {
                    try {
                        writeableStream.write(request)
                    } catch (e) {
                        throw e
                    }
                }
            }
        }
        inputStream()
    }

    const queue = new AsyncQueue<T>()

    const generator = async () => {
        const data: T[] = []

        let nextDataResolve: (going: boolean) => void
        let nextDataPromise = new Promise<boolean>((resolve) => (nextDataResolve = resolve))

        stream.on('data', (newData: T) => {
            data.push(newData)
            if (nextDataResolve) {
                nextDataResolve(true)
            }

            nextDataPromise = new Promise((resolve) => (nextDataResolve = resolve))
        })

        stream.on('end', () => {
            nextDataResolve(false)
        })

        while (true) {
            const trialListEntry = data.shift()
            if (trialListEntry) {
                queue.put(trialListEntry)
            } else {
                const doContinue = await nextDataPromise
                if (!doContinue) {
                    break
                }
            }
        }
    }
    generator()

    return queue
}

export class AsyncQueue<T> {
    private data: T[] = []
    private nextDataResolve: (going: boolean) => void = () => {}
    private nextDataPromise: Promise<boolean>
    constructor() {
        this.nextDataPromise = new Promise<boolean>((resolve) => (this.nextDataResolve = resolve))
    }

    public put = (newData: T) => {
        this.data.push(newData)
        if (this.nextDataResolve) {
            this.nextDataResolve(true)
        }

        this.nextDataPromise = new Promise((resolve) => (this.nextDataResolve = resolve))
    }

    public get = async () => {
        if (this.data.length) {
            return this.data.shift()
        }

        const doContinue = await this.nextDataPromise
        if (!doContinue) {
            return
        }
        if (!this.data.length) {
            return
        }

        return this.data.shift()
    }

    public end = () => {
        this.nextDataResolve(false)
    }
}

export const staticCastFromGoogle = <T extends MessageBase>(source: MessageGrpc, destClass: MessageClass): T => {
    const binary = source.serializeBinary()
    const deserialized = destClass.decode(binary)

    return deserialized as T
}

export const staticCastToGoogle = <T extends MessageGrpc>(source: MessageBase, destClass: typeof MessageGrpc): T => {
    const binary = (source.constructor as MessageClass).encode(source).finish()
    const newMessage = destClass.deserializeBinary(binary)

    return newMessage as T
}

export const requestAll = <Input extends MessageGrpc, Output extends MessageGrpc>(
    inputs: Input[],
    clientMethod: PromiseClientMethod<Input, Output>
) => {
    let numResolved = 0
    const results: Output[] = []

    const token = globalObject.token
    if (!token) throw new Error('No token')

    const authMetadata = {
        authorization: token,
    }

    return new Promise<Output[]>((resolve, reject) => {
        for (const input of inputs) {
            // eslint-disable-next-line no-loop-func
            clientMethod(input, authMetadata)
                .then((result) => {
                    results.push(result)
                    numResolved++
                    if (numResolved === inputs.length) {
                        resolve(results)
                    }
                })
                .catch((err) => {
                    reject(err)
                })
        }
    })
}

export const requestAllStream = <Input extends MessageGrpc, Output extends MessageGrpc>(
    inputs: Input[],
    bidi: Bidi<Input, Output>
) => {
    let numResolved = 0
    const results: Output[] = []

    return new Promise<Output[]>((resolve, reject) => {
        if (inputs.length === 0) {
            resolve(results)
        }

        for (const input of inputs) {
            bidi.write(input)
        }
        const waitForStream = async () => {
            while (true) {
                const result = await bidi.next()
                if (!result) {
                    reject('stream ended')
                    break
                }
                results.push(result)
                numResolved++
                if (numResolved === inputs.length) {
                    resolve(results)
                    break
                }
            }
        }
        waitForStream()
    })
}

export const deepNullCheck = (obj: any) => {
    if (obj === null) {
        return true
    }
    if (typeof obj !== 'object') {
        return false
    }
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (deepNullCheck(obj[key])) {
                throw new Error(`${key} is null`)
            }
        }
    }
    return false
}

type RequiredNonNull<T> = {
    [P in keyof T]-?: NonNullable<T[P]>
}

export const ensureProps = <T>(obj: T, props: (keyof T)[]): RequiredNonNull<T> => {
    //checks if all props are present
    for (const prop of props) {
        if (obj[prop] === null || obj[prop] === undefined) {
            throw new Error(`${prop} is null`)
        }
    }
    return obj as unknown as RequiredNonNull<T>
}
