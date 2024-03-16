import {tiny, defs} from './examples/common.js';

const {  Matrix } = tiny;

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

        varying vec3 view_pos;

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

        uniform mat4 projection_transform;
        uniform mat4 camera_transform;
        uniform mat4 camera_inverse;
        uniform mat4 inv_proj_mat;

        void main() {
            original_position = position;

            if(position.x < -15.0) {
                return;
            }

            vec3 p_sample = get_sample_position(position, time);
            displacement = get_gersrner_wave_displacement(p_sample, time);
            vec3 new_vertex_position = position + displacement;

            gl_Position = projection_camera_model_transform * vec4( new_vertex_position, 1.0 );      // Move vertex to final space.

            N = vec3(0.0, 1.0, 0.0);

            vertex_worldspace = ( model_transform * vec4( new_vertex_position, 1.0 ) ).xyz;

            view_pos = (camera_inverse * vec4(vertex_worldspace, 1.0)).xyz;
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
        uniform float sky_reflect;

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
                
                float specular_factor = get_fernel_coeff(-E, N);

                  // Compute diffuse and specular components of Phong Reflection Model.
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness) * specular_factor;     // Use Blinn's "halfway vector" method.
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );


                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;

                result += attenuation * light_contribution;
            }
            return result;
        }

        uniform mat4 projection_transform;
        uniform mat4 camera_transform;
        uniform mat4 camera_inverse;
        uniform mat4 inv_proj_mat;

        uniform sampler2D last_frame;
        uniform sampler2D depth_texture;

        uniform float screen_width;
        uniform float screen_height;
        uniform int is_ssr_texture_ready;

        // varying vec3 view_pos (set in vertex shader)
        // varying vec3 vertex_worldspace (set in vertex shader)
        // Everything else that's available in the fragment shader code as seen below 


        // Ray marching and SSR functions based on your previous algorithm
        const int NUM_SMALL_STEPS = 100;
        const int NUM_STEPS = 150;
        const float SMALL_STEP = 0.1;
        const float BIG_STEP = 0.4;
        const int NUM_ITERATIONS = 10;
        const float BINARY_SEARCH_STEP = 0.02;

        // // Function to generate position from depth
        // vec3 generateViewSpacePositionFromDepth(vec2 texturePos, float depth) {
        //     vec4 ndc = vec4((texturePos - 0.5) * 2.0, depth, 1.0);
        //     vec4 worldSpace = inv_proj_mat * ndc;
        //     worldSpace /= worldSpace.w;
        //     return (camera_inverse * worldSpace).xyz;
        // }

        // Function to generate projected position
        vec2 generateProjectedPositionFromViewSpacePos(vec3 viewSpacePos) {

            // camera_transform camera_inverse projection_transform inv_proj_mat

            // vec4 worldSpacePos = camera_transform * vec4(viewSpacePos, 1.0);

            vec4 projected = projection_transform * vec4(viewSpacePos, 1.0);
            projected.xy = (projected.xy / projected.w) * 0.5 + 0.5;
            return projected.xy;

        }

        const float near_clip = 0.1;
        const float far_clip = 80.0;

        // Iteratively walk from position_in_view_space in the direction of direction_in_view_space, 
        // and when the ray intersects the depth buffer, return the intersection point
        vec4 rayMarch(vec3 position_in_view_space, vec3 direction_in_view_space) {
            if (direction_in_view_space.z > 0.0) {
                return vec4(0.0); // Early exit if direction is away from the camera
            }

            float z = position_in_view_space.z; // Assuming current_position.z is negative
            float A = (far_clip + near_clip) / (far_clip - near_clip);
            float B = (2.0 * far_clip * near_clip) / (far_clip - near_clip);
            float depth_of_start = (A + B / z) / 2.0 + 0.5;
        
            vec3 current_position = position_in_view_space;
            vec2 projectedCoords;
            float depth, last_depth = 1.0;
            vec3 last_position = current_position;
        
            // March the ray
            for (int i = 0; i < NUM_STEPS; ++i) {
                current_position += direction_in_view_space * (i < NUM_SMALL_STEPS ? SMALL_STEP : BIG_STEP);
                projectedCoords = generateProjectedPositionFromViewSpacePos(current_position);
                depth = texture2D(depth_texture, projectedCoords).x;
        
                z = current_position.z; // Assuming current_position.z is negative
                A = (far_clip + near_clip) / (far_clip - near_clip);
                B = (2.0 * far_clip * near_clip) / (far_clip - near_clip);
                float depth_of_ray = (A + B / z) / 2.0 + 0.5;
        
                if (depth_of_ray > depth) {
                    // Binary search between last_position and current_position
                    vec3 min_pos = last_position;
                    vec3 max_pos = current_position;
                    for (int j = 0; j < NUM_ITERATIONS; ++j) {
                        vec3 mid_pos = (min_pos + max_pos) * 0.5;
                        projectedCoords = generateProjectedPositionFromViewSpacePos(mid_pos);
                        depth = texture2D(depth_texture, projectedCoords).x;
        
                        if ((A + B / mid_pos.z) / 2.0 + 0.5 > depth) {
                            max_pos = mid_pos;
                        } else {
                            min_pos = mid_pos;
                        }
                    }

                    if ( depth_of_start < depth ){
                        return vec4(generateProjectedPositionFromViewSpacePos(min_pos), depth, 1.0);
                    } else {
                        return vec4(0.0);
                    }
                }
        
                last_depth = depth;
                last_position = current_position;
            }
        
            return vec4(projectedCoords, last_depth, 0.0);
        }
        

        

        void main() {
            // Assume original_position, time, camera_center, shape_color, ambient,
            // and other necessary variables are defined and available

            if (original_position.x < -15.0)
                discard;

            vec3 p_sample = get_sample_position(original_position, time);
            vec3 norm = normalize(get_gersrner_wave_normal(p_sample, time));
        
            vec3 viewDir = normalize(vertex_worldspace - camera_center);
            vec3 reflection = reflect(viewDir, norm);
        
            vec4 waterColor = vec4(shape_color.xyz * ambient, shape_color.w);
            waterColor.xyz += phong_model_lights_water(norm, vertex_worldspace);
        
            vec4 reflectColor = get_skycolor(reflection);
        
            if (is_ssr_texture_ready == 1) {

                vec3 pos_in_view_space = (camera_inverse * vec4(vertex_worldspace, 1.0)).xyz;
                vec3 normal_in_view_space = (camera_inverse * vec4(norm, 0.0)).xyz;
                vec3 view_dir_in_view_space = normalize(pos_in_view_space);
                vec3 reflect_dir_in_view_space = reflect(view_dir_in_view_space, normal_in_view_space);


                vec4 ssr_result = rayMarch(pos_in_view_space, reflect_dir_in_view_space);
                vec2 ssr_uv = ssr_result.xy;
                float ssr_depth = ssr_result.z;
                int ssr_valid = int(ssr_result.w);
                vec4 ssr_color = texture2D(last_frame, ssr_uv);

                // color distance from shape_color
                const vec3 bad_blue = vec3(0.5, 0.5, 0.8);
                const vec3 bad_white = vec3(1.0, 1.0, 1.0);

                if (ssr_valid == 1 && length(ssr_color.rgb - bad_white) > 0.34 && length(ssr_color.rgb - bad_blue) > 0.34) {
                    reflectColor = vec4(ssr_color.rgb, 1.0);

                    // gl_FragColor = reflectColor;
                    // return;
                }else{
                    // gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    // return;
                
                }
            }
            
            waterColor = mix(waterColor, reflectColor, get_fernel_coeff(viewDir, norm) * sky_reflect);

            vec2 foam_uv = vec2(0.5 * (p_sample.x - offset_x) / foam_size_terrain + 0.5, 0.5 * (p_sample.z - offset_z) / foam_size_terrain + 0.5);
            if (foam_uv.x >= 0.0 && foam_uv.x <= 1.0 && foam_uv.y >= 0.0 && foam_uv.y <= 1.0) {
                vec4 foam_tex_sample = texture2D(foam_texture, foam_uv);
                float foam_intensity = foam_tex_sample.r * foam_color.a;
                waterColor = mix(waterColor, vec4(foam_color.rgb, 1.0), foam_intensity);
            }

            float distance = length(camera_center - vertex_worldspace);
            float fog_amount = smoothstep(fog_start_dist, fog_end_dist, distance);
            gl_FragColor = mix(waterColor, vec4(fog_color.rgb, 1.0), fog_amount);
        }
        
        
        
        
        `;
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
        context.uniform1f(gpu_addresses.sky_reflect, material.sky_reflect);

        // console.log(uniforms.angle_offset.toFixed(2) * 180 / Math.PI);

        context.uniform1f(gpu_addresses.screen_width, uniforms.prev_frame_material.screen_width);
        context.uniform1f(gpu_addresses.screen_height, uniforms.prev_frame_material.screen_height);
        context.uniform1i(gpu_addresses.is_ssr_texture_ready, uniforms.prev_frame_material.ready);

        // console.log(uniforms)

        context.uniformMatrix4fv (gpu_addresses.projection_transform, 
            false, Matrix.flatten_2D_to_1D (uniforms.projection_transform.transposed()) );

        context.uniformMatrix4fv (gpu_addresses.camera_transform,
            false, Matrix.flatten_2D_to_1D (uniforms.camera_transform.transposed()) );

        context.uniformMatrix4fv (gpu_addresses.camera_inverse,
            false, Matrix.flatten_2D_to_1D (uniforms.camera_inverse.transposed()) );

        context.uniformMatrix4fv (gpu_addresses.inv_proj_mat,
            false, Matrix.flatten_2D_to_1D (uniforms.inv_proj_mat.transposed()) );


        if (uniforms.prev_frame_material.ready) {
            context.uniform1i (gpu_addresses.last_frame, 0);
            uniforms.prev_frame_material.get_texture().activate(context, 0);

            context.uniform1i (gpu_addresses.depth_texture, 1);
            uniforms.prev_frame_material.get_depth_texture().activate(context, 1);
        }

        if (material.skyTexture && material.skyTexture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i (gpu_addresses.skyTexture, 2);
            // For this draw, use the texture image from the correct GPU buffer:
            material.skyTexture.activate(context, 2);
        }

        if (uniforms.foam_texture) {
            // Select texture unit 1 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i (gpu_addresses.foam_texture, 3);
            // For this draw, use the texture image from the correct GPU buffer:
            uniforms.foam_texture.activate(context, 3);
        }
    }
};
