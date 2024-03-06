import {tiny, defs} from './examples/common.js';
const { vec3, vec4, color, Mat4} = tiny;
import { GerstnerWave } from './GerstnerWave.js';
import { Ocean_Shader } from './Ocean_Shader.js';

class Point{
    constructor(pos){
        this.originalPos = pos.copy()
        this.pos = pos
        this.prevPos = pos.copy()
        this.locked = false;
        this.r = 0.1;
    }
}        

export
const Ocean = defs.Part_one_hermite_base =
class Ocean {

    constructor(config) {
        this.pos = config.initPos;
        this.density = config.density
        this.spacing = config.size / this.density;
        this.gersrnerWave = new GerstnerWave();

        const ocean_shader = new Ocean_Shader(1, this.gersrnerWave.get_glsl_strings(), config.fog_param);

        this.materials = {};
        this.materials.ocean = { shader: ocean_shader, ambient: 0.3, diffusivity: .3, specularity: .9, color: color( .35,.8,.95,1 ) }

        this.points = []
        this.floorPoints = []
        this.shapes = {};

        this.ocean_offset = vec3(0, 0, 0);

        // Set up Ocean
        const initial_corner_point = vec3( 0, 0, 0 );
        const row_operation = (s,p) => p ? Mat4.translation( 0,0,.2 ).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
        this.shapes.ocean =  new defs.Grid_Patch( config.density, config.density, row_operation, column_operation );

        // initialize points
        for (let i = -config.size/2; i <= config.size/2; i+=this.spacing){
            for (let j = -config.size/2; j <= config.size/2; j += this.spacing){
                this.points.push(new Point(vec3(i,0,j).plus(this.pos)))
            }
        }

        // initialize segments
        this.gridSize = Math.sqrt(this.points.length); // Calculate the grid size

        this.shapes.ocean.arrays.position.forEach( (p,i,a) =>{
            a[i] = this.points[i].pos
        });
    }

    apply_rb_offset(rigidBody){
        if(!rigidBody.position || isNaN(rigidBody.position[0]) || isNaN(rigidBody.position[2]))
            return;
        let new_x = rigidBody.position[0] - (rigidBody.position[0] % this.spacing);
        let new_z = rigidBody.position[2] - (rigidBody.position[2] % this.spacing);
        this.ocean_offset = vec3(new_x, 0, new_z);

    }

