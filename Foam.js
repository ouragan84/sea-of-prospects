import {tiny, defs} from './examples/common.js';
const { vec3, vec4, color, Mat4, Shader, Texture, Component, Matrix } = tiny;



export const Foam_Shader =
class Foam_Shader extends Shader {
    constructor (ocean, foam_size_terrain, starting_center, frame_half_life, jacobian_threshold_start, jacobian_threshold_end, max_dist_from_boat, cutoff_intensity, boat_dist_variation) {
        super ();
        this.ocean = ocean;
        this.foam_size_terrain = foam_size_terrain;
        this.initialized_waves = false;
        this.last_offset = starting_center;
        this.is_first_frame = true;
        this.decay_rate = 1 - Math.pow(0.5, 1 / frame_half_life);
        this.jacobian_threshold_start = jacobian_threshold_start;
        this.jacobian_threshold_end = jacobian_threshold_end;
        this.max_dist_from_boat = max_dist_from_boat;
        this.cutoff_intensity = cutoff_intensity;
        this.boat_dist_variation = boat_dist_variation;

        this.shader_material = null; // don't forget to set it.
    }

    flatten_vec_array (arr) {
        // Flattens a 2D array of vectors into a 1D array of floats
        let result = [];
        for (let i = 0; i < arr.length; i++) {
            result.push(arr[i][0]);
            result.push(arr[i][1]);
            result.push(arr[i][2]);
        }
        return result;
    }

    // Basic_Shader is nearly the simplest way to subclass Shader, which stores and manages a GPU program.
    update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
        // update_GPU():  Define how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [uniforms.projection_transform, uniforms.camera_inverse, model_transform],
            PCM       = P.times (C).times (M);
        context.uniformMatrix4fv (gpu_addresses.projection_camera_model_transform, false,
                                Matrix.flatten_2D_to_1D (PCM.transposed ()));

        context.uniform1f(gpu_addresses.time, uniforms.animation_time / 1000);
        context.uniform1f(gpu_addresses.last_offset_x, this.last_offset[0]);
        context.uniform1f(gpu_addresses.last_offset_z, this.last_offset[2]);
        context.uniform1f(gpu_addresses.offset_x, uniforms.offset[0]);
        context.uniform1f(gpu_addresses.offset_z, uniforms.offset[2]);
        context.uniform1f(gpu_addresses.boat_x, uniforms.sample_boat[0]);
        context.uniform1f(gpu_addresses.boat_z, uniforms.sample_boat[2]);
        context.uniform1f(gpu_addresses.boat_foam_intensity, Math.min(1, Math.max(0, uniforms.boat_foam_intensity)));


        if (this.is_first_frame) {
            context.uniform1i(gpu_addresses.is_first_frame, 1);
            this.is_first_frame = false;
        } else {
            context.uniform1i(gpu_addresses.is_first_frame, 0);
        }


        if (!this.initialized_waves) {
            context.uniform1f(gpu_addresses.foam_size_terrain, this.foam_size_terrain);
            context.uniform1fv(gpu_addresses.amplitudes, this.ocean.gersrnerWave.amplitudes);
            context.uniform1fv(gpu_addresses.frequencies, this.ocean.gersrnerWave.frequencies);
            context.uniform1fv(gpu_addresses.speeds, this.ocean.gersrnerWave.speeds);
            context.uniform1fv(gpu_addresses.phases, this.ocean.gersrnerWave.phases);
            context.uniform3fv(gpu_addresses.directions, this.flatten_vec_array(this.ocean.gersrnerWave.directions));
            context.uniform1f(gpu_addresses.decay_rate, this.decay_rate);
            context.uniform1f(gpu_addresses.jacobian_threshold_start, this.jacobian_threshold_start);
            context.uniform1f(gpu_addresses.jacobian_threshold_end, this.jacobian_threshold_end);
            context.uniform1f(gpu_addresses.max_dist_from_boat, this.max_dist_from_boat);
            context.uniform1f(gpu_addresses.cutoff_intensity, this.cutoff_intensity);
            context.uniform1f(gpu_addresses.boat_dist_variation, this.boat_dist_variation);
            this.initialized_waves = true;
        }

        if (this.shader_material.get_texture()){
            context.uniform1i (gpu_addresses.last_frame, 0);
            this.shader_material.get_texture().activate(context, 0);
        }

