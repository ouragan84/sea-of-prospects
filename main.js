import {tiny, defs} from './examples/common.js';
import { Island, Islands } from './island.js';
import { Ocean } from './Ocean.js';
import { RainSystem } from './RainSystem.js';
import { quaternionFromAngleAxis, RigidBody } from './RigidBody.js';
import { Ship } from './ship.js';
import { Skybox } from './Skybox.js';
import { Text } from './text.js';
import { ShaderMaterial, Sample_Shader } from './ShaderMaterial.js';
import { Foam_Shader } from './Foam.js';
import { ShaderMaterialPingPong } from './ShaderMaterialPingPong.js';

const { vec3, vec4, color, Mat4, Shader, Texture, Component } = tiny;

export class Sea_Of_Prospects_Scene extends Component
{       
  init()
  {
    this.preset = 'stormy'; // 'calm', 'agitated', 'stormy'

    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    this.hover = this.swarm = false;

    this.render_distance = 80;

    const foam_size_terrain = 60; // sizezX of the foam texture in world space in either direction

    let fog_param;

    switch(this.preset){
      case 'calm':
          this.light_color = color(1,0.91,0.62,1)
          fog_param = { color: color(1,1,1,1), start: this.render_distance-10, end: this.render_distance };
          break;
      case 'agitated':
          this.light_color = color(1,0.91,0.62,1)
          fog_param = { color: color(1,1,1,1), start: this.render_distance-10, end: this.render_distance };
          break;
      case 'stormy':
          this.light_color = color(1,0.91,0.62,1)
          fog_param = { color: color(.5,.5,.5,1), start: this.render_distance-20, end: this.render_distance };
          break;
      default:
          this.light_color = color(1,0.91,0.62,1)
    }


    this.shapes = { 'box'  : new defs.Cube(),
      'ball' : new defs.Subdivision_Sphere( 4 ),
      'axis' : new defs.Axis_Arrows(),
      'arrow': new defs.Arrow(),
      'box'  : new defs.Cube()
    };

    this.phong = new defs.Phong_Shader(1, fog_param);

    this.start = true
    this.start_text = "Start Game"
    this.start_audio = new Audio('assets/start.mp3')
    this.game_audio = new Audio('assets/game.mp3')
    this.mute = true

    // Keeps track of whether the game was started and was paused
    this.started = false

    // Text obj for start screen
    this.start_obj = new Text(fog_param, this.start_text)
    this.start_text_transform = Mat4.identity().times(Mat4.rotation(Math.PI/4, 0,1,0)).times(Mat4.translation(-6,5,0))

    this.score = 0
    this.reset = 0

    this.score_text_obj = new Text(fog_param, `${'Score: ' + this.score}`)
    // this.score_text_transform = Mat4.identity().times(Mat4.rotation(Math.PI/4, 0,1,0)).times(Mat4.translation(-6,0,0))

    this.vertical_input = 0;
    this.horizontal_input = 0;

    let skybox_texture;

    switch(this.preset){
      case 'calm':
          skybox_texture = new Texture("assets/sunny_sky.jpg");
          break;
      case 'agitated':
          skybox_texture = new Texture("assets/sunny_sky.jpg");
          break;
      case 'stormy':
          skybox_texture = new Texture("assets/stormy_sky.jpg");
          break;
      default:
          skybox_texture = new Texture("assets/sunny_sky.jpg");
    }

    this.base_water_color = color(0.27,0.46,0.95,1 );

    if(this.preset == 'agitated'){
        const avg = (this.base_water_color[0] + this.base_water_color[1] + this.base_water_color[2]) / 3;
        const f = 0.2;
        this.base_water_color = this.base_water_color.plus((color(avg, avg, avg, 0).minus(this.base_water_color)).times(f));
        this.base_water_color[3] = 1;
    }

    if(this.preset == 'stormy'){
        const avg = (this.base_water_color[0] + this.base_water_color[1] + this.base_water_color[2]) / 3;
        const f = .6;
        this.base_water_color = this.base_water_color.plus((color(avg, avg, avg, 0).minus(this.base_water_color)).times(f));
        this.base_water_color[3] = 1;

    }

    this.skybox = new Skybox({default_color: fog_param.color, texture: skybox_texture, fog_param: fog_param});

    this.ocean = new Ocean({
      ocean_color: this.base_water_color,
      initPos : vec3(0,0,0),
      density : 5,
      size : this.render_distance * 2,
      fog_param: fog_param,
      skybox: this.skybox,
      foam_size_terrain: foam_size_terrain,
      foam_color: color(0.9,0.98,1,1),
      preset: this.preset // 'calm', 'agitated', 'stormy'
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

    this.mousev = [0,0];  
    
    this.islands = new Islands(fog_param, 100)
    this.rainSystem = new RainSystem(200, fog_param)

    this.foam_shader = new Foam_Shader(
      this.ocean.gersrnerWave, // gersrnerWave
      foam_size_terrain, // foam_size_terrain
      this.ship.rb.position, // starting_center
      35, // frame_half_life
      0.50, // jacobian_threshold_start
      .15, // jacobian_threshold_end
      0.8, // max_dist_from_boat
      0.15, // cutoff intensity
      0.5 // boat_dist_variation
    );
    this.foam_material = new ShaderMaterialPingPong(4096, this.foam_shader);
    this.foam_shader.shader_material = this.foam_material;
  
    this.tex_phong = new defs.Textured_Phong(1, fog_param);

    this.explosionTimer = 100;
  }

  clamp = (x, min, max) => Math.min(Math.max(x, min), max);
     
  render_animation( caller )
  {                    
    const t = this.t = this.uniforms.animation_time/1000;
    const dt = this.dt = 0.02;


    if(this.start)
    {
      if(this.mute)
      {
          this.start_audio.pause()
          this.game_audio.pause()
      }
      else
      {
          this.start_audio.pause()
          this.game_audio.play()
      }

      this.game_update(caller, t, dt);
    }
    else
    {
      if(this.mute)
      {
          this.start_audio.pause()
          this.game_audio.pause()
      }
      else
      {
          this.game_audio.pause()
          this.start_audio.play()
      }
      
      this.draw_start_menu(caller, t, dt);
    }
  }

  game_update(caller, t, dt)
  {
    // Order:
    // Do physics
    // Get camera position
    // Update any Shader Materials
    // Update uniforms
    // Draw the scene

    // --- Physics ---

    this.explosionTimer+=dt*1.5

    this.update_wind()

    this.ocean.applyWaterForceOnRigidBody(this.ship.rb, t, dt, this.horizontal_input, this.vertical_input, this.wind, 
      (pos, size, color) => this.draw_debug_sphere(caller, pos, size, color),
      (pos, dir, length, width, color) => this.draw_debug_arrow(caller, pos, dir, length, width, color),
      (start, end, color) => this.draw_debug_line(caller, start, end, color)
    );

    this.ship.update(t, dt, this.wind)

    this.islands.OnCollideEnter(this.ship, () => this.shipExplosion(this.ship))

    if(this.ship.exploded){
      // this.ocean.applyWaterForceOnRigidBody(this.ship.rb_piece1, t, dt, 0, 0, this.wind, 
      //   (pos, size, color) => this.draw_debug_sphere(caller, pos, size, color),
      //   (pos, dir, length, width, color) => this.draw_debug_arrow(caller, pos, dir, length, width, color),
      //   (start, end, color) => this.draw_debug_line(caller, start, end, color)
      // );

      // this.ship.rb_piece1.show(caller, this.uniforms)

      // this.ocean.applyWaterForceOnRigidBody(this.ship.rb_piece2, t, dt, 0, 0, this.wind, 
      //   (pos, size, color) => this.draw_debug_sphere(caller, pos, size, color),
      //   (pos, dir, length, width, color) => this.draw_debug_arrow(caller, pos, dir, length, width, color),
      //   (start, end, color) => this.draw_debug_line(caller, start, end, color)
      // );

      // this.ship.rb_piece2.show(caller, this.uniforms)

      // this.ocean.applyWaterForceOnRigidBody(this.ship.rb_piece2, t, dt, 0, 0, this.wind, 
      //   (pos, size, color) => this.draw_debug_sphere(caller, pos, size, color),
      //   (pos, dir, length, width, color) => this.draw_debug_arrow(caller, pos, dir, length, width, color),
      //   (start, end, color) => this.draw_debug_line(caller, start, end, color)
      // );

      // this.ship.rb_piece3.show(caller, this.uniforms)
    }

    if (this.preset == 'stormy')
      this.rainSystem.update(this.dt, this.ship.rb.position);

    // --- Camera ---

    this.update_camera(caller);
    this.ocean.set_offset(this.ship.rb.position);


    // --- Shader Materials ---

    this.update_foam(caller)

    // --- Uniforms ---

    this.apply_camera(caller);

    // --- Draw the scene ---

    this.ship.show(caller, this.uniforms)

    this.skybox.show(caller, this.uniforms, this.cam_pos, this.render_distance);

    this.score_text_obj.update_string(`Score: ${this.score} - FPS: ${Math.round(1000/this.uniforms.animation_delta_time)}`)
    this.score_text_obj.draw(caller, this.uniforms, this.cam_Mat_inv.times(Mat4.translation(-.14, .075, -0.2)).times(Mat4.scale(.004, .004, .1)))

    this.islands.show(caller, this.uniforms)

    if (this.preset == 'stormy')
      this.rainSystem.draw(caller, this.uniforms)

    this.shapes.axis.draw( caller, this.uniforms, Mat4.identity(), { shader: this.phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( 1,1,1,1 ) } )
    this.ocean.show(this.shapes, caller, this.uniforms, this.camera_direction_xz, this.foam_material.get_texture());
    
  }

  shipExplosion(ship){
    ship.explode();
    this.explosionTimer = 0;
  }

  update_foam(caller)
  {
    const front_of_boat = this.ship.rb.getTransformationMatrix().times(vec4(0,0,-0.5,1)).to3();
    const sample_point_for_boat = this.ocean.gersrnerWave.get_original_position_and_true_y(front_of_boat[0], front_of_boat[2], this.t);
    this.foam_material.update(caller, {... this.uniforms, offset: this.ocean.ocean_offset, sample_boat: sample_point_for_boat, boat_foam_intensity: this.ship.rb.velocity.norm() / 8});
  }

  update_camera(caller)
  {
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

    this.cam_pos = vec3(this.currentX, this.currentY, this.currentZ).plus(this.ship.rb.position);
    this.cam_Mat = Mat4.look_at(this.cam_pos, this.ship.rb.position, vec3(0, 1, 0));
    this.cam_Mat_inv = Mat4.inverse(this.cam_Mat);

    this.camera_direction_xz = vec3(this.ship.rb.position[0] - this.cam_pos[0], 0, this.ship.rb.position[2] - this.cam_pos[2]).normalized();
  }

  apply_camera(caller)
  {
    Shader.assign_camera(this.cam_Mat, this.uniforms);

    this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 0.1, this.render_distance).times(Mat4.rotation(Math.sin(40*this.explosionTimer)*.04*Math.exp(-this.explosionTimer), .2,1,.2))

    const light_position = vec3(20, 20, -10).plus(this.ship.rb.position).to4(1);
    this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, this.light_color, 1000000 )];
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

