import {tiny, defs} from './examples/common.js';
import {Shape_From_File}  from './examples/obj-file-demo.js';
const { vec, vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const Islands = defs.Island =
class Islands {
    constructor(fog_param, islandDensity) {
        this.islandDensity = islandDensity;
        this.islands = [];
        this.islandShapes = []
        this.positions = positions

        this.shapes = {
            'island': new Shape_From_File( "assets/objects/island.obj" ),
            'island2': new Shape_From_File( "assets/objects/island2.obj" ),
            'island3': new Shape_From_File( "assets/objects/island3.obj" ),
            'island4': new Shape_From_File( "assets/objects/island4.obj" ),
            'island5': new Shape_From_File( "assets/objects/island5.obj" ),
        }



        for (let i = 0; i < this.islandDensity; i++) {
            this.islands.push(new Island(this.getRandomShape(), this.positions[i], Math.random() * Math.PI ,fog_param));
        }
    }

    OnCollideEnter(ship, shipExplosionCallBack) {
        for (let i = 0; i < this.islands.length; i++) {
            if (this.islands[i].isRigidbodyInsideIsland(ship.rb)) {
                shipExplosionCallBack()
                break; 
            }
        }
    }

    show(caller, uniforms) {
        for (let i = 0 ; i < this.islandDensity; i++){
            this.islands[i].show(caller, uniforms);
        }
    }

    getRandomShape() {
        const shapeKeys = Object.keys(this.shapes);
        const randomIndex = Math.floor(Math.random() * shapeKeys.length);
        const randomKey = shapeKeys[randomIndex];
        return this.shapes[randomKey];
    }
}


export
const Island = defs.Island =
class Island {
    constructor(shape, position, rotation, fog_param){
        this.shape = shape
        this.position = position
        this.rotation = rotation
        this.radius = 10
        const tex_phong = new defs.Textured_Phong(1, fog_param);
        const phong = new defs.Phong_Shader(1, fog_param);
        this.materials = {}
        this.materials.plastic = { shader: phong, ambient: .3, diffusivity: 1, specularity: .5, color: color( 0.647, 0.164, 0.164,1 )}
    }

    show(caller, uniforms) {
        let model_transform = Mat4.translation(this.position["x"], 0, this.position["y"]).times(Mat4.scale(15, 15, 15)).times(Mat4.rotation(this.rotation, 0,1,0));
        this.shape.draw(caller, uniforms,model_transform, this.materials.plastic );
    }

    isRigidbodyInsideIsland(rb) {
        const corners = [
            rb.getTransformationMatrix().times(vec4(-1, 1, 1, 1)).to3(),
            rb.getTransformationMatrix().times(vec4(1, 1, 1, 1)).to3(),
            rb.getTransformationMatrix().times(vec4(-1, 1, -1, 1)).to3(),
            rb.getTransformationMatrix().times(vec4(1, 1, -1, 1)).to3()
        ];
    
        for (const corner of corners) {
            // Calculate the distance between the island center and the ship's corner
            const distance = Math.sqrt(
                Math.pow(corner[0] - this.position["x"], 2) +
                Math.pow(corner[2] - this.position["y"], 2) // We use corner[2] (z-axis) because it corresponds to the 'y' in island's position
            );
    
            // Check if the distance is less than or equal to the island's radius
            if (distance <= this.radius) {
                return true;
            }
        }
    
        return false;
    }
}



const positions = [
    {
        "x": 84.72734253819033,
        "y": -113.87161309279924
    },
    {
        "x": -11.089923547957142,
        "y": 97.28416734231439
    },
    {
        "x": 82.14474896361185,
        "y": 174.97813933826694
    },
    {
        "x": 78.2529573662473,
        "y": 244.25426399303353
    },
    {
        "x": 485.2322822871507,
        "y": 322.0396589248112
    },
    {
        "x": -242.19806664442314,
        "y": -7.516237215563365
    },
    {
        "x": 171.664140014194,
        "y": 69.51923134775154
    },
    {
        "x": -153.19624984366686,
        "y": 204.5254905763552
    },
    {
        "x": 300.2403057405944,
        "y": 410.31126989578536
    },
    {
        "x": 314.28893267372734,
        "y": 22.62610811395666
    },
    {
        "x": -205.56104667096332,
        "y": 85.99148793363509
    },
    {
        "x": -81.59847686363076,
        "y": -446.93538456215776
    },
    {
        "x": -204.08212903431667,
        "y": -338.7678343651867
    },
    {
        "x": 59.61612139288388,
        "y": 431.2439750298877
    },
    {
        "x": -169.5805559565701,
        "y": -120.29879004263631
    },
    {
        "x": -446.0187269519897,
        "y": 497.2220847015069
    },
    {
        "x": 351.44599498470143,
        "y": 165.55688978627404
    },
    {
        "x": 6.041908981990218,
        "y": -279.7733338803388
    },
    {
        "x": -52.10234474018563,
        "y": 386.45005906332165
    },
    {
        "x": -41.56104846866816,
        "y": -29.46950649188227
    },
    {
        "x": -148.15910902367438,
        "y": 358.6166572619795
    },
    {
        "x": -194.16628983341934,
        "y": -319.97981419127285
    },
    {
        "x": 244.2593253350742,
        "y": 59.08383069783849
    },
    {
        "x": -452.42462839762845,
        "y": 215.600477212653
    },
    {
        "x": -75.28782949358668,
        "y": -467.8561361518817
    },
    {
        "x": -224.721522619081,
        "y": -356.31863915278495
    },
    {
        "x": -34.16894516264301,
        "y": -143.29818399121422
    },
    {
        "x": -455.91691578739733,
        "y": -63.12594643732319
    },
    {
        "x": 367.2259695669842,
        "y": -125.75883235776888
    },
    {
        "x": -495.45481715633065,
        "y": -401.7374392104871
    },
    {
        "x": 45.97816995667063,
        "y": 179.63078154438813
    },
    {
        "x": -370.6964219971795,
        "y": -32.11773099527329
    },
    {
        "x": -48.121514865357994,
        "y": -84.17948350701289
    },
    {
        "x": 499.72935846736016,
        "y": -118.07910827593207
    },
    {
        "x": 241.64874032393448,
        "y": -303.9403613122248
    },
    {
        "x": -249.0788437711746,
        "y": 389.16378621472177
    },
    {
        "x": 256.5688707360671,
        "y": -70.77578455016197
    },
    {
        "x": -490.4007276258097,
        "y": -358.14277315814
    },
    {
        "x": -188.4830814995306,
        "y": -370.578627716294
    },
    {
        "x": 446.1131506894957,
        "y": -13.921401417255936
    },
    {
        "x": -292.8801662018458,
        "y": -462.720808315816
    },
    {
        "x": 140.07268628881536,
        "y": 292.938720649777
    },
    {
        "x": -334.30543805778024,
        "y": -108.80941152755719
    },
    {
        "x": 386.1514004067835,
        "y": -432.87248225224596
    },
    {
        "x": -281.97602693946635,
        "y": -83.42619220774839
    },
    {
        "x": -499.9153691099776,
        "y": -45.41663299750911
    },
    {
        "x": 236.0263646553626,
        "y": 299.4925707020444
    },
    {
        "x": 448.8652123886295,
        "y": -388.398063981921
    },
    {
        "x": -478.189800650597,
        "y": 83.61924593905712
    },
    {
        "x": 338.58774560238624,
        "y": -30.19039139255375
    },
    {
        "x": 215.13338544019882,
        "y": 468.77363249527264
    },
    {
        "x": -106.13655990616422,
        "y": -130.11715845155692
    },
    {
        "x": 473.4296216703425,
        "y": -362.6895784085986
    },
    {
        "x": 410.2122333824234,
        "y": -376.23075444783206
    },
    {
        "x": 442.39143335350593,
        "y": 231.34533564856815
    },
    {
        "x": 64.55319294872174,
        "y": -114.64991401192793
    },
    {
        "x": 318.7386070756187,
        "y": -455.4940181096481
    },
    {
        "x": -80.04832420839301,
        "y": 391.3632379606654
    },
    {
        "x": -176.56792344035608,
        "y": 241.00568354906977
    },
    {
        "x": -329.15301300088515,
        "y": 249.12516655964657
    },
    {
        "x": -345.332940140486,
        "y": 326.68490265618743
    },
    {
        "x": -485.8324647014443,
        "y": 245.1121378604065
    },
    {
        "x": 342.9853214880893,
        "y": -260.79988865121396
    },
    {
        "x": 356.92867239432667,
        "y": -304.8952240943168
    },
    {
        "x": -96.69251730808116,
        "y": 475.7693525915222
    },
    {
        "x": 279.7777640622428,
        "y": -73.83869136042654
    },
    {
        "x": -151.2208747148864,
        "y": -43.54647308917771
    },
    {
        "x": -277.5361421637351,
        "y": 334.2396906531044
    },
    {
        "x": 74.35940838856106,
        "y": 137.5674794624482
    },
    {
        "x": 171.05378897819162,
        "y": -116.96503889049501
    },
    {
        "x": 465.74507725833394,
        "y": 286.37424250443974
    },
    {
        "x": 65.25013439689735,
        "y": -243.45662414938994
    },
    {
        "x": 109.87835589585723,
        "y": 262.4338720553676
    },
    {
        "x": 92.27696183412434,
        "y": 148.51574039420643
    },
    {
        "x": 47.283617325661794,
        "y": 7.219597237633309
    },
    {
        "x": 36.46082764659673,
        "y": -176.77978137772686
    },
    {
        "x": 300.9901478495781,
        "y": 134.67846121484763
    },
    {
        "x": -333.11586928178906,
        "y": -399.67219387762486
    },
    {
        "x": 173.32093178906166,
        "y": -427.7309837544181
    },
    {
        "x": 5.910631864189497,
        "y": -139.492585884334
    },
    {
        "x": -25.527665707427047,
        "y": -492.7290415991754
    },
    {
        "x": -492.28667406658434,
        "y": -159.86471126865564
    },
    {
        "x": 282.81035358142776,
        "y": -220.68123377958983
    },
    {
        "x": -21.482058047088003,
        "y": -310.11846762894527
    },
    {
        "x": 358.80651104828314,
        "y": -10.769219161635306
    },
    {
        "x": -284.2926978464285,
        "y": 177.62718354512435
    },
    {
        "x": -112.80992233215102,
        "y": 348.3333014626978
    },
    {
        "x": 434.8729837549082,
        "y": -468.1922107502886
    },
    {
        "x": 104.76855694681001,
        "y": 180.44671789180188
    },
    {
        "x": -489.73489057763254,
        "y": -72.47186796875093
    },
    {
        "x": -24.472230955613327,
        "y": 322.9247672985623
    },
    {
        "x": -6.721376560405076,
        "y": 434.1013103409342
    },
    {
        "x": -175.51199835128142,
        "y": -312.60950225436534
    },
    {
        "x": -317.6553600560113,
        "y": 499.38457689599863
    },
    {
        "x": -162.014870161705,
        "y": 476.0397478228383
    },
    {
        "x": 300.7215257176306,
        "y": 109.1571628163158
    },
    {
        "x": -270.314829950261,
        "y": -340.1979215993145
    },
    {
        "x": -448.7445346686669,
        "y": -359.1821730701148
    },
    {
        "x": -153.32298396150526,
        "y": -354.4978271328628
    },
    {
        "x": 357.4786342935836,
        "y": -367.9358187072513
    }
]