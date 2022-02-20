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

grpcServices.forEach(async service => {
    const outDirectory = join(__dirname, "../grpc-services", service, "protos");

    try {
        await unlink(outDirectory);
    } catch (e) {
        // ignore
    }
    await mkdir(outDirectory, { recursive: true });

    const fileName = service + 'API';

    const js = fileName + '.js';
    const dts = fileName + '.d.ts';

    const outJS = join(outDirectory, js);
    const outTS = join(outDirectory, dts);
    const protoFile = join(__dirname, "../api", service + ".proto");

    const command = `npx pbjs -t static-module -o ${outJS} -path=. ${protoFile} && npx pbts -o ${outTS} ${outJS}`;
    await shell(command);
})