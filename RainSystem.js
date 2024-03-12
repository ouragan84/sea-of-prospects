import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Vector3 } = tiny;

class Raindrop{
    constructor() {
        this.shapes = { 'cyl'  : new defs.Cylindrical_Tube(1,3),}
    }

    draw(webgl_manager, uniforms, transform,  mat) {
        this.shapes.cyl.draw(webgl_manager, uniforms, transform.times(Mat4.rotation(Math.PI/2, 1,0,0)).times(Mat4.scale(.07,.07,.6)), mat);
    }
};

export
const RainSystem = defs.RainSystem =
class RainSystem {
    constructor(count, fog_param) {
        this.raindrops = [];
        this.position = vec3(0,0,0)
        this.count = count;
        for (let i = 0; i < this.count; i++) {
            this.raindrops.push(this.createRaindrop(vec3(0,0,0)));
        }

        this.rainShape = new Raindrop()

        const phong = new defs.Phong_Shader(1, fog_param);
        this.material = { shader: phong, ambient: 1, diffusivity: .1, specularity: 1, color: color( .41-.1,.49-.1,.62-.1,1 )}
    }

    createRaindrop(shipPos) {
        // Randomize the initial position and speed of the raindrop
        let positionMatrix = Mat4.translation(shipPos[0] + Math.random() * 60 - 30, Math.random() * 5 + 20,shipPos[2] +  Math.random() * 60 - 30);
        let speed = Math.random() * 20 + 20;
        return { positionMatrix, speed };
    }

    update(dt, shipPos) {
        // console.log(this.raindrops[0].positionMatrix)
        for (let raindrop of this.raindrops) {
            raindrop.positionMatrix = raindrop.positionMatrix.times(Mat4.translation(0, -raindrop.speed * dt, 0));
            // Reset the raindrop to the top if it goes below a certain threshold
            if (raindrop.positionMatrix[1][3] < -2) {
                raindrop.positionMatrix = this.createRaindrop(shipPos).positionMatrix;
            }
        }
    }

    draw(caller, uniforms) {
        for (let raindrop of this.raindrops) {
            this.rainShape.draw(caller, uniforms, raindrop.positionMatrix, this.material);
        }
    }
}
