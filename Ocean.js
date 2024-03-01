import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;
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

        const phong = new defs.Phong_Shader( 1 );
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: 1, diffusivity: 0, specularity: 0, color: color( .9,.5,.9,1 ) }
    }

    show(shapes, caller, uniforms, mat) {       
        let transform = Mat4.identity().times(Mat4.translation(this.pos[0], this.pos[1], this.pos[2])).times(Mat4.scale(this.r, this.r, this.r)); 
        shapes.ball.draw( caller, uniforms, transform, {...this.materials.plastic, color: this.locked ? color(0, 0, 1, 1.0) : color(0.9,0.9,1,1.0)});
    }
}

export class GerstnerWave{

    constructor()
    {
        this.n = 3;
        this.s = [.5, 0.4, 0.2];  // steepness
        this.l = [4.0, 3.0, 1.0];  // wave length
        this.v = [4 * Math.PI / 10.0, 
                  8 * Math.PI / 10.0, 
                  12 * Math.PI / 10.0];  // speed

        this.dir = [vec3(1, 0, -.4),
                    vec3(.2, 0, .9),
                    vec3(-.6, 0, .4)];  // direction vector
    }

    setMainDirection(dir){
        this.dir[0] = dir;
    }

    gersrnerWave(pos, t){

        let new_pos = vec3(pos[0], pos[1], pos[2]);
        
        for (let i = 0; i < this.n; i++){
            let k = 2 * Math.PI / this.l[i];
            let nD = this.dir[i].normalized();
            let f = k * nD.dot(new_pos) - (this.v[i] * t);
            let a = this.s[i] / k;

            new_pos = new_pos.plus(vec3(nD[0] * a * Math.cos(f), a * Math.sin(f), nD[2] * a * Math.cos(f)));
        }

        return new_pos;

    }


    solveForY(x, z, t){
        // solve for y at a given x, z, and t.
        // first apply the gersrner wave function to the x, z, and t.
        // based on the new x, z, can compute the error and converge to the x and z value that will give the y value we want.

        let y = 0;
        let error = 0;
        let iterations = 0;
        let max_iterations = 10;
        let step = 0.1;

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
        this.material = config.material;
        this.floorMaterial = config.floorMaterial;
        this.floorMinY = config.floorMinY;
        this.floorMaxY = config.floorMaxY;
        this.floorDensity = config.floorDensity;
        this.floorSpacing = config.size / this.floorDensity;
        // this.wave_amplitude = config.wave_amplitude;

        this.points = []
        this.floorPoints = []
        this.shapes = {};

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

        // Set up Ocean Floor
        const initial_corner_point_floor = vec3( 0,this.floorMinY,0 );
        const row_operation_floor = (s,p) => p ? Mat4.translation( 0,0,.2 ).times(p.to4(1)).to3()
            : initial_corner_point_floor;
        const column_operation_floor = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
        this.shapes.floor = new defs.Grid_Patch( config.floorDensity, config.floorDensity, row_operation_floor, column_operation_floor );

        // initialize floor points
        for (let i = -config.size/2; i <= config.size/2; i+=this.floorSpacing){
            for (let j = -config.size/2; j <= config.size/2; j += this.floorSpacing){
                // TODO: make the floor points have a height based on perlin noise
                let height = perlin2d(i, j, this.floorMinY, this.floorMaxY);
                this.floorPoints.push(new Point(vec3(i,height,j).plus(this.pos)))
            }
        }[]

        // initialize segments
        this.gridSize = Math.sqrt(this.points.length); // Calculate the grid size
        this.floorGridSize = Math.sqrt(this.floorPoints.length); // Calculate the grid size

        // console.log(this)
        this.gersrnerWave = new GerstnerWave();
    }

    simulate(t, dt){
        for (let i = 0; i < this.points.length; i++){
            this.points[i].prevPos = this.points[i].pos.copy();
            this.points[i].pos = this.gersrnerWave.gersrnerWave(this.points[i].originalPos, t);
        }
    }

