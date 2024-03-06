import {tiny, defs} from './examples/common.js';
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Matrix, Vector} = tiny;

export const Skybox 
= class Skybox {
    constructor(config) {
        this.default_color = config.default_color;
        this.texture = config.texture;

        this.shape = new defs.Subdivision_Sphere(4);
        this.shader = new Skybox_Shader(
            1, // num_lights
            this.default_color, // default_color
            1.79495559215, // angle_from_top
            0.4, // radius_blend_start
            0.5, // radius_blend_end
            Math.PI // rotation_y
        ); 
        this.material = {shader: this.shader, texture: this.texture };
    }

    show(context, uniforms, camera_position, camera_distance) {
        const epsilon = 0.1;
        const model_transform = Mat4.translation(camera_position[0], camera_position[1], camera_position[2]).times(Mat4.scale(camera_distance-epsilon, camera_distance-epsilon, camera_distance-epsilon));
        this.shape.draw(context, uniforms, model_transform, {... this.material});
    }
}

const Skybox_Shader =
  class Skybox_Shader extends defs.Phong_Shader {
        constructor(num_lights=2, default_color, angle_from_top, radius_blend_start, radius_blend_end, rotation_y) {
            super(num_lights);
            this.default_color = `vec4(${default_color[0]}, ${default_color[1]}, ${default_color[2]}, ${default_color[3]})`;
            this.angle_from_top = angle_from_top;
            this.radius_blend_start = radius_blend_start;
            this.radius_blend_end = radius_blend_end;
            this.rotation_y = rotation_y;

        }

      vertex_glsl_code () {         // ********* VERTEX SHADER *********
          return this.shared_glsl_code () + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );     // Move vertex to final space.
                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                                              // Turn the per-vertex texture coordinate into an interpolated variable.
          } `;
      }
      fragment_glsl_code () {        // ********* FRAGMENT SHADER *********
          return this.shared_glsl_code () + `
        uniform sampler2D texture;

        #define PI 3.14159265359

        float angle_from_top = ${this.angle_from_top.toFixed(10)};  

        vec4 default_color = ${this.default_color};

        float radius_blend_start = ${this.radius_blend_start.toFixed(10)};
        float radius_blend_end = ${this.radius_blend_end.toFixed(10)};
        float rotation_y = ${this.rotation_y.toFixed(10)};

        void main() {
            vec3 direction = normalize(vertex_worldspace);

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
                tex_color = texture2D(texture, vec2(u, v)); // Sample the texture at the calculated UV coordinates

                if (radius > radius_blend_start) {
                    float blend = (radius - radius_blend_start) / (radius_blend_end - radius_blend_start);
                    tex_color = mix(tex_color, default_color, blend);
                }
            }
            
            gl_FragColor = tex_color;
          } `;
      }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);

          if (material.texture && material.texture.ready) {
              // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
              context.uniform1i (gpu_addresses.texture, 0);
              // For this draw, use the texture image from the correct GPU buffer:
              material.texture.activate(context, 0);
          }
      }
  };