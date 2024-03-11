import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shader, Texture, Component } = tiny;

export class ShaderMaterial
{
    constructor()
    {

    }

    update(context, uniforms)
    {

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
      }
      shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
          return `precision mediump float;
          varying vec3 vertex_worldspace;
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
            gl_FragColor = vec4( vertex_worldspace, 1.0 );
        }`;
      }
  };
