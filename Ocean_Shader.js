import {tiny, defs} from './examples/common.js';

export const Ocean_Shader =
  class Ocean_Shader extends defs.Phong_Shader {

    constructor(num_lights, wave_obj, skybox, fog) {
        super(num_lights, fog);
        this.gersrnerWave = wave_obj;
        this.skybox = skybox;
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return super.shared_glsl_code() + `
        uniform float time;
        uniform float offset_x;

        #define PI 3.14159265359
        uniform float offset_z;

        ${this.gersrnerWave.num_waves}
        ${this.gersrnerWave.amplitudes}
        ${this.gersrnerWave.frequencies}
        ${this.gersrnerWave.speeds}
        ${this.gersrnerWave.directions}
        ${this.gersrnerWave.phases}

        void init_waves(){
            ${this.gersrnerWave.amplitudesInit}
            ${this.gersrnerWave.frequenciesInit}
            ${this.gersrnerWave.speedsInit}
            ${this.gersrnerWave.directionsInit}
            ${this.gersrnerWave.phasesInit}
        }

        bool has_initialized_vars = false;

        vec3 get_gersrner_wave_position(vec3 pos, float t, float offset_x, float offset_z){
            vec3 new_pos = vec3(pos.x + offset_x, pos.y, pos.z + offset_z);

            for (int i = 0; i < num_waves; i++) {
                float w = frequencies[i];
                vec3 d = directions[i];
                float l = 2.0 * PI / w;
                float f = w * (d.x * (pos.x + offset_x) + d.z * (pos.z + offset_z)) - (speeds[i] * 2.0 / l  * t) + phases[i];
                float a = amplitudes[i];
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

            for (int i = 0; i < num_waves; i++) {
                float w = frequencies[i];
                vec3 d = directions[i];
                float l = 2.0 * PI / w;
                float f = w * (d.x * (pos.x + offset_x) + d.z * (pos.z + offset_z)) - (speeds[i] * 2.0 / l  * t) + phases[i];
                float a = amplitudes[i];

                rx += vec3(
                    - d.x * d.x * a * w * sin(f),
                    d.x * a * w * cos(f),
                    - d.x * d.z * a * w * sin(f)
                );
                rz += vec3(
                    - d.z * d.x * a * w * sin(f),
                    d.z * a * w * cos(f),
                    - d.z * d.z * a * w * sin(f)
                );
            }

            vec3 n = normalize(cross(rz, rx));

            return n;
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

        uniform sampler2D skyTexture;
        float angle_from_top = ${this.skybox.shader.angle_from_top.toFixed(10)};  
        vec4 default_color = ${this.skybox.shader.default_color};
        float radius_blend_start = ${this.skybox.shader.radius_blend_start.toFixed(10)};
        float radius_blend_end = ${this.skybox.shader.radius_blend_end.toFixed(10)};
        float rotation_y = ${this.skybox.shader.rotation_y.toFixed(10)};

        float pow2(float x) {
            return x * x;
        }

        float pow3(float x) {
            return x * x * x;
        }

        float pow4(float x) {
            return x * x * x * x;
        }

        float pow5(float x) {
            return x * x * x * x * x;
        }

        vec4 get_skycolor(vec3 direction) {
            // Calculate spherical coordinates
            float phi = atan(direction.z, direction.x) + rotation_y;
            float theta = acos(direction.y);

            // when theta = angle_from_top, radius = 0.5
            float radius = theta / (2.0 * angle_from_top);

            // (u,v) is point on the circle centered at (0.5, 0.5) with radius calculated above, with angle phi
            float u = radius * cos(phi) + 0.5;
            float v = radius * sin(phi) + 0.5;
            
            // Sample the texture
            vec4 tex_color;

            if (radius >= radius_blend_end) {
                tex_color = default_color;
            } else {
                tex_color = texture2D(skyTexture, vec2(u, v)); // Sample the texture at the calculated UV coordinates

                if (radius > radius_blend_start) {
                    float blend = (radius - radius_blend_start) / (radius_blend_end - radius_blend_start);
                    tex_color = mix(tex_color, default_color, blend);
                }
            }

            return tex_color;
        }

        // pseudorandom number generator based on 2 float inputs
        float random (in vec2 st) {
            return fract(sin(dot(st.xy,
                                 vec2(12.9898,78.233)))*
                43758.5453123);
        }


      void main() {  
        
        vec3 norm = normalize(N);

        gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
        gl_FragColor.xyz += phong_model_lights( norm, vertex_worldspace );

        vec3 direction = normalize(vertex_worldspace - camera_center);
        vec3 reflection = reflect(direction, norm);

        float fernel_coeff = pow3(1.0 - dot(-direction, norm)); // Schlick's approximation, usually ^5, but ^3 looks better 

        gl_FragColor = mix(gl_FragColor, get_skycolor(reflection), fernel_coeff);

        if(vertex_worldspace.y > 0.8){
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        }

        float distance = length(camera_center - vertex_worldspace);
        float fog_amount = smoothstep(fog_start_dist, fog_end_dist, distance);
        gl_FragColor = mix(gl_FragColor, fog_color, fog_amount);
        } `;
    }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);

          context.uniform1f(gpu_addresses.time, uniforms.animation_time / 1000);
          context.uniform1f(gpu_addresses.offset_x, uniforms.offset[0]);
          context.uniform1f(gpu_addresses.offset_z, uniforms.offset[2]);

          if (material.skyTexture && material.skyTexture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i (gpu_addresses.skyTexture, 0);
            // For this draw, use the texture image from the correct GPU buffer:
            material.skyTexture.activate(context, 0);
        }
      }
  };
