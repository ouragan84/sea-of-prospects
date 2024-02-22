import { Cloth } from './Cloth.js';
import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const gravity = 9.8

export
const Part_one_hermite_base = defs.Part_one_hermite_base =
    class Part_one_hermite_base extends Component
    {          
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        this.hover = this.swarm = false;

        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows(),
        };


        const phong = new defs.Phong_Shader(1);
        const tex_phong = new defs.Textured_Phong();
        const bump = new defs.Fake_Bump_Map(1);
        const Gouraud = new defs.Gouraud_Shader(1);
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.shiny = { shader: phong, ambient: .2, diffusivity: 1, specularity: .9, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.cloth = { shader: phong, ambient: 0.3, diffusivity: 1, specularity: 0.1, color: color( .8,.8,.5,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5}

        // call this with side_length = density+1
        const get_corners = (side_length) => [0, side_length-1, side_length**2-side_length, side_length**2-1];
        const get_edge = (side_length) => Array.from({length: side_length}, (_, i) => i);

        const sailConfig = {
          initPos : vec3(0,2.5,0),
          density : 10,
          size : 4,
          lockedPoints: get_corners(11),
          material: this.materials.cloth
        }

        // const sailConfig = {
        //   initPos : vec3(0,2.5,0),
        //   density : 3,
        //   size : 4,
        //   lockedPoints: [
        //     0, 3, 12, 15
        //   ],
        //   material: this.materials.cloth
        // }

        const flagConfig = {
          initPos : vec3(0.5,6,-.1),
          density : 10,
          size : 1,
          lockedPoints: get_edge(11),
          material: this.materials.cloth
        }


        this.sail = new Cloth(sailConfig)
        this.flag = new Cloth(flagConfig)
      }

      render_animation( caller )
      {      

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );
          Shader.assign_camera( Mat4.look_at (vec3 (10, 10, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        const t = this.t = this.uniforms.animation_time/1000;
        const dt = this.dt = 0.02

        const angle = Math.sin( t );

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20, 20, -10, 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        this.shapes.axis.draw(caller, this.uniforms, Mat4.identity().times(Mat4.scale(0.5,0.5,0.5)), this.materials.metal);
      }
    }


export class Part_one_hermite extends Part_one_hermite_base
{            
  render_animation( caller )
  {                           
    // Call the setup code that we left inside the base class:
    super.render_animation( caller );
    const sea_blue = color( 0,0.62,0.77,1 ), whiteish = color( .9,.9,1,1 ), brown = color(139/255, 69/255, 19/255,1);
    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.shiny, color: sea_blue } );

    // TODO: you should draw
    this.sail.simulate(this.t, this.dt)
    this.sail.show(this.shapes, caller, this.uniforms);

    this.flag.simulate(this.t, this.dt)
    this.flag.show(this.shapes, caller, this.uniforms);

    this.shapes.box.draw( caller, this.uniforms, Mat4.translation(0, 0, 0).times(Mat4.scale(.1, 6.5, .1)), { ...this.materials.shiny, color: brown } );
    this.shapes.box.draw( caller, this.uniforms, Mat4.translation(0, .5, 0).times(Mat4.rotation(Math.PI/2,0,0,1)).times(Mat4.scale(.06, 2, .06)), { ...this.materials.shiny, color: brown } );
    this.shapes.box.draw( caller, this.uniforms, Mat4.translation(0, 4.5, 0).times(Mat4.rotation(Math.PI/2,0,0,1)).times(Mat4.scale(.06, 2, .06)), { ...this.materials.shiny, color: brown } );

  }


}
