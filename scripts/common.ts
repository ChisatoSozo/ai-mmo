import { PathLike, readdirSync } from 'fs'

const getDirectories = (source: PathLike) =>
    readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .map((name) => `${source}/${name}`)

export const clientDirectories = ['client/src']
export const serverDirectories = [
    getDirectories('global-services'),
    getDirectories('content-services'),
    'instance-services',
    'utils',
].flat()
