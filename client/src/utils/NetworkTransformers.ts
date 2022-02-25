import { grpc } from '@improbable-eng/grpc-web'
import { Message } from 'google-protobuf'

type ServiceError = { message: string; code: number; metadata: grpc.Metadata }
type Status = { details: string; code: number; metadata: grpc.Metadata }

interface BidirectionalStream<ReqT, ResT> {
    write(message: ReqT): BidirectionalStream<ReqT, ResT>
    end(): void
    cancel(): void
    on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>
    on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>
    on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>
}

export const makeBidi = <Input extends Message, Output extends Message>(
    stream: BidirectionalStream<Input, Output>
): Bidi<Input, Output> => {
    //Changes the stream to a generator that can be used with async/await

    const data: Output[] = []

    let nextDataResolve: (going: boolean) => void
    let nextDataPromise = new Promise<boolean>((resolve) => (nextDataResolve = resolve))

    const statusObject = {
        status: undefined as Status | undefined,
    }

    stream.on('data', (newData: Output) => {
        data.push(newData)
        if (nextDataResolve) {
            nextDataResolve(true)
        }
    })

    stream.on('end', (status?: Status) => {
        console.log('stream end')
        statusObject.status = status
        if (nextDataResolve) {
            nextDataResolve(false)
        }
    })

    stream.on('status', (status: Status) => {
        console.log('stream status', status)
        statusObject.status = status
    })

    return {
        stream,
        write: (message: Input) => {
            stream.write(message)
        },
        end: () => {
            stream.end()
        },
        cancel: () => {
            stream.cancel()
        },
        next: async () => {
            if (data.length > 0) {
                return data.shift() as Output
            }
            const keepGoing = await nextDataPromise
            if (!keepGoing) {
                return undefined
            }
            nextDataPromise = new Promise<boolean>((resolve) => (nextDataResolve = resolve))
            return data.shift() as Output
        },
        statusObject,
    }
}

export type Bidi<Input extends Message, Output extends Message> = {
    stream: BidirectionalStream<Input, Output>
    write: (message: Input) => void
    end: () => void
    cancel: () => void
    next: () => Promise<Output | undefined>
    statusObject: {
        status: Status | undefined
    }
}
interface UnaryResponse {
    cancel(): void
}

type UnaryRequest = <Input extends Message, Output extends Message>(
    requestMessage: Input,
    metadata: grpc.Metadata,
    callback: (error: ServiceError | null, responseMessage: Output | null) => void
) => UnaryResponse

export const pFetch = async <Input extends Message, Output extends Message>(
    input: Input,
    method: UnaryRequest
): Promise<Output | null> => {
    const metadata = new grpc.Metadata()
    return new Promise<Output | null>((resolve, reject) => {
        method(input, metadata, (error, responseMessage: Output | null) => {
            if (error) {
                reject(error)
            } else {
                resolve(responseMessage)
            }
        })
    })
}
