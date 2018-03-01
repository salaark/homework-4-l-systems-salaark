import {vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import LSystem from './LSystem';
import Drawable from './rendering/gl/Drawable';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'color1': [ 160.0, 82.0, 45.0, 1.0 ],
  'color2': [ 255.0, 0.0, 0.0, 1.0 ],
  'variation': 20.0,
  'grammar': "SDSBS",
  'iters': 2,
  'Generate': loadScene,
};

let lsystem: LSystem;

function loadScene() {
  lsystem = new LSystem();
  lsystem.setGrammar(controls.grammar);
  lsystem.setRandom(controls.variation);
  lsystem.setIters(controls.iters);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.addColor(controls,'color1').onChange(updateColor);
  gui.addColor(controls,'color2').onChange(updateFlower);
  gui.add(controls, 'grammar');
  gui.add(controls, 'variation', 0, 50);
  gui.add(controls, 'iters', 1, 3).step(1);
  gui.add(controls, 'Generate');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, -10, 3), vec3.fromValues(0, 0, 3));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.482, 0.811, 0.82, 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  // This function will be called every frame
  let time:number = 0;
  function tick() {
    time += 0.01;
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    lambert.setTime(time);
    lambert.setCameraPos(camera.position);
    renderer.render(camera, lambert, [ lsystem ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  //Update render color on gui change
  function updateColor() {
    lambert.setGeometryColor(vec4.fromValues(controls.color1[0]/255, controls.color1[1]/255,
        controls.color1[2]/255, 1.0));
  }
  function updateFlower() {
    lambert.setFlowerColor(vec4.fromValues(controls.color2[0]/255, controls.color2[1]/255,
        controls.color2[2]/255, 1.0));
  }
  updateColor();
  updateFlower();

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
