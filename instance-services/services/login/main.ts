import { sendUnaryData, ServerUnaryCall } from 'grpc';
import { ILoginServer } from './protos/login_grpc_pb';
import { AuthenticationForm, AuthenticationResponse } from './protos/login_pb';

//@ts-ignore
export class LoginServer implements ILoginServer {
    login(call: ServerUnaryCall<AuthenticationForm>, callback: sendUnaryData<AuthenticationResponse>) {
        callback({
            code: -1,
            name: 'UNIMPLEMENTED',
            message: 'Login is not implemented',
        }, null);
    }
}