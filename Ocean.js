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
    }

    simulate(t, dt){
        for (let i = 0; i < this.points.length; i++){
            this.points[i].prevPos = this.points[i].pos.copy()
            // this.points[i].pos[1] = this.points[i].originalPos[1] + Math.sin(t + this.points[i].pos[0]) * Math.sin(t + this.points[i].pos[2]) * this.wave_amplitude;
            // this.points[i].pos[0] = this.points[i].originalPos[0] + Math.sin(t + this.points[i].pos[2]) * Math.sin(t + this.points[i].pos[1]) * this.wave_amplitude;
            // this.points[i].pos[2] = this.points[i].originalPos[2] + Math.sin(t + this.points[i].pos[0]) * Math.sin(t + this.points[i].pos[1]) * this.wave_amplitude;
        }
    }

    applyWaterForceOnRigidBody(rigidBody, dt){
        // Get list of points that are inside the rigid body
        let pointsInsideRigidBody = this.points.filter(point => isPointInsideRigidBody(point.pos, rigidBody));

        if (pointsInsideRigidBody.length === 0 && rigidBody.pos[1] > 0){
            rigidBody.applyForce(vec3(0,-9.8 * rigidBody.mass, 0))
            return;
        }

        // Find average height of points inside the rigid body
        let averageHeight = 0

        // if (pointsInsideRigidBody.length > 0){
        //     averageHeight = pointsInsideRigidBody.reduce((acc, point) => acc + point.pos[1], 0) / pointsInsideRigidBody.length;
        // }

        // Get depth of the rigid body in the water using it's scale, position, and orientation (assuming it's a box)

        let depth = rigidBody.scale[1] - (rigidBody.pos[1] - averageHeight);

        let percentSubmerged = depth / (2*rigidBody.scale[1]);
        if (percentSubmerged < 0) percentSubmerged = 0;
        if (percentSubmerged > 1) percentSubmerged = 1;

        // Apply buoyant force
        let volume = rigidBody.scale[0] * rigidBody.scale[1] * rigidBody.scale[2] * 8;
        const densityWater = 200; // kg/m^3
        let buoyantForce = vec3(0, 9.8 * percentSubmerged * volume * densityWater, 0);
        rigidBody.applyForce(buoyantForce);


        // apply gravity
        rigidBody.applyForce(vec3(0,-9.8 * rigidBody.mass, 0))


        // const boyant_friction = 0.2;
        const water_friction = 0.5;
        const water_drag = 0.5;

        // Apply drag force
        rigidBody.applyForce(rigidBody.vel.times(-water_drag * buoyantForce.norm()));

        // Apply friction force
        const friction_dir = rigidBody.vel.norm() < 0.001 ? vec3(0,0,0) : rigidBody.vel.normalized().times(-1);
        rigidBody.applyForce(friction_dir.times(water_friction * buoyantForce.norm()));

        // For each point inside the rigid body, apply a force in the direction of that point's velocity (pos - prevPos) / dt
        // const point_coefficient = 5; // kg*m/s
        // pointsInsideRigidBody.forEach(point => {
        //     // caclulate velocity
        //     let velocity = point.pos.minus(point.prevPos).times(1/dt);
        //     let force = velocity.times(point_coefficient);

        //     // calculate torque to apply based on force and position relative to the center of mass
        //     let leverArm = point.pos.minus(rigidBody.pos); // vector from COM to force application point
        //     let torque = leverArm.cross(force); // product to get torque
        //     rigidBody.applyTorque(torque);
        //     rigidBody.applyForce(force);
        // });

        // console.log(rigidBody.angularVel.norm(), rigidBody.angularAcc.norm())

        // TODO: Damp the rigid body's angular velocity, and restore towards vertical (over dampen)
        
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




        this.shapes.floor.arrays.position.forEach( (p,i,a) =>{
            a[i] = this.floorPoints[i].pos
        });
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
