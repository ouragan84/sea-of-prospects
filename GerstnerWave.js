import {tiny, defs} from './examples/common.js';
const { vec3 } = tiny;

export class GerstnerWave{

    constructor(preset = 'calm') // preset can be 'calm', 'agitated', 'stormy'
    {
        switch(preset){
            case 'calm':
                this.createWaves(
                    32,              // num_waves
                    .3,              // starting_amplitude
                    0.2,            // starting_frequency
                    2.5,             // speed
                    vec3(0,0,1),    // starting_dir
                    0.83,           // max_amplitude_decay
                    1.21,           // max_frequency_decay
                    "gsdg"          // seed_str
                );
                break;
            case 'agitated':
                this.createWaves(
                    32,              // num_waves
                    .5,              // starting_amplitude
                    0.2,            // starting_frequency
                    4,             // speed
                    vec3(0,0,1),    // starting_dir
                    0.78,           // max_amplitude_decay
                    1.29,           // max_frequency_decay
                    "sdge"          // seed_str
                );
                break;
            case 'stormy':
                this.createWaves(
                    32,              // num_waves
                    .5,              // starting_amplitude
                    0.2,            // starting_frequency
                    6,             // speed
                    vec3(0,0,1),    // starting_dir
                    0.78,           // max_amplitude_decay
                    1.29,           // max_frequency_decay
                    "sdgh"          // seed_str
                );
                break;
        }

        console.log(this);
    }

    createWaves(num_waves, starting_steepness, starting_frequency, speed, starting_dir, max_amplitudes_decay, max_frequencies_decay, seed_str){

        const seed = cyrb128(seed_str.toString());
        const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

        const get_random_dir = () => vec3(rand() * 2 - 1, 0, rand() * 2 - 1).normalized();

        this.num_waves = num_waves;
        this.amplitudes = [starting_steepness];
        this.frequencies = [starting_frequency];
        this.speeds = [speed];
        this.directions = [starting_dir];
        this.phases = [rand() * 2 * Math.PI];

        for (let i = 1; i < this.num_waves; i++){
            const amplitudes_decay =  max_amplitudes_decay + rand() * (1 - max_amplitudes_decay);
            const frequencies_decay =  max_frequencies_decay + rand() * (1 - max_frequencies_decay);

            this.amplitudes.push(this.amplitudes[i-1] * amplitudes_decay);
            this.frequencies.push(this.frequencies[i-1] * frequencies_decay);
            this.speeds.push(speed);
            this.directions.push(get_random_dir());
            this.phases.push(rand() * 2 * Math.PI);
        }
    }


    gersrnerWave(pos, t){
        let new_pos = vec3(pos[0], pos[1], pos[2]);
        
        for (let i = 0; i < this.num_waves; i++){
            const a = this.amplitudes[i];
            const d = this.directions[i];
            const w = this.frequencies[i];
            const l = 2 * Math.PI / w;
            const f = w * (pos[0] * d[0] + pos[2] * d[2]) - (this.speeds[i] * 2 / l * t)  + this.phases[i];


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

        for (let i = 0; i < this.num_waves; i++){
            const a = this.amplitudes[i];
            const d = this.directions[i];
            const w = this.frequencies[i];
            const l = 2 * Math.PI / w;
            const f = w * (pos[0] * d[0] + pos[2] * d[2]) - (this.speeds[i] * 2 / l * t)  + this.phases[i];

            rx = rx.plus(vec3(
                - d[0] * d[0] * a * w * Math.sin(f),
                d[0] * a * w * Math.cos(f),
                - d[0] * d[2] * a * w * Math.sin(f)
            ));

            rz = rz.plus(vec3(
                - d[2] * d[0] * a * w * Math.sin(f),
                d[2] * a * w * Math.cos(f),
                - d[2] * d[2] * a * w * Math.sin(f)
            ));
        }

        const n = rz.cross(rx).normalized();
        if (n[1] < 0)
            return n.times(-1);
        return n;
    }



    get_glsl_strings(){
        // Ensure all numeric values have a decimal point to be treated as floats in GLSL
        return {
            num_waves: `const int num_waves = ${this.num_waves};`,
            amplitudes: `float amplitudes[${this.num_waves}];`,
            frequencies: `float frequencies[${this.num_waves}];`,
            speeds: `float speeds[${this.num_waves}];`,
            directions: `vec3 directions[${this.num_waves}];`,
            phases: `float phases[${this.num_waves}];`,
            amplitudesInit: this.amplitudes.map((value, index) => `amplitudes[${index}] = ${value.toFixed(1)};`).join("\n    "),
            frequenciesInit: this.frequencies.map((value, index) => `frequencies[${index}] = ${value.toFixed(1)};`).join("\n    "),
            speedsInit: this.speeds.map((value, index) => `speeds[${index}] = ${value.toFixed(1)};`).join("\n    "),
            directionsInit: this.directions.map((vec, index) => `directions[${index}] = vec3(${vec.map(v => v.toFixed(1)).join(", ")});`).join("\n    "),
            phasesInit: this.phases.map((value, index) => `phases[${index}] = ${value.toFixed(1)};`).join("\n    "),
        }
    }

    solveForY(x, z, t){
        // solve for y at a given x, z, and t.
        // first apply the gersrner wave function to the x, z, and t.
        // based on the new x, z, can compute the error and converge to the x and z value that will give the y value we want.

        let y = 0;
        let error = 0;
        let iterations = 0;
        const max_iterations = 10;
        const max_error = 0.01;
        let my_x = x;
        let my_z = z;
        let pos = this.gersrnerWave(vec3(my_x, 0, my_z), t);

        while (iterations < max_iterations){

            y = pos[1];
            
            const diff_x = pos[0] - x; // if pos is to the right of x, diff_x is positive
            const diff_z = pos[2] - z; // if pos is in front of z, diff_z is positive

            my_x -= diff_x;
            my_z -= diff_z;

            error = Math.sqrt(diff_x * diff_x + diff_z * diff_z);

            if (error < max_error)
                break;

            pos = this.gersrnerWave(vec3(my_x, 0, my_z), t);
            iterations++;
        }

        return y;

    }

}  


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