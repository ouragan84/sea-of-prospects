import {tiny, defs} from './examples/common.js';
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Matrix, Vector} = tiny;

export const Skybox 
= class Skybox {
    constructor(config) {
        this.top_color = config.top_color;
        this.bottom_color = config.bottom_color;

        this.shape = new defs.Subdivision_Sphere(4);
        this.shader = new Skybox_Shader(this.top_color, this.bottom_color); 
        this.material = {shader: new defs.Phong_Shader(1), ambient: 1, diffusivity: 0, specularity: 0, smoothness: 0, texture: null};
    }

    show(context, uniforms, camera_position, camera_distance) {
        const epsilon = 0.1;
        const model_transform = Mat4.translation(camera_position).times(Mat4.scale([camera_distance-epsilon, camera_distance-epsilon, camera_distance-epsilon]));
        this.shape.draw(context, uniforms, model_transform, {... this.material});

        // console.log(model_transform);
    }
}

const Skybox_Shader =
  class Skybox_Shader  extends defs.Phong_Shader {

    constructor(top_color, bottom_color) {
        super();
        this.top_color = `vec4(${top_color[0]}, ${top_color[1]}, ${top_color[2]}, 1.0)`; // `vec4(0.0, 0.0, 0.0, 1.0)`
        this.bottom_color = `vec4(${bottom_color[0]}, ${bottom_color[1]}, ${bottom_color[2]}, 1.0)`; // `vec4(0.0, 0.0, 0.0, 1.0)`
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return super.shared_glsl_code() + `
        vec4 top_color = ${this.top_color};
        vec4 bottom_color = ${this.bottom_color};
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

            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
        } `;
    }

    fragment_glsl_code () {          // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      void main() {
        //   gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
        //   gl_FragColor.xyz += phong_model_lights( normalize(N), vertex_worldspace );
        
        // find angle of pixel along the sphere, shade in the interpolated color for now just top and bottom color
        gl_FragColor = top_color;
        } `;
    }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);
      }
  };