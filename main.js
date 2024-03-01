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
        };

        this.vertical_input = 0;
        this.horizontal_input = 0;

        this.is_camera_unlocked = false

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
        
        const oceanConfig = {
          initPos : vec3(0,0,0),
          density : 40,
          size : 40,
          material: this.materials.ocean,
          floorDensity : 20,
          floorMinY : -10,
          floorMaxY : -9,
          floorMaterial: this.materials.oceanfloor
        }

        this.ocean = new Ocean(oceanConfig)

        this.ship = new Ship()

        this.camera_coordinates = vec3(10,10,10)
        this.camera_matrix = Mat4.look_at (this.camera_coordinates, vec3 (0, 0, 0), vec3 (0, 1, 0))

      }

      getMousePos(canvas, evt) {
          var rect = canvas.getBoundingClientRect();
          return vec3(evt.clientX - rect.left, evt.clientY - rect.top,0)
      }

      getMouseVel(prevPos, currPos, dt) {
        return currPos.minus(prevPos).times(10000/dt);
      }

      mouseToWorldPos(mousePos) {
          //mouse x goes from 0 to 1080
          //mouse y goes from 0 to 600
          //world x -> -5 to 5
          //world y -> 1 to 3

          let x = map(mousePos[0], 0, 1080, -5, 5)
          let y = map(mousePos[1], 0, 600, 3, 1)

          return vec3(x,y,z)
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

      camera_control_pressed()
      {
          this.is_camera_unlocked = !this.is_camera_unlocked
      }
      
      move_camera(mouse_vx, mouse_vy)
      {
          //console.log(`Instantaneous Mouse Velocity - X: ${mouse_vx}px/s, Y: ${mouse_vy}px/s`);
          this.update_camera(mouse_vx, mouse_vy)
      }

      lerp(a, b, t) {
        return (1 - Math.sqrt(t)) * a + Math.sqrt(t) * b;
    }
    

      // vx is the mouse x velocity and vy is the mouse y velocity
      update_camera(vx, vy)
      {
          const scaleX = 0.00001; // Adjust this to control sensitivity of horizontal movement
          const scaleZ = 0.00001; // Adjust this to control sensitivity of vertical movement (forward/backward)
          const responsiveness = 0.1

          // Calculate new camera position
          // Note: You might need to adjust the direction (+ or -) based on how your scene is set up
          const new_x = this.camera_coordinates[0] + (vx * scaleX);
          const new_z = this.camera_coordinates[2] - (vy * scaleZ); // Using '-' for inverse relation in vertical mouse movement

          // Update camera_coordinates with new position
          this.camera_coordinates = vec3(this.lerp(this.camera_coordinates[0], new_x, responsiveness), 10, this.lerp(this.camera_coordinates[2], new_z, responsiveness)); // Y-coordinate remains constant at 10
          console.log('camera: ', this.camera_coordinates)

          // Update camera_matrix to "look at" the ship at (0, 0, 0) from the new position
          this.camera_matrix = Mat4.look_at(this.camera_coordinates, vec3(0, 0, 0), vec3(0, 1, 0));

          // Assign the updated camera matrix to the shader
          Shader.assign_camera(this.camera_matrix, this.uniforms);
      }

      render_controls () {
        this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
        this.key_triggered_button ("Forward", ["w"], () => this.forward_pressed(), undefined, () => this.forward_released());
        this.key_triggered_button ("Right", ["d"], () => this.right_pressed(), undefined, () => this.right_released());
        this.new_line ();
        this.key_triggered_button ("Bottom", ["s"], () => this.bottom_pressed(), undefined, () => this.bottom_released());
        this.key_triggered_button ("Left", ["a"], () => this.left_pressed(), undefined, () => this.left_released());
        this.key_triggered_button ("Change Orientation", ["m"], () => this.camera_control_pressed());
      }

      render_animation( caller )
      {      

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { 
          this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );
          console.log('camera in animation: ', this.camera_matrix)
          Shader.assign_camera( this.camera_matrix, this.uniforms );
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

        // Initialization
        let lastMousePos = null;
        let lastTime = Date.now();

        caller.canvas.addEventListener("mousemove", e => {
            e.preventDefault();
            const newMousePos = this.getMousePos(caller.canvas, e);
            const currentTime = Date.now();

            // Initialize lastMousePos if it's not set
            if (!lastMousePos) {
                lastMousePos = newMousePos;
            }

            // Calculate time difference in seconds
            const timeDiff = (currentTime - lastTime) / 1000; // Convert to seconds

            // Initialize velocity
            let velocity = { x: 0, y: 0 };

            // Only calculate velocity if timeDiff is greater than zero
            if (timeDiff > 0) {
                // Calculate instantaneous velocity
                velocity.x = (newMousePos[0] - lastMousePos[0]) / timeDiff;
                velocity.y = (newMousePos[1] - lastMousePos[1]) / timeDiff;
            }

            let vx = isFinite(velocity.x) ? velocity.x.toFixed(2) : 0
            let vy = isFinite(velocity.y) ? velocity.y.toFixed(2) : 0

            if(this.is_camera_unlocked)
            {
                this.move_camera(vx, vy)
            }

            // Update last position and time for the next calculation
            lastMousePos = newMousePos;
            lastTime = currentTime;
        });
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
    this.ocean.simulate(this.t, this.dt)
    this.ocean.show(this.shapes, caller, this.uniforms)

    this.ocean.applyWaterForceOnRigidBody(this.ship.rb, this.dt);

    this.ship.update(this.t, this.dt)
    this.ship.show(caller, this.uniforms)
  }

}


