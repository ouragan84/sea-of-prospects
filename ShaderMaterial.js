import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shader, Texture, Component, Matrix } = tiny;

export class Buffered_Texture extends tiny.Graphics_Card_Object {
    // **Texture** wraps a pointer to a new texture image where
    // it is stored in GPU memory, along with a new HTML image object.
    // This class initially copies the image to the GPU buffers,
    // optionally generating mip maps of it and storing them there too.
    constructor(texture_buffer_pointer) {
        super();
        Object.assign(this, {texture_buffer_pointer});
        this.ready = true;
        this.texture_buffer_pointer = texture_buffer_pointer;
    }

    copy_onto_graphics_card(context, need_initial_settings = true) {
        // copy_onto_graphics_card():  Called automatically as needed to load the
        // texture image onto one of your GPU contexts for its first time.

        // Define what this object should store in each new WebGL Context:
        const initial_gpu_representation = {texture_buffer_pointer: undefined};
        // Our object might need to register to multiple GPU contexts in the case of
        // multiple drawing areas.  If this is a new GPU context for this object,
        // copy the object to the GPU.  Otherwise, this object already has been
        // copied over, so get a pointer to the existing instance.
        const gpu_instance = super.copy_onto_graphics_card(context, initial_gpu_representation);

        if (!gpu_instance.texture_buffer_pointer) gpu_instance.texture_buffer_pointer = this.texture_buffer_pointer;

        // const gl = context;
        // gl.bindTexture(gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer);
        //
        // if (need_initial_settings) {
        //     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        //     // Always use bi-linear sampling when zoomed out.
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[this.min_filter]);
        //     // Let the user to set the sampling method
        //     // when zoomed in.
        // }
        //
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
        // if (this.min_filter == "LINEAR_MIPMAP_LINEAR")
        //     gl.generateMipmap(gl.TEXTURE_2D);
        // // If the user picked tri-linear sampling (the default) then generate
        // // the necessary "mips" of the texture and store them on the GPU with it.
        return gpu_instance;
    }

    activate(context, texture_unit = 0) {
        // activate(): Selects this Texture in GPU memory so the next shape draws using it.
        // Optionally select a texture unit in case you're using a shader with many samplers.
        // Terminate draw requests until the image file is actually loaded over the network:
        if (!this.ready)
            return;
        const gpu_instance = super.activate(context);
        context.activeTexture(context["TEXTURE" + texture_unit]);
        context.bindTexture(context.TEXTURE_2D, this.texture_buffer_pointer);
    }
}

export class ShaderMaterial
{
    constructor(SIZE, shaderInstance)
    {
        this.quad = new defs.Square();
        this.initialized = false;
        this.SHADER_TEXTURE_TEX_SIZE = SIZE;
        this.shader = shaderInstance;
    }

    texture_buffer_init(gl) {
        this.shaderTexture = gl.createTexture();
        this.buffered_shader_texture = new Buffered_Texture(this.shaderTexture);

        this.shaderTextureSize = this.SHADER_TEXTURE_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.shaderTexture);
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

        // Depth Texture Buffer
        this.shaderTextureFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shaderTextureFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.shaderTexture,         // texture
            0);                   // mip level
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
        }
        
        // Set the target framebuffer to the shader framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shaderTextureFramebuffer);
        gl.viewport(0, 0, this.shaderTextureSize, this.shaderTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw the quad with our custom shader, a quad goes from -1 to 1 in x and y dimensions, and is at 0 in z dimension
        // we want the quad to be unstretched and fill the entire framebuffer (ideally we can do orthographic projection)
        const projection_transform = Mat4.orthographic(-1, 1, -1, 1, -1, 1);
        const cam_Mat = Mat4.look_at(vec3(0, 0, 1), vec3(0, 0, 0), vec3(0, 1, 0));

        Shader.assign_camera(cam_Mat, uniforms);
        uniforms.projection_transform = projection_transform;

        const transform = Mat4.identity();
        this.quad.draw(context, uniforms, transform, {shader: this.shader});

        // Reset the target framebuffer to the default framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    }

    get_texture()
    {
        return this.buffered_shader_texture;
    }
}


export const Sample_Shader =
  class Sample_Shader extends Shader {
      // Basic_Shader is nearly the simplest way to subclass Shader, which stores and manages a GPU program.
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          // update_GPU():  Define how to synchronize our JavaScript's variables to the GPU's:
          const [P, C, M] = [uniforms.projection_transform, uniforms.camera_inverse, model_transform],
                PCM       = P.times (C).times (M);
          context.uniformMatrix4fv (gpu_addresses.projection_camera_model_transform, false,
                                    Matrix.flatten_2D_to_1D (PCM.transposed ()));
        context.uniform1f(gpu_addresses.time, uniforms.animation_time / 1000);
      }
      shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
          return `precision mediump float;
          varying vec3 vertex_worldspace;
            uniform float time;
      `;
      }
      vertex_glsl_code () {          // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        attribute vec4 color;
        attribute vec3 position;                            // Position is expressed in object coordinates.
        uniform mat4 projection_camera_model_transform;

        void main() { 
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );      // Move vertex to final space.
            vertex_worldspace = (projection_camera_model_transform * vec4( position, 1.0 )).xyz;
        }`;
      }
      fragment_glsl_code () {         // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        void main() {
            vec3 rotated = vec3(cos(time) * vertex_worldspace.x - sin(time) * vertex_worldspace.y, sin(time) * vertex_worldspace.x + cos(time) * vertex_worldspace.y, vertex_worldspace.z);
            gl_FragColor = vec4(rotated * 5.0, 1.0);

        }`;
      }
  };
