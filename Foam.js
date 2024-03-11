import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export const Foam_Shader =
  class Foam_Shader extends defs.Phong_Shader {

    constructor(num_lights, fog) {
        super(num_lights, fog);
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return super.shared_glsl_code() + `
        `;
    }
 
    vertex_glsl_code () {           // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );     // Move vertex to final space.
                                            // The final normal vector in screen space.

            vec3 new_normal = get_gersrner_wave_normal(position, time, offset_x, offset_z);
            N = normalize( mat3( model_transform ) * new_normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
        } `;
    }

    fragment_glsl_code () {          // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `

        void main() {
            gl_FragColor = vec4( vertex_worldspace.x, vertex_worldspace.z, vertex_worldspace.y, 1 );    // Compute the final color with contributions from lights.
        } `;
    }

    update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
        super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);
    }
};




