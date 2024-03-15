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

        const ocean_shader = new Ocean_Shader(1, this.gersrnerWave, config.skybox, config.fog_param, config.foam_size_terrain);

        this.materials = {};
        this.materials.ocean = {
            shader: ocean_shader, ambient: 0.4, diffusivity: 0.6, specularity: 0.5, 
            smoothness: 10, sky_reflect: 0.7, color: config.ocean_color, 
            skyTexture: config.skybox.texture, foamColor: config.foam_color
        };

        this.showed_once = false;

        console.log(this.gersrnerWave.get_original_position_and_true_y(0, 0, 0))
    }

    set_offset(pos){
        this.ocean_offset = vec3(pos[0], 0, pos[2]);
    }

    applyWaterForceOnRigidBody(rigidBody, t, dt, horizontal_input, vertical_input, wind, draw_debug_sphere, draw_debug_arrow, draw_debug_line){

        const boat_transform = rigidBody.getTransformationMatrix();

        // get the corners of the boat (top of the boat)
        let boat_corners = []
        boat_corners.push(boat_transform.times(vec4(-1, 1, 1, 1)).to3());
        boat_corners.push(boat_transform.times(vec4(1, 1, 1, 1)).to3());
        boat_corners.push(boat_transform.times(vec4(-1, 1, -1, 1)).to3());
        boat_corners.push(boat_transform.times(vec4(1, 1, -1, 1)).to3());
        boat_corners.push(boat_transform.times(vec4(-1, 1, 0, 1)).to3());
        boat_corners.push(boat_transform.times(vec4(1, 1, 0, 1)).to3());

        // console.log(`rigidBody.position = ${rigidBody.position}`);


        // origin_sample_points contains the x,z where the sample would have came from, and the solved y value of the ocean
        let origin_sample_points = []
        boat_corners.forEach( corner => {
            origin_sample_points.push(this.gersrnerWave.get_original_position_and_true_y(corner[0], corner[2], t));
        });

        // ocean_corners contains the x,y,z of the ocean at the same x,z as the boat
        let ocean_corners = []
        for (let i = 0; i < boat_corners.length; i++){
            ocean_corners.push(vec3(boat_corners[i][0], origin_sample_points[i][1], boat_corners[i][2]));
        }

        // ocean_normals_corners contains the normal of the ocean at the same x,z as the boat
        let ocean_normal_corners = []
        origin_sample_points.forEach( point => {
            ocean_normal_corners.push(this.gersrnerWave.get_normal(vec3(point[0], point[1], point[2]), t, 10));
        });

        // get forward (horizonally only) and normal of the boat
        const boat_normal = boat_transform.times(vec4(0, 1, 0, 0)).to3().normalized();
        let boat_forward = boat_transform.times(vec4(0, 0, -1, 0)).to3().normalized();
        boat_forward[1] = 0;
        boat_forward = boat_forward.normalized();

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        let percent_submerged_corners = []
        for (let i = 0; i < boat_corners.length; i++){
            let my_percent_submerged = clamp(ocean_corners[i].minus(boat_corners[i]).dot(vec3(0,1,0)) / (2 * rigidBody.scale[1]) + 1, 0, 1);
            percent_submerged_corners.push(my_percent_submerged);
        }


        // get average percent submerged
        let percent_submerged = 0;
        for (let i = 0; i < percent_submerged_corners.length; i++){
            percent_submerged += percent_submerged_corners[i];
        }
        percent_submerged /= percent_submerged_corners.length;

        // debug
        // draw_debug_arrow(rigidBody.position.plus(vec3(0,3,0)), boat_forward, 1.5, 1.5, color(0,0,1,1));
        // draw_debug_arrow(rigidBody.position.plus(vec3(0,3,0)), boat_normal, 1.5, 1.5, color(0,1,0,1));

        // for (let i = 0; i < boat_corners.length; i++){
        //     draw_debug_sphere(boat_corners[i], 0.2, color(0,1,0,1));
        //     draw_debug_line(boat_corners[i], boat_corners[i].plus(vec3(0,-4,0)), .02, color(1,0,0,1));
        //     draw_debug_arrow(ocean_corners[i], ocean_normal_corners[i], 1.5, 1.5, color(1,0,0,1));
        // }

        

        // Hack
        // if (boat_forward.dot(vec3(0,0,-1)) < 0){
        //     mult_t = -mult_t;
        // }

        // const angle_of_boat_forward = Math.acos(boat_forward.dot(vec3(0,0,-1)));

        // Apply forces and torques on each corner
        // for (let i = 0; i < boat_corners.length; i++){

        //     const top_corner = boat_corners[i];
        //     const ocean_corner = ocean_corners[i];
        //     const ocean_normal = ocean_normal_corners[i];
        //     const corner_percent_submerged = percent_submerged_corners[i];

        //     const linear_boyancy_force = mult_f * corner_percent_submerged;
        //     const linear_boyancy_force_vector = ocean_normal.times(linear_boyancy_force);
        //     rigidBody.addForce(linear_boyancy_force_vector);

        //     const angle = Math.abs(Math.acos(boat_forward.dot(ocean_normal)));
        //     const torque_amount = mult_t * corner_percent_submerged * angle;
        //     const torque_axis = boat_normal.cross(ocean_normal).normalized();
        //     const torque_vector = torque_axis.times(torque_amount);
        //     rigidBody.addTorque(torque_vector);


            


        //     // thought, if percent_submerged is 0, then we could rotate the boat so that this point falls into the water





        // }

        // Force and Torque factors
        const mult_f = 100000;
        let mult_t = 8000;

        // Hack
        if(boat_forward.dot(vec3(0,0,-1)) < 0){
            mult_t = -mult_t;
        }

        let average_ocean_normal = vec3(0,0,0);
        let average_ocean_corner = vec3(0,0,0);

        for (let i = 0; i < ocean_normal_corners.length; i++){
            average_ocean_normal = average_ocean_normal.plus(ocean_normal_corners[i]);
            average_ocean_corner = average_ocean_corner.plus(ocean_corners[i]);
        }

        average_ocean_normal = average_ocean_normal.normalized();
        average_ocean_corner = average_ocean_corner.times(1 / ocean_normal_corners.length);

        const boyancy_force = mult_f * percent_submerged;
        const boyancy_force_vector = average_ocean_normal.times(boyancy_force);
        rigidBody.addForce(boyancy_force_vector);

        const angle = Math.acos(boat_normal.dot(average_ocean_normal));
        const torque_amount = mult_t * percent_submerged * angle;
        const torque_axis = boat_normal.cross(average_ocean_normal).normalized();
        const torque_vector = torque_axis.times(torque_amount);
        rigidBody.addTorque(torque_vector);

        // console.log(`
        // Percent submerged: ${percent_submerged}
        // Angle: ${angle}
        // Magnitude of torque: ${torque_vector.norm()}
        // Magnitude of torque axis: ${torque_axis.norm()}
        // Magnitude of average_normal: ${average_ocean_normal.norm()}
        // Magnitude of boat_normal: ${boat_normal.norm()}
        // `);



        // draw_debug_arrow(average_ocean_corner, average_ocean_normal, 5, 3, color(1,0,0,1));
        // draw_debug_arrow(average_ocean_corner, torque_axis, 5, 3, color(0,0,1,1));
        // draw_debug_arrow(average_ocean_corner, boat_normal, 5, 3, color(0,1,0,1));


        

        // Restorative force
        // const restore = 10000;
        // const res_start_angle = Math.PI/6;
        // if( Math.abs(boat_normal.normalized().dot(vec3(0,1,0))) < Math.cos(res_start_angle)){
        //     const axis_res = boat_normal.cross(vec3(0,1,0)).normalized();
        //     const angle_res = Math.acos(boat_normal.dot(vec3(0,1,0)));
        //     rigidBody.addTorque(axis_res.times(angle_res * restore));
        // }
        
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

    show(shapes, caller, uniforms, camera_direction, foam_buffered_texture) {



        // rotate the ocean to rotate the ocean by the amount of degrees (only rotate about y axis) from <0,0,1> to the camera direction
        const angle =  Math.atan2(camera_direction[0], camera_direction[2]) % (2 * Math.PI);
        const rotation = Mat4.rotation(angle - Math.PI / 2, 0, 1, 0);

        const transform = Mat4.translation(this.ocean_offset[0], 0, this.ocean_offset[2]).times(rotation);

        // console.log( `CamDir = <${camera_direction[0].toFixed(2)}, ${camera_direction[2].toFixed(2)}>, Angle = ${angle.toFixed(2) * 180 / Math.PI}` );

        this.shapes.ocean.draw( caller, {...uniforms, offset: this.ocean_offset, angle_offset: angle, foam_texture: foam_buffered_texture}, transform, this.materials.ocean);


        // this.shapes.ocean.draw( caller, {...uniforms, offset: this.ocean_offset}, Mat4.identity(), this.materials.ocean);
    }
}
