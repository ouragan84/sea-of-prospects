import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const RigidBody = defs.RigidBody =
class RigidBody {
    constructor(mass=1, position = vec3(5, 1, 5), orientation = quaternionFromAngleAxis(0, vec3(0, 0, 1)), scale = vec3(1,1,1), momentOfInertia = 1, fog_param, def_mat) {
        this.position = position;
        this.orientation = orientation; 

        this.velocity = vec3(0, 0, 0); 
        this.angularVelocity = vec3(0, 0, 0);

        this.force = vec3(0, 0, 0);
        this.torque = vec3(0, 0, 0); 

        this.mass = mass
        this.momentOfInertia = momentOfInertia
        this.scale = scale
    
        this.shapes = {
            'box'  : new defs.Cube()
        }
        this.def_mat = { shader: new defs.Phong_Shader(1, fog_param), ambient: 1, diffusivity: 1, specularity: 1, color: color( .3,.3,.3,1 ) }
    }

    // apply a force at a point in world coordinates
    addForceAtPoint(force, point, torque_mult = 1) {
        this.force.add_by(force);
        const torque = point.minus(this.position).cross(force).times(torque_mult);
        this.torque.add_by(torque);
    }

    addForce(force) {
        this.force.add_by(force);
    }

    addTorque(torque) {
        this.torque.add_by(torque);
    }

    update(dt) {
      // console.log(`start position: ${this.position}`);

      // linear motion
      const acceleration = this.force.times(1 / this.mass);
      this.velocity.add_by(acceleration.times(dt));
      this.position.add_by(this.velocity.times(dt));

      // Update angular velocity
      const angularAcceleration = this.torque.times(1 / this.momentOfInertia);
      this.angularVelocity.add_by(angularAcceleration.times(dt));

      // Update orientation using quaternion
      let omega = vec4(0, this.angularVelocity[0], this.angularVelocity[1], this.angularVelocity[2]);
      let qDot = quaternionMultiply(this.orientation, omega).times(0.5);
      this.orientation = vec4(
          this.orientation[0] + qDot[0] * dt,
          this.orientation[1] + qDot[1] * dt,
          this.orientation[2] + qDot[2] * dt,
          this.orientation[3] + qDot[3] * dt
      );
      this.orientation = normalizeQuaternion(this.orientation);

      // Reset forces and torques
      this.force = vec3(0, 0, 0);
      this.torque = vec3(0, 0, 0);

      // console.log(`end position: ${this.position}`);
  }

  getTransformationMatrix() {
    // Convert quaternion to rotation matrix
    let rotationMatrix = quaternionToRotationMatrix(this.orientation);

    // Apply scale
    let scaleMatrix = Mat4.scale(this.scale[0], this.scale[1], this.scale[2]);
    let transformationMatrix = rotationMatrix.times(scaleMatrix);

    // Apply translation
    transformationMatrix = Mat4.translation(this.position[0], this.position[1], this.position[2]).times(transformationMatrix);

    return transformationMatrix;
  }  

    show(caller, uniforms) {
        this.shapes.box.draw( caller, uniforms, this.getTransformationMatrix(), this.def_mat );
    }

    checkCollissionWithGroundPlane(ks, kd) {
        // cheese
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

function normalizeColumns(mat) {
  // Iterate over each column
  for (let col = 0; col < mat[0].length; col++) {
    // Compute the norm of the column
    let norm = 0;
    for (let row = 0; row < mat.length; row++) {
      norm += mat[row][col] ** 2;
    }
    norm = Math.sqrt(norm);

    // Normalize each element in the column
    for (let row = 0; row < mat.length; row++) {
      mat[row][col] /= norm;
    }
  }
  return mat;
}

// Helper function to convert a quaternion to a rotation matrix
function quaternionToRotationMatrix(q) {
  let [w, x, y, z] = [q[0], q[1], q[2], q[3]];
  return new Mat4(
      [1 - 2 * (y * y + z * z),     2 * (x * y - z * w),     2 * (x * z + y * w), 0],
      [    2 * (x * y + z * w), 1 - 2 * (x * x + z * z),     2 * (y * z - x * w), 0],
      [    2 * (x * z - y * w),     2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
      [                      0,                       0,                       0, 1]
  );
}

export function quaternionToAngleAxis(quaternion) {
  let angle = 2 * Math.acos(quaternion[0]);
  let sinHalfTheta = Math.sqrt(1 - quaternion[0] * quaternion[0]);

  let axis;
  if (sinHalfTheta > 0.001) { // To avoid division by zero
      axis = vec3(quaternion[1] / sinHalfTheta, quaternion[2] / sinHalfTheta, quaternion[3] / sinHalfTheta);
  } else {
      // If the angle is 0, the axis does not matter. We can choose any unit vector.
      axis = vec3(1, 0, 0);
  }

  return { angle, axis };
}