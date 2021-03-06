import {
  BufferGeometry,
  BufferAttribute,
  Mesh,
  ShaderMaterial,
  WebGLRenderTarget,
  Vector2,
  LinearFilter,
  NearestFilter,
  RGBFormat,
  Scene,
  OrthographicCamera
} from 'three';
import { gui } from '../gui';
import { vertexShader, fragmentShader } from './shader.glsl';

// https://github.com/mikolalysenko/a-big-triangle

export default class PostProcessing {
  constructor(renderer, width, height) {
    this.renderer = renderer;

    const pixelRatio = renderer.getPixelRatio();

    // Construct a big triangle that covers screen space
    const geometry = new BufferGeometry();
    const attribute = new BufferAttribute(
      new Float32Array([-1, -1, 0, -1, 3, 0, 3, -1, 0]),
      3
    );
    geometry.addAttribute('position', attribute);
    geometry.setIndex([0, 2, 1]);

    // Setup the render target
    // Note: We want to use the same pixel ratio as the webgl renderer
    this.renderTarget = new WebGLRenderTarget(
      width * pixelRatio,
      height * pixelRatio,
      {
        minFilter: LinearFilter,
        magFilter: NearestFilter,
        format: RGBFormat,
        stencilBuffer: false
      }
    );

    // Setup the material with some noise uniforms
    const material = new ShaderMaterial({
      uniforms: {
        textureMap: {
          type: 't',
          value: this.renderTarget.texture
        },
        resolution: {
          value: new Vector2(this.renderTarget.width, this.renderTarget.height)
        },
        time: {
          value: 0
        },
        noiseSpeed: { value: 0.18 },
        noiseAmount: { value: 0.35 }
      },
      vertexShader,
      fragmentShader
    });

    // Create an empty scene and orthographic camera
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.mesh = new Mesh(geometry, material);
    // Mesh won't be moving so we can turn off the matrix update
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();

    this.scene.add(this.mesh);

    gui
      .add(this.mesh.material.uniforms.noiseAmount, 'value', 0, 1)
      .name('noiseAmount');
    gui
      .add(this.mesh.material.uniforms.noiseSpeed, 'value', 0, 1)
      .name('noiseSpeed');
  }

  resize(width, height) {
    // Resize the render target when the resolution changes
    const pixelRatio = this.renderer.getPixelRatio();
    this.renderTarget.setSize(width * pixelRatio, height * pixelRatio);
    this.mesh.material.uniforms.resolution.value.x = width * pixelRatio;
    this.mesh.material.uniforms.resolution.value.y = height * pixelRatio;
  }

  render(scene, camera, delta) {
    // Update time uniform
    this.mesh.material.uniforms.time.value += delta;
    // Set the active render target
    this.renderer.setRenderTarget(this.renderTarget);
    // Render the scene into the quad
    this.renderer.render(scene, camera);
    // Reset the render target
    this.renderer.setRenderTarget(null);
    // Render the quad fullscreen
    this.renderer.render(this.scene, this.camera);
  }
}
