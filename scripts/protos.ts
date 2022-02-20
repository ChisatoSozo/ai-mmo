import { exec } from 'child_process';
import { PathLike, readdirSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';

const getDirectories = (source: PathLike) =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

const grpcServices = getDirectories(join(__dirname, "../grpc-services"));

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
        await unlink(dir);
    } catch (e) {
        // ignore
    }
    await mkdir(dir, { recursive: true });
}

const main = async () => {
    const outClientDirectory = join(__dirname, "../client", "src", "protos");
    await cleanDirectory(outClientDirectory);

    for (let service of grpcServices) {
        const outServiceDirectory = join(__dirname, "../grpc-services", service, "protos");
        await cleanDirectory(outServiceDirectory);

        const fileName = service + 'API';

        const js = fileName + '.js';
        const dts = fileName + '.d.ts';

        const outClientJS = join(outClientDirectory, js);
        const outClientTS = join(outClientDirectory, dts);
        const protoFile = join(__dirname, "../api", service + ".proto");

        const serverCommand = `npx grpc_tools_node_protoc --proto_path=. --js_out=import_style=commonjs,binary:${outServiceDirectory} --ts_out=service=grpc-node:${outServiceDirectory} --grpc_out=${outServiceDirectory} ${protoFile}`
        const clientCommand = `npx pbjs -t static-module -o ${outClientJS} -path=. ${protoFile} && npx pbts -o ${outClientTS} ${outClientJS}`;

        await shell(serverCommand);
        await shell(clientCommand);
    }
}

main();