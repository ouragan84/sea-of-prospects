import { Cloth } from './Cloth.js';
import {tiny, defs} from './examples/common.js';
import {Shape_From_File}  from './examples/obj-file-demo.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;


// TODO: you should implement the required classes here or in another file.
// Ship Class
export
const Ship = defs.Ship =
class Ship {
  constructor() {  

    // default properties of the Ship
    this.mass = 1000

    // default physics of the Ship
    this.pos = vec3(0,0,0);
    this.vel = vec3(0,0,0);
    this.acc = vec3(0,0,0);

  }

  // change the force on the particle
  applyForce(f){
    // change the acceleration based on the modified force, since mass is constant
    this.acc = this.acc.plus(vec3(f[0]/this.mass, f[1]/this.mass, f[2]/this.mass))
  }
}

