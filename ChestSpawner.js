import { Chest } from './Chest.js';
import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Vector3 } = tiny;

export
const ChestSpawner = defs.ChestSpawner =
class ChestSpawner {
    constructor(scoreIncreaseCallback, fog_param){
        this.chests = []
        for (let i = 0; i < chest_positions.length; i++){
            this.chests.push(new Chest(vec3(chest_positions[i].x, 1, chest_positions[i].y), Math.random() * Math.PI, scoreIncreaseCallback, fog_param))
        }
    }

    update(t, dt, ship_pos){
        for (let i = 0; i < this.chests.length; i++){
            let chest_pos = this.chests[i].position;
            let distance = ship_pos.minus(chest_pos).norm(); // Calculate the distance between the ship and the chest

            if (distance <= 5 && !this.chests[i].startChestOpen) {
                this.chests[i].openChest(); // Open the chest if the ship is within a distance of 5 or less
            }

            this.chests[i].update(t, dt, ship_pos);
        }
    }

    show(caller, uniforms){
        for (let i = 0; i < chest_positions.length; i++){
            this.chests[i].show(caller, uniforms)
        }
    }
}







const chest_positions = [
    {
        "x": -121.85730181169903,
        "y": 139.47721176333994
    },
    {
        "x": -184.60224472752208,
        "y": 79.52675312144908
    },
    {
        "x": 43.97220919976132,
        "y": -134.54655085034943
    },
    {
        "x": 55.30841843233665,
        "y": -83.20484158150423
    },
    {
        "x": -171.69407551570987,
        "y": -103.35271790416809
    },
    {
        "x": -115.54001743435762,
        "y": -196.3862376434425
    },
    {
        "x": 126.51993684239085,
        "y": 185.34302584005445
    },
    {
        "x": 19.01902144757642,
        "y": -163.20148690237596
    },
    {
        "x": 196.88052269715666,
        "y": -129.2808797217865
    },
    {
        "x": -61.39815025973948,
        "y": -26.060210019728032
    },
    {
        "x": 46.83078850586023,
        "y": -158.8224377632642
    },
    {
        "x": 88.13440220369517,
        "y": -196.60239108526446
    },
    {
        "x": -81.47941500026073,
        "y": 17.226915400680923
    },
    {
        "x": -132.48992713970483,
        "y": -41.69599984884047
    },
    {
        "x": 132.71302946226854,
        "y": -65.96967032610897
    },
    {
        "x": -6.6177905535996615,
        "y": -120.61651670260557
    },
    {
        "x": 156.31360786422516,
        "y": -3.8841587742830086
    },
    {
        "x": 47.44247465374062,
        "y": 58.86201857358594
    },
    {
        "x": 69.48336349405281,
        "y": 41.642619627429895
    },
    {
        "x": -40.13145959973525,
        "y": 166.58073550048414
    },
    {
        "x": 134.58526174816427,
        "y": -17.830294361218137
    },
    {
        "x": -65.41877034497173,
        "y": -175.09999142546152
    },
    {
        "x": 142.21413525452613,
        "y": -151.6561685959349
    },
    {
        "x": 10.856995682268604,
        "y": 175.60258630863592
    },
    {
        "x": -92.1205702496406,
        "y": -67.96188004504779
    },
    {
        "x": -164.5260576549015,
        "y": 129.8236283212459
    },
    {
        "x": 196.30075907070398,
        "y": 167.4121904029309
    },
    {
        "x": -134.6618876168915,
        "y": 56.14922192091541
    },
    {
        "x": 52.631127752915546,
        "y": -59.38663998820877
    },
    {
        "x": -82.24767485100406,
        "y": 54.81895122570393
    },
    {
        "x": 81.77322453182347,
        "y": 67.74211780732287
    },
    {
        "x": -171.40072129808868,
        "y": -5.156011504168305
    },
    {
        "x": -33.27807678171854,
        "y": -70.00858835489802
    },
    {
        "x": -56.7028556565179,
        "y": 158.51744321616889
    },
    {
        "x": -47.780034627072354,
        "y": -199.71604445440292
    },
    {
        "x": 153.46160600232895,
        "y": -185.4921841931628
    },
    {
        "x": -96.95106282456996,
        "y": 181.9014602759114
    },
    {
        "x": 114.98611095842745,
        "y": 107.90993534593076
    },
    {
        "x": 89.11582406362578,
        "y": 106.48546399745152
    },
    {
        "x": -48.48962634219393,
        "y": 113.2850283969288
    },
    {
        "x": -73.36525895769341,
        "y": -62.6684373119065
    },
    {
        "x": -142.32813008154488,
        "y": 138.09778614327996
    },
    {
        "x": 107.91990435267047,
        "y": 5.472386589192439
    },
    {
        "x": -181.77005844947703,
        "y": 16.340306329600992
    },
    {
        "x": 192.70301258401076,
        "y": 108.87681431479228
    },
    {
        "x": -84.49112553650137,
        "y": -104.5353468030747
    },
    {
        "x": 125.08539038157858,
        "y": -102.32858621768469
    },
    {
        "x": -142.51288450833664,
        "y": -170.80301369059333
    },
    {
        "x": -137.5622518948166,
        "y": 20.799626247167907
    },
    {
        "x": -44.478814330713504,
        "y": 145.55056887033055
    },
    {
        "x": -183.64484072170674,
        "y": 39.43755566113282
    },
    {
        "x": 118.01856548802215,
        "y": -37.33391033430121
    },
    {
        "x": -176.37547786203393,
        "y": 180.69998435965067
    },
    {
        "x": 67.63127701424463,
        "y": 197.651413308084
    },
    {
        "x": -22.493121572823895,
        "y": -180.51156175244412
    },
    {
        "x": 122.02986149619966,
        "y": -7.299282859716982
    },
    {
        "x": -123.7440213244239,
        "y": -57.145802914380596
    },
    {
        "x": -92.34357539968521,
        "y": -142.75765642532843
    },
    {
        "x": 145.48485319487372,
        "y": -97.11372152393385
    },
    {
        "x": -169.42342596355832,
        "y": 65.41231311673903
    },
    {
        "x": -41.428017869870615,
        "y": -160.16119447965667
    },
    {
        "x": 97.20060890316648,
        "y": -147.1510858872502
    },
    {
        "x": 112.21473085711955,
        "y": -178.0882994123359
    },
    {
        "x": 38.06405900637125,
        "y": -40.371901635564285
    },
    {
        "x": 21.505670760779566,
        "y": -63.13924045023427
    },
    {
        "x": 129.88678361007675,
        "y": -172.3778870717378
    },
    {
        "x": -165.44819905351798,
        "y": -83.79085906625265
    },
    {
        "x": 105.69044915381329,
        "y": 46.451843191245956
    },
    {
        "x": 14.624453966075151,
        "y": -94.26807819722379
    },
    {
        "x": 179.94546224178663,
        "y": 173.79256983209007
    },
    {
        "x": -126.13962450647654,
        "y": -103.81283908896188
    },
    {
        "x": 9.829985795739475,
        "y": 158.0983968642205
    },
    {
        "x": 134.94003169974735,
        "y": 68.60688726895148
    },
    {
        "x": -89.69241378939317,
        "y": 164.7554440987828
    },
    {
        "x": -60.95016914023236,
        "y": -110.62657695995478
    },
    {
        "x": 88.545457810696,
        "y": -84.0435206026664
    },
    {
        "x": -143.85612394504835,
        "y": -72.24678146521057
    },
    {
        "x": 64.08046984827604,
        "y": -145.7464244075066
    },
    {
        "x": -196.49153898545936,
        "y": -77.98637794959728
    },
    {
        "x": 154.5485837089227,
        "y": 160.61587243723523
    },
    {
        "x": -9.273164159482405,
        "y": -62.50348995847631
    },
    {
        "x": 143.8737633908218,
        "y": 172.0263469221918
    },
    {
        "x": 198.02682006185051,
        "y": 22.345109088670966
    },
    {
        "x": -150.59878185722133,
        "y": 95.62252905031238
    },
    {
        "x": 121.51899026005867,
        "y": -52.065531063696994
    },
    {
        "x": -95.95461444476845,
        "y": 98.44455341476379
    },
    {
        "x": -196.55930332706822,
        "y": 148.34677544801053
    },
    {
        "x": -183.4167899725115,
        "y": -146.35915698510829
    },
    {
        "x": -55.1883909952071,
        "y": 66.1482856429783
    },
    {
        "x": -63.438736592430274,
        "y": -141.59941287286512
    },
    {
        "x": 28.49577555473539,
        "y": 130.67931269389544
    },
    {
        "x": -103.42052785600745,
        "y": 10.885646404711622
    },
    {
        "x": -43.59112617934713,
        "y": -7.638603113258512
    },
    {
        "x": 106.386881918543,
        "y": -16.790767851901222
    },
    {
        "x": -189.32663718531327,
        "y": -9.823587424719108
    },
    {
        "x": 51.99222700795491,
        "y": 89.82935179630721
    },
    {
        "x": -103.69772105975805,
        "y": -9.213963580278943
    },
    {
        "x": -140.90465616109992,
        "y": 163.66566143620906
    },
    {
        "x": 141.74222849477422,
        "y": 11.94352227073773
    },
    {
        "x": -52.37172042203727,
        "y": 9.274290920337421
    }
]