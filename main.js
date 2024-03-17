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
import { PreviousFrameMaterial } from './PreviousFrameMaterial.js';
import { Chest } from './Chest.js';
import { ChestSpawner } from './ChestSpawner.js';
import { SharkSystem } from './Shark.js';

const { vec3, vec4, color, Mat4, Matrix, Shader, Texture, Component } = tiny;

export class Sea_Of_Prospects_Scene extends Component
{       
  init()
  {
    this.preset = 'calm'; // 'calm', 'agitated', 'stormy'
    this.weather_states = ['calm', 'agitated', 'stormy']
    this.weather_index = 0 // default is calm

    this.button_obj = new defs.Square()
    this.weather_button_obj = new defs.Square()

    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    this.hover = this.swarm = false;

    this.render_distance = 80;

    const foam_size_terrain = 60; // sizezX of the foam texture in world space in either direction

    this.light_color = color(1,0.91,0.62,1)
    const fog_param = { color: color(1,1,1,1), start: this.render_distance-15, end: this.render_distance };

    this.shapes = { 'box'  : new defs.Cube(),
      'ball' : new defs.Subdivision_Sphere( 4 ),
      'axis' : new defs.Axis_Arrows(),
      'arrow': new defs.Arrow(),
      'box'  : new defs.Cube(),
      'quad' : new defs.Square(),
    };

    this.phong = new defs.Phong_Shader(1, fog_param);

    this.start_audio = new Audio('assets/sounds/start_menu.mp3')
    this.game_audio = new Audio('assets/sounds/game_loop.mp3')
    this.mute = false

    this.pickup_prospect_audio = new Audio('assets/sounds/pickup_prospect.mp3')

    // Keeps track of whether the game was started and was paused
    this.started = false

    // Text obj for start screen
    this.gameover_obj = new Text(fog_param, "Game Over - Refresh to Restart");
    this.start_screen_texture = new Texture("assets/textures/menu_screen.jpg");
    this.start_obj = new Text(fog_param, 'START')
    this.start_weather_obj = new Text(fog_param, `Weather: ${this.preset}`);
    // this.change_obj = new Text(fog_param, "Change");

    this.score = 0
    this.reset = 0

    this.score_text_obj = new Text(fog_param, `${'Score: ' + this.score}`)
    // this.score_text_transform = Mat4.identity().times(Mat4.rotation(Math.PI/4, 0,1,0)).times(Mat4.translation(-6,0,0))

    this.vertical_input = 0;
    this.horizontal_input = 0;

    let skybox_texture;

    this.skyBox_calm = new Texture("assets/textures/sunny_sky.jpg");
    this.skyBox_stormy = new Texture("assets/textures/stormy_sky3.jpg");

    this.skybox = new Skybox({default_color: fog_param.color, texture: this.skyBox_calm, fog_param: fog_param});

    this.ocean = new Ocean();

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
      this.ocean, // gersrnerWave
      foam_size_terrain, // foam_size_terrain
      this.ship.rb.position, // starting_center
      35, // frame_half_life
      0.65, // jacobian_threshold_start
      .2, // jacobian_threshold_end
      0.8, // max_dist_from_boat
      0.15, // cutoff intensity
      0.5 // boat_dist_variation
    );

    this.foam_material = new ShaderMaterialPingPong(4096, this.foam_shader);
    this.foam_shader.shader_material = this.foam_material;
  
    this.tex_phong = new defs.Textured_Phong(1, fog_param);

    this.chests = new ChestSpawner(() => {
      this.score += 1;
      this.pickup_prospect_audio.play();
    }, fog_param, this.ocean);

    this.explosionTimer = 100;

    this.shark_system = new SharkSystem(this.ocean, fog_param, () => this.shipExplosion(this.ship));

    this.gameover = false;

    this.foam_size_terrain = foam_size_terrain;

    this.prev_frame_material = new PreviousFrameMaterial();

    this.prev_date_micro_sec = window.performance.now();

    this.ssr_enabled = false;

    this.fog_param = fog_param;

