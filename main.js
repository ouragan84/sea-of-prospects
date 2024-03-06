import {tiny, defs} from './examples/common.js';
import { Ocean } from './Ocean.js';
import { quaternionFromAngleAxis, RigidBody } from './RigidBody.js';
import { Ship } from './ship.js';
import { Skybox } from './Skybox.js';

const { vec3, vec4, color, Mat4, Shader, Texture, Component } = tiny;

export class Sea_Of_Prospects_Scene extends Component
{       
  init()
  {
    console.log("init")

    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    this.hover = this.swarm = false;

    this.render_distance = 80;
    const fog_param = { color: color(.8,.9,1,1), start: this.render_distance-20, end: this.render_distance };

    this.shapes = { 'box'  : new defs.Cube(),
      'ball' : new defs.Subdivision_Sphere( 4 ),
      'axis' : new defs.Axis_Arrows(),
    };

    this.vertical_input = 0;
    this.horizontal_input = 0;

    this.ocean = new Ocean({
      initPos : vec3(0,0,0),
      density : 200,
      size : 160,
      fog_param: fog_param
    });

    this.ship = new Ship(fog_param)

    // camera config
    this.cameraConfig = {
      distanceFromSubject: 20,
      sensitivity: .02,
    }
    this.mouseVelX = 0;
    this.mouseVelY = 0;
    this.theta = Math.PI/4
    this.phi = Math.PI/4
    this.currentX = 10
    this.currentY = 10
    this.currentZ = 10

    this.wind_default_magnitude = 15;
    this.wind_forward_magnitude = 35;
    this.wind = vec3(0,0,-this.wind_default_magnitude);

    // this.rb = new RigidBody(10, vec3(0,3,0), quaternionFromAngleAxis(0, vec3(0, 0, 1)), vec3(1,1,1), 1, fog_param);
    this.mousev = [0,0];
    
    this.skybox = new Skybox({default_color: color(1,1,1,1), texture: new Texture("assets/skybox2.jpg"), fog_param: fog_param});
    
  }

  clamp = (x, min, max) => Math.min(Math.max(x, min), max);
     
  render_animation( caller )
  {                     

    const t = this.t = this.uniforms.animation_time/1000;
    const dt = this.dt = 0.02

    // Update theta and phi based on mouse input
    this.theta += this.mousev[0] * this.cameraConfig.sensitivity;
    this.phi = this.clamp(this.phi - this.mousev[1] * this.cameraConfig.sensitivity, 0.1, Math.PI/2 - 0.1);

    // Calculate target position
    const r = this.cameraConfig.distanceFromSubject;
    const targetX = r * Math.sin(this.phi) * Math.cos(this.theta);
    const targetY = r * Math.cos(this.phi);
    const targetZ = r * Math.sin(this.phi) * Math.sin(this.theta);

    // Interpolation factor (t)
    const a = .2; // Adjust this value to control the smoothness (smaller values result in smoother movement)

    // Interpolate the camera position
    this.currentX = lerp(this.currentX, targetX, a);
    this.currentY = lerp(this.currentY, targetY, a);
    this.currentZ = lerp(this.currentZ, targetZ, a);

    const cam_pos = vec3(this.currentX, this.currentY, this.currentZ).plus(this.ship.rb.position);

    // Assign the interpolated position to the camera
    Shader.assign_camera(Mat4.look_at(cam_pos, this.ship.rb.position, vec3(0, 1, 0)), this.uniforms);

    this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 0.1, this.render_distance);

    // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
    // !!! Light changed here
    const light_position = vec3(20, 20, -10).plus(this.ship.rb.position).to4(1);
    
    this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 )];

    this.ocean.apply_rb_offset(this.ship.rb);
    this.ocean.show(this.shapes, caller, this.uniforms)

    this.ocean.applyWaterForceOnRigidBody(this.ship.rb, t, dt, this.horizontal_input, this.vertical_input, this.wind)
    this.update_wind()

    this.ship.update(this.t, this.dt, this.wind)
    this.ship.show(caller, this.uniforms)

    this.skybox.show(caller, this.uniforms, cam_pos, this.render_distance);
  }

  update_wind() {
    if (this.vertical_input == 1) {
      const ship_forward = this.ship.rb.getTransformationMatrix().times(vec3(0,0,-1))
      this.wind = ship_forward.times(this.wind_forward_magnitude);
    } else if (this.wind.norm() != this.wind_default_magnitude) {
      this.wind = this.wind.normalized().times(this.wind_default_magnitude);
    }
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
  
  render_controls () {
    this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
    this.key_triggered_button ("Forward", ["w"], () => this.vertical_input = 1, undefined, () => this.vertical_input = 0);
    this.key_triggered_button ("Right", ["d"], () => this.horizontal_input = 1, undefined, () => this.horizontal_input = 0);
    this.new_line ();
    this.key_triggered_button ("Bottom", ["s"], () => this.vertical_input = -1, undefined, () => this.vertical_input = 0);
    this.key_triggered_button ("Left", ["a"], () => this.horizontal_input = -1, undefined, () => this.horizontal_input = 0);

    const canvas = document.getElementsByTagName("canvas")[0];

    // setting up pointer lock for mouse control
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

    canvas.onclick = function(e){
        canvas.requestPointerLock();
    };

    let changeCallback =  function() {

        if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
            // console.log('The pointer lock status is now locked');
            canvas.addEventListener("mousemove", (e) => {
                // this.mouse.from_center = mouse_position(e);
                this.mousev = [e.movementX, e.movementY];
                //console.log("mouse position: ", this.mouse.from_center)
            }, false)

            // canvas.addEventListener("mousedown", e => {
            //     if(e.button == 2 || e.shiftKey || e.ctrlKey || e.altKey)
            //         this.shoot_projectile("orange");
            //     else
            //         this.shoot_projectile("blue");
            // })

        } else {
            // console.log('The pointer lock status is now unlocked');
            canvas.addEventListener("mouseout", (e) => {
                this.mousev = [0,0];
            }, false)
        };
    }

    document.addEventListener('pointerlockchange', changeCallback.bind(this), false);
    document.addEventListener('mozpointerlockchange', changeCallback.bind(this),false);
  }
}


function lerp( a, b, alpha ) {
  return a + alpha * (b-a)
 }

