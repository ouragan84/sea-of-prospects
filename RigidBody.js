import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const RigidBody = defs.RigidBody =
class RigidBody {
    constructor(initalPos, initialVelocity, mass, scale, orientation) {
        this.pos = initalPos || vec3(0,0,0)
        this.vel = initialVelocity || vec3(0,0,0)
        this.acc = vec3(0,0,0)
        this.scale = scale || vec3(1,1,1)

        this.angularDragPercent = 0.95 // closer this is to 1, less energy lost to drag

        this.angularVel = vec3(0, 0, 0); // Angular velocity in radians per second
        this.angularAcc = vec3(0, 0, 0); // Angular acceleration
        this.orientation = orientation || vec4(0, 0, 1, 0); // position equivalent of rotation

        this.mass = mass || 1
        this.transform = Mat4.translation(this.pos[0], this.pos[1], this.pos[2]).times(Mat4.scale(this.scale[0], this.scale[1], this.scale[2])).times(Mat4.rotation(this.orientation[0], this.orientation[1], this.orientation[2], this.orientation[3] ));
        this.shapes = {
            'box'  : new defs.Cube()
        }
        this.def_mat = { shader: new defs.Phong_Shader(1), ambient: .3, diffusivity: 1, specularity: .5, color: color( .9,.1,.1,1 ) }
    }

    applyForce(f) {
        this.acc = this.acc.plus(vec3(f[0] / this.mass, f[1] / this.mass, f[2] / this.mass))
    }

    applyTorque(torque) {
        let momentOfInertia = 5;
        this.angularAcc = this.angularAcc.plus(vec3(torque[0] / momentOfInertia, torque[1] / momentOfInertia, torque[2] / momentOfInertia));
    }
    
    applyForceAtPosition(force, position) {
        // apply linear force
        this.applyForce(force);
    
        // calc the vector from the center of mass to the point of force application
        // the center of mass is at this.pos for simplicity
        let r = position.minus(this.pos);
    
        // Calculate the torque: torque = r x F
        let torque = r.cross(force);
    
        this.applyTorque(torque);
    }

    update(dt) {
        this.vel = this.vel.plus(this.acc.times(dt));
        this.pos = this.pos.plus(this.vel.times(dt));

        // Angular motion updates
        this.angularVel = this.angularVel.plus(this.angularAcc.times(dt));
        
        let axis = this.angularVel.normalized(); // The axis to rotate around
        if (isNaN(axis[0]) && isNaN(axis[1]) && isNaN(axis[2])) axis = vec3(0,1,0)
        this.orientation = vec4(this.orientation[0] + this.angularVel.norm() * dt, axis[0], axis[1], axis[2])
        this.transform = Mat4.identity().times(Mat4.translation(this.pos[0], this.pos[1], this.pos[2])).times(Mat4.scale(this.scale[0],this.scale[1],this.scale[2]));
        this.transform = this.transform.times(Mat4.rotation(this.orientation[0], this.orientation[1], this.orientation[2], this.orientation[3]));

        this.angularVel = this.angularVel.times(this.angularDragPercent)

        this.acc = vec3(0, 0, 0);
        this.angularAcc = vec3(0, 0, 0);
    }

    show(caller, uniforms) {
        this.shapes.box.draw( caller, uniforms, this.transform, this.def_mat );
    }

    checkCollissionWithGroundPlane(ks, kd) {
        if (this.pos[1] - 1 <= 0) {
            let penetrationDepth = Math.min(1 - this.pos[1], 0.2);
            let springForce = ks * penetrationDepth; // F = kx
            let dampingForce = kd * (-this.vel[1]); // F = -kv
            let groundForce = springForce + dampingForce;
            this.applyForce(vec3(0,groundForce, 0));
        }
    }

}