import { Cloth } from './Cloth.js';
import {tiny, defs} from './examples/common.js';
import {Shape_From_File}  from './examples/obj-file-demo.js';
import { Ocean } from './Ocean.js';
import { RigidBody, isPointInsideRigidBody } from './RigidBody.js';
import { Ship } from './ship.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const gravity = defs.gravity = 9.8

class Keyboard_Manager {
  // See description at:
  // https://github.com/encyclopedia-of-code/tiny-graphics-js/wiki/tiny-graphics-gui.js#keyboard_manager
  constructor (target = document, callback_behavior = (callback, event) => callback (event)) {
      this.saved_controls        = {};
      this.actively_pressed_keys = new Set ();
      this.callback_behavior     = callback_behavior;
      target.addEventListener ("keydown", this.key_down_handler.bind (this));
      target.addEventListener ("keyup", this.key_up_handler.bind (this));
      // Deal with stuck keys during focus change:
      window.addEventListener ("focus", () => this.actively_pressed_keys.clear ());
  }
  key_down_handler (event) {
      if (["INPUT", "TEXTAREA"].includes (event.target.tagName)) return;    // Don't interfere with typing.
      this.actively_pressed_keys.add (event.key);                              // Track the pressed key.
      for (let saved of Object.values (this.saved_controls)) {         // Re-check all the keydown handlers.
          if (saved.shortcut_combination.every (s => this.actively_pressed_keys.has (s))
              && event.ctrlKey === saved.shortcut_combination.includes ("Control")
              && event.shiftKey === saved.shortcut_combination.includes ("Shift")
              && event.altKey === saved.shortcut_combination.includes ("Alt")
              && event.metaKey === saved.shortcut_combination.includes ("Meta"))  // Modifiers must exactly match.
              this.callback_behavior (saved.callback, event);       // The keys match, so fire the callback.
      }
  }
  key_up_handler (event) {
      const lower_symbols = "qwertyuiopasdfghjklzxcvbnm1234567890-=[]\\;',./",
            upper_symbols = "QWERTYUIOPASDFGHJKLZXCVBNM!@#$%^&*()_+{}|:\"<>?";

      const lifted_key_symbols = [event.key, upper_symbols[ lower_symbols.indexOf (event.key) ],
                                  lower_symbols[ upper_symbols.indexOf (event.key) ]];
      // Call keyup for any shortcuts
      for (let saved of Object.values (this.saved_controls))                          // that depended on the released
          if (lifted_key_symbols.some (s => saved.shortcut_combination.includes (s)))  // key or its shift-key counterparts.
              this.callback_behavior (saved.keyup_callback, event);                  // The keys match, so fire the
                                                                                     // callback.
      lifted_key_symbols.forEach (k => this.actively_pressed_keys.delete (k));
  }
  add (shortcut_combination, callback = () => {}, keyup_callback = () => {}) {
      this.saved_controls[ shortcut_combination.join ('+') ] = {shortcut_combination, callback, keyup_callback};
  }
}

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

        const background_top = vec4(0.8, 0.9, 1.0, 1); // Light blue
        const background_bottom = vec4(0.2, 0.3, 0.4, 1); // Dark blue
        const fogParams = {
          color: vec4(0.5, 0.6, 0.7, 1), // Fog color
          min_distance: 20,
          max_distance: 100,
          intensity: 0.5
        };

        const phong = new defs.Phong_Shader(1);
        const tex_phong = new defs.Textured_Phong(1);
        const bump = new defs.Fake_Bump_Map(1);
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 )}
        this.materials.shiny = { shader: phong, ambient: .3, diffusivity: 1, specularity: .9, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .3, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.flag_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/skull.png"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
        this.materials.cloth_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/cloth.jpg"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
        this.materials.wood = { shader: tex_phong, ambient: .3, texture: new Texture("assets/wood.jpg"),  diffusivity: 0.7, specularity: 0.3, color: color( 1, 1, 1 ,1 )}
        this.materials.ocean = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( 0,0.62,0.77,1 ) }
        this.materials.oceanfloor = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( 0.5,0.5,0.5,1 ) }
        

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

        const oceanConfig = {
          initPos : vec3(0,0,0),
          density : 40,
          size : 40,
          material: this.materials.ocean,
          floorDensity : 20,
          floorMinY : -10,
          floorMaxY : -9,
          floorMaterial: this.materials.oceanfloor,
          wave_amplitude: 0.5
        }

        const ocean2Config = {
          initPos : vec3(0,-0.5,0),
          density : 40,
          size : 200,
          material: this.materials.ocean,
          floorDensity : 10,
          floorMinY : -10,
          floorMaxY : -9,
          floorMaterial: this.materials.oceanfloor,
          wave_amplitude: 0.5
        }



        this.sail = new Cloth(sailConfig)
        this.sail2 = new Cloth(sailConfig2)
        this.flag = new Cloth(flagConfig)

        this.ocean = new Ocean(oceanConfig)
        // this.ocean2 = new Ocean(ocean2Config)

        this.ship = new Ship()

        this.rb = new RigidBody(vec3(0, 4, 0), vec3(0, 0, 0), 2000, vec3(1,1,1), vec4(0, 0, 1, 0), 100);

      }

      forward_pressed()
      {
        this.vertical_input = 1;
        // console.log('Forward Pressed', this.vertical_input)
      }

      forward_released()
      {
        this.vertical_input = 0;
        // console.log('Forward Released', this.vertical_input)
      }

      bottom_pressed()
      {
        this.vertical_input = -1;
        // console.log('Bottom Pressed', this.vertical_input)
      }

      bottom_released()
      {
        this.vertical_input = 0;
        // console.log('Bottom Released', this.vertical_input)
      }

      left_pressed()
      {
        this.horizontal_input = -1;
        // console.log('Left Pressed', this.horizontal_input)
      }

      left_released()
      {  
        this.horizontal_input = 0;
        // console.log('Left Released', this.horizontal_input)
      }

      right_pressed()
      {
        this.horizontal_input = 1;
        // console.log('Right Pressed', this.horizontal_input)
      }

      right_released()
      {
        this.horizontal_input = 0;
        // console.log('Right Released', this.horizontal_input)
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
        { 
          this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
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
        // this.shapes.axis.draw(caller, this.uniforms, Mat4.identity().times(Mat4.scale(0.5,0.5,0.5)), this.materials.metal);
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
    // let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    // this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.shiny, color: sea_blue } );

    // TODO: you should draw
    // this.sail.simulate(this.t, this.dt)
    // this.sail.show(this.shapes, caller, this.uniforms);

    // this.flag.simulate(this.t, this.dt)
    // this.flag.show(this.shapes, caller, this.uniforms);

    // this.sail2.simulate(this.t, this.dt)
    // this.sail2.show(this.shapes, caller, this.uniforms)

    // this.shapes.ship.draw( caller, this.uniforms, Mat4.translation(0, 1.5, .5).times(Mat4.scale(2.3,2.3,2.3)), this.materials.wood );

    this.ocean.simulate(this.t, this.dt)
    this.ocean.show(this.shapes, caller, this.uniforms)

    this.ship.update(this.t, this.dt)
    this.ship.show(caller, this.uniforms)

    this.ocean.applyWaterForceOnRigidBody(this.ship.rb, this.dt)

    // this.ocean2.simulate(this.t, this.dt)
    // this.ocean2.show(this.shapes, caller, this.uniforms)
  
    // this.rb.applyForceAtPosition(vec3(0,20,0).times(this.vertical_input), vec3(1,0,1))
    // this.rb.applyForce(vec3(0,-gravity * this.rb.mass, 0))
    // this.rb.update(this.dt)
    // this.rb.show(caller, this.uniforms)

    // let temp_pos = vec3(0,1.48,0)
    // let tt = Mat4.translation(temp_pos[0], temp_pos[1], temp_pos[2]).times(Mat4.scale(.1, .1, .1));
    // this.shapes.ball.draw( caller, this.uniforms, tt, { ...this.materials.shiny, color: whiteish } );
  }


}