    this.previous_ship_pos = vec3(0,0,0);
  }


  startGame(weather){
    this.preset = weather
    this.started = true

    const fog_param = this.fog_param;
    const foam_size_terrain =this.foam_size_terrain

    if(this.preset == 'stormy'){
      this.skybox.updateTexture(this.skyBox_stormy);
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

    this.ocean.setConfig(
      {
        ocean_color: this.base_water_color,
        initPos : vec3(0,0,0),
        density : 5,
        size : this.render_distance * 2,
        fog_param: fog_param,
        skybox: this.skybox,
        foam_size_terrain: foam_size_terrain,
        foam_color: color(0.9,0.98,1,1),
        preset: this.preset // 'calm', 'agitated', 'stormy'
      }
    )

  }

  

  clamp = (x, min, max) => Math.min(Math.max(x, min), max);
     
  render_animation( caller )
  {                    
    const t = this.t = this.uniforms.animation_time/1000;
    const dt = this.dt = 0.02;


    if(this.started)   
      this.game_update(caller, t, dt);
    else
      this.draw_start_menu(caller, t, dt);

    this.play_audio();
    
  }

  async play_audio(){
    if(this.mute)
    {
      this.start_audio.pause()
      this.game_audio.pause()
      return;
    }

    if(this.started)
    {
      try{
        await this.game_audio.play();
      } catch (e) {}
      this.start_audio.pause()
    }
    else
    {
      try{
        await this.start_audio.play();
      } catch (e) {}
      this.game_audio.pause()
    }
  }

  game_update(caller, t, dt)
  {

    // --- Physics ---

    this.last_cam_pos = this.cam_pos || vec3(0,0,0);

    this.explosionTimer+=dt*1.5

    this.update_wind()

    // this.sanity_check();

    this.ocean.applyWaterForceOnRigidBody(this.ship.rb, t, dt, this.horizontal_input, this.vertical_input, this.wind, 
      (pos, size, color) => this.draw_debug_sphere(caller, pos, size, color),
      (pos, dir, length, width, color) => this.draw_debug_arrow(caller, pos, dir, length, width, color),
      (start, end, color) => this.draw_debug_line(caller, start, end, color)
    );

    // this.sanity_check();

    this.ship.update(t, dt, this.wind)

    

    this.islands.OnCollideEnter(this.ship, () => this.shipExplosion(this.ship))

    this.chests.update(this.t, this.dt, this.ship.rb.position)
    this.shark_system.update(t, dt, this.ship.rb.position)

    if (this.preset == 'stormy')
      this.rainSystem.update(this.dt, this.ship.rb.position);

      // this.sanity_check();

    // --- Camera ---

    this.update_camera(caller);
    this.ocean.set_offset(this.last_cam_pos);

    // --- Shader Materials ---

    this.update_foam(caller)

    // --- Uniforms ---
    // This must be the first draw call

    this.prev_frame_material.set_output_framebuffer(caller, this.uniforms);
    this.apply_camera(caller);

    // this.sanity_check();

    // --- Draw the scene ---
    this.ship.show(caller, this.uniforms)

    this.skybox.show(caller, this.uniforms, this.cam_pos, this.render_distance);

    this.islands.show(caller, this.uniforms)

    if (this.preset == 'stormy')
      this.rainSystem.draw(caller, this.uniforms)

    this.chests.show(caller, this.uniforms)

    this.ocean.show(this.shapes, caller, {...this.uniforms, 
      prev_frame_material: this.prev_frame_material,
      inv_proj_mat: this.projection_transform_inv,
      ssr_enabled: this.ssr_enabled
    }, this.camera_direction_xz, this.foam_material.get_texture());

    this.shark_system.show(caller, this.uniforms)

    this.shapes.ball.draw( caller, this.uniforms, this.projection_transform_inv.times(Mat4.translation(0, 0, -0.5)).times(Mat4.scale(0.2, 0.2, 0.2)), 
    { shader: this.phong, ambient: .3, diffusivity: .8, specularity: .5, color: color(1,0,0,1) } )

    if(this.prev_frame_material.ready){
      // this.shapes.box.draw(caller, this.uniforms, Mat4.translation(0, 4, -5).times(Mat4.scale(2,2,2)), {shader: this.tex_phong, ambient: 1, diffusivity: 0, specularity:  0, color: color(1,1,1,1), texture: this.prev_frame_material.get_texture()})
      // this.shapes.box.draw(caller, this.uniforms, Mat4.translation(0, 4, 5).times(Mat4.scale(2,2,2)), {shader: this.tex_phong, ambient: 1, diffusivity: 0, specularity:  0, color: color(1,1,1,1), texture: this.prev_frame_material.get_depth_texture()})
    }
    
    // Draw this frame to the screen
    this.prev_frame_material.draw_scene(caller, this.uniforms);

    // --- UI ---
    this.draw_screen_ui(caller);
  }

  draw_screen_ui(caller)
  {
    const new_date_micro_sec = window.performance.now();
    this.score_text_obj.update_string(`Score: ${this.score} - FPS: ${Math.round(1000/(new_date_micro_sec - this.prev_date_micro_sec))}`)
    this.score_text_obj.draw(caller, this.uniforms, Mat4.translation(-0.95, .5, 0.1).times(Mat4.scale(.03, .03, .1)))
    this.prev_date_micro_sec = new_date_micro_sec;

    if(this.gameover && this.explosionTimer > 5.0)
    {
      const trans = Mat4.translation(0,0,0.1).times(Mat4.scale(2,2,2))
      this.shapes.quad.draw( caller, this.uniforms, trans, 
        { shader: this.phong, ambient: 1, diffusivity: 0, specularity: 0, color: color(1,0,0,.1)} )

      this.gameover_obj.update_string("Game Over - Refresh to Restart")
      this.gameover_obj.draw(caller, this.uniforms, Mat4.translation(-0.6,0,1).times(Mat4.scale(.03, .03, .03)))
    }
  
    
  }

  shipExplosion(ship){
    ship.explode();
    if(this.gameover == false){
      this.explosionTimer = 0;
      this.gameover = true;
      this.wind = vec3(0,.1,0);
    }
  }

  update_foam(caller)
  {
    const front_of_boat = this.ship.rb.getTransformationMatrix().times(vec4(0,-1,-0.5,1)).to3();
    const sample_point_for_boat = this.ocean.gersrnerWave.get_original_position_and_true_y(front_of_boat[0], front_of_boat[2], this.t);
    
    let intensity_from_boat = this.ship.rb.velocity.norm() / 8;
    if(front_of_boat[1] > sample_point_for_boat[1]){
      intensity_from_boat = -10;
    }

    if(this.gameover){
      intensity_from_boat = 0;
    }

    this.foam_material.update(caller, {... this.uniforms, offset: this.cam_pos, sample_boat: sample_point_for_boat, boat_foam_intensity: intensity_from_boat});

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

    if( isNaN( this.ship.rb.position[0] ) || isNaN( this.ship.rb.position[1] ) || isNaN( this.ship.rb.position[2] ) ){
      this.cam_pos = vec3(this.currentX, this.currentY, this.currentZ).plus(vec3(0,0,0));
      this.cam_Mat = Mat4.look_at(this.cam_pos, vec3(0,0,0), vec3(0, 1, 0));
    }

    this.cam_Mat_inv = Mat4.inverse(this.cam_Mat);

    this.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 0.1, this.render_distance).times(Mat4.rotation(Math.sin(40*this.explosionTimer)*.04*Math.exp(-this.explosionTimer), .2,1,.2));
    this.projection_transform_inv = Mat4.inverse(this.projection_transform);

    this.camera_direction_xz = vec3(this.ship.rb.position[0] - this.cam_pos[0], 0, this.ship.rb.position[2] - this.cam_pos[2]).normalized();
  }

  apply_camera(caller)
  {
    Shader.assign_camera(this.cam_Mat, this.uniforms);

    this.uniforms.projection_transform = this.projection_transform;

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
    const gl = caller.context;
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const aspect_ratio = gl.canvas.width / gl.canvas.height;

    const width = 1;
    const height = width / aspect_ratio;  

    const projection_transform = Mat4.orthographic(-1, 1, -height, height, -4, 4);
    const cam_Mat = Mat4.look_at(vec3(0, 0, 1), vec3(0, 0, 0), vec3(0, 1, 0));

    Shader.assign_camera(cam_Mat, this.uniforms);
    this.uniforms.projection_transform = projection_transform;

    const start_screen_transform = Mat4.identity();

    this.shapes.quad.draw( caller, this.uniforms, start_screen_transform, 
      { shader: this.tex_phong, ambient: 1, diffusivity: 1, specularity: 1, color: color(.5,1,.5,1), texture: this.start_screen_texture} )

    const start_text_transform = Mat4.identity().times(Mat4.translation(-0.125,-0.01,1)).times(Mat4.scale(.04, .04, .04));
    const start_weather_transform = Mat4.identity().times(Mat4.translation(-0.38,-0.36,1)).times(Mat4.scale(0.032, 0.032, 0.022))
    // const change_text_transform = Mat4.identity().times(Mat4.translation(0.36,-0.2,1)).times(Mat4.scale(0.025, 0.025, 0.025))

    // console.log('button matrix: ', start_text_transform)

    // this.start_obj.draw(caller, this.uniforms, start_text_transform)
    this.start_weather_obj.draw(caller, this.uniforms, start_weather_transform)
    // this.change_obj.draw(caller, this.uniforms, change_text_transform)

    const button_color = color( 0.2, 0.2, 0.2, 1 )
    this.materials = {}
    this.materials.plastic = { shader: this.phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }

    const start_button_transform = Mat4.identity().times(Mat4.translation(0,0,1)).times(Mat4.scale(0.365, 0.11, 0.04));
    const weather_button_transform = Mat4.identity().times(Mat4.translation(0,-0.35,1)).times(Mat4.scale(0.48,.08,.035));
    
    // comment out below two to comment out the black bounding box
    // this.button_obj.draw(caller, this.uniforms, start_button_transform, { ...this.materials.plastic, color:  button_color})
    // this.weather_button_obj.draw(caller, this.uniforms, weather_button_transform, { ...this.materials.plastic, color:  button_color})
    
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
    if(this.started)
    {
        this.started = false
        this.score = 0
    }
  }

  // handle_weather()
  // {
  //     if(!this.started)
  //     {
  //         let fog_param;
  //         this.preset = this.weather_states[++this.weather_index % 3]
  //         this.start_weather_obj.update_string(`Weather: ${this.preset}`)
  //         const foam_size_terrain = 60; // sizezX of the foam texture in world space in either direction
  //         let skybox_texture;

  //         switch(this.preset){
  //           case 'calm':
  //               this.light_color = color(1,0.91,0.62,1)
  //               fog_param = { color: color(1,1,1,1), start: this.render_distance-10, end: this.render_distance };
  //               break;
  //           case 'agitated':
  //               this.light_color = color(1,0.91,0.62,1)
  //               fog_param = { color: color(1,1,1,1), start: this.render_distance-10, end: this.render_distance };
  //               break;
  //           case 'stormy':
  //               this.light_color = color(1,0.91,0.62,1)
  //               fog_param = { color: color(.5,.5,.5,1), start: this.render_distance-20, end: this.render_distance };
  //               break;
  //           default:
  //               this.light_color = color(1,0.91,0.62,1)
  //         }
      
  //         this.phong = new defs.Phong_Shader(1, fog_param);
      
  //         switch(this.preset){
  //           case 'calm':
  //               skybox_texture = new Texture("assets/textures/sunny_sky.jpg");
  //               break;
  //           case 'agitated':
  //               skybox_texture = new Texture("assets/textures/sunny_sky.jpg");
  //               break;
  //           case 'stormy':
  //               skybox_texture = new Texture("assets/textures/stormy_sky.jpg");
  //               break;
  //           default:
  //               skybox_texture = new Texture("assets/textures/sunny_sky.jpg");
  //         }
      
  //         this.base_water_color = color(0.27,0.46,0.95,1 );
      
  //         if(this.preset == 'agitated'){
  //             const avg = (this.base_water_color[0] + this.base_water_color[1] + this.base_water_color[2]) / 3;
  //             const f = 0.2;
  //             this.base_water_color = this.base_water_color.plus((color(avg, avg, avg, 0).minus(this.base_water_color)).times(f));
  //             this.base_water_color[3] = 1;
  //         }
      
  //         if(this.preset == 'stormy'){
  //             const avg = (this.base_water_color[0] + this.base_water_color[1] + this.base_water_color[2]) / 3;
  //             const f = .6;
  //             this.base_water_color = this.base_water_color.plus((color(avg, avg, avg, 0).minus(this.base_water_color)).times(f));
  //             this.base_water_color[3] = 1;
      
  //         }
      
  //         this.skybox = new Skybox({default_color: fog_param.color, texture: skybox_texture, fog_param: fog_param});
      
  //         // this.ocean = new Ocean({
  //         //   ocean_color: this.base_water_color,
  //         //   initPos : vec3(0,0,0),
  //         //   density : 5,
  //         //   size : this.render_distance * 2,
  //         //   fog_param: fog_param,
  //         //   skybox: this.skybox,
  //         //   foam_size_terrain: foam_size_terrain,
  //         //   foam_color: color(0.9,0.98,1,1),
  //         //   preset: this.preset // 'calm', 'agitated', 'stormy'
  //         // });
  //     }
  //     // disable weather change while game is going on
  // }
  
  render_controls () {
    this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
    // this.key_triggered_button ("Start Game", [" "], () => {this.started = true});
    this.key_triggered_button ("Toggle Experimental Reflections", ["r"], () => this.ssr_enabled = !this.ssr_enabled);
    //this.key_triggered_button ("Pause Game", [" "], () => this.start = 0);
    this.new_line();
    this.key_triggered_button ("Mute/Unmute", ["m"], () => this.mute=!this.mute);
    // this.key_triggered_button ("Increase Score", ["i"], () => {
    //   this.chest.openChest()
    // });
    this.new_line();
    this.key_triggered_button ("Forward", ["w"], () => this.vertical_input = 1, undefined, () => this.vertical_input = 0);
    this.key_triggered_button ("Right", ["d"], () => this.horizontal_input = 1, undefined, () => this.horizontal_input = 0);
    this.new_line ();
    this.key_triggered_button ("Bottom", ["s"], () => this.vertical_input = -1, undefined, () => this.vertical_input = 0);
    this.key_triggered_button ("Left", ["a"], () => this.horizontal_input = -1, undefined, () => this.horizontal_input = 0);

    // this.new_line();
    // this.key_triggered_button ("Change Weather", ['ArrowRight'], () => this.handle_weather());

    const canvas = document.getElementsByTagName("canvas")[0];

    // setting up pointer lock for mouse control
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

    canvas.onclick = function(e){
        canvas.requestPointerLock();
    };

    function getButtonPos(translateX, translateY, scaleX, scaleY)
    {
      // console.log(translateX, translateY, scaleX, scaleY)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
  
          // Convert translation to canvas coordinates
          const translatedX = centerX + (translateX * canvas.width);
          const translatedY = centerY + (translateY * canvas.height);
  
          const halfSizeScaledX = (scaleX * canvas.width) / 2;
          const halfSizeScaledY = (scaleY * canvas.height) / 2;
  
          const squareBounds = {
              x: translatedX - halfSizeScaledX,
              y: translatedY - halfSizeScaledY,
              width: scaleX * canvas.width,
              height: scaleY * canvas.height
      };

      return squareBounds
    }

    // Function to check if a click is within the bounds of the square
    function isClickInsideSquare(clickX, clickY, obj, translateX, translateY, scaleX, scaleY) {

      const squareBounds = getButtonPos(translateX, translateY, scaleX, scaleY)

      return (
        // clickX >= squareBounds.x &&
        // clickX <= squareBounds.x + squareBounds.width &&
        // clickY >= squareBounds.y &&
        // clickY <= squareBounds.y + squareBounds.height
        clickX >= squareBounds.x - squareBounds.width &&
        clickX <= squareBounds.x + squareBounds.width &&
        clickY >= squareBounds.y - 0.5*squareBounds.height &&
        clickY <= squareBounds.y + squareBounds.height
      );
    }
    
    // Add click event listener to the canvas
    canvas.onclick = (event) => {
      // Calculate click position relative to the canvas
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;   // Relationship bitmap vs. element for X
      const scaleY = canvas.height / rect.height; // Relationship bitmap vs. element for Y

      const clickX = (event.clientX - rect.left) * scaleX; // Scale mouse coordinates after they have
      const clickY = (event.clientY - rect.top) * scaleY;  // been adjusted to be relative to element

      // console.log('click pos: ', clickX, clickY)

      // Check if the click was inside the square and react accordingly
      // translateX, translateY, scaleX, scaleY 0.27, 0.1, 0.345, 0.04
      if (isClickInsideSquare(clickX, clickY, this.button_obj, 0.09, 0.035, 0.18, 0.135)) {
        if(this.started) return;

        this.startGame(this.preset)
        
        // console.log('START');
        // this.started = true;
        canvas.requestPointerLock();
      }

      if (isClickInsideSquare(clickX, clickY, this.weather_button_obj, 0.12, 0.344, 0.24, 0.093)) {
        if(this.started) return;

        // console.log('hello weather');
        this.preset = this.weather_states[++this.weather_index % 3]
        this.start_weather_obj.update_string(`Weather: ${this.preset}`)
        console.log(this.preset)
      }
    }

    const changeCallback = () => {
        if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
            canvas.addEventListener("mousemove", (e) => {
              if(this.started)
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

