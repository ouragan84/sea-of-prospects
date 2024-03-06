import {tiny, defs} from './examples/common.js';
import { Ocean } from './Ocean.js';
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

    this.shapes = { 'box'  : new defs.Cube(),
      'ball' : new defs.Subdivision_Sphere( 4 ),
      'axis' : new defs.Axis_Arrows(),
    };

    this.vertical_input = 0;
    this.horizontal_input = 0;

    const oceanConfig = {
      initPos : vec3(0,0,0),
      density : 200,
      size : 150
    }

    this.ocean = new Ocean(oceanConfig)

    this.ship = new Ship()

    // camera config
    this.cameraConfig = {
      distanceFromSubject: 20,
      sensitivity: .0001,
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

    // this.rb = new RigidBody();

    this.skybox = new Skybox({default_color: color(1,1,1,1), texture: new Texture("assets/skybox2.jpg")});

    this.render_distance = 100;
  }
     
  render_animation( caller )
  {                      
    const t = this.t = this.uniforms.animation_time/1000;
    const dt = this.dt = 0.02

    // Update theta and phi based on mouse input
    this.theta += this.mouseVelX * this.cameraConfig.sensitivity;
    this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi - this.mouseVelY * this.cameraConfig.sensitivity));

    // Calculate target position
    const r = this.cameraConfig.distanceFromSubject;
    const targetX = r * Math.sin(this.phi) * Math.cos(this.theta);
    const targetY = r * Math.cos(this.phi);
    const targetZ = r * Math.sin(this.phi) * Math.sin(this.theta);

    // Interpolation factor (t)
    const a = 0.1; // Adjust this value to control the smoothness (smaller values result in smoother movement)

    // Interpolate the camera position
    const newX = lerp(this.currentX, targetX, a);
    const newY = lerp(this.currentY, targetY, a);
    const newZ = lerp(this.currentZ, targetZ, a);

    // Update the current camera position
    this.currentX = newX;
    this.currentY = newY;
    this.currentZ = newZ;

    // Assign the interpolated position to the camera
    Shader.assign_camera(Mat4.look_at(vec3(newX, newY, newZ), vec3(0,0,0), vec3(0, 1, 0)), this.uniforms);

    this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 0.1, this.render_distance);

    const angle = Math.sin( t );

    // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
    // !!! Light changed here
    const light_position = vec4(20, 20, -10, 1.0);
    
    this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 )];

    // draw axis arrows.

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
        
        // console.log(`Instantaneous Mouse Velocity - X: ${isFinite(velocity.x) ? velocity.x.toFixed(2) : 0}px/s, Y: ${isFinite(velocity.y) ? velocity.y.toFixed(2) : 0}px/s`);
        this.mouseVelX = velocity.x
        this.mouseVelY = velocity.y
        // Update last position and time for the next calculation
        lastMousePos = newMousePos;
        lastTime = currentTime;

    });

    this.ocean.apply_rb_offset(this.ship.rb);

    this.ocean.show(this.shapes, caller, this.uniforms)

    this.update_wind();
    this.ocean.applyWaterForceOnRigidBody(this.ship.rb, t, this.dt, this.horizontal_input, this.vertical_input, this.wind)
    
    this.ship.update(this.t, this.dt, this.wind)
    this.ship.show(caller, this.uniforms)

    this.skybox.show(caller, this.uniforms, vec3(this.currentX, this.currentY, this.currentZ), this.render_distance);

  }

  update_wind() {
    if (this.vertical_input == 1) {
      const ship_forward = this.ship.rb.rotation.times(vec3(0,0,-1))
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
  }
}


function lerp( a, b, alpha ) {
  return a + alpha * (b-a)
 }

