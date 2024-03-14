import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shader, Texture, Component, Matrix } = tiny;
import { Buffered_Texture } from './ShaderMaterial.js';

export class PreviousFrameMaterial
{
    constructor()
    {
        this.quad = new defs.Square();
        this.initialized = false;
        this.read_texture = 1; // texture to read from, null means the default texture
        this.write_texture = 0;
        this.ready = false;

        this.texture_shader = new defs.Textured_Phong(1);
    }

    texture_buffer_init(gl) {
        this.shaderTextures = [gl.createTexture(), gl.createTexture()];
        this.depthTextures = [gl.createTexture(), gl.createTexture()]; // Depth textures
        this.buffered_shader_textures = [new Buffered_Texture(this.shaderTextures[0]), new Buffered_Texture(this.shaderTextures[1])];
        this.buffered_depth_textures = [new Buffered_Texture(this.depthTextures[0]), new Buffered_Texture(this.depthTextures[1])];

        this.screen_height = gl.canvas.height;
        this.screen_width = gl.canvas.width;

        // Initialize both color and depth textures
        for (let i = 0; i < 2; i++) {
            // Color texture setup
            gl.bindTexture(gl.TEXTURE_2D, this.shaderTextures[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.screen_width, this.screen_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            // Depth texture setup
            gl.bindTexture(gl.TEXTURE_2D, this.depthTextures[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.screen_width, this.screen_height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        // Create and setup framebuffers
        this.shaderTextureFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
        for (let i = 0; i < 2; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.shaderTextureFramebuffers[i]);
            // Attach color texture
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shaderTextures[i], 0);
            // Attach depth texture
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTextures[i], 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    set_output_framebuffer(context, uniforms) {
        const gl = context.context;

        if (!this.initialized) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('WEBGL_depth_texture extension is required but not supported.');
            }
            this.texture_buffer_init(gl);
            this.initialized = true;
        } else {
            this.read_texture = this.write_texture;
            this.write_texture = (this.write_texture + 1) % 2;
        }

        let i = this.write_texture;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shaderTextureFramebuffers[i]);
        gl.viewport(0, 0, this.screen_width, this.screen_height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
    }

    draw_scene(context, uniforms)
    {
        const gl = context.context;

        // Reset the target framebuffer to the default framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const ar = gl.canvas.width / gl.canvas.height;

        // Use the current write texture as the texture to draw to the screen

        const projection_transform = Mat4.orthographic(-1, 1, -1/ar, 1/ar, -4, 4);
        const cam_Mat = Mat4.look_at(vec3(0, 0, 1), vec3(0, 0, 0), vec3(0, 1, 0));

        Shader.assign_camera(cam_Mat, uniforms);
        uniforms.projection_transform = projection_transform;

        const transform = Mat4.identity().times(Mat4.scale(1, 1/ar, 1));
        const texture = this.buffered_shader_textures[this.write_texture];
        this.quad.draw(context, uniforms, transform, {shader: this.texture_shader, texture: texture, ambient: 1, diffusivity: 0, specularity: 0, color: color(1, 1, 1, 1)});

        this.ready = true;
    }

    get_texture()
    {
        return this.buffered_shader_textures[this.read_texture];
    }

    get_depth_texture()
    {
        return this.buffered_depth_textures[this.read_texture];
    }
}
