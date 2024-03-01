import { Cloth } from './Cloth.js';
import {tiny, defs} from './examples/common.js';
import {Shape_From_File}  from './examples/obj-file-demo.js';
import { RigidBody } from './RigidBody.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const gravity = 9.8

export
const Ship = defs.Ship =
class Ship {
  constructor() {  
    this.shapes = {
      'box'  : new defs.Cube(),
      'ball' : new defs.Subdivision_Sphere( 4 ),
      'ship': new Shape_From_File( "assets/ship.obj" ),
    }

    const tex_phong = new defs.Textured_Phong(1);
    const phong = new defs.Phong_Shader(1);
    this.materials = {};
    this.materials.flag_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/skull.png"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
    this.materials.cloth_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/cloth.jpg"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
    this.materials.wood = { shader: tex_phong, ambient: .3, texture: new Texture("assets/wood.jpg"),  diffusivity: 0.7, specularity: 0.3, color: color( 1, 1, 1 ,1 )}
    this.materials.plastic = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( 1,.1,.1,1 )}

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

    this.rb = new RigidBody(vec3(0, 2, 0), vec3(0, 0, 0), 2000, vec3(2.3,2.3,2.3), vec4(0, 0, 1, 0), 100);


  }

  update(t, dt){
    this.sail.simulate(t, dt)
    this.flag.simulate(t, dt)
    this.sail2.simulate(t, dt)

    this.rb.applyForce(vec3(0,-gravity * this.rb.mass, 0)) 
    this.rb.update(dt)
    // this.rb.checkCollissionWithGroundPlane(1000,25)
  }

  show(caller, uniforms) {
    // this.rb.show(caller, uniforms)
    this.sail.updatePosition(this.computeSail1anchors())
    this.sail.show(this.shapes, caller, uniforms);

    this.sail2.updatePosition(this.computeSail2anchors())
    this.sail2.show(this.shapes, caller, uniforms)

    this.flag.updatePosition(this.computeFlagAnchors())
    this.flag.show(this.shapes, caller, uniforms);
    // this.shapes.ship.draw( caller, uniforms, Mat4.translation(0, 1.5, .5).times(Mat4.scale(2.3,2.3,2.3)), this.materials.wood );
    this.shapes.ship.draw( caller, uniforms, this.rb.transform, this.materials.wood );
  }

  computeSail1anchors(){
    let p1_t = this.rb.transform.times(Mat4.translation(.8,0.28,-0.25))
    let p2_t = this.rb.transform.times(Mat4.translation(-.8,0.28,-0.25))
    let p3_t = this.rb.transform.times(Mat4.translation(.8,1.92,-0.25))
    let p4_t = this.rb.transform.times(Mat4.translation(-.8,1.92,-0.25))
    let p1 = vec3(p1_t[0][3], p1_t[1][3], p1_t[2][3])
    let p2 = vec3(p2_t[0][3], p2_t[1][3], p2_t[2][3])
    let p3 = vec3(p3_t[0][3], p3_t[1][3], p3_t[2][3])
    let p4 = vec3(p4_t[0][3], p4_t[1][3], p4_t[2][3])
    return [p1, p2, p3, p4]
  }

  computeSail2anchors(){
    let p1_t = this.rb.transform.times(Mat4.translation(.42,.34,0.97))
    let p2_t = this.rb.transform.times(Mat4.translation(-.42,.34,0.97))
    let p3_t = this.rb.transform.times(Mat4.translation(.42,1.16,0.97))
    let p4_t = this.rb.transform.times(Mat4.translation(-.42,1.16,0.97))
    let p1 = vec3(p1_t[0][3], p1_t[1][3], p1_t[2][3])
    let p2 = vec3(p2_t[0][3], p2_t[1][3], p2_t[2][3])
    let p3 = vec3(p3_t[0][3], p3_t[1][3], p3_t[2][3])
    let p4 = vec3(p4_t[0][3], p4_t[1][3], p4_t[2][3])
    return [p1, p2, p3, p4]
  }

  computeFlagAnchors(){
    let positions = []
    for(let i = 0; i < 11; i++){
      let temp_t = this.rb.transform.times(Mat4.translation(0,3.25-i*.1,-.3))
      positions.push(vec3(temp_t[0][3], temp_t[1][3], temp_t[2][3]))
    }
    return positions
  }

}

