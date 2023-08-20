// {"name": "PS2Chip8", "author": "Luan Alcolea", "version": "18082023","icon": "ps2chip8_icon.png", "file": "ps2chip8.js"}

/* (WIP) CHIP-8 Interpreter written in JavaScript */
/* Code based on: https://code.austinmorlan.com/austin/2019-chip8-emulator */

const black    = Color.new(0, 0, 0);
const gray     = Color.new(64, 64, 64);
const white    = Color.new(255, 255, 255);

const ROM_ADDRESS           = 0x200;
const FONTSET_SIZE          = 0x50;
const FONTSET_START_ADDRESS = 0x50;
const SIZE                  = 9;
const COLUMN                = 64;
const LINES                 = 32;

let font = new Font();
font.color = white;

var framepos = {
    x:60,
    y:25
};

var video_color = [white,black];

let fontset = new Array(
    0xF0, 0x90, 0x90, 0x90, 0xF0,
    0x20, 0x60, 0x20, 0x20, 0x70,
    0xF0, 0x10, 0xF0, 0x80, 0xF0,
    0xF0, 0x10, 0xF0, 0x10, 0xF0,
    0x90, 0x90, 0xF0, 0x10, 0x10,
    0xF0, 0x80, 0xF0, 0x10, 0xF0,
    0xF0, 0x80, 0xF0, 0x90, 0xF0,
    0xF0, 0x10, 0x20, 0x40, 0x40,
    0xF0, 0x90, 0xF0, 0x90, 0xF0,
    0xF0, 0x90, 0xF0, 0x10, 0xF0,
    0xF0, 0x90, 0xF0, 0x90, 0x90,
    0xE0, 0x90, 0xE0, 0x90, 0xE0,
    0xF0, 0x80, 0x80, 0x80, 0xF0,
    0xE0, 0x90, 0x90, 0x90, 0xE0,
    0xF0, 0x80, 0xF0, 0x80, 0xF0,
    0xF0, 0x80, 0xF0, 0x80, 0x80
);

class CPU {
    registers = new Uint8Array(16);
    stack = new Uint16Array(16);
    keypad = new Uint8Array(16);
    memory = new Uint8Array(4096);
    framebuffer = new Array(64).fill(0).map(()=>new Array(32).fill(0));
    sp = 0x0000;
    pc = 0x0000;
    opcode;
    instruction;
    index;
    delay_timer;
    sound_timer;
    rand;

