import { spawn } from 'child_process';
import { existsSync } from 'fs';
import * as os from 'os';
import { ProxyReply, ProxyRequestList } from './protos/proxy_manager_pb';

const _env: { [key: string]: string } = {
    PROXY_MANAGER_DYNAMIC_PORTS_START: process.env.PROXY_MANAGER_DYNAMIC_PORTS_START || "",
    PROXY_MANAGER_FRONTEND_PORT_MIN: process.env.PROXY_MANAGER_FRONTEND_PORT_MIN || "",
    PROXY_MANAGER_FRONTEND_PORT_MAX: process.env.PROXY_MANAGER_FRONTEND_PORT_MAX || "",
}

Object.keys(_env).forEach(key => {
    if (!_env[key]) {
        throw new Error(`Environment variable ${key} is not set.`);
    }
});

const env = {
    PROXY_MANAGER_DYNAMIC_PORTS_START: parseInt(_env.PROXY_MANAGER_DYNAMIC_PORTS_START),
    PROXY_MANAGER_FRONTEND_PORT_MIN: parseInt(_env.PROXY_MANAGER_FRONTEND_PORT_MIN),
    PROXY_MANAGER_FRONTEND_PORT_MAX: parseInt(_env.PROXY_MANAGER_FRONTEND_PORT_MAX),
}

const shell = (command: string) => {
    console.log(`Executing: ${command}`);
    return new Promise<void>((resolve) => {
        const process = spawn('sh', ['-c', command], { stdio: 'inherit' });

        process.on('close', (code) => {
            if (code !== 0) {
                console.error(`Process exited with code ${code}`);
            }
            resolve();
        });
    });
};

let currentDynamicFrontendPort = 10501;
let forcedPorts = new Set();

export const launchWebProxies = (proxies: ProxyRequestList) => {
    if (!existsSync('/usr/local/bin/grpcwebproxy')) {
        throw new Error('grpcwebproxy not found');
    }

    if (currentDynamicFrontendPort >= env.PROXY_MANAGER_FRONTEND_PORT_MAX) {
        throw new Error('Too many frontends');
    }

    const hostname = os.hostname();

    return proxies.getProxyList().map(proxy => {

        const forcedPort = proxy.getForceFrontendPort();
        let frontendPort = 0;

        if (forcedPort) {
            if (forcedPorts.has(proxy.getForceFrontendPort())) {
                throw new Error(`Port ${proxy.getForceFrontendPort()} is already in use`);
            }
            if (forcedPort < env.PROXY_MANAGER_FRONTEND_PORT_MIN || forcedPort > env.PROXY_MANAGER_FRONTEND_PORT_MAX) {
                throw new Error(`Port ${proxy.getForceFrontendPort()} is not in the allowed range`);
            }

            frontendPort = proxy.getForceFrontendPort();
            forcedPorts.add(proxy.getForceFrontendPort());
        }
        else {
            frontendPort = currentDynamicFrontendPort++;
        }

        const backendHostname = proxy.getBackendHostname();
        const backendPort = proxy.getBackendPort();

        console.log(`Launching grpcwebproxy on ${hostname}:${frontendPort}`);
        console.log(`Routing to ${backendHostname}:${backendPort}`);

        shell(`grpcwebproxy --backend_addr=${backendHostname}:${backendPort} --run_tls_server=false --allow_all_origins --use_websockets --server_http_debug_port=${frontendPort}`)

        const response = new ProxyReply();
        response.setBackendHostname(backendHostname);
        response.setBackendPort(backendPort);
        response.setFrontendHostname(hostname);
        response.setFrontendPort(frontendPort);

        return response;
    });
}