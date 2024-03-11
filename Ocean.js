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
        this.size = config.size
        this.spacing = 1 / this.density;

        this.gersrnerWave = new GerstnerWave(config.preset);

        const points_across = this.size * this.density + 1;

        const ocean_shader = new Ocean_Shader(1, this.gersrnerWave, config.skybox, config.fog_param);

        this.materials = {};
        this.materials.ocean = { shader: ocean_shader, ambient: 0.4, diffusivity: 0.9, specularity: 0.4, smoothness: 10, color: config.ocean_color, skyTexture: config.skybox.texture};

        this.points = []
        this.floorPoints = []
        this.shapes = {};

        this.ocean_offset = vec3(0, 0, 0);

        // Set up Ocean
        const initial_corner_point = vec3( 0, 0, 0 );
        const row_operation = (s,p) => p ? Mat4.translation( 0,0,.2 ).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
        this.shapes.ocean =  new defs.Grid_Patch( points_across - 1, points_across - 1, row_operation, column_operation );

        // initialize points
        for (let i = 0; i < points_across; i+=1){
            for (let j = 0; j < points_across; j+=1){
                const pos = vec3(i * this.spacing - this.size / 2, 0, j * this.spacing - this.size / 2);
                this.points.push(new Point(pos));
            }
        }

        console.log(this.points.length);

        // initialize segments
        this.gridSize = points_across;

        this.shapes.ocean.arrays.position.forEach( (p,i,a) =>{
            a[i] = this.points[i].pos
        });

        this.showed_once = false;
    }

    apply_rb_offset(rigidBody){
        if(!rigidBody.position || isNaN(rigidBody.position[0]) || isNaN(rigidBody.position[2]))
            return;
        // let new_x = rigidBody.position[0] - (rigidBody.position[0] % this.spacing);
        // let new_z = rigidBody.position[2] - (rigidBody.position[2] % this.spacing);
        // this.ocean_offset = vec3(new_x, 0, new_z);

        this.ocean_offset = rigidBody.position;
        this.ocean_offset[1] = 0;

    }

    applyWaterForceOnRigidBody(rigidBody, t, dt, horizontal_input, vertical_input, wind, draw_debug_sphere, draw_debug_arrow, draw_debug_line){

        const boat_transform = rigidBody.getTransformationMatrix();

        const corner1_boat = boat_transform.times(vec4(-1, 1, 1, 1)).to3();
        const corner2_boat = boat_transform.times(vec4(1, 1, 1, 1)).to3();
        const corner3_boat = boat_transform.times(vec4(-1, 1, -1, 1)).to3();
        const corner4_boat = boat_transform.times(vec4(1, 1, -1, 1)).to3();

        const corner1_ocean = vec3(corner1_boat[0], this.gersrnerWave.solveForY(corner1_boat[0], corner1_boat[2], t), corner1_boat[2]);
        const corner2_ocean = vec3(corner2_boat[0], this.gersrnerWave.solveForY(corner2_boat[0], corner2_boat[2], t), corner2_boat[2]);
        const corner3_ocean = vec3(corner3_boat[0], this.gersrnerWave.solveForY(corner3_boat[0], corner3_boat[2], t), corner3_boat[2]);
        const corner4_ocean = vec3(corner4_boat[0], this.gersrnerWave.solveForY(corner4_boat[0], corner4_boat[2], t), corner4_boat[2]);

        const corner1_ocean_normal = this.gersrnerWave.gersrnerWaveNormal(corner1_ocean, t);
        const corner2_ocean_normal = this.gersrnerWave.gersrnerWaveNormal(corner2_ocean, t);
        const corner3_ocean_normal = this.gersrnerWave.gersrnerWaveNormal(corner3_ocean, t);
        const corner4_ocean_normal = this.gersrnerWave.gersrnerWaveNormal(corner4_ocean, t);

        let boat_forward = boat_transform.times(vec4(0, 0, -1, 0)).to3().normalized();
        // cancel out the y component
        boat_forward[1] = 0;
        boat_forward = boat_forward.normalized();

        const boat_normal = boat_transform.times(vec4(0, 1, 0, 0)).to3().normalized();
        // let ocean_normal = corner1_ocean_normal.plus(corner2_ocean_normal).plus(corner3_ocean_normal).plus(corner4_ocean_normal).normalized();

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        let corner1_percent_submerged = clamp(corner1_ocean.minus(corner1_boat).dot(vec3(0,1,0)) / (2 * rigidBody.scale[1]) + 1, 0, 1);
        let corner2_percent_submerged = clamp(corner2_ocean.minus(corner2_boat).dot(vec3(0,1,0)) / (2 * rigidBody.scale[1]) + 1, 0, 1);
        let corner3_percent_submerged = clamp(corner3_ocean.minus(corner3_boat).dot(vec3(0,1,0)) / (2 * rigidBody.scale[1]) + 1, 0, 1);
        let corner4_percent_submerged = clamp(corner4_ocean.minus(corner4_boat).dot(vec3(0,1,0)) / (2 * rigidBody.scale[1]) + 1, 0, 1);

        let percent_submerged = (corner1_percent_submerged + corner2_percent_submerged + corner3_percent_submerged + corner4_percent_submerged) / 4;

        // console.log(percent_submerged.toFixed(2), corner1_percent_submerged.toFixed(2), corner2_percent_submerged.toFixed(2), corner3_percent_submerged.toFixed(2), corner4_percent_submerged.toFixed(2));


        draw_debug_sphere(corner1_boat, 0.2, color(0,1,0,1));
        draw_debug_sphere(corner2_boat, 0.2, color(0,1,0,1));
        draw_debug_sphere(corner3_boat, 0.2, color(0,1,0,1));
        draw_debug_sphere(corner4_boat, 0.2, color(0,1,0,1));

        draw_debug_line(corner1_boat, corner1_boat.plus(vec3(0,-4,0)), .02, color(1,0,0,1));
        draw_debug_line(corner2_boat, corner2_boat.plus(vec3(0,-4,0)), .02, color(1,0,0,1));
        draw_debug_line(corner3_boat, corner3_boat.plus(vec3(0,-4,0)), .02, color(1,0,0,1));
        draw_debug_line(corner4_boat, corner4_boat.plus(vec3(0,-4,0)), .02, color(1,0,0,1));

        draw_debug_arrow(corner1_ocean, corner1_ocean_normal, 1.5, 1.5, color(1,0,0,1));
        draw_debug_arrow(corner2_ocean, corner2_ocean_normal, 1.5, 1.5, color(1,0,0,1));
        draw_debug_arrow(corner3_ocean, corner3_ocean_normal, 1.5, 1.5, color(1,0,0,1));
        draw_debug_arrow(corner4_ocean, corner4_ocean_normal, 1.5, 1.5, color(1,0,0,1));

        draw_debug_arrow(rigidBody.position.plus(vec3(0,3,0)), boat_forward, 1.5, 1.5, color(0,0,1,1));
        draw_debug_arrow(rigidBody.position.plus(vec3(0,3,0)), boat_normal, 1.5, 1.5, color(0,1,0,1));

        const mult_f = 20000;
        let mult_t = 2000;

        if (boat_forward.dot(vec3(0,0,-1)) < 0){
            mult_t = -mult_t;
        }

        const axis1 = boat_normal.cross(corner1_ocean_normal).normalized();
        draw_debug_arrow(corner1_boat, axis1, 1.5, 1.5, color(0,1,0,1));
        const angle1 = Math.acos(boat_normal.dot(corner1_ocean_normal));
        // console.log(angle1.toFixed(2) * 180 / Math.PI);
        if(Math.abs(angle1) > 0.01)
            rigidBody.addTorque(axis1.times( angle1 * mult_t * corner1_percent_submerged));
        rigidBody.addForce(vec3(0,1,0).times(mult_f * corner1_percent_submerged));

        const axis2 = boat_normal.cross(corner2_ocean_normal).normalized();
        // draw_debug_arrow(corner2_boat, axis2, 1.5, 1.5, color(0,1,0,1));
        const angle2 = Math.acos(boat_normal.dot(corner2_ocean_normal));
        if(Math.abs(angle2) > 0.01)
            rigidBody.addTorque(axis2.times( angle2 * mult_t * corner2_percent_submerged));
        rigidBody.addForce(vec3(0,1,0).times(mult_f * corner2_percent_submerged));

        const axis3 = boat_normal.cross(corner3_ocean_normal).normalized();
        // draw_debug_arrow(corner3_boat, axis3, 1.5, 1.5, color(0,1,0,1));
        const angle3 = Math.acos(boat_normal.dot(corner3_ocean_normal));
        if(Math.abs(angle3) > 0.01)
            rigidBody.addTorque(axis3.times( angle3 * mult_t * corner3_percent_submerged));
        rigidBody.addForce(vec3(0,1,0).times(mult_f * corner3_percent_submerged));

        const axis4 = boat_normal.cross(corner4_ocean_normal).normalized();
        // draw_debug_arrow(corner4_boat, axis4, 1.5, 1.5, color(0,1,0,1));
        const angle4 = Math.acos(boat_normal.dot(corner4_ocean_normal));
        if(Math.abs(angle4) > 0.01)
            rigidBody.addTorque(axis4.times( angle4 * mult_t * corner4_percent_submerged));
        rigidBody.addForce(vec3(0,1,0).times(mult_f * corner4_percent_submerged));

        const restore = 10000;
        const res_start_angle = Math.PI/6;
        if( Math.abs(boat_normal.normalized().dot(vec3(0,1,0))) < Math.cos(res_start_angle)){
            const axis_res = boat_normal.cross(vec3(0,1,0)).normalized();
            const angle_res = Math.acos(boat_normal.dot(vec3(0,1,0)));
            rigidBody.addTorque(axis_res.times(angle_res * restore));
        }
        
        // gravity
        const gravity = 9.8;
        rigidBody.addForce(vec3(0, -gravity * rigidBody.mass, 0));

        // Vertical Input
        const coef_force_applied = 10000;
        rigidBody.addForce(boat_forward.times(coef_force_applied * vertical_input));

        // Horizontal Input
        const coef_torque_applied = 2000;
        rigidBody.addTorque(vec3(0,1,0).times( - coef_torque_applied * horizontal_input));

        // damping
        this.applyLinearDamping(rigidBody, percent_submerged);
        this.applyAngularDamping(rigidBody, percent_submerged);
    }

    applyLinearDamping(rigidBody, percent_submerged){
        const drag_coef_v = 1.1;
        const friction_coef_v = 1.5;
        const drag_coef_h = .5;
        const friction_coef_h = .9;
        const air_drag_coef = .2;
        const air_friction_coef = .1;
        
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
    }

    applyAngularDamping(rigidBody, percent_submerged){
        const angular_drag_coef = 1200;
        const angular_friction_coef = 100;
        const air_angular_drag_coef = 100;
        const air_angular_friction_coef = 5;

        if(percent_submerged > 0){
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
    }


    point_to_coord(i, gridSize){
        return [i % gridSize, Math.floor(i / gridSize)]
    }

    coord_to_point(x, y, gridSize){
        return x + y * gridSize
    }

    show(shapes, caller, uniforms, camera_direction) {



        // rotate the ocean to rotate the ocean by the amount of degrees (only rotate about y axis) from <1,0,1> to the camera direction
        const angle =  Math.atan2(camera_direction[0], camera_direction[2]) % (2 * Math.PI);
        const rotation = Mat4.rotation(angle - Math.PI / 4, 0, 1, 0);

        const transform = Mat4.translation(this.ocean_offset[0], 0, this.ocean_offset[2]).times(rotation);

        // console.log( `CamDir = <${camera_direction[0].toFixed(2)}, ${camera_direction[2].toFixed(2)}>, Angle = ${angle.toFixed(2) * 180 / Math.PI}` );

        this.shapes.ocean.draw( caller, {...uniforms, offset: this.ocean_offset, angle_offset: angle}, transform, this.materials.ocean);


        // this.shapes.ocean.draw( caller, {...uniforms, offset: this.ocean_offset}, Mat4.identity(), this.materials.ocean);
    }
}