    applyWaterForceOnRigidBody(rigidBody, t, dt, horizontal_input, vertical_input, wind){

        // const transform = Mat4.translation(rigidBody.pos[0], rigidBody.pos[1], rigidBody.pos[2]).times(Mat4.scale(rigidBody.scale[0],rigidBody.scale[1],rigidBody.scale[2])).times(Mat4.rotation(rigidBody.orientation[0], rigidBody.orientation[1], rigidBody.orientation[2], rigidBody.orientation[3]));
        const corner1_boat = rigidBody.getTransformationMatrix().times(vec4(-1, 1, 1, 1)).to3();
        const corner2_boat = rigidBody.getTransformationMatrix().times(vec4(1, 1, 1, 1)).to3();
        const corner3_boat = rigidBody.getTransformationMatrix().times(vec4(0, 1, -1, 1)).to3();

        const corner1_ocean = vec3(corner1_boat[0], this.gersrnerWave.solveForY(corner1_boat[0], corner1_boat[2], t), corner1_boat[2]);
        const corner2_ocean = vec3(corner2_boat[0], this.gersrnerWave.solveForY(corner2_boat[0], corner2_boat[2], t), corner2_boat[2]);
        const corner3_ocean = vec3(corner3_boat[0], this.gersrnerWave.solveForY(corner3_boat[0], corner3_boat[2], t), corner3_boat[2]);

        const boat_normal = corner3_boat.minus(corner2_boat).cross(corner1_boat.minus(corner2_boat)).normalized();
        let ocean_normal = corner3_ocean.minus(corner2_ocean).cross(corner1_ocean.minus(corner2_ocean)).normalized();

        let corner1_percent_submerged = (corner1_ocean[1] - corner1_boat[1]) / (2 * rigidBody.scale[1]) + 1;
        if (corner1_percent_submerged < 0) corner1_percent_submerged = 0;
        if (corner1_percent_submerged > 1) corner1_percent_submerged = 1;

        let corner2_percent_submerged = (corner2_ocean[1] - corner2_boat[1]) / (2 * rigidBody.scale[1]) + 1;
        if (corner2_percent_submerged < 0) corner2_percent_submerged = 0;
        if (corner2_percent_submerged > 1) corner2_percent_submerged = 1;

        let corner3_percent_submerged = (corner3_ocean[1] - corner3_boat[1]) / (2 * rigidBody.scale[1]) + 1;
        if (corner3_percent_submerged < 0) corner3_percent_submerged = 0;
        if (corner3_percent_submerged > 1) corner3_percent_submerged = 1;

        let percent_submerged = (corner1_percent_submerged + corner2_percent_submerged + corner3_percent_submerged) / 3;

        if (percent_submerged > 0.99)
            ocean_normal = vec3(0, 1, 0);

        let angle = Math.acos(boat_normal.dot(ocean_normal));
        if (isNaN(angle))
            angle = 0;

        const gravity = 9.8;
        const boyancy_factor = 5;
        const drag_coef_v = 1.1;
        const friction_coef_v = 1.5;
        const drag_coef_h = .5;
        const friction_coef_h = .9;
        const air_drag_coef = .2;
        const air_friction_coef = .1;
        const torque_coef = 8000;
        const angular_drag_coef = 1200;
        const angular_friction_coef = 10;
        const air_angular_drag_coef = 100;
        const air_angular_friction_coef = 5;
        const coef_force_applied = 6000;
        const coef_torque_applied = 700;
        const max_ang_speed = 10;

        rigidBody.addForce(vec3(0, -gravity * rigidBody.mass, 0));

        const boyancy_force = ocean_normal.times(boyancy_factor * gravity * rigidBody.mass * percent_submerged);
        rigidBody.addForce(boyancy_force);

        

        if(percent_submerged > 0){
            // Apply drag force
            rigidBody.addForce(vec3(
                - rigidBody.velocity[0] * drag_coef_h, 
                - rigidBody.velocity[1] * drag_coef_v, 
                - rigidBody.velocity[2] * drag_coef_h
            ).times(rigidBody.mass));

            // Apply friction force
            if( rigidBody.velocity.norm() > 0){
                rigidBody.addForce(vec3(
                    - Math.sign(rigidBody.velocity[0]) * friction_coef_h, 
                    - Math.sign(rigidBody.velocity[1]) * friction_coef_v, 
                    - Math.sign(rigidBody.velocity[2]) * friction_coef_h
                ).times(rigidBody.mass));
            }
        } else {
            // Apply air drag force
            rigidBody.addForce( rigidBody.velocity.times(-air_drag_coef).times(rigidBody.mass));

            // Apply air friction force
            if( rigidBody.velocity.norm() > 0)
                rigidBody.addForce(rigidBody.velocity.normalized().times(-air_friction_coef).times(rigidBody.mass));
        }

        // Apply vertcal force in the forward direction of the boat (rigidbody.orentation is a quaternion)
        const forward = rigidBody.getTransformationMatrix().times(vec4(0, 0, -1, 0)).to3().normalized();

        const vertical_force = forward.times(vertical_input * coef_force_applied);
        rigidBody.addForce(vertical_force);

        // Apply torque to make the boat align with the ocean normal

        const clamp = (num, min, max) =>  (num <= min ? min : num >= max ? max : num);

        const torque_towards_up = boat_normal.cross(vec3(0, 1, 0)).times( angle * 4000);
        rigidBody.addTorque(torque_towards_up);

        if(percent_submerged > 0){
            const torque_towards_ocean_normal = boat_normal.cross(ocean_normal).times( angle * 5000);
            rigidBody.addTorque(torque_towards_ocean_normal);

            // Apply torque for horizontal input
            const horizontal_torque = vec3(0, - horizontal_input * coef_torque_applied, 0);
            rigidBody.addTorque(horizontal_torque);

            // Apply angular drag
            const angular_drag = rigidBody.angularVelocity.times(-angular_drag_coef);
            rigidBody.addTorque(angular_drag);

            // Apply angular friction
            if(rigidBody.angularVelocity.norm() > 0){
                const angular_friction = rigidBody.angularVelocity.normalized().times(-angular_friction_coef);
                rigidBody.addTorque(angular_friction);
            }
        } else {
            // Apply air drag
            const air_angular_drag = rigidBody.angularVelocity.times(-air_angular_drag_coef);
            rigidBody.addTorque(air_angular_drag);

            // Apply air friction
            if(rigidBody.angularVelocity.norm() > 0){
                const air_angular_friction = rigidBody.angularVelocity.normalized().times(-air_angular_friction_coef);
                rigidBody.addTorque(air_angular_friction);
            }
        }


        // limit the angular velocity to max_ang_speed
        if(rigidBody.angularVelocity.norm() > max_ang_speed){
            rigidBody.angularVelocity = rigidBody.angularVelocity.normalized().times(max_ang_speed);
        }
    }

    point_to_coord(i, gridSize){
        return [i % gridSize, Math.floor(i / gridSize)]
    }

    coord_to_point(x, y, gridSize){
        return x + y * gridSize
    }

    show(shapes, caller, uniforms) {
        this.shapes.ocean.draw( caller, {...uniforms, offset: this.ocean_offset}, Mat4.identity(), this.materials.ocean);
    }
}
