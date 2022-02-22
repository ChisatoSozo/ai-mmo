import { sendUnaryData, ServerDuplexStream, ServerReadableStream } from 'grpc';
import { Chunk, Empty } from './protos/common_pb';
import { IEntitiesServer } from './protos/entities_grpc_pb';
import { EntityState } from './protos/entities_pb';

//@ts-ignore
export class EntitiesServer implements IEntitiesServer {
    update(call: ServerReadableStream<EntityState>, callback: sendUnaryData<Empty>) {
        callback({
            code: -1,
            name: 'UNIMPLEMENTED',
            message: 'Update is not implemented',
        }, null);
    }
    get(call: ServerDuplexStream<Chunk, ResponseType>) {
        call.end();
    }
}