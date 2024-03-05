import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Matrix, Vector} = tiny;
import {isPointInsideRigidBody} from './RigidBody.js';


// Ocean Class is like the cloth, with individual points that move according to a callable function
// For now, the callable function is just simple sine waves in the x, y, and z directions
// We use the Grid_Patch class to draw the ocean.
// We also use the Grid_Patch class to draw the ocean floor underneath the ocean, which is created with perlin noise
class Point{
    constructor(pos){
        this.originalPos = pos.copy()
        this.pos = pos
        this.prevPos = pos.copy()
        this.locked = false;
        this.r = 0.1;
    }
}

export class GerstnerWave{

    constructor()
    {
        this.n = 30;
		this.s = [0.1, 0.10485330470602275, 0.11381760719782011, 0.1265142307666522, 0.12927877207919886, 0.1391383270891647, 0.15174340163951358, 0.15720212447147353, 0.17739765423095497, 0.1856290320914309, 0.20461957329014113, 0.21397340481639013, 0.22261527975047152, 0.2380169048609526, 0.2717951634211129, 0.27834979534553395, 0.3005726197055354, 0.3220353773974762, 0.3431911112266567, 0.3827172581347963, 0.3878975956029178, 0.4148104810162244, 0.46922817483834556, 0.507086205852071, 0.530725985348299, 0.5625947263605202, 0.6258693662780145, 0.648272777857156, 0.6796153017671225, 0.7390884197919649];
		this.l = [20.0, 16.276587030926855, 13.793525431712741, 12.56019317604558, 9.557227149463156, 7.786937213857204, 6.812802166697542, 5.337195931277145, 5.060545911702058, 3.9576050222862946, 3.296216120112831, 2.718858712951965, 2.435098602772112, 1.9775315356895122, 1.8387550587059367, 1.5199976202358738, 1.2488054153131989, 1.0359018778695126, 0.813960243988936, 0.7582356154354, 0.5886331716119202, 0.5323029760610809, 0.422594606481265, 0.3440074371387982, 0.2828617949229588, 0.24543096659910876, 0.189058872239466, 0.16838450343154204, 0.13057375936835303, 0.11163262466859375];
		this.v = [0.5, 0.532601937212548, 0.5888412491908516, 0.6143706506709481, 0.6984642812491132, 0.7415832468106065, 0.8184624473785139, 0.8425006807453497, 0.9527690979970167, 1.0099357230962775, 1.0898581834591428, 1.165880971122125, 1.2770841397768782, 1.392802543098797, 1.5099361139985337, 1.5949370906218938, 1.6670796140138708, 1.8938622780113445, 2.039447405834382, 2.0700539818015122, 2.346134188088755, 2.542918563473768, 2.6711488080169463, 2.849977202420483, 3.0419803095622466, 3.3320087520409585, 3.8189658992204363, 4.005934903388934, 4.401437184431325, 4.793944361879538];
		this.dir = [
			vec3(0.9834054874003986, 0, 0.18142118771186763),
			vec3(0.42108777680775317, 0, 0.9070198918563496),
			vec3(0.9030196630375303, 0, -0.4295992180714314),
			vec3(0.667509063124111, 0, -0.7446016724713769),
			vec3(0.5880869968223698, 0, 0.8087976781423435),
			vec3(-0.25632455830816436, 0, 0.9665907721513404),
			vec3(0.6104374498490147, 0, 0.792064466960759),
			vec3(0.2707158371475335, 0, 0.9626593039687044),
			vec3(0.2471560123301823, 0, 0.9689756991633188),
			vec3(0.5671978274306891, 0, -0.8235815834256532),
			vec3(0.7160807068832423, 0, -0.6980174934982617),
			vec3(-0.9840239030615004, 0, -0.17803639572742058),
			vec3(-0.16941044081394216, 0, 0.9855455862329382),
			vec3(0.9316484019217747, 0, -0.3633610534944595),
			vec3(-0.6685194562678181, 0, -0.7436946527919781),
			vec3(0.8168343486940616, 0, 0.5768722967811406),
			vec3(0.23742650406139965, 0, -0.9714055050128046),
			vec3(-0.9955295940821558, 0, -0.09445013132133835),
			vec3(-0.8112177714246033, 0, 0.5847441554431305),
			vec3(-0.9797577683723648, 0, -0.20018670114171808),
			vec3(-0.6809494597584, 0, 0.7323304126244814),
			vec3(0.9464150979627536, 0, -0.3229527246334229),
			vec3(0.3299754233712256, 0, 0.9439895232315773),
			vec3(-0.14038906905008464, 0, 0.9900964141391739),
			vec3(-0.18046599166842384, 0, -0.9835812248366336),
			vec3(0.0061053322839791915, 0, 0.9999813622851689),
			vec3(0.5181603558019938, 0, -0.8552834884850468),
			vec3(0.8467115204176219, 0, 0.5320522541932127),
			vec3(0.9891724438157774, 0, -0.1467578835890014),
			vec3(0.8804761544259202, 0, 0.4740904359796168),
		];



        for (let i = 0; i < this.n; i++){
            this.dir[i] = this.dir[i].normalized();
        }
    }

