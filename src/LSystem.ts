import {vec3, mat3} from 'gl-matrix';
import Drawable from './rendering/gl/Drawable';
import {gl} from './globals';

var random: number = 20;

class LSystem extends Drawable {
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  d_idx: number[];
  d_pos: number[];
  d_nor: number[];
  turtle: Turtle;
  grammar: string;
  expandRules: any;
  drawRules: any;
  minlength: number;
  iters: number;
  OBJ: any;
  fs: any;
  flowermesh: any;

  constructor() {
    super();
    this.grammar = "";
    this.minlength = 2;
    this.iters = 3;
    this.OBJ = require("webgl-obj-loader");
    this.OBJ.downloadMeshes({'flower': 'src/geometry/Flower.obj'}, this.flowerLoaded.bind(this));

    this.d_idx = [];
    this.d_pos = [];
    this.d_nor = [];
    this.turtle = new Turtle();
    this.expandRules = {'B':'D[+B]','S':'D[+BF][+S]+'};
    this.drawRules = {'[':this.saveState.bind(this),
                      ']':this.loadState.bind(this),
                      'D':this.addBranch.bind(this),
                      'B':this.addBranch.bind(this),
                      'S':this.addBranch.bind(this),
                      '+':this.rotate.bind(this),
                      'F':this.addFlower.bind(this)};
  }

  init() {
    this.expandGrammar();
    this.drawGrammar();
    this.create();
  }

  flowerLoaded(meshes:any) {
    this.flowermesh = meshes.flower;
    console.log(this.flowermesh);
    this.init();
  }

  expandGrammar() {
    for(let a = 0; a < this.iters; a++) {
      let p: number = 0;
      for(let i = 0; i < this.grammar.length; i++) {
        let drawRule: string = this.expandRules[this.grammar[p]];
        if(!drawRule) {
          p += 1;
        } else {
          let len: number = drawRule.length;
          this.grammar = this.grammar.slice(0,p)+drawRule+this.grammar.slice(p+1,this.grammar.length);
          p += len;
        }
      }
    }
  }

  drawGrammar() {
    for(let i = 0; i < this.grammar.length; i++) {
      this.drawRules[this.grammar[i]]();
    }
  }

  setGrammar(newgrammar: string) {
    this.grammar = newgrammar;
  }

  setRandom(rand: number) {
    random = rand;
  }

  setIters(it: number) {
    this.iters = it;
  }

  addBranch() {
    let length: number = this.minlength + (Math.random() * (random/20) - (random/50)) - ((this.turtle.depth()-1.0)/this.iters);
    let width: number = 0.7 - (this.turtle.depth()/7.0);
    let idx: number = this.d_pos.length/4;
    let newpos: number[] = [-.5,-.5,0,  -.5,.5,0,  .5,.5,0,  .5,-.5,0,
                            -.5,-.5,1,  -.5,.5,1,  .5,.5,1,  .5,-.5,1,
                            -.5,-.5,0,  -.5,.5,0,  -.5,.5,1, -.5,-.5,1,
                            .5,.5,0,    .5,-.5,0,  .5,-.5,1,  .5,.5,1,
                            -.5,.5,0,   .5,.5,0,   .5,.5,1,  -.5,.5,1,
                            -.5,-.5,0,  .5,-.5,0,  .5,-.5,1,  -.5,-.5,1];
    let newnor: number[] = [0,0,-1,  0,0,-1,  0,0,-1, 0,0,-1,
                            0,0,1,  0,0,1,  0,0,1, 0,0,1,
                            -1,0,0,  -1,0,0,  -1,0,0, -1,0,0,
                            1,0,0,  1,0,0,  1,0,0, 1,0,0,
                            0,1,0,  0,1,0,  0,1,0, 0,1,0,
                            0,-1,0,  0,-1,0,  0,-1,0, 0,-1,0,]
    for(let i = 0; i < newpos.length; i += 3) {
      let pos: vec3 = vec3.fromValues(newpos[i]*width,newpos[i+1]*width,newpos[i+2]*length);
      let nor: vec3 = vec3.fromValues(newnor[i],newnor[i+1],newnor[i+2]);
      let state: TurtleState = this.turtle.current();
      vec3.transformMat3(pos, pos, state.rotation);
      vec3.transformMat3(nor, nor, state.rotation);
      vec3.add(pos, pos, state.position);
      this.d_pos.push(pos[0], pos[1], pos[2], 1);
      this.d_nor.push(nor[0], nor[1], nor[2], 0);
    }
    this.d_idx.push(idx, idx+1, idx+2,   idx, idx+2, idx+3,
                    idx+4, idx+5, idx+6, idx+4, idx+6, idx+7,
                    idx+8, idx+9, idx+10,   idx+8, idx+10, idx+11,
                    idx+12, idx+13, idx+14, idx+12, idx+14, idx+15,
                    idx+16, idx+17, idx+18, idx+16, idx+18, idx+19,
                    idx+20, idx+21, idx+22, idx+20, idx+22, idx+23);
    this.turtle.current().extend(length);
  }

