import { Cloth } from './Cloth.js';
import {tiny, defs} from './examples/common.js';
import {Shape_From_File}  from './examples/obj-file-demo.js';
import { RigidBody } from './RigidBody.js';

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
          'teapot': new Shape_From_File( "assets/teapot.obj" ),
          'ship': new Shape_From_File( "assets/ship.obj" ),
        };

        this.vertical_input = 0;
        this.horizontal_input = 0;


        const phong = new defs.Phong_Shader(1);
        const tex_phong = new defs.Textured_Phong(1);
        const bump = new defs.Fake_Bump_Map(1);
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.shiny = { shader: phong, ambient: .3, diffusivity: 1, specularity: .9, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .3, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.flag_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/skull.png"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
        this.materials.cloth_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/cloth.jpg"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
        this.materials.wood = { shader: tex_phong, ambient: .3, texture: new Texture("assets/wood.jpg"),  diffusivity: 0.7, specularity: 0.3, color: color( 1, 1, 1 ,1 )}
        this.materials.rgb = { shader: tex_phong, ambient: .5}

        // call this with side_length = density+1
        const get_corners = (side_length) => [0, side_length-1, side_length**2-side_length, side_length**2-1];
        const get_edge = (side_length) => Array.from({length: side_length}, (_, i) => i);

        const sailConfig = {
          initPos : vec3(0,4,0),
          density : 10,
          size : 4,
          lockedPoints: get_corners(11),
          material: this.materials.cloth_tex,
        }
        const sailConfig2 = {
          initPos : vec3(0,3.25,2.75),
          density : 10,
          size : 2,
          lockedPoints: get_corners(11),
          material: this.materials.cloth_tex,
        }

        const flagConfig = {
          initPos : vec3(1,8,-.2),
          density : 10,
          size : 2,
          lockedPoints: get_edge(11),
          material: this.materials.flag_tex
        }


        this.sail = new Cloth(sailConfig)
        this.sail2 = new Cloth(sailConfig2)
        this.flag = new Cloth(flagConfig)

        this.rb = new RigidBody(vec3(0,1,0))
      }

      forward_pressed()
      {
        this.vertical_input = 1;
        console.log('Forward Pressed', this.vertical_input)
      }

      forward_released()
      {
        this.vertical_input = 0;
        console.log('Forward Released', this.vertical_input)
      }

      bottom_pressed()
      {
        this.vertical_input = -1;
        console.log('Bottom Pressed', this.vertical_input)
      }

      bottom_released()
      {
        this.vertical_input = 0;
        console.log('Bottom Released', this.vertical_input)
      }

      left_pressed()
      {
        this.horizontal_input = -1;
        console.log('Left Pressed', this.horizontal_input)
      }

      left_released()
      {  
        this.horizontal_input = 0;
        console.log('Left Released', this.horizontal_input)
      }

      right_pressed()
      {
        this.horizontal_input = 1;
        console.log('Right Pressed', this.horizontal_input)
      }

      right_released()
      {
        this.horizontal_input = 0;
        console.log('Right Released', this.horizontal_input)
      }

      render_controls () {
        this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
        this.key_triggered_button ("Forward", ["w"], () => this.forward_pressed(), undefined, () => this.forward_released());
        this.key_triggered_button ("Right", ["d"], () => this.right_pressed(), undefined, () => this.right_released());
        this.new_line ();
        this.key_triggered_button ("Bottom", ["s"], () => this.bottom_pressed(), undefined, () => this.bottom_released());
        this.key_triggered_button ("Left", ["a"], () => this.left_pressed(), undefined, () => this.left_released());
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
    // this.sail.simulate(this.t, this.dt)
    // this.sail.show(this.shapes, caller, this.uniforms);

    // this.flag.simulate(this.t, this.dt)
    // this.flag.show(this.shapes, caller, this.uniforms);

    // this.sail2.simulate(this.t, this.dt)
    // this.sail2.show(this.shapes, caller, this.uniforms)

    // // this.shapes.box.draw( caller, this.uniforms, Mat4.translation(0, 0, 0).times(Mat4.scale(.1, 6.5, .1)), { ...this.materials.shiny, color: brown } );
    // // this.shapes.box.draw( caller, this.uniforms, Mat4.translation(0, .5, 0).times(Mat4.rotation(Math.PI/2,0,0,1)).times(Mat4.scale(.06, 2, .06)), { ...this.materials.shiny, color: brown } );
    // // this.shapes.box.draw( caller, this.uniforms, Mat4.translation(0, 4.5, 0).times(Mat4.rotation(Math.PI/2,0,0,1)).times(Mat4.scale(.06, 2, .06)), { ...this.materials.shiny, color: brown } );

    // this.shapes.ship.draw( caller, this.uniforms, Mat4.translation(0, 1.5, .5).times(Mat4.scale(2.3,2.3,2.3)), this.materials.wood );

    this.rb.applyForceAtPosition(vec3(0,20,0).times(this.vertical_input), vec3(1,0,1))
    this.rb.applyForce(vec3(0,-gravity * this.rb.mass, 0))
    this.rb.update(this.dt)
    this.rb.checkCollissionWithGroundPlane(1000,25)
    this.rb.show(caller, this.uniforms)

    let temp_pos = vec3(0,1.48,0)
    let tt = Mat4.translation(temp_pos[0], temp_pos[1], temp_pos[2]).times(Mat4.scale(.1, .1, .1));
    this.shapes.ball.draw( caller, this.uniforms, tt, { ...this.materials.shiny, color: whiteish } );
    console.log(isPointInsideRigidBody(temp_pos, this.rb))

  }


}