    applyWaterForceOnRigidBody(rigidBody, t, dt, caller, uniforms, sphere, mat1, mat2){

        // const transform = Mat4.translation(rigidBody.pos[0], rigidBody.pos[1], rigidBody.pos[2]).times(Mat4.scale(rigidBody.scale[0],rigidBody.scale[1],rigidBody.scale[2])).times(Mat4.rotation(rigidBody.orientation[0], rigidBody.orientation[1], rigidBody.orientation[2], rigidBody.orientation[3]));

        const corner1_boat = rigidBody.transform.times(vec4(-1, 1, 1, 1)).to3();
        const corner2_boat = rigidBody.transform.times(vec4(1, 1, 1, 1)).to3();
        const corner3_boat = rigidBody.transform.times(vec4(0, 1, -1, 1)).to3();

        const corner1_ocean = vec3(corner1_boat[0], this.gersrnerWave.solveForY(corner1_boat[0], corner1_boat[2], t), corner1_boat[2]);
        const corner2_ocean = vec3(corner2_boat[0], this.gersrnerWave.solveForY(corner2_boat[0], corner2_boat[2], t), corner2_boat[2]);
        const corner3_ocean = vec3(corner3_boat[0], this.gersrnerWave.solveForY(corner3_boat[0], corner3_boat[2], t), corner3_boat[2]);

        // draw all the corners
        // sphere.draw( caller, uniforms, Mat4.translation(corner1_boat[0], corner1_boat[1], corner1_boat[2]).times(Mat4.scale(0.1,0.1,0.1)), mat1 );
        // sphere.draw( caller, uniforms, Mat4.translation(corner2_boat[0], corner2_boat[1], corner2_boat[2]).times(Mat4.scale(0.1,0.1,0.1)), mat1 );
        // sphere.draw( caller, uniforms, Mat4.translation(corner3_boat[0], corner3_boat[1], corner3_boat[2]).times(Mat4.scale(0.1,0.1,0.1)), mat1 );

        // sphere.draw( caller, uniforms, Mat4.translation(corner1_ocean[0], corner1_ocean[1], corner1_ocean[2]).times(Mat4.scale(0.1,0.1,0.1)), mat2 );
        // sphere.draw( caller, uniforms, Mat4.translation(corner2_ocean[0], corner2_ocean[1], corner2_ocean[2]).times(Mat4.scale(0.1,0.1,0.1)), mat2 );
        // sphere.draw( caller, uniforms, Mat4.translation(corner3_ocean[0], corner3_ocean[1], corner3_ocean[2]).times(Mat4.scale(0.1,0.1,0.1)), mat2 );



        const boat_normal = corner3_boat.minus(corner2_boat).cross(corner1_boat.minus(corner2_boat)).normalized();
        const ocean_normal = corner3_ocean.minus(corner2_ocean).cross(corner1_ocean.minus(corner2_ocean)).normalized();

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

        const angle = Math.acos(boat_normal.dot(ocean_normal));


        // apply gravity
        const gravity = 9.8;
        rigidBody.applyForce(vec3(0, -gravity * rigidBody.mass, 0));

        // Apply overdamped boyancy force in the direction of the normal of the ocean

        const boyancy_factor = 4;

        const boyancy_force = ocean_normal.times(boyancy_factor * gravity * rigidBody.mass * percent_submerged);
        rigidBody.applyForce(boyancy_force);

        const drag_coef = 0.4;
        const friction_coef = 0.4;

        if(percent_submerged > 0){
            // Apply drag force
            const drag_force = rigidBody.vel.times(-drag_coef);

            // Apply friction force
            if( rigidBody.vel.norm() > 0){
                const friction_force = rigidBody.vel.normalized().times(-friction_coef * gravity * rigidBody.mass);
                rigidBody.applyForce(friction_force);
            }
        }

        const torque_coef = 10000;
        const angular_drag_coef = 0.9;

        // Apply torque to make the boat align with the ocean normal
        const torque = boat_normal.cross(ocean_normal).times(angle * torque_coef);
        rigidBody.applyTorque(torque);

        // Apply angular drag
        const angular_drag = rigidBody.angularVel.times(-angular_drag_coef);
        rigidBody.applyTorque(angular_drag);


        
    }

    point_to_coord(i, gridSize){
        return [i % gridSize, Math.floor(i / gridSize)]
    }

