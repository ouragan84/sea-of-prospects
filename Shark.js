import {tiny, defs} from './examples/common.js';
const { vec3, vec4, color, Mat4, Matrix, Shader, Texture, Component } = tiny;
import { Shape_From_File } from './examples/obj-file-demo.js';


export const SharkSystem = class SharkSystem {

    constructor(ocean, fog_param, ship_explode_callback){
        this.sharks = []
        this.ocean = ocean
        this.number = 5

        this.ship_explode_callback = ship_explode_callback
        this.shark_material = {shader: new defs.Phong_Shader(1, fog_param), ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: color(0.5,0.5,0.5,1)}

        this.sharkshape = new Shape_From_File( "assets/objects/shark.obj" );

        this.spawn_radius = 80;

        this.circle_around_radius_range = [12, 18];

        for (let i = 0; i < this.number; i++){
            const angle = Math.random() * 2 * Math.PI;
            const x = Math.cos(angle) * this.spawn_radius;
            const z = Math.sin(angle) * this.spawn_radius;

            const circle_around_radius = Math.random() * (this.circle_around_radius_range[1] - this.circle_around_radius_range[0]) + this.circle_around_radius_range[0]

            let shark = new Shark(this.sharkshape, this.shark_material, this.ocean, x, z, circle_around_radius, this, i)
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

    kill_player(){
        this.ship_explode_callback()
    }

    get_separation_vector(i){

        const rad = 5;
        const my_pos = this.sharks[i].position

        let separation_vector = vec3(0,0,0)
        for (let j = 0; j < this.sharks.length; j++){
            if (i != j){
                const other_pos = this.sharks[j].position
                const dist = my_pos.minus(other_pos).norm()

                if (dist < rad){
                    separation_vector = separation_vector.plus(my_pos.minus(other_pos).times(1/(dist * dist)))
                }
            }
        }

        return separation_vector.normalized()
    }
}


export const Shark = class Shark {

    constructor(shape, material, ocean, x, z, circle_around_radius, shark_system, i){
        this.shape = shape
        this.material = material
        this.ocean = ocean

        this.position = vec3(x, 0, z)
        this.y_rotation = 0
        this.speed = 4;
        this.rot_speed = 1.5; // rad/s

        this.circle_around_radius = circle_around_radius;
        this.shark_system = shark_system;

        this.i = i
        this.attack_chance = 1 / (60 * 20) // 1 in x seconds (on average) poisson distribution

        this.attack = false
        this.attack_timer = 1000000
        this.attack_max_time = 1500
        this.kill_radius = 1.5
    }

    update(t, dt, ship_pos){
        const height = this.ocean.gersrnerWave.solveForY(this.position[0], this.position[2], t, 4, 0.1, 10)
        this.position[1] = height

        const player_dist = ship_pos.minus(this.position).norm()

        const player_direction = ship_pos.minus(this.position).normalized(); // shark --> player
        let player_angle = Math.atan2(player_direction[0], player_direction[2])

        // make sure player_angle is between -pi and pi
        if (player_angle < -Math.PI)
            player_angle += 2 * Math.PI
        else if (player_angle > Math.PI)
            player_angle -= 2 * Math.PI

        const separation_vector = this.shark_system.get_separation_vector(this.i)
        let separation_angle = Math.atan2(separation_vector[0], separation_vector[2])
        
        if (separation_angle < -Math.PI)
            separation_angle += 2 * Math.PI
        else if (separation_angle > Math.PI)
            separation_angle -= 2 * Math.PI

        if (player_dist > this.circle_around_radius || this.attack){
            // move y_rotation towards player angle at this.rot_speed
            let angle_diff; 
            
            if(Math.abs(separation_angle - this.y_rotation) > 1){
                angle_diff = separation_angle - this.y_rotation
            }else {
                angle_diff = player_angle - this.y_rotation
            }

            if(Math.abs(angle_diff) > 0.05)
                this.y_rotation += Math.sign(angle_diff) * Math.min(this.rot_speed * dt, Math.abs(angle_diff))

            this.position[0] += Math.sin(this.y_rotation) * this.speed * dt
            this.position[2] += Math.cos(this.y_rotation) * this.speed * dt

            if(this.attack){
                this.attack_timer += dt
                if(this.attack_timer > this.attack_max_time){
                    this.attack = false
                    this.attack_timer = 100000
                }
            }
            
        } else {
            let tangent_angle = player_angle + Math.PI/2;

            if (tangent_angle > Math.PI)
                tangent_angle -= 2 * Math.PI
            else if (tangent_angle < -Math.PI)
                tangent_angle += 2 * Math.PI

            let angle_diff;
            // move y_rotation towards tangent angle at this.rot_speed
            if(Math.abs(separation_angle - this.y_rotation) > 1){
                angle_diff = separation_angle - this.y_rotation
            }else {
                angle_diff = tangent_angle - this.y_rotation
            }

            if(Math.abs(angle_diff) > 0.05)
                this.y_rotation += Math.sign(angle_diff) * Math.min(this.rot_speed * dt, Math.abs(angle_diff))

            this.position[0] += Math.sin(this.y_rotation) * this.speed * dt
            this.position[2] += Math.cos(this.y_rotation) * this.speed * dt


            if (Math.random() < this.attack_chance){
                this.attack = true
                this.attack_timer = 0
            }
        }

        const player_pos2d = vec3(ship_pos[0], height, ship_pos[2])

        if (player_pos2d.minus(this.position).norm() < this.kill_radius){
            this.shark_system.kill_player()
        }
    }

    show(caller, uniforms){
        this.shape.draw( caller, uniforms, Mat4.translation(this.position[0], this.position[1], this.position[2])
            .times(Mat4.rotation(this.y_rotation, 0,1,0))
            .times(Mat4.scale(1, 1, 1)), this.material );
    }
}