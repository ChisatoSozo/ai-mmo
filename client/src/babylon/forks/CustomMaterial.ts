/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-array-constructor */
import { Vector3 } from '@babylonjs/core'
import { Effect } from '@babylonjs/core/Materials/effect'
import { MaterialDefines } from '@babylonjs/core/Materials/materialDefines'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Scene } from '@babylonjs/core/scene'

export class CustomShaderStructure {
    //@ts-ignore
    public FragmentStore: string
    //@ts-ignore
    public VertexStore: string

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}
}

export class ShaderSpecialParts {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}

    //@ts-ignore
    public Fragment_Begin: string
    //@ts-ignore
    public Fragment_Definitions: string
    //@ts-ignore
    public Fragment_MainBegin: string

    // diffuseColor
    //@ts-ignore
    public Fragment_Custom_Diffuse: string
    // lights
    //@ts-ignore
    public Fragment_Before_Lights: string
    // fog
    //@ts-ignore
    public Fragment_Before_Fog: string
    // alpha
    //@ts-ignore
    public Fragment_Custom_Alpha: string

    //@ts-ignore
    public Fragment_Before_FragColor: string

    //@ts-ignore
    public Vertex_Begin: string
    //@ts-ignore
    public Vertex_Definitions: string
    //@ts-ignore
    public Vertex_MainBegin: string

    // positionUpdated
    //@ts-ignore
    public Vertex_Before_PositionUpdated: string

    // normalUpdated
    //@ts-ignore
    public Vertex_Before_NormalUpdated: string

    // worldPosComputed
    //@ts-ignore
    public Vertex_After_WorldPosComputed: string

    // mainEnd
    //@ts-ignore
    public Vertex_MainEnd: string
}

export class CustomMaterial extends StandardMaterial {
    public static ShaderIndexer = 1
    public CustomParts: ShaderSpecialParts
    //@ts-ignore
    _isCreatedShader: boolean
    //@ts-ignore
    _createdShaderName: string
    //@ts-ignore
    _customUniform: string[]
    //@ts-ignore
    _newUniforms: string[]
    //@ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _newUniformInstances: { [name: string]: any }
    //@ts-ignore
    _newSamplerInstances: { [name: string]: Texture }
    //@ts-ignore
    _newSamplerArrayInstances: { [name: string]: Texture[] }
    //@ts-ignore
    _customAttributes: string[]

    public FragmentShader: string
    public VertexShader: string

    public AttachAfterBind(mesh: Mesh, effect: Effect) {
        if (this._newUniformInstances) {
            for (const el in this._newUniformInstances) {
                const ea = el.toString().split('-')
                if (ea[0] == 'vec2') {
                    effect.setVector2(ea[1], this._newUniformInstances[el])
                } else if (ea[0] == 'vec3') {
                    effect.setVector3(ea[1], this._newUniformInstances[el])
                } else if (ea[0] == 'vec4') {
                    effect.setVector4(ea[1], this._newUniformInstances[el])
                } else if (ea[0] == 'mat4') {
                    effect.setMatrix(ea[1], this._newUniformInstances[el])
                } else if (ea[0] == 'float') {
                    effect.setFloat(ea[1], this._newUniformInstances[el])
                }
            }
        }
        if (this._newSamplerInstances) {
            for (const el in this._newSamplerInstances) {
                const ea = el.toString().split('-')
                if (
                    ea[0] == 'sampler2D' &&
                    this._newSamplerInstances[el].isReady &&
                    this._newSamplerInstances[el].isReady()
                ) {
                    effect.setTexture(ea[1], this._newSamplerInstances[el])
                }
            }
        }
        if (this._newSamplerArrayInstances) {
            for (const el in this._newSamplerArrayInstances) {
                const ea = el.toString().split('-')
                if (
                    ea[0] == 'sampler2D' &&
                    this._newSamplerArrayInstances[el].every((texture) => texture.isReady) &&
                    this._newSamplerArrayInstances[el].every((texture) => texture.isReady())
                ) {
                    effect.setTextureArray(ea[1], this._newSamplerArrayInstances[el])
                }
            }
        }
    }

    public ReviewUniform(name: string, arr: string[]): string[] {
        if (name == 'uniform' && this._newUniforms) {
            for (let ind = 0; ind < this._newUniforms.length; ind++) {
                if (this._customUniform[ind].indexOf('sampler') == -1) {
                    arr.push(this._newUniforms[ind])
                }
            }
        }
        if (name == 'sampler' && this._newUniforms) {
            for (let ind = 0; ind < this._newUniforms.length; ind++) {
                if (this._customUniform[ind].indexOf('sampler') != -1) {
                    arr.push(this._newUniforms[ind])
                }
            }
        }
        return arr
    }

