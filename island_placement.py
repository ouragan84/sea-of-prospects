import random
import json

def generate_positions(count, min_distance, x_range, y_range):
    positions = []
    while len(positions) < count:
        x = random.uniform(x_range[0], x_range[1])
        y = random.uniform(y_range[0], y_range[1])
        if all(((x - pos['x'])**2 + (y - pos['y'])**2) >= min_distance**2 for pos in positions):
            positions.append({'x': x, 'y': y})
    return positions

positions = generate_positions(100, 20, (-200, 200), (-200, 200))

file_name = './positions.json'

with open(file_name, 'w') as file:
    json.dump(positions, file, indent=4)

print(f"Positions are saved to {file_name}")
