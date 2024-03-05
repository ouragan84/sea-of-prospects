# ALTER PARAMETERS HERE
# PASTE OUTPUT INTO Ocean.js, line 25
# can do `python gerstner-gen.py | pbcopy` to copy directly to clipboard

n = 20
max_steepness = 0.4
min_steepness = 0.01
max_length = 20.0
min_length = 0.1
min_vel = 0.5
max_vel = 5.0

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

# create linspace from 0 to 1 with n points=
rand_centers = [(n-i)/n for i in range(n)]
rand_deviation = .5/n

waves = []

for center in rand_centers:
    steepness = inv_exp_rand(min_steepness, max_steepness, rand_deviation, center)
    length = inv_exp_rand(min_length, max_length, rand_deviation, center)
    vel = inv_exp_rand(max_vel, min_vel, rand_deviation, center)
    dirx = random.random() * 2 - 1
    diry = random.random() * 2 - 1
    waves.append([steepness, length, vel, dirx, diry])

str_out = ""

str_out += "this.n = " + str(n) + ";\n"
str_out += "this.s = [" + ", ".join([str(w[0]) for w in waves]) + "];\n"
str_out += "this.l = [" + ", ".join([str(w[1]) for w in waves]) + "];\n"
str_out += "this.v = [" + ", ".join([str(w[2]) for w in waves]) + "];\n"
str_out += "this.dir = ["
for w in waves:
    str_out += "vec3(" + str(w[3]) + ", 0, " + str(w[4]) + "),\n"
str_out += "];"

print(str_out)