  draw_start_menu(caller, t, dt)
  {
    const start_screen_transform = Mat4.identity().times( Mat4.scale( 10,10, 1) );
    const start_screen_material = { shader: new defs.Basic_Shader(), ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }

    // TODO: Add orthographic camera projection, see ShaderMaterial class

    this.shapes.ball.draw( caller, this.uniforms, start_screen_transform, start_screen_material );

    if(this.started)
    {
        this.start_obj.update_string("Paused")
    }
    else
    {
        this.start_obj.update_string("Start Game")
    }

    this.score_text_obj.update_string("Score: " + this.score)

    this.start_obj.draw(caller, this.uniforms, this.start_text_transform)
    this.score_text_obj.draw(caller, this.uniforms, this.score_text_transform)
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

  handle_reset()
  {
    if(this.start)
    {
        this.start = false
        this.started = false
        this.score = 0
    }
  }

  handle_audio()
  {
      this.mute = !this.mute

      if(this.mute)
      {
          this.start_audio.pause()
          this.game_audio.pause()
      }
      else
      {
          if(this.start)
          {
              this.game_audio.play()
          }
          else
          {
              this.start_audio.play()
          }
      }
  }
  
  render_controls () {
    this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
    this.key_triggered_button ("Start/Pause Game", [" "], () => {this.start = !this.start; this.started = true});
    this.key_triggered_button ("Reset", ["r"], () => this.handle_reset());
    //this.key_triggered_button ("Pause Game", [" "], () => this.start = 0);
    this.new_line();
    this.key_triggered_button ("Mute/Unmute", ["m"], () => this.mute=!this.mute);
    this.key_triggered_button ("Increase Score", ["i"], () => {
      this.score+=1
    });
    this.new_line();
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

    const changeCallback = () => {
        if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
            canvas.addEventListener("mousemove", (e) => {
              if(this.start)
              {
                  this.mousev = [e.movementX, e.movementY];
              }
            }, false)

        } else {
            canvas.addEventListener("mouseout", (e) => {
                this.mousev = [0,0];
            }, false)
        };
    }

    document.addEventListener('pointerlockchange', changeCallback.bind(this), false);
    document.addEventListener('mozpointerlockchange', changeCallback.bind(this),false);
  }