function isPointInsideRigidBody(point, rigidBody) {
  // Step 1: Translate the point into the rigid body's local coordinate system
  let localPoint = point.minus(rigidBody.pos);
  
  // Step 2: Rotate the point by the inverse of the rigid body's orientation
  // Calculate the inverse of the orientation quaternion
  let angle = rigidBody.orientation[0];
  let axis = vec3(rigidBody.orientation[1], rigidBody.orientation[2], rigidBody.orientation[3]);
  let invOrientation = quaternionFromAngleAxis(-angle, axis); // Assuming you have this function
  
  // Apply the inverse rotation to the point
  localPoint = rotateVectorByQuaternion(localPoint, invOrientation); // Assuming you have this function
  
  // Step 3: Check if the localPoint is within the bounds defined by the scale
  let halfScale = rigidBody.scale.times(0.5);
  return Math.abs(localPoint[0]) <= halfScale[0] &&
         Math.abs(localPoint[1]) <= halfScale[1] &&
         Math.abs(localPoint[2]) <= halfScale[2];
}

// Helper function to create a quaternion from an angle and an axis
function quaternionFromAngleAxis(angle, axis) {
  let halfAngle = angle * 0.5;
  let s = Math.sin(halfAngle);
  return vec4(Math.cos(halfAngle), axis[0] * s, axis[1] * s, axis[2] * s);
}

// Helper function to rotate a vector by a quaternion
function rotateVectorByQuaternion(vector, quaternion) {
  // Convert the vector into a quaternion with a w-value of 0
  let vQuat = vec4(0, vector[0], vector[1], vector[2]);
  
  // Calculate the conjugate of the quaternion
  let qConj = vec4(quaternion[0], -quaternion[1], -quaternion[2], -quaternion[3]);
  
  // Rotate the vector quaternion: q * v * q^-1
  let rotatedQuat = quaternionMultiply(quaternionMultiply(quaternion, vQuat), qConj);
  
  // Return the rotated vector, ignoring the w component
  return vec3(rotatedQuat[1], rotatedQuat[2], rotatedQuat[3]);
}

// Helper function to multiply two quaternions
function quaternionMultiply(q1, q2) {
  return vec4(
      q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] - q1[3] * q2[3],
      q1[0] * q2[1] + q1[1] * q2[0] + q1[2] * q2[3] - q1[3] * q2[2],
      q1[0] * q2[2] - q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1],
      q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0]
  );
}
