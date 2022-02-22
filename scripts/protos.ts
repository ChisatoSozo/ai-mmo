import { exec } from 'child_process';
import { PathLike, readdirSync } from 'fs';
import { mkdir, rmdir } from 'fs/promises';
import { join } from 'path';

const getDirectories = (source: PathLike) =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

const shell = (command: string) => {
    console.log(`Executing: ${command}`);
    return new Promise<void>((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`\u001B[31m${error.message}\u001B[0m`);
                resolve();
                return;
            }
            if (stderr) {
                console.log(`\u001B[31m${stderr}\u001B[0m`);
                resolve();
                return;
            }
            console.log(stdout);
            resolve();
        });
    });
};

const cleanDirectory = async (dir: string) => {
    try {
        await rmdir(dir, { recursive: true });
    } catch (e) {
        console.log(e)
        // ignore
    }
    await mkdir(dir, { recursive: true });
}

const protoLibs = ["common.proto"];
const serviceDirectories = ["instance-services/services", "global-services"];

const main = async () => {
    const outClientDirectory = join(__dirname, "../client", "src", "protos");
    await cleanDirectory(outClientDirectory);

    for(const serviceDirectory of serviceDirectories) {
        const services = getDirectories(join(__dirname, `../${serviceDirectory}`));
        for (let service of services) {
            const outServiceDirectory = join(serviceDirectory, service, "protos");
            await cleanDirectory(outServiceDirectory);

            const fileName = service + 'API';

            const js = fileName + '.js';
            const dts = fileName + '.d.ts';

            const outClientJS = join(outClientDirectory, js);
            const outClientTS = join(outClientDirectory, dts);
            const protoFile = join(service + ".proto");

            const serverCommand = `npx grpc_tools_node_protoc --proto_path=api --js_out=import_style=commonjs,binary:${outServiceDirectory} --ts_out=service=grpc-node:${outServiceDirectory} --grpc_out=${outServiceDirectory} ${protoFile}`
            const clientCommand = `npx pbjs -t static-module -o ${outClientJS} -path=api ${protoFile} && npx pbts -o ${outClientTS} ${outClientJS}`;

            await shell(serverCommand);
            await shell(clientCommand);

            for(let protoLib of protoLibs){
                const serverCommand = `npx grpc_tools_node_protoc --proto_path=api --js_out=import_style=commonjs,binary:${outServiceDirectory} --ts_out=service=grpc-node:${outServiceDirectory} --grpc_out=${outServiceDirectory} ${protoLib}`
                await shell(serverCommand);
            }
        }
        
        //server_list => instance-services
        const outServiceDirectory = join("instance-services", "protos");
        await cleanDirectory(outServiceDirectory);
        const serverCommand = `npx grpc_tools_node_protoc --proto_path=api --js_out=import_style=commonjs,binary:${outServiceDirectory} --ts_out=service=grpc-node:${outServiceDirectory} --grpc_out=${outServiceDirectory} server_list.proto`
        await shell(serverCommand);
    }
}

main();