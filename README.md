
# CHIP-8 for Playstation 2
This is a simple CHIP-8 interpreter written in JavaScript for the [Athena Env](https://github.com/DanielSant0s/AthenaEnv/tree/main) platform. Please note that the interpreter currently runs slowly.

# How to run
Follow these steps to run the CHIP-8 interpreter on your PlayStation 2 using Athena Env:

1. Copy the following files and folder: ps2chip8, ps2chip8.js, and ps2chip8_icon.png.

2. Paste these files and folder into the main directory of [Athena Env](https://github.com/DanielSant0s/AthenaEnv/tree/main).

3. To run a ROM, open the .js file and locate the ROM name assignment. For example: 
const cpu = new CPU("ps2chip8/Tetris.ch8");