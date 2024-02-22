import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const Line = defs.Line =
class Line{
    constructor() {
      this.material = {
        shader: new defs.Phong_Shader(),
        ambient: 1.0,
        color: color(1, 0, 0, 1)
      };
  
      this.shapes = { 'box'  : new defs.Cube() };
    }
  
    draw(webgl_manager, uniforms, a, b, line_thickness) {
      const midpoint = a.plus(b).times(0.5);
      const direction = b.minus(a);
      const length = direction.norm();
      const directionNormalized = direction.normalized();

      const zAxis = vec3(0, 0, 1);

      // updated rotation axis calc (perp to both dir and z) based on x axis
      let rotationAxis = zAxis.cross(directionNormalized);
      if (rotationAxis.norm() === 0) { 
        rotationAxis = vec3(1, 0, 0); 
      } else {
        rotationAxis = rotationAxis.normalized();
      }

      const angle = Math.acos(directionNormalized.dot(zAxis));
      const scaleFactors = vec3(line_thickness, line_thickness, length / 2);

      this.transform = Mat4.identity()
        .times(Mat4.translation(...midpoint))
        .times(Mat4.rotation(angle, ...rotationAxis))
        .times(Mat4.scale(...scaleFactors));

      this.shapes.box.draw(webgl_manager, uniforms, this.transform, this.material);
    }
  }
  

class Point{
    constructor(pos){
        this.pos = pos
        this.prevPos = pos
        this.locked = false;
        this.r = 0.1;

        const phong = new defs.Phong_Shader();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
    }

    show(shapes, caller, uniforms, mat) {       
        let transform = Mat4.identity().times(Mat4.translation(this.pos[0], this.pos[1], this.pos[2])).times(Mat4.scale(this.r, this.r, this.r)); 
        shapes.ball.draw( caller, uniforms, transform, {...this.materials.plastic, color: this.locked ? color(0, 0, 1, 1.0) : color(0.9,0.9,1,1.0)});
    }
}

class Segment{
    constructor(a,b){
        this.a = a;
        this.b = b;
        this.length = dist3D(this.a.pos, this.b.pos);
        this.line = new Line();
    }

    show(caller, uniforms){
        this.line.draw(caller, uniforms, this.a.pos, this.b.pos, 0.02)
    }

}

export
const Cloth = defs.Part_one_hermite_base =
class Cloth {
    constructor(config) {
        this.pos = config.initPos;
        this.density = config.density;
        this.spacing = config.size / this.density
        // set up cloth
        this.points = []
        this.segments = []

        const initial_corner_point = vec3( -1,-1,0 );
        const row_operation = (s,p) => p ? Mat4.translation( 0,.2,0 ).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
        this.shapes = { sheet : new defs.Grid_Patch( config.density, config.density, row_operation, column_operation ) };
        
        const shader = new defs.Textured_Phong( 1 );
        this.material = { shader, ambient: 0.5, specularity:0, texture: new Texture( "assets/saba.jpg" ) };

        // initialize points
        for (let i = -config.size/2; i <= config.size/2; i+=this.spacing){
            for (let j = -config.size/2; j <= config.size/2; j += this.spacing){
                this.points.push(new Point(vec3(i,j,0).plus(this.pos)))
            }
        }
        // initialize segments
        let gridSize = Math.sqrt(this.points.length); // Calculate the grid size

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                // Calculate the index of the current point in the flat array
                let index = i * gridSize + j;

                // Check if the current point is not on the right edge of the grid
                if (j < gridSize - 1) {
                    // Create a segment to the right neighbor
                    let rightNeighborIndex = index + 1;
                    this.segments.push(new Segment(this.points[index], this.points[rightNeighborIndex]));
                }

                // Check if the current point is not on the bottom edge of the grid
                if (i < gridSize - 1) {
                    // Create a segment to the bottom neighbor
                    let bottomNeighborIndex = index + gridSize;
                    this.segments.push(new Segment(this.points[index], this.points[bottomNeighborIndex]));
                }
            }
        }

        for (let i = 0; i < config.lockedPoints.length; i++) {
            this.points[config.lockedPoints[i]].locked = true
        }
        
    }

    simulate(t, dt) {
        const numOfIterations = 5
        const gravity = 9.8
        // const points = shuffle(this.points);
        const points = this.points
        for(let i = 0; i < points.length; i++){
          if(!points[i].locked){
            let initPos = points[i].pos;
            points[i].pos = points[i].pos.plus(points[i].pos.minus(points[i].prevPos));
            points[i].pos = points[i].pos.plus(vec3(0,-gravity * dt * dt, 0));
            // points[i].pos = points[i].pos.plus(vec3(-100 * (Math.random()-0.2) * dt * dt,0, Math.sin(t) * 0.005));
            points[i].pos = points[i].pos.plus(vec3(Math.sin(t) * 0.005, 0, -100 * (Math.random()-0.2) * dt * dt));

            points[i].prevPos = initPos;
          }
        }
        for(let iter = 0; iter < numOfIterations; iter++){
          for(let i = 0; i < this.segments.length; i++){
            let segmentCenter = this.segments[i].a.pos.plus(this.segments[i].b.pos).times(0.5);
            let segmentDir = this.segments[i].a.pos.minus(this.segments[i].b.pos).normalized();
            if(!this.segments[i].a.locked){
              this.segments[i].a.pos = segmentCenter.plus(segmentDir.times(this.segments[i].length/2));
            }
            if(!this.segments[i].b.locked){
              this.segments[i].b.pos = segmentCenter.minus(segmentDir.times(this.segments[i].length/2));
            }
          }
        }

    }

    updatePosition(newPos) {
        // Calculate the difference between the new position and the old position
        let offset = newPos.minus(this.pos);
        
        // Update the current position to the new position
        this.pos = newPos;
        
        // Update all points with the new offset
        for (let point of this.points) {
            if(!point.locked){
                point.pos = point.pos.plus(offset);
            }
        }
    }

    show(shapes, caller, uniforms, mat) {
        // Update the JavaScript-side shape with new vertices:
        this.shapes.sheet.arrays.position.forEach( (p,i,a) =>{
          a[i] = this.points[i].pos
        });
        // Update the normals to reflect the surface's new arrangement.
        // This won't be perfect flat shading because vertices are shared.
        this.shapes.sheet.flat_shade();
        // Draw the current sheet shape.
        this.shapes.sheet.draw( caller, uniforms, Mat4.identity(), this.material );
    
        // Update the gpu-side shape with new vertices.
        // Warning:  You can't call this until you've already drawn the shape once.
        this.shapes.sheet.copy_onto_graphics_card( caller.context, ["position","normal"], false );

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

const perm = [...Array(256).keys()].map(() => Math.floor(Math.random() * 256));
for (let i=0; i < 256 ; i++) perm.push(perm[i]);

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

// The main Perlin noise function
function perlin(x) {
    // Calculate the "unit cube" that the point asked will be located in
    // The left bound is ( |_x_| ) and the right bound is ( |_x_|+1 )
    const xi = Math.floor(x) & 255; // Calculate the "left" vector
    const xf = x - Math.floor(x); // Calculate the "right" vector

    // Compute fade curves for each of xi
    const u = fade(xf);

    // Hash coordinates of the cube corners
    const a = perm[xi];
    const b = perm[xi + 1];

    // And add blended results from the corners of the cube
    const x1 = lerp(grad(a, xf), grad(b, xf - 1), u);

    return x1 * 0.5 + 0.5; // We bind it to 0 - 1 (theoretical min/max before is -1 - 1)
}