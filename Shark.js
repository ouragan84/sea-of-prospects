import {tiny, defs} from './examples/common.js';
const { vec3, vec4, color, Mat4, Matrix, Shader, Texture, Component } = tiny;
import { Shape_From_File } from './examples/obj-file-demo.js';


export const SharkSystem = class SharkSystem {

    constructor(ocean, fog_param){
        this.sharks = []
        this.ocean = ocean
        this.number = 1

        this.shark_material = {shader: new defs.Phong_Shader(1, fog_param), ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: color(0.5,0.5,0.5,1)}

        this.sharkshape = new Shape_From_File( "assets/objects/shark.obj" );

        this.spawn_radius = 20;

        for (let i = 0; i < this.number; i++){
            const angle = Math.random() * 2 * Math.PI;
            const x = Math.cos(angle) * this.spawn_radius;
            const z = Math.sin(angle) * this.spawn_radius;

            let shark = new Shark(this.sharkshape, this.shark_material, this.ocean, x, z)
            this.sharks.push(shark)
        }
    }


    update(t, dt, ship_pos){
        for (let shark of this.sharks){
            shark.update(t, dt, ship_pos)
        }
    }

    show(caller, uniforms){
        for (let shark of this.sharks){
            shark.show(caller, uniforms)
        }
    }
}


export const Shark = class Shark {

    constructor(shape, material, ocean, x, z){
        this.shape = shape
        this.material = material
        this.ocean = ocean

        this.position = vec3(x, 0, z)
        this.y_rotation = 0
        this.speed = 1;
        this.rot_speed = 1; // rad/s
    }

    update(t, dt, ship_pos){
        const height = this.ocean.gersrnerWave.solveForY(this.position[0], this.position[2], t, 4, 0.1, 10)
        this.position[1] = height

        const player_direction = ship_pos.minus(this.position).normalized(); // shark --> player
        const player_angle = Math.atan2(player_direction[0], player_direction[2])

        const player_dist = ship_pos.minus(this.position).norm()


        // move y_rotation towards player angle at this.rot_speed
        const angle_diff = player_angle - this.y_rotation
        if(angle_diff > 0.05)
            this.y_rotation += Math.sign(angle_diff) * Math.min(this.rot_speed * dt, Math.abs(angle_diff))

        // move towards player at this.speed
        if(player_dist > 5){
            this.position[0] += player_direction[0] * this.speed * dt
            this.position[2] += player_direction[2] * this.speed * dt
        }

        console.log(this.position);
    }

    show(caller, uniforms){
        this.shape.draw( caller, uniforms, Mat4.translation(this.position[0], this.position[1], this.position[2])
            .times(Mat4.rotation(this.y_rotation, 0,1,0))
            .times(Mat4.scale(1, 1, 1)), this.material );
    }
}