    public Builder(
        shaderName: string,
        uniforms: string[],
        uniformBuffers: string[],
        samplers: string[],
        defines: MaterialDefines | string[],
        attributes?: string[]
    ): string {
        if (attributes && this._customAttributes && this._customAttributes.length > 0) {
            attributes.push(...this._customAttributes)
        }

        this.ReviewUniform('uniform', uniforms)
        this.ReviewUniform('sampler', samplers)

        if (this._isCreatedShader) {
            return this._createdShaderName
        }
        this._isCreatedShader = false

        CustomMaterial.ShaderIndexer++
        const name: string = 'custom_' + CustomMaterial.ShaderIndexer

        //@ts-ignore
        const fn_afterBind = this._afterBind.bind(this)
        //@ts-ignore
        this._afterBind = (m, e) => {
            if (!e) {
                return
            }
            this.AttachAfterBind(m, e)
            try {
                fn_afterBind(m, e)
            } catch (e) {
                // eslint-disable-next-line no-empty
            }
        }

        Effect.ShadersStore[name + 'VertexShader'] = this.VertexShader.replace(
            '#define CUSTOM_VERTEX_BEGIN',
            this.CustomParts.Vertex_Begin ? this.CustomParts.Vertex_Begin : ''
        )
            .replace(
                '#define CUSTOM_VERTEX_DEFINITIONS',
                (this._customUniform ? this._customUniform.join('\n') : '') +
                    (this.CustomParts.Vertex_Definitions ? this.CustomParts.Vertex_Definitions : '')
            )
            .replace(
                '#define CUSTOM_VERTEX_MAIN_BEGIN',
                this.CustomParts.Vertex_MainBegin ? this.CustomParts.Vertex_MainBegin : ''
            )
            .replace(
                '#define CUSTOM_VERTEX_UPDATE_POSITION',
                this.CustomParts.Vertex_Before_PositionUpdated ? this.CustomParts.Vertex_Before_PositionUpdated : ''
            )
            .replace(
                '#define CUSTOM_VERTEX_UPDATE_NORMAL',
                this.CustomParts.Vertex_Before_NormalUpdated ? this.CustomParts.Vertex_Before_NormalUpdated : ''
            )
            .replace(
                '#define CUSTOM_VERTEX_MAIN_END',
                this.CustomParts.Vertex_MainEnd ? this.CustomParts.Vertex_MainEnd : ''
            )

        if (this.CustomParts.Vertex_After_WorldPosComputed) {
            Effect.ShadersStore[name + 'VertexShader'] = Effect.ShadersStore[name + 'VertexShader'].replace(
                '#define CUSTOM_VERTEX_UPDATE_WORLDPOS',
                this.CustomParts.Vertex_After_WorldPosComputed
            )
        }

        Effect.ShadersStore[name + 'PixelShader'] = this.FragmentShader.replace(
            '#define CUSTOM_FRAGMENT_BEGIN',
            this.CustomParts.Fragment_Begin ? this.CustomParts.Fragment_Begin : ''
        )
            .replace(
                '#define CUSTOM_FRAGMENT_MAIN_BEGIN',
                this.CustomParts.Fragment_MainBegin ? this.CustomParts.Fragment_MainBegin : ''
            )
            .replace(
                '#define CUSTOM_FRAGMENT_DEFINITIONS',
                (this._customUniform ? this._customUniform.join('\n') : '') +
                    (this.CustomParts.Fragment_Definitions ? this.CustomParts.Fragment_Definitions : '')
            )
            .replace(
                '#define CUSTOM_FRAGMENT_UPDATE_DIFFUSE',
                this.CustomParts.Fragment_Custom_Diffuse ? this.CustomParts.Fragment_Custom_Diffuse : ''
            )
            .replace(
                '#define CUSTOM_FRAGMENT_UPDATE_ALPHA',
                this.CustomParts.Fragment_Custom_Alpha ? this.CustomParts.Fragment_Custom_Alpha : ''
            )
            .replace(
                '#define CUSTOM_FRAGMENT_BEFORE_LIGHTS',
                this.CustomParts.Fragment_Before_Lights ? this.CustomParts.Fragment_Before_Lights : ''
            )
            .replace(
                '#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR',
                this.CustomParts.Fragment_Before_FragColor ? this.CustomParts.Fragment_Before_FragColor : ''
            )

        if (this.CustomParts.Fragment_Before_Fog) {
            Effect.ShadersStore[name + 'PixelShader'] = Effect.ShadersStore[name + 'PixelShader'].replace(
                '#define CUSTOM_FRAGMENT_BEFORE_FOG',
                this.CustomParts.Fragment_Before_Fog
            )
        }

        this._isCreatedShader = true
        this._createdShaderName = name

        return name
    }

