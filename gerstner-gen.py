# ALTER PARAMETERS HERE
# PASTE OUTPUT INTO Ocean.js, line 25
# can do `python gerstner-gen.py | pbcopy` to copy directly to clipboard

n = 30
max_steepness = 0.8
min_steepness = 0.1
max_length = 20.0
min_length = 0.1
min_vel = 0.5
max_vel = 5.0

main_dir = [1,1]

import random
import math

def inv_exp_rand( rare, common, random_deviation, random_center ):
    random_val = (random.random()*2-1) * random_deviation + random_center
    val = math.pow( common / rare, random_val ) * rare
    if common < rare and val < common or common > rare and val > common:
        val = common
    if rare < common and val < rare or rare > common and val > rare:
        val = rare
    return val

# create linspace from 1 to 0 with n points
rand_centers = [(n-i)/n for i in range(n)]
rand_deviation = .5/n

waves = []

for center in rand_centers:
    steepness = inv_exp_rand(max_steepness, min_steepness, rand_deviation, center)
    length = inv_exp_rand(min_length, max_length, rand_deviation, center)
    vel = inv_exp_rand(max_vel, min_vel, rand_deviation, center)

    mix_factor = inv_exp_rand(1, 0.00001, 0, center)  # Closer to 1 means closer to main_dir, closer to 0 means more random
    random_dir = [random.uniform(-1, 1), random.uniform(-1, 1)]  # Generate a random direction
    
    # Normalize the random direction
    random_dir_magnitude = math.sqrt(random_dir[0]**2 + random_dir[1]**2)
    random_dir = [random_dir[0] / random_dir_magnitude, random_dir[1] / random_dir_magnitude]
    
    # Interpolate between main_dir and random_dir based on mix_factor
    dirx = (main_dir[0] * mix_factor + random_dir[0] * (1 - mix_factor))
    diry = (main_dir[1] * mix_factor + random_dir[1] * (1 - mix_factor))
    
    # Optionally, ensure dirx and diry are within the -1 to 1 range, though this should already be the case
    magnitude = math.sqrt(dirx**2 + diry**2)
    dirx, diry = dirx / magnitude, diry / magnitude

    waves.append([steepness, length, vel, dirx, diry])

str_out = ""

str_out += "this.n = " + str(n) + ";\n"
str_out += "\t\tthis.s = [" + ", ".join([str(w[0]) for w in waves]) + "];\n"
str_out += "\t\tthis.l = [" + ", ".join([str(w[1]) for w in waves]) + "];\n"
str_out += "\t\tthis.v = [" + ", ".join([str(w[2]) for w in waves]) + "];\n"
str_out += "\t\tthis.dir = [\n"
for w in waves:
    str_out += "\t\t\tvec3(" + str(w[3]) + ", 0, " + str(w[4]) + "),\n"
str_out += "\t\t];"

print(str_out)