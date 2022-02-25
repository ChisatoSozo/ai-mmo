import * as grpc from 'grpc'
import * as jwt from 'jsonwebtoken'

export const test = () => null

export const authUsernameDuplex = <T, S>(call: grpc.ServerDuplexStream<T, S>, TOKEN_KEY: string): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, TOKEN_KEY) as jwt.JwtPayload
        return decoded.username
    } catch (err: any) {
        console.log(err)
        call.destroy(new Error('UNAUTHENTICATED'))
        return false
    }
}

export const authUsernameServerStream = <T, S>(
    call: grpc.ServerReadableStream<T>,
    callback: grpc.sendUnaryData<S>,
    TOKEN_KEY: string
): string | false => {
    try {
        const token = call.metadata.get('authorization')[0] as string
        const decoded = jwt.verify(token, TOKEN_KEY) as jwt.JwtPayload
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