        this.last_offset = uniforms.offset.slice(); 
    }
    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec3 vertex_worldspace;
        uniform float time;
        uniform sampler2D last_frame;
        uniform float last_offset_x;
        uniform float last_offset_z;
        uniform float offset_x;
        uniform float offset_z;
        uniform float foam_size_terrain;
        uniform bool is_first_frame;
        uniform float decay_rate;
        uniform float jacobian_threshold_start;
        uniform float jacobian_threshold_end;
        uniform float cutoff_intensity;

        uniform float boat_x;
        uniform float boat_z;
        uniform float boat_foam_intensity;
        uniform float boat_dist_variation;

        uniform float max_dist_from_boat;

        const int num_waves = ${this.ocean.gersrnerWave.num_waves};

        uniform float amplitudes[num_waves];
        uniform float frequencies[num_waves];
        uniform float speeds[num_waves];
        uniform vec3 directions[num_waves];
        uniform float phases[num_waves];

        #define PI 3.14159265359

        float get_jacobian_determinant(vec3 pos, float t){
            // vec3 p = vec3(0.0, 0.0, 0.0);

            // for (int i = 0; i < num_waves; i++) {
            //     float w = frequencies[i];
            //     vec3 d = directions[i];
            //     float l = 2.0 * PI / w;
            //     float f = w * (d.x * pos.x + d.z * pos.z) - (speeds[i] * 2.0 / l  * t) + phases[i];
            //     float a = amplitudes[i];
            //     p = p + vec3(
            //         d.x * a * cos(f), 
            //         a * sin(f), 
            //         d.z * a * cos(f)
            //     );
            // }

            float dx_dx = 0.0;
            float dx_dz = 0.0;
            float dz_dx = 0.0;
            float dz_dz = 0.0;

            const float lambda = 1.0;

            for (int i = 0; i < num_waves; i++) {
                float w = frequencies[i];
                vec3 d = directions[i];
                float l = 2.0 * PI / w;
                float f = w * (d.x * pos.x + d.z * pos.z) - (speeds[i] * 2.0 / l  * t) + phases[i];
                float a = amplitudes[i];

                dx_dx += - d.x * d.x * a * w * sin(f);
                dx_dz += - d.x * d.z * a * w * sin(f);
                dz_dx += - d.z * d.x * a * w * sin(f);
                dz_dz += - d.z * d.z * a * w * sin(f);
            }

            float J = (1.0 + lambda * dx_dx) * (1.0 + lambda * dz_dz) - (lambda * dx_dz) * (lambda * dz_dx);

            return J;
        }


        float rand(vec3 co){
            return fract(sin(dot(co, vec3(12.9898, 78.233, 45.543)) * 43758.5453));
        }

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
            // vertex_worldspace will range from -1 to 1 in x and y direction. We need to map it to offset_x-ocean_size to offset_x + ocean_size and same for z.
            float x = vertex_worldspace.x * foam_size_terrain + offset_x;
            float z = vertex_worldspace.y * foam_size_terrain + offset_z;

            // if we had uv of this point in last frame:
            // x = (u - 0.5) * 2.0 * ocean_size + last_offset_x
            // z = (v - 0.5) * 2.0 * ocean_size + last_offset_z
            // Solve for u and v:
            float u = (x - last_offset_x) / (2.0 * foam_size_terrain) + 0.5;
            float v = (z -  last_offset_z) / (2.0 * foam_size_terrain) + 0.5;

            if(! is_first_frame && u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0){
                gl_FragColor = mix(texture2D(last_frame, vec2(u, v)), vec4(0.0, 0.0, 0.0, 1.0), decay_rate);
            }else{
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }

            float jacobian = get_jacobian_determinant(vec3(x, 0.0, z), time);

            if (jacobian < jacobian_threshold_start){
                float intensity = (jacobian - jacobian_threshold_start) / (jacobian_threshold_end - jacobian_threshold_start);
                gl_FragColor = mix(gl_FragColor, vec4(1.0, 1.0, 1.0, 1.0), intensity);
            }

            // radial foam around the boat (intensity decreases as we move away from the boat)
            float dx = x - boat_x;
            float dz = z - boat_z;
            float dist = sqrt(dx * dx + dz * dz) + rand(vec3(x, z, time)) * 2.0 * boat_dist_variation - boat_dist_variation;
            float intensity = boat_foam_intensity - dist / max_dist_from_boat;
            if (boat_foam_intensity > 0.0 && intensity > 0.0){
                gl_FragColor = mix(gl_FragColor, vec4(1.0, 1.0, 1.0, 1.0), intensity);
            }
            

            if (gl_FragColor.r < cutoff_intensity){
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
            
        }`;
    }
};
