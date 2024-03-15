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

        this.texture_shader = new Post_Process_Shader();
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
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.screen_width, this.screen_height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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
        this.quad.draw(context, {...uniforms, screen_height: gl.canvas.height, screen_width: gl.canvas.width}
        , transform, {shader: this.texture_shader, texture: texture});

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


const Post_Process_Shader = class Post_Process_Shader extends Shader {
    // The vertex shader only needs to pass through texture coordinates.
    vertex_glsl_code() {
        return `
        precision mediump float;
        attribute vec3 position;           // Position is expressed in object coordinates.
        attribute vec2 texture_coord;      // Per-vertex texture coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        varying vec2 f_tex_coord;          // Pass texture coordinates to the fragment shader.

        void main() {
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            f_tex_coord = texture_coord;   // Pass through texture coordinates.
        }`;
    }

    // The fragment shader samples the texture and applies it directly.
    fragment_glsl_code() {
        return `
        precision mediump float;

        varying vec2 f_tex_coord;          // Interpolated texture coordinates.
        uniform sampler2D texture;         // The texture sampler.

        uniform float screen_height;
        uniform float screen_width;

        const float FXAA_REDUCE_MIN = 1.0/128.0;
        const float FXAA_REDUCE_MUL = 1.0/8.0;
        const float FXAA_SPAN_MAX = 8.0;

        float luminance(vec3 color) {
            return dot(color, vec3(0.299, 0.587, 0.114));
        }
        
        vec4 fxaa(vec4 color, sampler2D texture, vec2 tex_coords) {
            float lumaNW = luminance(texture2D(texture, f_tex_coord + vec2(-1.0, -1.0) / vec2(screen_width, screen_height)).rgb);
            float lumaNE = luminance(texture2D(texture, f_tex_coord + vec2(1.0, -1.0) / vec2(screen_width, screen_height)).rgb);
            float lumaSW = luminance(texture2D(texture, f_tex_coord + vec2(-1.0, 1.0) / vec2(screen_width, screen_height)).rgb);
            float lumaSE = luminance(texture2D(texture, f_tex_coord + vec2(1.0, 1.0) / vec2(screen_width, screen_height)).rgb);
            float lumaM = luminance(color.rgb);
        
            float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
            float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
        
            vec2 dir;
            dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
            dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));
        
            float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
        
            float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
            dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
                  max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
                  dir * rcpDirMin)) / vec2(screen_width, screen_height);
        
            vec3 rgbA = 0.5 * (
                texture2D(texture, f_tex_coord.xy + dir * (1.0 / 3.0 - 0.5)).rgb +
                texture2D(texture, f_tex_coord.xy + dir * (2.0 / 3.0 - 0.5)).rgb);
            vec3 rgbB = rgbA * 0.5 + 0.25 * (
                texture2D(texture, f_tex_coord.xy + dir * -0.5).rgb +
                texture2D(texture, f_tex_coord.xy + dir * 0.5).rgb);
        
            float lumaB = luminance(rgbB);
            if ((lumaB < lumaMin) || (lumaB > lumaMax)) {
                return vec4(rgbA, color.a);
            } else {
                return vec4(rgbB, color.a);
            }
        }

        vec4 contrastSaturationBrightness(vec4 color, float brt, float sat, float con) {
            vec3 c = color.rgb;
            c = c * brt;
            c = mix(vec3(luminance(color.rgb)), c, sat);
            c = mix(vec3(0.5), c, con) + vec3(0.5 * (1.0 - con));
            return vec4(c, color.a);
        }

        vec4 applyVignette(vec4 color, vec2 position, float amount) {
            vec3 c = color.rgb;
            float dist = distance(position, vec2(0.5, 0.5));
            c *= smoothstep(0.8, amount, dist * (amount + 0.5));
            return vec4(c, color.a);
        }

        vec4 simpleBloom(vec4 color, float bloomAmount, float intensityAmount) {
            vec3 c = color.rgb;
            float intensity = max(max(c.r, c.g), c.b);
            if (intensity > intensityAmount) {
                c += bloomAmount * (intensity - intensityAmount);
            }
            return vec4(c, color.a);
        }

        vec4 applyChromaticAberration(vec4 color, vec2 uv, float amount) {
            vec2 caUV = uv + vec2(amount, 0.0);
            float r = texture2D(texture, uv).r;
            float g = texture2D(texture, caUV).g;
            float b = texture2D(texture, caUV).b;
            return vec4(r, g, b, color.a);
        }

        vec4 sharpen(vec4 color, vec2 uv, float strength) {
            vec3 nbr_color = (
                texture2D(texture, uv + vec2(0.0, 1.0/screen_height)).rgb +
                texture2D(texture, uv + vec2(0.0, -1.0/screen_height)).rgb +
                texture2D(texture, uv + vec2(1.0/screen_width, 0.0)).rgb +
                texture2D(texture, uv + vec2(-1.0/screen_width, 0.0)).rgb
            ) * 0.25;
            return vec4(mix(color.rgb, nbr_color, -strength), 1.0);
        }
        
        void main() {
            vec4 color = texture2D(texture, f_tex_coord);
        
            gl_FragColor = fxaa(color, texture, f_tex_coord);

            gl_FragColor = contrastSaturationBrightness(gl_FragColor, 1.0, 1.0, 1.0);
            // gl_FragColor = applyVignette(gl_FragColor, f_tex_coord, 0.2);
            gl_FragColor = simpleBloom(gl_FragColor, 0.1, 0.5);
            gl_FragColor = sharpen(gl_FragColor, f_tex_coord, 0.1);
            
        }
        `;
    }

    update_GPU(context, gpu_addresses, uniforms, model_transform, material) {
        // Activate and bind the texture if it exists and is ready.
        if (material.texture && material.texture.ready) {
            context.uniform1i(gpu_addresses.texture, 0); // Texture unit 0 is for the texture sampler in the fragment shader.
            material.texture.activate(context, 0);
        }
    
        // Compute and send the model_transform and projection_camera_model_transform matrices.
        // These matrices are crucial for transforming the vertices from model space to clip space.
        const model_transform_loc = gpu_addresses.model_transform; // Assuming the location is stored in gpu_addresses
        const projection_camera_model_transform_loc = gpu_addresses.projection_camera_model_transform; // Assuming location storage
    
        // Assuming 'Matrix.flatten_2D_to_1D' exists and converts matrices for WebGL, similar to the provided shader's context.
        // If your context does not have this helper function, you will need to replace it with appropriate WebGL calls.
        if(model_transform_loc) { // If the location is valid
            context.uniformMatrix4fv(model_transform_loc, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        }
        
        if(projection_camera_model_transform_loc) { // If the location is valid
            const projection_transform = uniforms.projection_transform; // Assuming this is provided in 'uniforms'
            const camera_inverse = uniforms.camera_inverse; // Assuming this is provided in 'uniforms'
            
            const PCM = projection_transform.times(camera_inverse).times(model_transform); // Compute the combined matrix.
            context.uniformMatrix4fv(projection_camera_model_transform_loc, false, Matrix.flatten_2D_to_1D(PCM.transposed()));
        }

        // Set screen dimensions
        context.uniform1f(gpu_addresses.screen_height, uniforms.screen_height);
        context.uniform1f(gpu_addresses.screen_width, uniforms.screen_width);
    }
};
