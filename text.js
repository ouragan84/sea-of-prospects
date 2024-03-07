import {tiny, defs} from './examples/common.js';
import { Text_Line } from './examples/text-demo.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const Text = defs.Text =
class Text {

    constructor(fog_param, str) 
    { 
        this.str = str 
        this.shapes = { cube: new defs.Cube(), text: new Text_Line( 35 ) };
        this.widget_options = { make_controls: false };

        //this.render_distance = 80;
        //const fog_param = { color: color(.8,.9,1,1), start: this.render_distance-20, end: this.render_distance };

        const phong   = new defs.Phong_Shader(1, fog_param);
        const texture = new defs.Textured_Phong( 1 );
        this.grey       = { shader: phong, color: color( .5,.5,.5,1 ), ambient: 0,
                                        diffusivity: .3, specularity: .5, smoothness: 10 }

                                // To show text you need a Material like this one:
        this.text_image = { shader: texture, ambient: 1, diffusivity: 0, specularity: 0,
                                        texture: new Texture( "assets/text.png" ) };

        // this.transform = Mat4.identity().times(Mat4.rotation(Math.PI/4, 0,1,0)).times(Mat4.translation(-6,5,0))
    }

    update_string(str)
    {
        this.str = str
    }

    draw(caller, uniforms, transform)
    {
        const t = uniforms.animation_time/1000;
        //const funny_orbit = Mat4.rotation( Math.PI/4*t,   Math.cos(t), Math.sin(t), 1 );
        //this.shapes.cube.draw( caller, uniforms, this.transform, this.grey );
        this.shapes.text.set_string( this.str, caller );
        this.shapes.text.draw( caller, uniforms, transform, this.text_image );
    }
}