    OP_00E0()
    {
        for(var i = 0; i < COLUMN; ++i)
        {
            for(var j = 0; j < LINES; ++j)
            {
                this.framebuffer[i][j] = 0;
            }
        }
    }
    OP_00EE()
    {
        this.sp--;
        this.pc = (this.stack[this.sp]);
    }
    OP_1NNN()
    {
        this.pc = (this.opcode & 0x0FFF);
    }
    OP_2NNN()
    {
        this.stack[this.sp] = this.pc;
        ++this.sp;
        this.pc = (this.opcode & 0x0FFF);
    }
    OP_3XKK()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var byte = (this.opcode & 0x00FF);
        if(this.registers[Vx] == byte){this.pc += 2;}
    }
    OP_4XKK()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var byte = (this.opcode & 0x00FF);
        if(this.registers[Vx] != byte){this.pc += 2;}
    }
    OP_5XY0()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        if(this.registers[Vx] == this.registers[Vy]) {this.pc += 2;}
    }
    OP_6XKK()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var byte = (this.opcode & 0x00FF);
        this.registers[Vx] = byte;
    }
    OP_7XKK()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var byte = (this.opcode & 0x00FF);
        this.registers[Vx] += byte;
    }
    OP_8XY0()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        this.registers[Vx] = this.registers[Vy];
    }
    OP_8XY1()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        this.registers[Vx] |= this.registers[Vy];
    }
    OP_8XY2()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        this.registers[Vx] &= this.registers[Vy];
    }
    OP_8XY3()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        this.registers[Vx] ^= this.registers[Vy];
    }
    OP_8XY4()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        var sum = this.registers[Vx] + this.registers[Vy];
        if(sum > 255) {this.registers[0xF] = 1;}
        else{ this.registers[0xF] = 0; }
        this.registers[Vx] = sum & 0xFF;
    }
    OP_8XY5()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        if(this.registers[Vx] > this.registers[Vy]) {this.registers[0xF] = 1;}
        else{ this.registers[0xF] = 0;}
        this.registers[Vx] -= this.registers[Vy];
    }
    OP_8XY6()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        this.registers[0xF] = (this.registers[Vx] & 0x1);
        this.registers[Vx] >>= 1;
    }
    OP_8XY7()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        if(this.registers[Vy] > this.registers[Vx]) {this.registers[0xF] = 1;}
        else{ this.registers[0xF] = 0;}
        this.registers[Vx] = this.registers[Vy] - this.registers[Vx];
    }
    OP_8XYE()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        this.registers[0xF] = (this.registers[Vx] & 0x80) >> 7;
        this.registers[Vx] <<= 1;
    }
    OP_9XY0()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        if(this.registers[Vx] != this.registers[Vy])
        {
           this.pc += 2;
        }
    }
    OP_ANNN()
    {
        this.index = (this.opcode & 0x0FFF);
    }
    OP_BNNN()
    {
        var nnn = (this.opcode & 0x0FFF);
        this.pc = (this.registers[0] + nnn);
    }
    OP_CXKK()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var byte = (this.opcode & 0x00FF);
        this.registers[Vx] = (Math.floor(Math.random() * 256)) & byte;
    }
    OP_DXYN()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var Vy = (this.opcode & 0x00F0) >> 4;
        var height = this.opcode & 0x000F;
        var x_location = this.registers[Vx];
        var y_location = this.registers[Vy];
        var pixel;
        this.registers[0xF] = 0;
        for(var y_coords = 0; y_coords < height; y_coords++)
        {
            pixel = this.memory[this.index + y_coords];
            for(var x_coords = 0; x_coords < 8; x_coords++)
            {
                if((pixel & (0x80 >> x_coords)) != 0)
                {
                    if(this.framebuffer[x_location + x_coords][y_location + y_coords] == 1)
                    {
                        this.registers[0xF] = 1;
                    }
                    this.framebuffer[x_location + x_coords][y_location + y_coords] ^= 1;
                }
            }
        }
    }
    OP_EX9E()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var key = this.registers[Vx];
        if(this.keypad[key])
        {
            this.pc += 2;
        }
    }
    OP_EXA1()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var key = this.registers[Vx];
        if(!this.keypad[key])
        {
            this.pc += 2;
        }
    }
    OP_FX07()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        this.registers[Vx] = this.delay_timer;
    }
    OP_FX0A()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        switch(this.keypad[Vx])
        {
            case 0:
                this.registers[Vx] = 0;
            break;
            case 1:
                this.registers[Vx] = 1;
            break;
            case 2:
                this.registers[Vx] = 2;
            break;
            case 3:
                this.registers[Vx] = 3;
            break;
            case 4:
                this.registers[Vx] = 4;
            break;
            case 5:
                this.registers[Vx] = 5;
            break;
            case 6:
                this.registers[Vx] = 6;
            break
            case 7:
                this.registers[Vx] = 7;
            break;
            case 8:
                this.registers[Vx] = 8;
            break;
            case 9:
                this.registers[Vx] = 9;
            break;
            case 10:
                this.registers[Vx] = 10;
            break;
            case 11:
                this.registers[Vx] = 11;
            break;
            case 12:
                this.registers[Vx] = 12;
            break;
            case 13:
                this.registers[Vx] = 13;
            break;
            case 14:
                this.registers[Vx] = 14;
            break;
            case 15:
                this.registers[Vx] = 15;
            break;
            default:
                this.pc -= 2;
            break;
        }
    }
    OP_FX15()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        this.delay_timer = this.registers[Vx];
    }
    OP_FX18()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        this.sound_timer = this.registers[Vx];
    }
    OP_FX1E()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        this.index += this.registers[Vx];
    }
    OP_FX29()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var digit = this.registers[Vx];
        this.index = FONTSET_START_ADDRESS + (5 * digit);
    }
    OP_FX33()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        var value = this.registers[Vx];

        this.memory[this.index + 2] = value % 10;
        value /= 10;

        this.memory[this.index + 1] = value % 10;
        value /= 10;

        this.memory[this.index] = value % 10;
    }
    OP_FX55()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        for(var i = 0; i <= Vx; ++i)
        {
            this.memory[this.index + i] = this.registers[i];
        }
    }
    OP_FX65()
    {
        var Vx = (this.opcode & 0x0F00) >> 8;
        for(var i = 0; i <= Vx; ++i)
        {
            this.registers[i] = this.memory[this.index + i];
        }
    }
    LoadFonts()
    {
        for(var i = 0; i < FONTSET_SIZE; i++)
        {
            this.memory[FONTSET_START_ADDRESS + i] = fontset[i];
        }
    }
    LoadROM(romname)
    {
        var tmpfile = System.openFile(romname, System.FREAD);
        var lenght = System.sizeFile(tmpfile);
        var f = std.open(romname, "r");
        var resultBuffer = new ArrayBuffer(lenght);
        var buffer = new Uint8Array(resultBuffer);
        f.read(resultBuffer, 0, lenght);
        for(var i = 0; i < lenght; i++)
        {
            this.memory[ROM_ADDRESS + i] = buffer[i];
        }
        f.close();
        System.closeFile(tmpfile);
    }

    Execute()
    {
        switch(this.opcode & 0xF000)
        {
            case 0x0000:
                switch(this.opcode & 0x00FF)
                {
                    case 0x00E0:
                        // CLS 00E0
                        this.OP_00E0();
                        break;
                    case 0x00EE:
                        // RET 00EE
                        this.OP_00EE();
                        break;
                    default:
                        // Undefined Opcode
                        break;    
                }
            break;
            case 0x1000:
                // JMP 1NNN
                this.OP_1NNN();
                break;
            case 0x2000:
                // CALL SUB 2NNN
                this.OP_2NNN();
                break;
            case 0x3000:
                // Skip next instruction Vx == kk 3XKK
                this.OP_3XKK();
                break;
            case 0x4000:
                // Skip next instruction Vx != kk 4XKK
                this.OP_4XKK();
                break;
            case 0x5000:
                // Skip next instruction Vx == Vy 5XY0
                this.OP_5XY0();
                break;
            case 0x6000:
                // Load Vx reg 6XKk
                this.OP_6XKK();
                break;
            case 0x7000:
                // Add Vx reg immediate 7XKK
                this.OP_7XKK();
                break;
            case 0x8000:
                switch(this.opcode & 0x000F)
                {
                    case 0x0000:
                        // Move Vy reg into VX reg 8XY0
                        this.OP_8XY0();
                        break;
                    case 0x0001:
                        // Instruction OR 8XY1
                        this.OP_8XY1();
                        break;
                    case 0x0002:
                        // Instruction AND 8XY2
                        this.OP_8XY2();
                        break;
                    case 0x0003:
                        // Instruction XOR 8XY3
                        this.OP_8XY3();
                        break;
                    case 0x0004:
                        // Instruction ADD VX VY 8XY4
                        this.OP_8XY4();
                        break;
                    case 0x0005:
                        // Instruction SUB VX VY 8XY5
                        this.OP_8XY5();
                        break;
                    case 0x0006:
                        // Instruction SHR VX 8XY6
                        this.OP_8XY6();
                        break;
                    case 0x0007:
                        // Instruction SUBN VX VY 8XY7
                        this.OP_8XY7();
                        break;
                    case 0x000E:
                        // Instruction SHL VX 8XYE
                        this.OP_8XYE();
                        break;
                    default:
                        // Undefined Opcode
                        break;
                }
                break;
            case 0x9000:
                // Skip next instruction Vx != Vy 9XY0
                this.OP_9XY0();
                break;
            case 0xA000:
                // Instruction LDI ANNN
                this.OP_ANNN();
                break;
            case 0xB000:
                // Instruction JMP + V0 BNNN
                this.OP_BNNN();
                break;
            case 0xC000:
                // Instruction RNG Vx (CXKK)
                this.OP_CXKK();
                break;
            case 0xD000:
                // Draw Sprite DXYN
                this.OP_DXYN();
                break;
            case 0xE000:
                switch(this.opcode & 0x00FF)
                {
                    case 0x009E:
                        // Skip next Instruction if key pressed 009E
                        this.OP_EX9E();
                        break;
                    case 0x00A1:
                        // Skip next instruction if key not pressed 00A1
                        this.OP_EXA1();
                        break;
                    default:
                        // Undefined Opcode
                        break;
                }
                break;
            case 0xF000:
                switch(this.opcode & 0x00FF){
                    case 0x0007:
                        // Load VX with Delay Timer 0007
                        this.OP_FX07();
                        break;
                    case 0x000A:
                        // Wait for key press 000A
                        this.OP_FX0A();
                        break;
                    case 0x0015:
                        // Load Delay Timer with VX 0015
                        this.OP_FX15();
                        break;
                    case 0x0018:
                        // Load Sound Timer with VX 0018
                        this.OP_FX18();
                        break;
                    case 0x001E:
                        // Add Index and VX 001E
                        this.OP_FX1E();
                        break;
                    case 0x0029:
                        // Load font from VX value 0029
                        this.OP_FX29();
                        break;
                    case 0x0033:
                        // Store BCD of VX value 0033
                        this.OP_FX33();
                        break
                    case 0x0055:
                        // Store Regs V[0] - V[X] start at I reg 0055
                        this.OP_FX55();
                        break;
                    case 0x0065:
                        // Load Regs V[0] - V[X] start at I reg 0065
                        this.OP_FX65();
                        break;
                    default:
                        // Undefined opcode
                        break;
                }
        }
    }
    Display()
    {
        for(var i = 0; i < COLUMN; i++)
        {
            for(var j = 0; j < LINES; j++)
            {
                Draw.rect(SIZE * i, SIZE * j, SIZE, SIZE, video_color[cpu.framebuffer[i][j]]);
            }
        }
    }
    ProcessInput()
    {
        // 1
        if(Pads.check(new_pad, Pads.CROSS)) this.keypad[0x0] = 1;
        if(!Pads.check(new_pad, Pads.CROSS)) this.keypad[0x0] = 0;
        // 2
        if(Pads.check(new_pad, Pads.CIRCLE)) this.keypad[0x1] = 1;
        if(!Pads.check(new_pad, Pads.CIRCLE)) this.keypad[0x1] = 0;
        // 3
        if(Pads.check(new_pad, Pads.SQUARE)) this.keypad[0x2] = 1;
        if(!Pads.check(new_pad, Pads.SQUARE)) this.keypad[0x2] = 0;
        // 4
        if(Pads.check(new_pad, Pads.TRIANGLE)) this.keypad[0x3] = 1;
        if(!Pads.check(new_pad, Pads.TRIANGLE)) this.keypad[0x3] = 0;
        // 5
        if(Pads.check(new_pad, Pads.UP)) this.keypad[0x4] = 1;
        if(!Pads.check(new_pad, Pads.UP)) this.keypad[0x4] = 0;
        // 6
        if(Pads.check(new_pad, Pads.LEFT)) this.keypad[0x5] = 1;
        if(!Pads.check(new_pad, Pads.LEFT)) this.keypad[0x5] = 0;
        // 7
        if(Pads.check(new_pad, Pads.DOWN)) this.keypad[0x6] = 1;
        if(!Pads.check(new_pad, Pads.DOWN)) this.keypad[0x6] = 0;
        // 8
        if(Pads.check(new_pad, Pads.RIGHT)) this.keypad[0x7] = 1;
        if(!Pads.check(new_pad, Pads.RIGHT)) this.keypad[0x7] = 0;
        // 9
        if(Pads.check(new_pad, Pads.R1)) this.keypad[0x8] = 1;
        if(!Pads.check(new_pad, Pads.R1)) this.keypad[0x8] = 0;
        // 10
        if(Pads.check(new_pad, Pads.R2)) this.keypad[0x9] = 1;
        if(!Pads.check(new_pad, Pads.R2)) this.keypad[0x9] = 0;
        // 11
        if(Pads.check(new_pad, Pads.L1)) this.keypad[0xA] = 1;
        if(!Pads.check(new_pad, Pads.L1)) this.keypad[0xA] = 0;
        // 12
        if(Pads.check(new_pad, Pads.L2)) this.keypad[0xB] = 1;
        if(!Pads.check(new_pad, Pads.L2)) this.keypad[0xB] = 0;
        // 13
        if(Pads.check(new_pad, Pads.R3)) this.keypad[0xC] = 1;
        if(!Pads.check(new_pad, Pads.R3)) this.keypad[0xC] = 0;
        // 14
        if(Pads.check(new_pad, Pads.L3)) this.keypad[0xD] = 1;
        if(!Pads.check(new_pad, Pads.L3)) this.keypad[0xD] = 0;
        // 15
        if(Pads.check(new_pad, Pads.START)) this.keypad[0xE] = 1;
        if(!Pads.check(new_pad, Pads.START)) this.keypad[0xE] = 0;
        // 16
        if(Pads.check(new_pad, Pads.SELECT)) this.keypad[0xF] = 1;
        if(!Pads.check(new_pad, Pads.SELECT)) this.keypad[0xF] = 0;
    }
    Cycle()
    {
        this.opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
        this.pc += 2;
        this.ProcessInput();
        this.Execute();
        this.Display();
        if(this.delayTimer > 0){--this.delayTimer;}
        if(this.soundTimer > 0){--this.soundTimer;}
    }
    constructor(romname)
    {
        this.pc = ROM_ADDRESS;
        this.rand = (Math.floor(Math.random() * 256));
        this.LoadFonts();
        this.LoadROM(romname);
    }
}

//const cpu = new CPU("ps2chip8/Tetris.ch8");
const cpu = new CPU("ps2chip8/test_opcode.ch8");
let new_pad = null;
let old_pad = null;

var currentTime = 0;
var lastTime    = 0;
var cycle       = 1;
var timer       = Timer.new();

Timer.reset(timer);
Timer.setTime(timer, 0);
Timer.resume(timer);
lastTime = Timer.getTime(timer);

Screen.setFrameCounter(true);

while(true)
{
    Screen.clear(gray);

    old_pad = new_pad;
    new_pad = Pads.get();
    currentTime = (Timer.getTime(timer) - lastTime);
    
    if(currentTime > cycle)
    {
        lastTime = Timer.getTime(timer);
        cpu.Cycle();
    }
    
    cpu.Display();
    font.print(64, 300, "FPS: " + Screen.getFPS(10));
    Screen.flip();
}