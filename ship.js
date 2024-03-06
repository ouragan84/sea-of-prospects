import { Cloth } from './Cloth.js';
import {tiny, defs} from './examples/common.js';
import {Shape_From_File}  from './examples/obj-file-demo.js';
import { quaternionFromAngleAxis, RigidBody } from './RigidBody.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const gravity = 9.8

export
const Ship = defs.Ship =
class Ship {
  constructor(fog_param) {  
    this.shapes = {
      'box'  : new defs.Cube(),
      'ball' : new defs.Subdivision_Sphere( 4 ),
      'ship': new Shape_From_File( "assets/ship.obj" ),
    }

    const init_pos = vec3(0, 5, 0);

    const tex_phong = new defs.Textured_Phong(1, fog_param);
    const phong = new defs.Phong_Shader(1, fog_param);
    this.materials = {};
    this.materials.flag_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/skull.png"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
    this.materials.cloth_tex = { shader: tex_phong, ambient: .3, texture: new Texture("assets/cloth.jpg"),  diffusivity: 0.6, specularity: 0.5, color: color( 1, 1, 1 ,1 )}
    this.materials.wood = { shader: tex_phong, ambient: .3, texture: new Texture("assets/wood.jpg"),  diffusivity: 0.7, specularity: 0.3, color: color( 1, 1, 1 ,1 )}
    this.materials.plastic = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( 1,.1,.1,1 )}

    const get_corners = (side_length) => [0, side_length-1, side_length**2-side_length, side_length**2-1];
    const get_edge = (side_length) => Array.from({length: side_length}, (_, i) => i);

    const sailConfig = {
      initPos : vec3(0,4,0).plus(init_pos),
      density : 10,
      size : 4,
      lockedPoints: get_corners(11),
      material: this.materials.cloth_tex
    }
    const sailConfig2 = {
      initPos : vec3(0,3.25,2.75).plus(init_pos),
      density : 10,
      size : 2,
      lockedPoints: get_corners(11),
      material: this.materials.cloth_tex
    }
    const flagConfig = {
      initPos : vec3(1,8,-.2).plus(init_pos),
      density : 10,
      size : 2,
      lockedPoints: get_edge(11),
      material: this.materials.flag_tex
    }

    this.sail = new Cloth(sailConfig)
    this.sail2 = new Cloth(sailConfig2)
    this.flag = new Cloth(flagConfig)

    this.boatscale = vec3(2.3,2.3,2.3)
    this.boatoffset = vec3(0,.6,.2)

    this.rb = new RigidBody(2000, init_pos, quaternionFromAngleAxis(0, vec3(0, 0, 1)), vec3(1.7,1.2,4), 100, fog_param);
    // this.rb = new RigidBody(2000, init_pos, Mat4.identity(), vec3(1.7,2,4), 100);


    this.offsetMat = Mat4.translation(this.boatoffset[0], this.boatoffset[1], this.boatoffset[2])
    .times(Mat4.scale(this.boatscale[0]/this.rb.scale[0], this.boatscale[1]/this.rb.scale[1], this.boatscale[2]/this.rb.scale[2]))
  }

  update(t, dt, wind){
    this.sail.simulate(t, dt, wind)
    this.flag.simulate(t, dt, wind)
    this.sail2.simulate(t, dt, wind)

    // this.rb.applyForce(vec3(0,-gravity * this.rb.mass, 0)) 
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
    this.shapes.ship.draw( caller, uniforms, this.rb.getTransformationMatrix().times(this.offsetMat), this.materials.wood );

    // draw rigid body
    // this.shapes.box.draw( caller, uniforms, this.rb.getTransformationMatrix(), this.materials.plastic );
  }

  computeSail1anchors(){
    let p1_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(.8,0.28,-0.25))
    let p2_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(-.8,0.28,-0.25))
    let p3_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(.8,1.92,-0.25))
    let p4_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(-.8,1.92,-0.25))
    let p1 = vec3(p1_t[0][3], p1_t[1][3], p1_t[2][3])
    let p2 = vec3(p2_t[0][3], p2_t[1][3], p2_t[2][3])
    let p3 = vec3(p3_t[0][3], p3_t[1][3], p3_t[2][3])
    let p4 = vec3(p4_t[0][3], p4_t[1][3], p4_t[2][3])
    return [p1, p2, p3, p4]
  }

  computeSail2anchors(){
    let p1_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(.42,.34,0.97))
    let p2_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(-.42,.34,0.97))
    let p3_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(.42,1.16,0.97))
    let p4_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(-.42,1.16,0.97))
    let p1 = vec3(p1_t[0][3], p1_t[1][3], p1_t[2][3])
    let p2 = vec3(p2_t[0][3], p2_t[1][3], p2_t[2][3])
    let p3 = vec3(p3_t[0][3], p3_t[1][3], p3_t[2][3])
    let p4 = vec3(p4_t[0][3], p4_t[1][3], p4_t[2][3])
    return [p1, p2, p3, p4]
  }

  computeFlagAnchors(){
    let positions = []
    for(let i = 0; i < 11; i++){
      let temp_t = this.rb.getTransformationMatrix().times(this.offsetMat).times(Mat4.translation(0,2.25+i*.1,-.3))
      positions.push(vec3(temp_t[0][3], temp_t[1][3], temp_t[2][3]))
    }
    return positions
  }

}

