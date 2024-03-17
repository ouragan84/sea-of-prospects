# SEA OF PROSPECTS

## Overview:

This is a game in tiny-graphics.js, it is an ocean surface simulation with rigid body system, cloth simulation, particle system, boid simulation, and animation principles. The object of the game is to navigate the ocean and collect teasures (prospects) while avoiding rocks and sharks.

Move with `wasd`, activate experimental Screen space reflection with `r`.

To play, you can start the python server, or go to ship.edgarbaudry.dev

### Algothims Used:
 - RigidBody Simulation
 - Buoyancy simulation (discreet points on mesh)
 - Sum of Gerstner wave ocean simulation (normals and displacment vectors calculated in shader for performance)
 - Rain Particle System
 - Dynamic foam texture (based on jacobian of gerstner displacment)
 - Simple Shark Boid System
 - lerps and slerps for camera and propects
 - Chest open animation (animation curves)
 - Cloth Simulation for sail and flag
 - Collision Detection

### Extra graphics algorithms:
 - Skybox
 - Skybox Reflection in water
 - Screen Space Reflections (experimental)
 - Clickable Buttons
 - Distance Fog
 - Sound System

## Implementation of Main Algorithms

### Ocean

The Gerstner Wave implementation simulates water waves by initializing wave characteristics (amplitude, frequency, speed, direction, phase) that vary based on presets like 'calm', 'agitated', or 'stormy'. It employs fractional brownian motion to transition between starting and ending wave parameters, creating a realistic wave spectrum. 

The model calculates wave displacement and normal vectors at each point on the water surface, accounting for the cumulative effect of multiple waves. This is achieved through iterative calculations that simulate the motion and interaction of waves, allowing for realistic rendering of water dynamics.

The approach also includes an inverse mapping function to determine the original position of a point on the water surface, essential for rendering floating objects accurately.

This is done in the shader and the ocean is also rotated and translated with the player to ensure glitch free looking water.


### RigidBody

The RigidBody class in JavaScript simulates the physics of a rigid body, allowing it to be moved and rotated in 3D space. It is initialized with properties like mass, position, orientation (using quaternions), scale, and moment of inertia. 

We added methods to apply forces and torques, which influence the body's linear and angular velocity. The update method evolves the body's state over time, applying Newton's laws to update its position and orientation based on the accumulated force, torque, and existing velocities. 

Quaternion arithmetic is used to handle rotations, ensuring stable and smooth orientation changes. The getTransformationMatrix method computes a transformation matrix for rendering the body in a 3D scene, incorporating translations, rotations, and scaling. Additional functions assist in vector and quaternion operations, like rotation and normalization, essential for accurate physical simulation.


### Buoyancy

The buoyancy implementation calculates the force exerted by water on a rigid body, floating or submerged in it. It starts by determining the boat's corners in world space and finding the corresponding points on the water surface using the Gerstner wave function. For each corner, it calculates the percentage submerged by comparing the boat's height with the water's height at that point. The average of these percentages gives the overall buoyancy effect. The buoyancy force is proportional to this average, directed along the average normal of the water surface under the boat. Additionally, the method calculates a torque to simulate the boat's rotation due to the uneven water force on its hull, enhancing realism. This torque is based on the angle between the boat's upward normal and the water's average normal, scaled by the submerged percentage. Forces for gravity, user inputs (vertical and horizontal), and damping (both linear and angular) are also applied to the rigid body to simulate realistic water dynamics.


### Cloth Simulation

The Cloth class simulates a cloth using a particle system, where Point objects represent the particles and Segment objects represent the connections between them, forming a grid. 

The cloth is initialized with a density and size, which determine the number of points and segments. Each point has a position, and each segment has a rest length, maintaining the structure of the cloth. 

The simulate method updates the cloth's physics, applying forces like gravity and wind, and enforcing constraints to maintain segment lengths. This is achieved through a verlet integration approach, updating positions based on previous positions and velocities, and a relaxation process that iteratively corrects the distances between points to match the segment lengths.