    constructor(name: string, scene: Scene) {
        super(name, scene)
        this.CustomParts = new ShaderSpecialParts()
        //@ts-ignore
        this.customShaderNameResolve = this.Builder

        this.FragmentShader = Effect.ShadersStore['defaultPixelShader']
        this.VertexShader = Effect.ShadersStore['defaultVertexShader']
    }

    public AddUniform(name: string, kind: 'sampler2D', param: Texture): CustomMaterial
    public AddUniform(name: string, kind: 'vec3', param: Vector3): CustomMaterial
    public AddUniform(name: string, kind: string, param: any): CustomMaterial {
        if (!this._customUniform) {
            this._customUniform = new Array()
            this._newUniforms = new Array()
            this._newSamplerInstances = {}
            this._newSamplerArrayInstances = {}
            this._newUniformInstances = {}
        }
        if (param) {
            if (kind.indexOf('sampler') != -1) {
                ;(<any>this._newSamplerInstances)[kind + '-' + name] = param
            } else {
                ;(<any>this._newUniformInstances)[kind + '-' + name] = param
            }
        }
        this._customUniform.push('uniform ' + kind + ' ' + name + ';')
        this._newUniforms.push(name)

        return this
    }

    public AddUniformArray(name: string, kind: 'sampler2D', param: Texture[], length: number): CustomMaterial
    public AddUniformArray(name: string, kind: string, param: any[], length = param.length): CustomMaterial {
        if (!this._customUniform) {
            this._customUniform = new Array()
            this._newUniforms = new Array()
            this._newSamplerInstances = {}
            this._newSamplerArrayInstances = {}
            this._newUniformInstances = {}
        }
        if (param) {
            if (kind.indexOf('sampler') != -1) {
                ;(<any>this._newSamplerArrayInstances)[kind + '-' + name] = param
            } else {
                throw new Error("Uniform array can't be non sampler")
            }
        }
        this._customUniform.push('uniform ' + kind + ' ' + name + '[' + length + '];')
        this._newUniforms.push(name)

        return this
    }

    public AddAttribute(name: string): CustomMaterial {
        if (!this._customAttributes) {
            this._customAttributes = []
        }

        this._customAttributes.push(name)

        return this
    }

    public Fragment_Begin(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Begin = shaderPart
        return this
    }

    public Fragment_Definitions(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Definitions = shaderPart
        return this
    }

    public Fragment_MainBegin(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_MainBegin = shaderPart
        return this
    }

    public Fragment_Custom_Diffuse(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Custom_Diffuse = shaderPart.replace('result', 'diffuseColor')
        return this
    }

    public Fragment_Custom_Alpha(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Custom_Alpha = shaderPart.replace('result', 'alpha')
        return this
    }

    public Fragment_Before_Lights(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Before_Lights = shaderPart
        return this
    }

    public Fragment_Before_Fog(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Before_Fog = shaderPart
        return this
    }

    public Fragment_Before_FragColor(shaderPart: string): CustomMaterial {
        this.CustomParts.Fragment_Before_FragColor = shaderPart.replace('result', 'color')
        return this
    }

    public Vertex_Begin(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_Begin = shaderPart
        return this
    }

    public Vertex_Definitions(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_Definitions = shaderPart
        return this
    }

    public Vertex_MainBegin(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_MainBegin = shaderPart
        return this
    }

    public Vertex_Before_PositionUpdated(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_Before_PositionUpdated = shaderPart.replace('result', 'positionUpdated')
        return this
    }

    public Vertex_Before_NormalUpdated(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_Before_NormalUpdated = shaderPart.replace('result', 'normalUpdated')
        return this
    }

    public Vertex_After_WorldPosComputed(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_After_WorldPosComputed = shaderPart
        return this
    }

    public Vertex_MainEnd(shaderPart: string): CustomMaterial {
        this.CustomParts.Vertex_MainEnd = shaderPart
        return this
    }
}
