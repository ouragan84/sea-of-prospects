import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Vector3 } = tiny;

class Prospect {
    constructor(chest_transform, scoreIncreaseCallback,fog_param){
        this.chest_transform = chest_transform
        this.transform = this.chest_transform.times(Mat4.scale(.1,.1,.1))
        this.scoreIncreaseCallback = scoreIncreaseCallback
        this.acquired = false
        this.spawnCounter = 0

        let tex_phong = new defs.Textured_Phong(1, fog_param);
        this.material = { shader: tex_phong, ambient: .3, texture: new Texture("assets/textures/gem_texture.jpg"),  diffusivity: 0.7, specularity: 1, color: color( 1, 1, 1 ,1 )}
        this.shapes = {
            'ball' : new Shape_From_File( "assets/objects/gem.obj" ),
        }

        this.lerpProgress = 0
    }

    update(t,dt, ship_pos, y_rotation){
        this.scaleFactor = Math.min(map(6*this.spawnCounter*this.spawnCounter, 0,3, .1,1 ), 1)
        this.transform = this.chest_transform.times(Mat4.translation(0,Math.min(6*this.spawnCounter*this.spawnCounter,3),0)).times(Mat4.scale(this.scaleFactor,this.scaleFactor,this.scaleFactor))
        this.spawnCounter += dt

        if (this.spawnCounter > 1){
            // follow player
            if (!this.lerpProgress) {
                this.lerpProgress = 0;
            }
            const lerpSpeed = 0.5;
            this.lerpProgress = Math.min(this.lerpProgress + dt * lerpSpeed, 1); 
            const currentPosition = vec3(this.transform[0][3], this.transform[1][3], this.transform[2][3])
            
            const newPosition = vFastFinishLerp(currentPosition, ship_pos, this.lerpProgress);

            this.transform = Mat4.translation(newPosition[0], newPosition[1], newPosition[2])
                             .times(Mat4.rotation(y_rotation, 0,1,0))
                             .times(Mat4.scale(this.scaleFactor, this.scaleFactor, this.scaleFactor));

            let dist = newPosition.minus(ship_pos).norm()
            if (dist < .1 && this.acquired == false){
                this.scoreIncreaseCallback()
                this.acquired = true
            }
        }
    }

    show(caller, uniforms){
        this.shapes.ball.draw( caller, uniforms, this.transform, this.material );
    }
}

export
const Chest = defs.Chest =
class Chest {
    constructor(position = vec3(0,1,0), y_rotation = -Math.PI/2,scoreIncreaseCallback, fog_param) {
        this.position = position
        this.y_rotation = y_rotation

        this.chest_open_counter = 0
        this.startChestOpen = false
        
        this.transform = Mat4.translation(position[0], position[1], position[2]).times(Mat4.rotation(y_rotation, 0,1,0))

        let tex_phong = new defs.Textured_Phong(1, fog_param);
        this.material = { shader: tex_phong, ambient: .3, texture: new Texture("assets/textures/treasure_chest_texture.jpg"),  diffusivity: 0.7, specularity: 0.45, color: color( 1, 1, 1 ,1 )}

        this.shapes = {
            'chest_upper': new Shape_From_File( "assets/objects/chest_upper.obj" ),
            'chest_lower': new Shape_From_File( "assets/objects/chest_lower.obj" ),
        }

        this.prospect = new Prospect(this.transform, scoreIncreaseCallback, fog_param)

    }

    chest_open_function(x){
        let func = 1 - Math.abs(-Math.exp(-x) * Math.sin(Math.PI * Math.exp(0.7 * x) - 2));
        return x < 3.506 ? map(func, .091, 1, 0, 2*Math.PI/3) : 2*Math.PI/3
    }

    openChest(){
        this.startChestOpen = true
    }

    update(t, dt, ship_pos){
        let pivot = vec3(.85,.3,0); 
        
        this.chest_upper_transform = this.transform.times(Mat4.translation(-.3,.55,0))
            .times(Mat4.translation(-pivot[0], -pivot[1], -pivot[2]))
            .times(Mat4.rotation(this.chest_open_function(this.chest_open_counter), 0, 0, 1))
            .times(Mat4.translation(pivot[0], pivot[1], pivot[2]))
            .times(Mat4.scale(1.25, 1.25, 1.2));

        if (this.startChestOpen){
            this.chest_open_counter+=dt
        }

        if (this.chest_open_counter > 2){
            // prospect spawns!!!
            this.prospect.update(t, dt, ship_pos, this.y_rotation)
        }
    }

    show(caller, uniforms){
        this.shapes.chest_upper.draw( caller, uniforms, this.chest_upper_transform, this.material );
        this.shapes.chest_lower.draw( caller, uniforms, this.transform, this.material );

        // prospect
        if(this.prospect.acquired == false){
            this.prospect.show(caller, uniforms)
        }
    }

}


function map (number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function lerp(a, b, t) {
    return (1 - Math.sqrt(t)) * a + Math.sqrt(t) * b;
}

function vlerp(v1, v2, t){
    return vec3(lerp(v1[0], v2[0], t), lerp(v1[1], v2[1], t), lerp(v1[2], v2[2], t))
}

function easeOutCubic(t) {
    return (--t) * t * t + 1;
}

function fastFinishLerp(a, b, t) {
    return a + (b - a) * easeOutCubic(t);
}

function vFastFinishLerp(v1, v2, t) {
    return vec3(fastFinishLerp(v1[0], v2[0], t), fastFinishLerp(v1[1], v2[1], t), fastFinishLerp(v1[2], v2[2], t));
}