    coord_to_point(x, y, gridSize){
        return x + y * gridSize
    }

    shade (shape, gridSize) {
        /*
  
          3  7 11  15
          2  6 10  14
          1  5  9  13
          0  4  8  12
  
  
          
        */
  
        
  
        // First, iterate through the index or position triples:
        // for (let counter = 0; counter < (shape.indices ? shape.indices.length : shape.arrays.position.length);
        //      counter += 1) {
        //     const index = shape.indices[ counter ];
        //     const pc = shape.arrays.position[ index ];
        //     const [cx, cy] = this.point_to_coord(index,gridSize);
  
        //     const p1 = (cx - 1 < 0) ? pc : shape.arrays.position[this.coord_to_point(cx - 1, cy,gridSize)];
        //     const p2 = (cx + 1 >= gridSize) ? pc : shape.arrays.position[this.coord_to_point(cx + 1, cy,gridSize)];
        //     const p3 = (cy - 1 < 0) ? pc : shape.arrays.position[this.coord_to_point(cx, cy - 1,gridSize)];
        //     const p4 = (cy + 1 >= gridSize) ? pc : shape.arrays.position[this.coord_to_point(cx, cy + 1,gridSize)];
  
        //     const v1 = p2.minus(p1);
        //     const v2 = p4.minus(p3);
  
        //     const n1 = v1.cross(v2).normalized();
  
        //     shape.arrays.normal[index] = n1;
  
        // }

        // array of normals size of number of vertices
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
        if (this.once === undefined) {
            this.once = true;
            this.shapes.ocean.draw( caller, uniforms, Mat4.identity(), this.material);
            this.shapes.floor.draw( caller, uniforms, Mat4.identity(), this.floorMaterial);
        }


        // Update the JavaScript-side shape with new vertices:
        this.shapes.ocean.arrays.position.forEach( (p,i,a) =>{
          a[i] = this.points[i].pos
        });
        // Update the normals to reflect the surface's new arrangement.
        // This won't be perfect flat shading because vertices are shared.

        this.shade(this.shapes.ocean, this.gridSize);
        // Draw the current sheet shape.
        // this.shapes.ocean.flat_shade();

    
        // Update the gpu-side shape with new vertices.
        // Warning:  You can't call this until you've already drawn the shape once.
        this.shapes.ocean.copy_onto_graphics_card(caller.context, ["position", "normal"], false);

        this.shapes.ocean.draw( caller, uniforms, Mat4.identity(), this.material);


        // Update the normals to reflect the surface's new arrangement.
        // This won't be perfect flat shading because vertices are shared.
        this.shade(this.shapes.floor, this.floorGridSize);
        // this.shapes.floor.flat_shade();
        // Draw the current sheet shape.
        this.shapes.floor.draw( caller, uniforms, Mat4.identity(), this.floorMaterial);

        // ------------------
        // for(let i = 0; i < this.segments.length; i++){
        //     this.segments[i].show(caller, uniforms);
        // }
    
        // for(let i = 0; i < this.points.length; i++){
        //     this.points[i].show(shapes, caller, uniforms, mat);
        // }
    }
}

function dist3D(vec1, vec2) {
    // Extracting coordinates from the first vector
    const x1 = vec1[0];
    const y1 = vec1[1];
    const z1 = vec1[2];
  
    // Extracting coordinates from the second vector
    const x2 = vec2[0];
    const y2 = vec2[1];
    const z2 = vec2[2];
  
    // Calculating the distance using the Euclidean distance formula
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
  
    return distance;
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      //swap
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }

function fade(t) {
    // Fade function as defined by Ken Perlin. This eases coordinate values
    // so that they will ease towards integral values. This smooths the final output.
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    // Linear interpolate between a and b
    return (1 - t) * a + t * b;
}

function grad(hash, x) {
    // This will hash the input value x, and produce a gradient from the hashed value.
    const h = hash & 15;
    const grad = 1 + (h & 7); // Gradient value is one of 1, 2, ..., 8
    return (h & 8 ? -grad : grad) * x; // and a random direction
}

// define stuff for perlin noise
const perm = shuffle([...Array(256).keys()]);


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
