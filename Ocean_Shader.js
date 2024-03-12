import {tiny, defs} from './examples/common.js';

export const Ocean_Shader =
  class Ocean_Shader extends defs.Phong_Shader {

    constructor(num_lights, wave_obj, skybox, fog) {
        super(num_lights, fog);
        this.gersrnerWave = wave_obj;
        this.skybox = skybox;
        this.initialized_waves = false;
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return super.shared_glsl_code() + `
        uniform float time;
        uniform float offset_x;

        varying vec3 original_position;
        varying vec3 displacement;

        #define PI 3.14159265359
        uniform float offset_z;
        uniform float angle_offset;

        const int num_waves = ${this.gersrnerWave.num_waves};

        uniform float amplitudes[num_waves];
        uniform float frequencies[num_waves];
        uniform float speeds[num_waves];
        uniform vec3 directions[num_waves];
        uniform float phases[num_waves];

        vec3 get_gersrner_wave_displacement(vec3 pos, float t, vec3 p_sample) {
            vec3 p = vec3(0.0, 0.0, 0.0);

            for (int i = 0; i < num_waves; i++) {
                float w = frequencies[i];
                vec3 d = directions[i];
                float l = 2.0 * PI / w;
                float f = w * (d.x * p_sample.x + d.z * p_sample.z) - (speeds[i] * 2.0 / l  * t) + phases[i];
                float a = amplitudes[i];
                p = p + vec3(
                    d.x * a * cos(f), 
                    a * sin(f), 
                    d.z * a * cos(f)
                );
            }
            
            return p;
        }

        vec3 get_gersrner_wave_normal(vec3 pos, float t, vec3 p_sample) {
            vec3 rx = vec3(1.0,0.0,0.0);
            vec3 rz = vec3(0.0,0.0,1.0);

            for (int i = 0; i < num_waves; i++) {
                float w = frequencies[i];
                vec3 d = directions[i];
                float l = 2.0 * PI / w;
                float f = w * (d.x * p_sample.x + d.z * p_sample.z) - (speeds[i] * 2.0 / l  * t) + phases[i];
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

        vec3 get_sample_position(vec3 pos, float t) {

            float a = - angle_offset + PI / 4.0;

            vec3 p_sample = vec3(
                pos.x * cos(a) - pos.z * sin(a),
                pos.y,
                pos.x * sin(a) + pos.z * cos(a)
            );

            p_sample = p_sample + vec3(offset_x, 0.0, offset_z);

            return p_sample;
        }

        `;
    }
 
    vertex_glsl_code () {           // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            original_position = position;

            if(position.x + position.z < - 30.0) {
                return;
            }

            vec3 p_sample = get_sample_position(position, time);

            displacement = get_gersrner_wave_displacement(position, time, p_sample);
            vec3 new_vertex_position = position + displacement;

            gl_Position = projection_camera_model_transform * vec4( new_vertex_position, 1.0 );      // Move vertex to final space.

            N = vec3(0.0, 1.0, 0.0);

            vertex_worldspace = ( model_transform * vec4( new_vertex_position, 1.0 ) ).xyz;
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


        float get_fernel_coeff(vec3 direction, vec3 norm) {
            return pow3(1.0 - dot(-direction, norm));
        }


        vec3 phong_model_lights_water( vec3 N, vec3 vertex_worldspace ) {
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++) {
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz -
                                               light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                
                  // Compute diffuse and specular components of Phong Reflection Model.
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness ) * get_fernel_coeff(-L, N);     // Use Blinn's "halfway vector" method.
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );


                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;

                result += attenuation * light_contribution;
            }
            return result;
        }


        void main() {

            if(original_position.x + original_position.z < - 30.0) {
                discard;
            }
        
            // vec3 norm = normalize(get_gersrner_wave_normal(original_position, time, offset_x, offset_z));
            // vec3 norm = normalize(N);

            vec3 p_sample = get_sample_position(original_position, time);

            vec3 norm = normalize(get_gersrner_wave_normal(original_position, time, p_sample));

            gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );

            gl_FragColor.xyz += phong_model_lights_water( norm, vertex_worldspace );

            vec3 direction = normalize(vertex_worldspace - camera_center);
            vec3 reflection = reflect(direction, norm);

            gl_FragColor = mix(gl_FragColor, get_skycolor(reflection), get_fernel_coeff(direction, norm));

            float distance = length(camera_center - vertex_worldspace);
            float fog_amount = smoothstep(fog_start_dist, fog_end_dist, distance);
            gl_FragColor = mix(gl_FragColor, fog_color, fog_amount);
        } `;
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

    update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
        if (!this.initialized_waves) {
            context.uniform1fv(gpu_addresses.amplitudes, this.gersrnerWave.amplitudes);
            context.uniform1fv(gpu_addresses.frequencies, this.gersrnerWave.frequencies);
            context.uniform1fv(gpu_addresses.speeds, this.gersrnerWave.speeds);
            context.uniform1fv(gpu_addresses.phases, this.gersrnerWave.phases);
            context.uniform3fv(gpu_addresses.directions, this.flatten_vec_array(this.gersrnerWave.directions));
            this.initialized_waves = true;
        }

        super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);

        context.uniform1f(gpu_addresses.time, uniforms.animation_time / 1000);
        context.uniform1f(gpu_addresses.offset_x, uniforms.offset[0]);
        context.uniform1f(gpu_addresses.offset_z, uniforms.offset[2]);

        context.uniform1f(gpu_addresses.angle_offset, uniforms.angle_offset);

        // console.log(uniforms.angle_offset.toFixed(2) * 180 / Math.PI);


        if (material.skyTexture && material.skyTexture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i (gpu_addresses.skyTexture, 0);
            // For this draw, use the texture image from the correct GPU buffer:
            material.skyTexture.activate(context, 0);
        }
    }
};