  draw_debug_sphere = (caller, pos, size=0.2, sphere_color=color(1,0,0,1)) => {
    this.shapes.ball.draw( caller, this.uniforms, Mat4.translation(pos[0], pos[1], pos[2]).times( Mat4.scale( size, size, size) ), { shader: this.phong, ambient: .3, diffusivity: .8, specularity:  .5, color: sphere_color } )
  }

  draw_debug_arrow = (caller, pos, dir, length=1, width=1, arrow_color=color(1,0,0,1)) => {
    const d = dir.normalized();

    const angle_y = Math.atan2(d[0], d[2]);
    const angle_x = -Math.asin(d[1]);

    const rotMat = Mat4.rotation(angle_y, 0, 1, 0).times(Mat4.rotation(angle_x, 1, 0, 0));

    const transform = Mat4.translation(pos[0], pos[1], pos[2]).times(rotMat).times(Mat4.scale(width/2, width/2, length/2));

    this.shapes.arrow.draw(caller, this.uniforms, transform, { shader: this.phong, ambient: .3, diffusivity: .8, specularity: .5, color: arrow_color });

  }

  draw_debug_line = (caller, start, end, thickness=0.05, line_color=color(1,0,0,1)) => {
    const dir = end.minus(start);
    const length = dir.norm();
    const d = dir.normalized();

    const angle_y = Math.atan2(d[0], d[2]);
    const angle_x = -Math.asin(d[1]);

    const rotMat = Mat4.rotation(angle_y, 0, 1, 0).times(Mat4.rotation(angle_x, 1, 0, 0));

    const transform = Mat4.translation(start[0], start[1], start[2]).times(rotMat).times(Mat4.scale(thickness, thickness, length/2)).times(Mat4.translation(0, 0, 1));

    this.shapes.box.draw(caller, this.uniforms, transform, { shader: this.phong, ambient: .3, diffusivity: .8, specularity: .5, color: line_color });
  }
}


function lerp( a, b, alpha ) {
  return a + alpha * (b-a)
 }

