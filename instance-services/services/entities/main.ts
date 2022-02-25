import * as grpc from 'grpc'
import { sendUnaryData, ServerDuplexStream, ServerReadableStream } from 'grpc'
import * as jwt from 'jsonwebtoken'
import { Chunk, Empty } from '../../protos/common_pb'
import { IEntitiesServer } from '../../protos/entities_grpc_pb'
import { EntityList, EntityState } from '../../protos/entities_pb'

const _env: { [key: string]: string } = {
    TOKEN_KEY: process.env.TOKEN_KEY || '',
}

Object.keys(_env).forEach((key) => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set.`)
    }
})

const env = {
    TOKEN_KEY: _env.TOKEN_KEY,
}

const authUsernameDuplex = <T, S>(call: ServerDuplexStream<T, S>): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, env.TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        call.destroy(new Error('UNAUTHENTICATED'))
        return false
    }
}

const authUsername = <T, S>(call: ServerReadableStream<T>, callback: sendUnaryData<S>): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, env.TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        callback(
            {
                code: grpc.status.UNAUTHENTICATED,
                name: 'UNAUTHENTICATED',
                message: err.message,
            },
            null
        )
        return false
    }
}

//@ts-ignore
export class EntitiesServer implements IEntitiesServer {
    entityStates: { [chunkString: string]: { [key: string]: EntityState } } = {}

    setEntityState(state: EntityState) {
        this.entityStates[JSON.stringify(state.getChunk()?.toObject())][state.getName()] = state
    }

    getEntityStates(chunk: Chunk) {
        return this.entityStates[JSON.stringify(chunk.toObject())]
    }

    update(call: ServerReadableStream<EntityState>, callback: sendUnaryData<Empty>) {
        const username = authUsername(call, callback)
        if (!username) return

        call.on('data', (entityState: EntityState) => {
            if (entityState.getName() !== username) {
                call.destroy(new Error('Entity name does not match username'))
            }
            this.setEntityState(entityState)
        })

        callback(null, new Empty())
    }

    get(call: ServerDuplexStream<Chunk, EntityList>) {
        const username = authUsernameDuplex(call)
        if (!username) return

        call.on('data', (chunk: Chunk) => {
            const entityStates = this.getEntityStates(chunk)
            const entityList = new EntityList()
            if (entityStates) {
                entityList.setEntitiesList(Object.values(entityStates))
            }
            call.write(entityList)
        })
    }
}
