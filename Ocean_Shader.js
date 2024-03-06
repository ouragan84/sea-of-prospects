import {tiny, defs} from './examples/common.js';

export const Ocean_Shader =
  class Ocean_Shader extends defs.Phong_Shader {

    constructor(num_lights, wave_obj) {
        super(num_lights);
        this.gersrnerWave = wave_obj;
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return super.shared_glsl_code() + `
        uniform float time;
        uniform float offset_x;
        uniform float offset_z;

        ${this.gersrnerWave.n}
        ${this.gersrnerWave.s}
        ${this.gersrnerWave.l}
        ${this.gersrnerWave.v}
        ${this.gersrnerWave.dir}

        void init_waves(){
            ${this.gersrnerWave.sInit}
            ${this.gersrnerWave.lInit}
            ${this.gersrnerWave.vInit}
            ${this.gersrnerWave.dirInit}
        }

        bool has_initialized_vars = false;

        const int MAX_WAVES = 10;

        vec3 get_gersrner_wave_position(vec3 pos, float t, float offset_x, float offset_z){
            vec3 new_pos = vec3(pos.x + offset_x, pos.y, pos.z + offset_z);
            for (int i = 0; i < MAX_WAVES; i++) {
                if (i >= num_waves) break;
                float k = 2.0 * 3.14159 / wave_length[i];
                vec3 d = direction[i];
                float f = k * (d.x * (pos.x + offset_x) + d.z * (pos.z + offset_z)) - (speed[i] * t);
                float a = steepness[i] / k;
                new_pos = new_pos + vec3(
                    d.x * a * cos(f), 
                    a * sin(f), 
                    d.z * a * cos(f)
                );
            }
            return new_pos;
        }

        vec3 get_gersrner_wave_normal(vec3 pos, float t, float offset_x, float offset_z) {
            vec3 rx = vec3(1.0,0.0,0.0);
            vec3 rz = vec3(0.0,0.0,1.0);

            for (int i = 0; i < MAX_WAVES; i++) {
                if (i >= num_waves) break;
                float k = 2.0 * 3.14159 / wave_length[i];
                vec3 d = direction[i];
                float f = k * (d.x * (pos.x + offset_x) + d.z * (pos.z + offset_z)) - (speed[i] * t);
                float a = steepness[i] / k;
                rx += vec3(
                    - d.x * d.x * a * k * sin(f),
                    d.x * a * k * cos(f),
                    - d.x * d.z * a * k * sin(f)
                );
                rz += vec3(
                    - d.z * d.x * a * k * sin(f),
                    d.z * a * k * cos(f),
                    - d.z * d.z * a * k * sin(f)
                );
            }

            return normalize(cross(rz, rx));
        }
        `;
    }
 
    vertex_glsl_code () {           // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {        
            if (!has_initialized_vars){
                init_waves();
                has_initialized_vars = true;
            }

            vec3 p = get_gersrner_wave_position(position, time, offset_x, offset_z);
            
            gl_Position = projection_camera_model_transform * vec4( p, 1.0 );     // Move vertex to final space.
                                            // The final normal vector in screen space.

            vec3 new_normal = get_gersrner_wave_normal(position, time, offset_x, offset_z);
            N = normalize( mat3( model_transform ) * new_normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( p, 1.0 ) ).xyz;
        } `;
    }

    fragment_glsl_code () {          // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      void main() {                        
          // compute the normal for each pixel
        //    vec3 norm = get_gersrner_wave_normal( vertex_worldspace, time, offset_x, offset_z );
                                         // Compute an initial (ambient) color:
          gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                                         // Compute the final color with contributions from lights:
          gl_FragColor.xyz += phong_model_lights( normalize(N), vertex_worldspace );
        } `;
    }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);

          context.uniform1f(gpu_addresses.time, uniforms.animation_time / 1000);
          context.uniform1f(gpu_addresses.offset_x, uniforms.offset[0]);
          context.uniform1f(gpu_addresses.offset_z, uniforms.offset[2]);
      }
  };
