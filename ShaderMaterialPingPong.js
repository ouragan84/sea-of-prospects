import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shader, Texture, Component, Matrix } = tiny;
import { Buffered_Texture } from './ShaderMaterial.js';

export class ShaderMaterialPingPong
{
    constructor(SIZE, shaderInstance)
    {
        this.quad = new defs.Square();
        this.initialized = false;
        this.SHADER_TEXTURE_TEX_SIZE = SIZE;
        this.shader = shaderInstance;
        this.read_texture = 1; // texture to read from, null means the default texture
        this.write_texture = 0;
    }

    texture_buffer_init(gl) {
        this.shaderTextures = [gl.createTexture(), gl.createTexture()];
        this.buffered_shader_textures = [new Buffered_Texture(this.shaderTextures[0]), new Buffered_Texture(this.shaderTextures[1])];

        this.shaderTextureSize = this.SHADER_TEXTURE_TEX_SIZE;

        for (let i = 0; i < 2; i++)
        {
            gl.bindTexture(gl.TEXTURE_2D, this.shaderTextures[i]);
            gl.texImage2D(
                gl.TEXTURE_2D,      // target
                0,                  // mip level
                gl.RGBA, // internal format
                this.shaderTextureSize,   // width
                this.shaderTextureSize,   // height
                0,                  // border
                gl.RGBA, // format
                gl.UNSIGNED_BYTE,    // type
                null);              // data
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        }

        this.shaderTextureFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
        for (let i = 0; i < 2; i++)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.shaderTextureFramebuffers[i]);
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,       // target
                gl.COLOR_ATTACHMENT0,  // attachment point
                gl.TEXTURE_2D,        // texture target
                this.shaderTextures[i],         // texture
                0);                   // mip level
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    update(context, uniforms)
    {
        const gl = context.context;

        // Initialize the texture buffer if it hasn't been initialized yet
        if (!this.initialized)
        {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);
            this.initialized = true;
        } else {
            this.read_texture = this.write_texture;
            this.write_texture = (this.write_texture + 1) % 2;
        }

        let i = this.write_texture;
        
        // Set the target framebuffer to the shader framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shaderTextureFramebuffers[i]);
        gl.viewport(0, 0, this.shaderTextureSize, this.shaderTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw the quad with our custom shader, a quad goes from -1 to 1 in x and y dimensions, and is at 0 in z dimension
        // we want the quad to be unstretched and fill the entire framebuffer (ideally we can do orthographic projection)
        const projection_transform = Mat4.orthographic(-1, 1, -1, 1, -1, 1);
        const cam_Mat = Mat4.look_at(vec3(0, 0, 1), vec3(0, 0, 0), vec3(0, 1, 0));

        Shader.assign_camera(cam_Mat, uniforms);
        uniforms.projection_transform = projection_transform;

        const transform = Mat4.identity();
        this.quad.draw(context, {...uniforms, previous_frame: this.get_texture()}, transform, {shader: this.shader});

        // Reset the target framebuffer to the default framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    }

    get_texture()
    {
        return this.buffered_shader_textures[this.read_texture];
    }
}
