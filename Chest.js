import {tiny, defs} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Vector3 } = tiny;

class Prospect {
    constructor(chest_transform, fog_param){
        this.chest_transform = chest_transform
        this.transform = this.chest_transform.times(Mat4.scale(.1,.1,.1))

        this.spawnCounter = 0

        let tex_phong = new defs.Textured_Phong(1, fog_param);
        this.material = { shader: tex_phong, ambient: .3, texture: new Texture("assets/textures/saba.jpg"),  diffusivity: 0.7, specularity: 0.45, color: color( 1, 1, 1 ,1 )}
        this.shapes = {
            'ball' : new defs.Subdivision_Sphere( 3 ),
        }
    }

    update(t,dt){
        this.scaleFactor = Math.min(map(6*this.spawnCounter*this.spawnCounter, 0,3, .1,1 ), 1)
        this.transform = this.chest_transform.times(Mat4.translation(0,Math.min(6*this.spawnCounter*this.spawnCounter,3),0)).times(Mat4.scale(this.scaleFactor,this.scaleFactor,this.scaleFactor))
        this.spawnCounter += dt
    }

    show(caller, uniforms){
        this.shapes.ball.draw( caller, uniforms, this.transform, this.material );
    }
}

export
const Chest = defs.Chest =
class Chest {
    constructor(position = vec3(0,1,0), y_rotation = -Math.PI/2, fog_param) {
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

        this.prospect = new Prospect(this.transform, fog_param)

    }

    chest_open_function(x){
        let func = 1 - Math.abs(-Math.exp(-x) * Math.sin(Math.PI * Math.exp(0.7 * x) - 2));
        return x < 3.506 ? map(func, .091, 1, 0, 2*Math.PI/3) : 2*Math.PI/3
    }

    openChest(){
        this.startChestOpen = true
    }

    update(t, dt){
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
            this.prospect.update(t, dt)
        }
    }

    show(caller, uniforms){
        this.shapes.chest_upper.draw( caller, uniforms, this.chest_upper_transform, this.material );
        this.shapes.chest_lower.draw( caller, uniforms, this.transform, this.material );

        // prospect
        this.prospect.show(caller, uniforms)
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