import {tiny} from './tiny-graphics.js';

export const FoamGradientShader = class FoamGradientShader extends tiny.Shader {
    // Override vertex shader code
    vertex_glsl_code() {
        return `
            attribute vec4 position;
            void main() {
                gl_Position = position;
            }
        `;
    }

    // Override fragment shader code
    fragment_glsl_code() {
        return `
            precision mediump float;
            uniform sampler2D foamTexture;
            uniform float time;
            void main() {
                vec2 uv = gl_FragCoord.xy / vec2(256.0, 256.0); // Assuming a 256x256 texture
                vec4 prevFrameColor = texture2D(foamTexture, uv);
                // Example gradient calculation; modify as needed
                gl_FragColor = mix(vec4(uv, 0.0, 1.0), prevFrameColor, 0.5);
            }
        `;
    }
}