    gersrnerWave(pos, t){

        let new_pos = vec3(pos[0], pos[1], pos[2]);
        
        for (let i = 0; i < this.n; i++){
            const k = 2 * Math.PI / this.l[i];
            const d = this.dir[i]
            const f = k * (pos[0] * d[0] + pos[2] * d[2]) - (this.v[i] * t);
            const a = this.s[i] / k;

            new_pos = new_pos.plus(vec3(
                d[0] * a * Math.cos(f), 
                a * Math.sin(f), 
                d[2] * a * Math.cos(f)
            ));
        }

        return new_pos;

    }

    gersrnerWaveNormal(pos, t){
        let rx = vec3(1,0,0);
        let rz = vec3(0,0,1);

        for (let i = 0; i < this.n; i++){
            const k = 2 * Math.PI / this.l[i];
            const d = this.dir[i]
            const f = k * (pos[0] * d[0] + pos[2] * d[2]) - (this.v[i] * t);
            const a = this.s[i] / k;

            rx = rx.plus(vec3(
                - d[0] * d[0] * a * k * Math.sin(f),
                d[0] * a * k * Math.cos(f),
                - d[0] * d[2] * a * k * Math.sin(f)
            ));

            rz = rz.plus(vec3(
                - d[2] * d[0] * a * k * Math.sin(f),
                d[2] * a * k * Math.cos(f),
                - d[2] * d[2] * a * k * Math.sin(f)
            ));
        }


        return rz.cross(rx).normalized();
    }



    get_glsl_strings(){
        // Ensure all numeric values have a decimal point to be treated as floats
        let sInit = this.s.map((value, index) => `steepness[${index}] = ${value.toFixed(1)};`).join("\n    ");
        let lInit = this.l.map((value, index) => `wave_length[${index}] = ${value.toFixed(1)};`).join("\n    ");
        let vInit = this.v.map((value, index) => `speed[${index}] = ${value.toFixed(1)};`).join("\n    ");
        let dirInit = this.dir.map((vec, index) => `direction[${index}] = vec3(${vec.map(v => v.toFixed(1)).join(", ")});`).join("\n    ");
    
        return {
            n: `int num_waves = ${this.n};`,
            s: `float steepness[${this.n}];`,
            l: `float wave_length[${this.n}];`,
            v: `float speed[${this.n}];`,
            dir: `vec3 direction[${this.n}];`,
            sInit: sInit,
            lInit: lInit,
            vInit: vInit,
            dirInit: dirInit
        }
    }
    


    solveForY(x, z, t){
        // solve for y at a given x, z, and t.
        // first apply the gersrner wave function to the x, z, and t.
        // based on the new x, z, can compute the error and converge to the x and z value that will give the y value we want.

        let y = 0;
        let error = 0;
        let iterations = 0;
        let max_iterations = 10;

        while (error < 0.01 && iterations < max_iterations){
            let new_pos = vec3(x, y, z);
            let new_y = this.gersrnerWave(new_pos, t)[1];
            error = Math.abs(new_y - y);
            y = new_y;
            iterations++;
        }

        return y;

    }



}  

        

export
const Ocean = defs.Part_one_hermite_base =
class Ocean {

