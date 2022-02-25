import { exec } from 'child_process'
import { PathLike, readdirSync } from 'fs'
import { copySync } from 'fs-extra'
import { mkdir, rmdir } from 'fs/promises'
import { join } from 'path'

const getDirectories = (source: PathLike) =>
    readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .map((name) => `${source}/${name}`)

const getFiles = (source: PathLike) =>
    readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)

const shell = (command: string) => {
    console.log(`Executing: ${command}`)
    return new Promise<void>((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`\u001B[31m${error.message}\u001B[0m`)
                resolve()
                return
            }
            if (stderr) {
                console.log(`\u001B[31m${stderr}\u001B[0m`)
                resolve()
                return
            }
            console.log(stdout)
            resolve()
        })
    })
}

const cleanDirectory = async (dir: string) => {
    try {
        await rmdir(dir, { recursive: true })
    } catch (e) {
        // ignore
    }
    await mkdir(dir, { recursive: true })
}

const clientDirectories = ['client/src']
const serverDirectories = [
    getDirectories('global-services'),
    getDirectories('content-services'),
    'instance-services',
].flat()

const protoFiles = getFiles('api')

const main = async () => {
    const outServerDirectory = join('api', 'server-protos')
    const outClientDirectory = join('api', 'client-protos')
    await cleanDirectory(outServerDirectory)
    await cleanDirectory(outClientDirectory)

    for (const protoFile of protoFiles) {
        const fileName = protoFile.split('.')[0]
        const js = fileName + '.js'
        const dts = fileName + '.d.ts'
        const outClientJS = join(outClientDirectory, js)
        const outClientTS = join(outClientDirectory, dts)

        const serverCommand = `npx grpc_tools_node_protoc --proto_path=api --js_out=import_style=commonjs,binary:${outServerDirectory} --ts_out=service=grpc-node:${outServerDirectory} --grpc_out=${outServerDirectory} ${protoFile}`
        const clientPBCommand = `npx grpc_tools_node_protoc --proto_path=api --js_out=import_style=commonjs,binary:${outClientDirectory} --ts_out=service=grpc-web:${outClientDirectory} ${protoFile}`
        const clientCommand = `npx pbjs -t static-module -o ${outClientJS} -path=api ${protoFile} && npx pbts -o ${outClientTS} ${outClientJS}`
        await shell(serverCommand)
        await shell(clientPBCommand)
        await shell(clientCommand)
    }

    for (const serverDirectory of serverDirectories) {
        copySync(outServerDirectory, serverDirectory + '/protos', { overwrite: true })
    }

    for (const clientDirectory of clientDirectories) {
        copySync(outClientDirectory, clientDirectory + '/protos', { overwrite: true })
    }
}

main()
