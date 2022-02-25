import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')

const getAllFiles = function (dirPath: string, arrayOfFiles: string[] = []) {
    if (dirPath.endsWith('node_modules')) {
        return arrayOfFiles
    }
    const files = readdirSync(dirPath)

    arrayOfFiles = arrayOfFiles || []

    files.forEach(function (file) {
        if (statSync(dirPath + '/' + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles)
        } else {
            arrayOfFiles.push(join(root, dirPath, '/', file))
        }
    })

    return arrayOfFiles
}
console.log(`cd ${root}/utils`)
require('child_process').execSync(`cd ${root}/utils && rm -rf *.tgz && npm pack`)

const files = getAllFiles(root)

//find all package.json files and npm install them
files.forEach((file) => {
    if (file.endsWith('package.json')) {
        const path = file.replace(root, '').replace('package.json', '')

        if (path === root + '/utils/') {
            console.log('skipping utils package.json')
            return
        }
        if (path === root + '/') {
            console.log('skipping root package.json')
            return
        }
        console.log('installing', path)

        if (!path.includes('client')) {
            require('child_process').execSync(`rm -rf ${path}/utils.tgz`)
            require('child_process').execSync(`cp ${root + '/utils/' + '*.tgz'} ${path}/utils.tgz`)
        }

        require('child_process').execSync(`rm -rf ${path}/node_modules`)
        require('child_process').execSync(`cd ${path} && npm install`)
    }
})
