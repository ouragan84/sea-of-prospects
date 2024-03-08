import {tiny, defs} from './examples/common.js';
const { vec3 } = tiny;

// Stolen from stackoverflow
const cyrb128 = (str) => {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

// Stolen from stackoverflow
const sfc32 = (a, b, c, d) => {
    return function() {
      a |= 0; b |= 0; c |= 0; d |= 0; 
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

export class GerstnerWave{

    constructor()
    {
        this.createWaves(
            35,             // num_waves
            0.1,            // starting_steepness
            20,             // starting_wave_length
            1,              // starting_speed   
            vec3(1,0,0),    // starting_dir
            0.87,           // max_steepness_decay
            1.29,            // max_wave_length_decay
            0.81,           // max_speed_decay
            "poo"          // seed_str
        );

        console.log(this);
    }

    createWaves(num_waves, starting_steepness, starting_wave_length, starting_speed, starting_dir, 
        max_steepness_decay, max_wave_length_decay, max_speed_decay, seed_str){

        const seed = cyrb128(seed_str.toString());
        const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

        const get_random_dir = () => vec3(rand() * 2 - 1, 0, rand() * 2 - 1).normalized();

        this.n = num_waves;
        this.s = [starting_steepness];
        this.l = [starting_wave_length];
        this.v = [starting_speed];
        this.dir = [get_random_dir()];

        for (let i = 1; i < this.n; i++){
            const steepness_decay =  max_steepness_decay + rand() * (1 - max_steepness_decay);
            const wave_length_decay =  max_wave_length_decay + rand() * (1 - max_wave_length_decay);
            const speed_decay =  max_speed_decay + rand() * (1 - max_speed_decay);

            this.s.push(this.s[i-1] / steepness_decay);
            this.l.push(this.l[i-1] / wave_length_decay);
            this.v.push(this.v[i-1] / speed_decay);
            this.dir.push(get_random_dir());
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

        const n = rz.cross(rx).normalized();
        if (n[1] < 0)
            return n.times(-1);
        return n;
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