    constructor(config) {
        this.pos = config.initPos;
        this.density = config.density
        this.spacing = config.size / this.density
        // this.material = config.material;
        // this.floorMaterial = config.floorMaterial;
        this.floorMinY = config.floorMinY;
        this.floorMaxY = config.floorMaxY;
        this.floorDensity = config.floorDensity;
        this.floorSpacing = config.size / this.floorDensity;
        // this.wave_amplitude = config.wave_amplitude;

        this.gersrnerWave = new GerstnerWave();

        console.log(this.gersrnerWave.get_glsl_strings())

        const ocean = new Ocean_Shader(1, this.gersrnerWave.get_glsl_strings());
        const floor = new defs.Phong_Shader(1);

        this.materials = {};
        this.materials.ocean = { shader: ocean, ambient: 0.3, diffusivity: .3, specularity: .9, color: color( .35,.8,.95,1 ) }
        this.materials.floor = { shader: floor, ambient: 0.3, diffusivity: .5, specularity: .4, color: color( .5,.5,.5,1 ) }

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

    applyWaterForceOnRigidBody(rigidBody, t, dt, caller, uniforms, sphere, mat1, mat2, horizontal_input, vertical_input){

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
        const torque_coef = 6000;
        const angular_drag_coef = 1200;
        const angular_friction_coef = 10;
        const air_angular_drag_coef = 100;
        const air_angular_friction_coef = 5;
        const coef_force_applied = 4000;
        const coef_torque_applied = 500;
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
        if(percent_submerged > 0){
            const torque = boat_normal.cross(ocean_normal).times(angle * torque_coef);
            rigidBody.addTorque(torque);

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

    shade (shape, gridSize) {
        let normals = Array(shape.arrays.position.length).fill(vec3(0,0,0));

        for (let counter = 0; counter < (shape.indices ? shape.indices.length : shape.arrays.position.length);
               counter += 3) {

                const p1 = shape.arrays.position[shape.indices[counter]];
                const p2 = shape.arrays.position[shape.indices[counter+1]];
                const p3 = shape.arrays.position[shape.indices[counter+2]];

                const v1 = p2.minus(p1);
                const v2 = p3.minus(p1);

                const n1 = v1.cross(v2).normalized();

                normals[shape.indices[counter]] = normals[shape.indices[counter]].plus(n1);
                normals[shape.indices[counter+1]] = normals[shape.indices[counter+1]].plus(n1);
                normals[shape.indices[counter+2]] = normals[shape.indices[counter+2]].plus(n1);
          }

        for (let i = 0; i < normals.length; i++){
            normals[i] = normals[i].normalized();
        }

        for (let counter = 0; counter < (shape.indices ? shape.indices.length : shape.arrays.position.length);
               counter += 1) {
            const index = shape.indices[ counter ];
            shape.arrays.normal[index] = normals[index];
        }
    }

    show(shapes, caller, uniforms, mat) {
        this.shapes.ocean.draw( caller, {...uniforms, offset: this.ocean_offset}, Mat4.identity(), this.materials.ocean);
        // this.shapes.floor.draw( caller, uniforms, Mat4.identity(), this.materials.floor);
    }
}

function lerp(a, b, t) {
    // Linear interpolate between a and b
    return (1 - t) * a + t * b;
}


// Smoothstep function for smoother transitions
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

// Example "pseudo-random" gradient function
function pseudoRandomGradient(x, y) {
    return Math.sin(x * 12.9898 + y * 4.1414) * 43758.5453 % 1;
}

// The simplified Perlin-like 2D noise function
function perlin2d(x, y, min, max) {
    // Generate base pseudo-random values
    let n0 = pseudoRandomGradient(Math.floor(x), Math.floor(y));
    let n1 = pseudoRandomGradient(Math.ceil(x), Math.floor(y));
    let n2 = pseudoRandomGradient(Math.floor(x), Math.ceil(y));
    let n3 = pseudoRandomGradient(Math.ceil(x), Math.ceil(y));

    // Smoothly interpolate between points
    let ix0 = lerp(n0, n1, smoothstep(x - Math.floor(x)));
    let ix1 = lerp(n2, n3, smoothstep(x - Math.floor(x)));
    let value = lerp(ix0, ix1, smoothstep(y - Math.floor(y)));

    // Normalize to 0-1
    let normalized = (value + 1) / 2;

    // Scale to min-max range
    return min + (max - min) * normalized;
}



export const Ocean_Shader = defs.Ocean_Shader =
  class Ocean_Shader extends defs.Phong_Shader {

    constructor(num_lights, wave_obj) {
        super(num_lights);
        this.gersrnerWave = wave_obj;
    }

    shared_glsl_code () {           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return super.shared_glsl_code() + `
        uniform float time;
        uniform float offset_x;
        uniform float offset_z;

        ${this.gersrnerWave.n}
        ${this.gersrnerWave.s}
        ${this.gersrnerWave.l}
        ${this.gersrnerWave.v}
        ${this.gersrnerWave.dir}

        void init_waves(){
            ${this.gersrnerWave.sInit}
            ${this.gersrnerWave.lInit}
            ${this.gersrnerWave.vInit}
            ${this.gersrnerWave.dirInit}
        }

        bool has_initialized_vars = false;

        const int MAX_WAVES = 10;

        vec3 get_gersrner_wave_position(vec3 pos, float t, float offset_x, float offset_z){
            vec3 new_pos = vec3(pos.x + offset_x, pos.y, pos.z + offset_z);
            for (int i = 0; i < MAX_WAVES; i++) {
                if (i >= num_waves) break;
                float k = 2.0 * 3.14159 / wave_length[i];
                vec3 d = direction[i];
                float f = k * (d.x * (pos.x + offset_x) + d.z * (pos.z + offset_z)) - (speed[i] * t);
                float a = steepness[i] / k;
                new_pos = new_pos + vec3(
                    d.x * a * cos(f), 
                    a * sin(f), 
                    d.z * a * cos(f)
                );
            }
            return new_pos;
        }

        vec3 get_gersrner_wave_normal(vec3 pos, float t, float offset_x, float offset_z) {
            vec3 rx = vec3(1.0,0.0,0.0);
            vec3 rz = vec3(0.0,0.0,1.0);

            for (int i = 0; i < MAX_WAVES; i++) {
                if (i >= num_waves) break;
                float k = 2.0 * 3.14159 / wave_length[i];
                vec3 d = direction[i];
                float f = k * (d.x * (pos.x + offset_x) + d.z * (pos.z + offset_z)) - (speed[i] * t);
                float a = steepness[i] / k;
                rx += vec3(
                    - d.x * d.x * a * k * sin(f),
                    d.x * a * k * cos(f),
                    - d.x * d.z * a * k * sin(f)
                );
                rz += vec3(
                    - d.z * d.x * a * k * sin(f),
                    d.z * a * k * cos(f),
                    - d.z * d.z * a * k * sin(f)
                );
            }

            return normalize(cross(rz, rx));
        }
        `;
    }
 
    vertex_glsl_code () {           // ********* VERTEX SHADER *********
        return this.shared_glsl_code () + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {        
            if (!has_initialized_vars){
                init_waves();
                has_initialized_vars = true;
            }

            vec3 p = get_gersrner_wave_position(position, time, offset_x, offset_z);
            
            gl_Position = projection_camera_model_transform * vec4( p, 1.0 );     // Move vertex to final space.
                                            // The final normal vector in screen space.

            vec3 new_normal = get_gersrner_wave_normal(position, time, offset_x, offset_z);
            N = normalize( mat3( model_transform ) * new_normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( p, 1.0 ) ).xyz;
        } `;
    }

    fragment_glsl_code () {          // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code () + `
      void main() {                        
          // compute the normal for each pixel
        //    vec3 norm = get_gersrner_wave_normal( vertex_worldspace, time, offset_x, offset_z );
                                         // Compute an initial (ambient) color:
          gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                                         // Compute the final color with contributions from lights:
          gl_FragColor.xyz += phong_model_lights( normalize(N), vertex_worldspace );
        } `;
    }
      update_GPU (context, gpu_addresses, uniforms, model_transform, material) {
          super.update_GPU(context, gpu_addresses, uniforms, model_transform, material);

          context.uniform1f(gpu_addresses.time, uniforms.animation_time / 1000);
          context.uniform1f(gpu_addresses.offset_x, uniforms.offset[0]);
          context.uniform1f(gpu_addresses.offset_z, uniforms.offset[2]);
      }
  };



  