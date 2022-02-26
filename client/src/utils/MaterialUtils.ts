export const glsl = (template: TemplateStringsArray, ...args: (string | number)[]) => {
    let str = ''
    for (let i = 0; i < args.length; i++) {
        str += template[i] + String(args[i])
    }
    return str + template[template.length - 1]
}

export const unrollTextureArrayUniform = (size: number) => {
    const result = []
    for (let i = 0; i < size; i++) {
        result.push(glsl`
        case ${i}:
            return texture2D(textureArray[${i}], uv);
        `)
    }
    const body = result.join('\n')

    const glslFragment = glsl`
        vec4 arrayTexture(sampler2D textureArray[${size}], int index, vec2 uv) {
            switch (index) {
                ${body}
                default:
                    return vec4(0.0, 0.0, 0.0, 0.0);
            }
        }
    `
    return glslFragment
}