  addFlower() {
    let mesh: any = this.flowermesh;
    let idx: number = this.d_pos.length/4;
    for(let i = 0; i < mesh.vertices.length; i += 3) {
      let pos: vec3 = vec3.fromValues(mesh.vertices[i]/3.0,mesh.vertices[i+1]/3.0,mesh.vertices[i+2]/3.0);
      let nor: vec3 = vec3.fromValues(mesh.vertexNormals[i]/2.0, mesh.vertexNormals[i+1]/2.0, mesh.vertexNormals[i+2]/2.0);
      let state: TurtleState = this.turtle.current();
      vec3.transformMat3(pos, pos, state.rotation);
      vec3.transformMat3(nor, nor, state.rotation);
      vec3.add(pos, pos, state.position);
      this.d_pos.push(pos[0], pos[1], pos[2], 1);
      this.d_nor.push(nor[0], nor[1], nor[2], 0);
    }
    for(let d = 0; d < mesh.indices.length; d++) {
      this.d_idx.push(mesh.indices[d]+idx);
    }
  }

  saveState() { this.turtle.saveState(); }
  loadState() { this.turtle.loadState(); }
  rotate() { this.turtle.current().rotate(30+Math.random()*random); }

  create() {
    this.indices = new Uint32Array(this.d_idx);
    this.normals = new Float32Array(this.d_nor);
    this.positions = new Float32Array(this.d_pos);

    this.generateIdx();
    this.generatePos();
    this.generateNor();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    console.log("Created LSystem with "+(this.d_pos.length/3)+" vertices.");
  }
};

class TurtleState {
  position: vec3;
  rotation: mat3;

  constructor(pos: vec3, rot: mat3) {
    this.position = pos;
    this.rotation = rot;
  }

  extend(dist: number) {
    let diff: vec3 = vec3.fromValues(0,0,dist);
    vec3.transformMat3(diff, diff, this.rotation);
    vec3.add(this.position, this.position, diff);
  }

  rotate(angle: number) {
    angle = angle*Math.PI/180;
    let cosTheta: number = Math.cos(angle);
    let sinTheta: number = Math.sin(angle);
    let seed: number = Math.floor(Math.random()*4.0);
    switch(seed) {
      case 0: this.rotation = mat3.fromValues(1, 0, 0, 0, cosTheta, sinTheta, 0, -sinTheta, cosTheta); break;
      case 1: this.rotation = mat3.fromValues(cosTheta, 0, -sinTheta, 0, 1, 0, sinTheta, 0, cosTheta); break;
      case 2: this.rotation = mat3.fromValues(1, 0, 0, 0, -cosTheta, sinTheta, 0, sinTheta, cosTheta); break;
      case 3: this.rotation = mat3.fromValues(cosTheta, 0, sinTheta, 0, 1, 0, -sinTheta, 0, cosTheta); break;
    }
  }
};

class Turtle {
  states: TurtleState[];

  constructor() {
    let pos: vec3 = vec3.fromValues(0,0,0);
    let rot: mat3 = mat3.fromValues(1,0,0,0,1,0,0,0,1);
    this.states = [];
    this.states.push(new TurtleState(pos, rot));
  }

  current() {
    return this.states[this.states.length-1];
  }

  depth() {
    return this.states.length;
  }

  saveState() {
    var recent = this.states[this.states.length-1];
    var newpos: vec3 = vec3.fromValues(0,0,0);
    var newrot: mat3 = mat3.fromValues(0,0,0,0,0,0,0,0,0)
    vec3.copy(newpos, recent.position);
    mat3.copy(newrot, recent.rotation);
    this.states.push(new TurtleState(newpos, newrot));
  }

  loadState() {
    this.states.pop();
  }
};

export default LSystem;
