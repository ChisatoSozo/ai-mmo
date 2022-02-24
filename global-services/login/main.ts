import * as bcrypt from 'bcrypt';
import * as flatfile from 'flat-file-db';
import { existsSync, writeFileSync } from 'fs';
import * as grpc from "grpc";
import { sendUnaryData, ServerUnaryCall } from 'grpc';
import * as jwt from 'jsonwebtoken';
import { ILoginServer, LoginService } from './protos/login_grpc_pb';
import { AuthenticationForm, AuthenticationResponse, AuthenticationUser } from './protos/login_pb';
import { ProxyManagerClient } from './protos/proxy_manager_grpc_pb';
import { ProxyRequest, ProxyRequestList } from './protos/proxy_manager_pb';

const _env: { [key: string]: string } = {
    PROXY_MANAGER_HOSTNAME: process.env.PROXY_MANAGER_HOSTNAME || "",
    PROXY_MANAGER_PORT: process.env.PROXY_MANAGER_PORT || "",
    LOGIN_HOSTNAME: process.env.LOGIN_HOSTNAME || "",
    LOGIN_PORT: process.env.LOGIN_PORT || "",
    LOGIN_FRONTEND_PORT: process.env.LOGIN_FRONTEND_PORT || "",
    TOKEN_KEY: process.env.TOKEN_KEY || "",
}

Object.keys(_env).forEach(key => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set.`);
    }
});

const env = {
    PROXY_MANAGER_HOSTNAME: _env.PROXY_MANAGER_HOSTNAME,
    PROXY_MANAGER_PORT: parseInt(_env.PROXY_MANAGER_PORT),
    LOGIN_HOSTNAME: _env.LOGIN_HOSTNAME,
    LOGIN_PORT: parseInt(_env.LOGIN_PORT),
    LOGIN_FRONTEND_PORT: parseInt(_env.LOGIN_FRONTEND_PORT),
    TOKEN_KEY: _env.TOKEN_KEY,
}

if (!existsSync('./db/users.db')) {
    writeFileSync('./db/users.db', '')
}

const db = flatfile.sync('./db/users.db');


//@ts-ignore
export class LoginServer implements ILoginServer {
    register(call: ServerUnaryCall<AuthenticationForm>, callback: sendUnaryData<AuthenticationResponse>) {
        const authenticationObject = call.request.toObject();
        const { username, password } = authenticationObject;

        if (!username || !password) {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                name: 'INVALID_ARGUMENT',
                message: 'Username and password are required',
            }, null);
            return;
        }

        if (db.has(username)) {
            callback({
                code: grpc.status.ALREADY_EXISTS,
                name: 'ALREADY_EXISTS',
                message: 'Username already exists',
            }, null);
            return;
        }

        const encryptedPassword = bcrypt.hashSync(password, 10);

        const token = jwt.sign(
            { username },
            env.TOKEN_KEY,
            {
                expiresIn: '2h'
            }
        )

        db.put(username, {
            username,
            password: encryptedPassword,
            token
        });

        const response = new AuthenticationResponse();
        response.setToken(token);
        callback(null, response);
    }

    login(call: ServerUnaryCall<AuthenticationForm>, callback: sendUnaryData<AuthenticationResponse>) {

        const authenticationObject = call.request.toObject();
        const { username, password } = authenticationObject;

        if (!username || !password) {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                name: 'INVALID_ARGUMENT',
                message: 'Username and password are required',
            }, null);
            return;
        }

        const user = db.get(username);

        if (!user) {
            callback({
                code: grpc.status.NOT_FOUND,
                name: 'NOT_FOUND',
                message: 'Username not found',
            }, null);
            return;
        }

        const isValid = bcrypt.compareSync(password, user.password);

        if (!isValid) {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                name: 'INVALID_ARGUMENT',
                message: 'Invalid password',
            }, null);
            return;
        }

        const token = jwt.sign(
            { username },
            env.TOKEN_KEY,
            {
                expiresIn: '2h'
            }
        )

        db.put(username, { ...user, token });

        const response = new AuthenticationResponse();
        response.setToken(token);
        callback(null, response);
    }

    authenticate(call: ServerUnaryCall<AuthenticationResponse>, callback: sendUnaryData<AuthenticationUser>) {
        const authenticationObject = call.request.toObject();
        const { token } = authenticationObject;

        if (!token) {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                name: 'INVALID_ARGUMENT',
                message: 'Token is required',
            }, null);
            return;
        }

        try {
            const { username } = jwt.verify(token, env.TOKEN_KEY) as jwt.JwtPayload;
            const response = new AuthenticationUser();
            response.setUser(username);
            callback(null, response);
        }
        catch (error) {
            callback({
                code: grpc.status.INVALID_ARGUMENT,
                name: 'INVALID_ARGUMENT',
                message: 'Invalid token',
            }, null);
        }
    }
}

const LOGIN_URI = `${env.LOGIN_HOSTNAME}:${env.LOGIN_PORT}`;

const server = new grpc.Server();
//@ts-ignore
server.addService(LoginService, new LoginServer());
server.bindAsync(LOGIN_URI, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log(`Server List: Listening on ${LOGIN_URI}`);
    server.start();
});

const PROXY_MANAGER_URI = `${env.PROXY_MANAGER_HOSTNAME}:${env.PROXY_MANAGER_PORT}`;
const proxyManagerClient = new ProxyManagerClient(PROXY_MANAGER_URI, grpc.credentials.createInsecure());

const request = new ProxyRequestList();
const proxyRequest = new ProxyRequest();
proxyRequest.setBackendHostname(env.LOGIN_HOSTNAME);
proxyRequest.setBackendPort(env.LOGIN_PORT);
proxyRequest.setForceFrontendPort(env.LOGIN_FRONTEND_PORT);

request.setProxyList([proxyRequest]);
proxyManagerClient.put(request, (err, response) => {
    if (err) {
        console.log(`Server List: Failed to register with proxy manager: ${err.message}`);
        throw err;
    }
    console.log(`Successfully Started Proxy on Port ${env.LOGIN_FRONTEND_PORT}`);
});