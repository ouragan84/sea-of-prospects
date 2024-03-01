import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const RigidBody = defs.RigidBody =
class RigidBody {
    constructor(initalPos, initialVelocity, mass, scale, orientation, momentOfInertia) {
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

        this.momentOfInertia = momentOfInertia;
        // console.log(this.momentOfInertia)
    }

    applyForce(f) {
        this.acc = this.acc.plus(vec3(f[0] / this.mass, f[1] / this.mass, f[2] / this.mass))
    }

    applyTorque(torque) {
        // let momentOfInertia = 5;
        // let momentOfInertia = 10;
        this.angularAcc = this.angularAcc.plus(torque.times(1 / this.momentOfInertia));
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
    
        // Update orientation quaternion based on angular velocity
        if (this.angularVel.norm() > 0) {
            // Convert angular velocity to a quaternion
            let angle = this.angularVel.norm() * dt;
            let axis = this.angularVel.normalized();
            let deltaOrientation = quaternionFromAngleAxis(angle, axis);
    
            // Multiply current orientation quaternion by deltaOrientation
            this.orientation = quaternionMultiply(this.orientation, deltaOrientation);
    
            // Normalize the orientation quaternion to avoid scaling effects
            this.orientation = normalizeQuaternion(this.orientation);
        }
    
        this.transform = Mat4.translation(this.pos[0], this.pos[1], this.pos[2]).times(Mat4.rotation(this.orientation[0], this.orientation[1], this.orientation[2], this.orientation[3])).times(Mat4.scale(this.scale[0],this.scale[1],this.scale[2]))
    
        this.angularVel = this.angularVel.times(this.angularDragPercent);
    
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

export function isPointInsideRigidBody(point, rigidBody) {
    // Step 1: Translate the point into the rigid body's local coordinate system
    let localPoint = point.minus(rigidBody.pos);
    
    // Step 2: Rotate the point by the inverse of the rigid body's orientation
    // Calculate the inverse of the orientation quaternion
    let angle = rigidBody.orientation[0];
    let axis = vec3(rigidBody.orientation[1], rigidBody.orientation[2], rigidBody.orientation[3]);
    let invOrientation = quaternionFromAngleAxis(-angle, axis); // Assuming you have this function
    
    // Apply the inverse rotation to the point
    localPoint = rotateVectorByQuaternion(localPoint, invOrientation); // Assuming you have this function
    
    // Step 3: Check if the localPoint is within the bounds defined by the scale
    let halfScale = rigidBody.scale.times(0.5);
    return Math.abs(localPoint[0]) <= halfScale[0] &&
           Math.abs(localPoint[1]) <= halfScale[1] &&
           Math.abs(localPoint[2]) <= halfScale[2];
  }
  
  // Helper function to create a quaternion from an angle and an axis
  export function quaternionFromAngleAxis(angle, axis) {
    let halfAngle = angle * 0.5;
    let s = Math.sin(halfAngle);
    return vec4(Math.cos(halfAngle), axis[0] * s, axis[1] * s, axis[2] * s);
  }
  
  // Helper function to rotate a vector by a quaternion
  function rotateVectorByQuaternion(vector, quaternion) {
    // Convert the vector into a quaternion with a w-value of 0
    let vQuat = vec4(0, vector[0], vector[1], vector[2]);
    
    // Calculate the conjugate of the quaternion
    let qConj = vec4(quaternion[0], -quaternion[1], -quaternion[2], -quaternion[3]);
    
    // Rotate the vector quaternion: q * v * q^-1
    let rotatedQuat = quaternionMultiply(quaternionMultiply(quaternion, vQuat), qConj);
    
    // Return the rotated vector, ignoring the w component
    return vec3(rotatedQuat[1], rotatedQuat[2], rotatedQuat[3]);
  }
  
  // Helper function to multiply two quaternions
  export function quaternionMultiply(q1, q2) {
    return vec4(
        q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] - q1[3] * q2[3],
        q1[0] * q2[1] + q1[1] * q2[0] + q1[2] * q2[3] - q1[3] * q2[2],
        q1[0] * q2[2] - q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1],
        q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0]
    );
  }

  function normalizeQuaternion(quaternion) {
    let norm = Math.sqrt(quaternion[0] * quaternion[0] + quaternion[1] * quaternion[1] + quaternion[2] * quaternion[2] + quaternion[3] * quaternion[3]);
    return vec4(quaternion[0] / norm, quaternion[1] / norm, quaternion[2] / norm, quaternion[3] / norm);
  }