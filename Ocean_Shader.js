import {tiny, defs} from './examples/common.js';

export const Ocean_Shader =
  class Ocean_Shader extends defs.Phong_Shader {

    constructor(num_lights, wave_obj, skybox, fog, foam_size_terrain) {
        super(num_lights, fog);
        this.gersrnerWave = wave_obj;
        this.skybox = skybox;
        this.initialized_waves = false;
        this.foam_size_terrain = foam_size_terrain;
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        float fog_start_dist = ${this.fog_start.toFixed(2)};
        float fog_end_dist = ${this.fog_end.toFixed(2)};
        vec4 fog_color = ${this.fog_color};

        varying vec3 N, vertex_worldspace;

        uniform float time;
        uniform float offset_x;

        varying vec3 original_position;
        varying vec3 displacement;

        // varying float is_close_to_origin;

        #define PI 3.14159265359
        uniform float offset_z;
        uniform float angle_offset;

        const int num_waves = ${this.gersrnerWave.num_waves};

        uniform float amplitudes[num_waves];
        uniform float frequencies[num_waves];
        uniform float speeds[num_waves];
        uniform vec3 directions[num_waves];
        uniform float phases[num_waves];

        uniform float foam_size_terrain;

        vec3 random_normal(vec3 p) {
            return normalize(vec3(
                cos(p.x * 12.9898 + p.y * 78.233) * 43758.5453,
                cos(p.x * -23.233 + p.y * 123.233) * 23421.631,
                cos(p.x * 93.319 + p.y * 43.9833) * 54321.987
            ));
        }

        vec3 get_gersrner_wave_displacement(vec3 p_sample, float t) {
            vec3 dis = vec3(0.0, 0.0, 0.0);
        
            for (int i = 0; i < num_waves; i++) {
                float a = amplitudes[i];
                vec3 d = directions[i];
                float w = frequencies[i];
                float l = 2.0 * PI / w;
                float f = w * (d.x * p_sample.x + d.z * p_sample.z) - (speeds[i] * 2.0 / l * t) + phases[i];
        
                dis += vec3(
                    d.x * a * cos(f),
                    a * sin(f),
                    d.z * a * cos(f)
                );
            }

            float a = angle_offset - PI / 2.0;
            dis = vec3(
                dis.x * cos(a) - dis.z * sin(a),
                dis.y,
                dis.x * sin(a) + dis.z * cos(a)
            );
        
            return dis;
        }

        vec3 get_gersrner_wave_normal(vec3 p_sample, float t) {
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

            float a = angle_offset - PI / 2.0;
            n = vec3(
                n.x * cos(a) - n.z * sin(a),
                n.y,
                n.x * sin(a) + n.z * cos(a)
            );

            return n;
        }

        vec3 get_sample_position(vec3 pos, float t) {

            float a = - angle_offset + PI / 2.0;

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

            // is_close_to_origin = 0.0;
            // if(position.x * position.x + position.z * position.z < 0.04) {
            //     is_close_to_origin = 1.0;
            // }

            if(position.x < - 20.0) {
                return;
            }

            vec3 p_sample = get_sample_position(position, time);

            // displacement = get_gersrner_wave_normal(vec3(0,0,0), time);
            // vec3 new_vertex_position = displacement + random_normal(p_sample) * 0.3;

            displacement = get_gersrner_wave_displacement(p_sample, time);
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

        uniform vec4 foam_color;

        uniform sampler2D foam_texture;

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
            if(original_position.x < - 20.0)
                discard;

            vec3 p_sample = get_sample_position(original_position, time);
            vec3 norm = normalize(get_gersrner_wave_normal(p_sample, time));

            gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
            gl_FragColor.xyz += phong_model_lights_water( norm, vertex_worldspace );

            vec3 direction = normalize(vertex_worldspace - camera_center);
            vec3 reflection = reflect(direction, norm);
            gl_FragColor = mix(gl_FragColor, get_skycolor(reflection), get_fernel_coeff(direction, norm));

            vec2 foam_uv = vec2(0.5 * (p_sample.x - offset_x) / foam_size_terrain + 0.5, 0.5 * (p_sample.z - offset_z) / foam_size_terrain + 0.5);
            if (foam_uv.x >= 0.0 && foam_uv.x <= 1.0 && foam_uv.y >= 0.0 && foam_uv.y <= 1.0){  
                vec4 foam_tex_sample = texture2D(foam_texture, foam_uv);
                float foam_intensity = foam_tex_sample.r * foam_color.a;
                gl_FragColor = mix(gl_FragColor, vec4(foam_color.rgb, 1.0), foam_intensity);
            }



            // gl_FragColor = mix(gl_FragColor, vec4(p_sample*100.0, 1.0), 1.0);


            // if (p_sample.x * p_sample.x + p_sample.z * p_sample.z < 0.08) {
            //     gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
            // }
            

            // if sample_pos is <0.2 from (x=0,z=0), shade yellow
            // if (is_close_to_origin > 0.5) {
            //     gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
            // }

            

            // // if world_pos is <0.2 from (x=0,z=0), shade green
            // if (vertex_worldspace.x * vertex_worldspace.x + vertex_worldspace.z * vertex_worldspace.z < 0.04) {
            //     gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
            // }
            


            float distance = length(camera_center - vertex_worldspace);
            float fog_amount = smoothstep(fog_start_dist, fog_end_dist, distance);
            gl_FragColor = mix(gl_FragColor, fog_color, fog_amount);
        }`;
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
            context.uniform1f(gpu_addresses.foam_size_terrain, this.foam_size_terrain);

            // console.log(this);

            context.uniform4fv(gpu_addresses.foam_color, material.foamColor);
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

        if (uniforms.foam_texture) {
            // Select texture unit 1 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i (gpu_addresses.foam_texture, 1);
            // For this draw, use the texture image from the correct GPU buffer:
            uniforms.foam_texture.activate(context, 1);
        }
    }
};
