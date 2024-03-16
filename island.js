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
        this.texPhong = new defs.Textured_Phong(1, fog_param);
        this.rockTexture = new Texture("assets/textures/rock_tex.jpg")
        this.iceTexture = new Texture("assets/textures/ice.jpg")
        this.positions = positions

        this.shapes = {
            'island': new Shape_From_File( "assets/objects/island.obj" ),
            'island2': new Shape_From_File( "assets/objects/island2.obj" ),
            'island3': new Shape_From_File( "assets/objects/island3.obj" ),
            'island4': new Shape_From_File( "assets/objects/island4.obj" ),
            'island5': new Shape_From_File( "assets/objects/island5.obj" ),
        }



        for (let i = 0; i < this.islandDensity; i++) {
            let shape = this.getRandomShape()
            let tex = this.rockTexture
            if (Math.random() < .3){
                tex = this.iceTexture
            }
            this.islands.push(new Island(shape, this.texPhong, tex, this.positions[i], Math.random() * Math.PI ,fog_param));
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
    constructor(shape, shader, texture, position, rotation, fog_param){
        this.shape = shape
        this.position = position
        this.rotation = rotation
        this.radius = 6.85
        this.materials = {}

        this.materials.plastic = { shader: shader, ambient: .3, diffusivity: 1, specularity: .5, texture: texture, color: color( 1,1,1,1 )}
    }

    show(caller, uniforms) {
        let model_transform = Mat4.translation(this.position["x"], 0, this.position["y"]).times(Mat4.scale(10, 10, 10)).times(Mat4.rotation(this.rotation, 0,1,0));
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
        "x": -73.81178098461838,
        "y": 81.50032617437017
    },
    {
        "x": -190.4337986927917,
        "y": 82.40749108656127
    },
    {
        "x": -37.07932788974895,
        "y": -123.17848658157806
    },
    {
        "x": -114.33234751968561,
        "y": 116.1700730518915
    },
    {
        "x": 93.57716261642764,
        "y": -84.67459556914095
    },
    {
        "x": -78.64067427472774,
        "y": 132.54539224430857
    },
    {
        "x": 84.23021902062061,
        "y": -138.05715681807214
    },
    {
        "x": 42.20156107860004,
        "y": 92.54210280000098
    },
    {
        "x": 194.5469326543577,
        "y": 35.62443506493773
    },
    {
        "x": -40.10387854395927,
        "y": 32.31140961395374
    },
    {
        "x": 30.62964256672319,
        "y": -4.098870446222719
    },
    {
        "x": -172.81094395268548,
        "y": -21.88475113559764
    },
    {
        "x": -166.1540827650743,
        "y": 21.459998937568457
    },
    {
        "x": -191.23165172398924,
        "y": -40.824209950376655
    },
    {
        "x": 109.27153148916022,
        "y": 165.09074405321257
    },
    {
        "x": 70.38868442937292,
        "y": 22.11615124545284
    },
    {
        "x": -166.08939780122046,
        "y": 96.53554264134573
    },
    {
        "x": 140.01899840306595,
        "y": 87.35938082776875
    },
    {
        "x": 139.75362170168427,
        "y": -1.9716232982497672
    },
    {
        "x": -146.82517037716218,
        "y": -2.9836963682105306
    },
    {
        "x": -26.692590677064658,
        "y": -188.86678748409273
    },
    {
        "x": -51.66224218118364,
        "y": -181.83970890375352
    },
    {
        "x": 24.64050084421706,
        "y": -181.0096145245443
    },
    {
        "x": 109.59214146793778,
        "y": -174.73637068076053
    },
    {
        "x": -140.47888623262295,
        "y": -154.81471789775537
    },
    {
        "x": 16.44956448618413,
        "y": 141.71362346892596
    },
    {
        "x": 174.41831182382776,
        "y": 72.52201445602981
    },
    {
        "x": 172.0346483593043,
        "y": -49.93836515736837
    },
    {
        "x": 38.99948631777778,
        "y": 184.81656688052544
    },
    {
        "x": -192.53536890087517,
        "y": 32.38909011593205
    },
    {
        "x": 31.025542827703532,
        "y": -144.35722831055716
    },
    {
        "x": 196.3147770979307,
        "y": -165.2342696171329
    },
    {
        "x": -189.24922884747068,
        "y": -173.93932344411104
    },
    {
        "x": -124.45719705873243,
        "y": -50.981963255417725
    },
    {
        "x": 77.53147813907094,
        "y": 0.790255450624727
    },
    {
        "x": -11.47446668600685,
        "y": 109.66232377372478
    },
    {
        "x": 41.90742625262976,
        "y": 164.17016619948998
    },
    {
        "x": -195.83933200256186,
        "y": 153.53104428769717
    },
    {
        "x": 107.10450402955388,
        "y": -37.34324433626054
    },
    {
        "x": -169.63732975856612,
        "y": -92.81301891779572
    },
    {
        "x": -94.39863533800401,
        "y": -179.19977477864845
    },
    {
        "x": 73.68251426987496,
        "y": -72.30057386625761
    },
    {
        "x": 167.93754084083287,
        "y": -172.2482681801718
    },
    {
        "x": -42.41377391397441,
        "y": -46.13621705225262
    },
    {
        "x": 109.25268675448706,
        "y": 81.97964956102857
    },
    {
        "x": 107.89380838444879,
        "y": -59.23594179771149
    },
    {
        "x": -172.09765444925722,
        "y": -137.43936929329212
    },
    {
        "x": -140.27222975260548,
        "y": 171.92273387944653
    },
    {
        "x": 184.88615604675232,
        "y": 145.82317574880722
    },
    {
        "x": 140.96529293586445,
        "y": 190.98007094540918
    },
    {
        "x": -5.316731495639772,
        "y": 187.7696094435566
    },
    {
        "x": 178.0747475783022,
        "y": -77.61163583472279
    },
    {
        "x": 189.30855864901872,
        "y": 7.721274457303366
    },
    {
        "x": 150.8047051158693,
        "y": 108.19741135894526
    },
    {
        "x": -146.15952449826946,
        "y": 198.06461468340802
    },
    {
        "x": 131.72044976981044,
        "y": 125.20400090298227
    },
    {
        "x": -199.00427033621736,
        "y": -1.1192992402396271
    },
    {
        "x": -105.09548583112593,
        "y": 14.56241739498131
    },
    {
        "x": -35.17309917826208,
        "y": 127.82410274725402
    },
    {
        "x": -89.82750464940624,
        "y": -103.95406721213658
    },
    {
        "x": -133.95547431012469,
        "y": -90.19099935459849
    },
    {
        "x": -106.56856517312363,
        "y": 194.46549576254984
    },
    {
        "x": 69.64373739656622,
        "y": -34.211691039760154
    },
    {
        "x": -198.42691259534587,
        "y": 122.6108949352801
    },
    {
        "x": -147.2857481023333,
        "y": 47.537277406921476
    },
    {
        "x": -149.7323747772326,
        "y": -184.83498068622578
    },
    {
        "x": -117.83788838854692,
        "y": -127.60281330776641
    },
    {
        "x": 129.96031384981325,
        "y": -173.87002999318648
    },
    {
        "x": 54.52430323299154,
        "y": -6.619987800409717
    },
    {
        "x": -112.69268518976298,
        "y": -197.46232732386707
    },
    {
        "x": -130.8497410323945,
        "y": 70.34592266169574
    },
    {
        "x": 90.9340292586715,
        "y": 53.619262121169214
    },
    {
        "x": -160.7141710474917,
        "y": 124.88493303151012
    },
    {
        "x": -137.36863383989294,
        "y": -22.765964080776968
    },
    {
        "x": -21.278291333783983,
        "y": 152.4146843260013
    },
    {
        "x": -39.30813983789966,
        "y": 83.65891546385404
    },
    {
        "x": -80.10355662619446,
        "y": -33.107846139010945
    },
    {
        "x": -181.16670229605558,
        "y": 187.65260525199074
    },
    {
        "x": 138.55375532352662,
        "y": 61.39308049988415
    },
    {
        "x": 133.9838454120911,
        "y": -24.32756399648909
    },
    {
        "x": -48.23026445876533,
        "y": -79.00784839541343
    },
    {
        "x": 65.45987515622812,
        "y": -118.02579128749304
    },
    {
        "x": 39.97871357678301,
        "y": -66.427184124163
    },
    {
        "x": 88.58137704946142,
        "y": 146.24972024479257
    },
    {
        "x": 54.2479139375144,
        "y": -81.91086642163405
    },
    {
        "x": -108.7278881300584,
        "y": 94.77646468718109
    },
    {
        "x": 187.39303155429025,
        "y": -128.4671702383917
    },
    {
        "x": 54.59142478032123,
        "y": 73.80200014720481
    },
    {
        "x": -69.15873687050635,
        "y": 14.515116378704562
    },
    {
        "x": 172.4555200166963,
        "y": 92.82633913721281
    },
    {
        "x": 155.65061770756824,
        "y": -100.27680279994638
    },
    {
        "x": -9.892339896095365,
        "y": 52.13299914263945
    },
    {
        "x": -33.179430592949416,
        "y": 105.3481057548733
    },
    {
        "x": -109.59148324963954,
        "y": 144.36775768370757
    },
    {
        "x": 91.66380165724757,
        "y": 105.73947722720789
    },
    {
        "x": -72.94467023118054,
        "y": -71.17192522675361
    },
    {
        "x": 17.08174604139785,
        "y": -43.00489686907602
    },
    {
        "x": 9.252797423262649,
        "y": -166.9460466762187
    },
    {
        "x": -44.33632042303253,
        "y": -147.8291777414819
    },
    {
        "x": -4.190281878866784,
        "y": -187.9007992283486
    }
]