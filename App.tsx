import { GLView } from "expo-gl";
import { mat4 } from "gl-matrix";
import React, { useEffect, useState } from "react";
import { PanResponder, View } from "react-native";

const vertexShaderSource = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying vec3 vNormal;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
  vNormal = normal;
}
`;

const fragmentShaderSource = `
precision mediump float;
varying vec3 vNormal;

void main() {
  vec3 light = normalize(vec3(1.0, 1.0, 1.0));
  float brightness = dot(normalize(vNormal), light);
  gl_FragColor = vec4(vec3(brightness * 0.5 + 0.5), 1.0);
}
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
};

const onContextCreate = async (gl) => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  const positions = new Float32Array([
    // front
    -1, -1, 1, 0, 0, 1,
    1, -1, 1, 0, 0, 1,
    1, 1, 1, 0, 0, 1,
    -1, -1, 1, 0, 0, 1,
    1, 1, 1, 0, 0, 1,
    -1, 1, 1, 0, 0, 1,
    // back
    -1, -1, -1, 0, 0, -1,
    1, 1, -1, 0, 0, -1,
    1, -1, -1, 0, 0, -1,
    -1, -1, -1, 0, 0, -1,
    -1, 1, -1, 0, 0, -1,
    1, 1, -1, 0, 0, -1,
    // left
    -1, -1, -1, -1, 0, 0,
    -1, -1, 1, -1, 0, 0,
    -1, 1, 1, -1, 0, 0,
    -1, -1, -1, -1, 0, 0,
    -1, 1, 1, -1, 0, 0,
    -1, 1, -1, -1, 0, 0,
    // right
    1, -1, -1, 1, 0, 0,
    1, 1, 1, 1, 0, 0,
    1, -1, 1, 1, 0, 0,
    1, -1, -1, 1, 0, 0,
    1, 1, -1, 1, 0, 0,
    1, 1, 1, 1, 0, 0,
    // top
    -1, 1, -1, 0, 1, 0,
    -1, 1, 1, 0, 1, 0,
    1, 1, 1, 0, 1, 0,
    -1, 1, -1, 0, 1, 0,
    1, 1, 1, 0, 1, 0,
    1, 1, -1, 0, 1, 0,
    // bottom
    -1, -1, -1, 0, -1, 0,
    1, -1, 1, 0, -1, 0,
    -1, -1, 1, 0, -1, 0,
    -1, -1, -1, 0, -1, 0,
    1, -1, -1, 0, -1, 0,
    1, -1, 1, 0, -1, 0,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "position");
  const aNormal = gl.getAttribLocation(program, "normal");

  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);

  gl.enableVertexAttribArray(aNormal);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);

  const uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
  const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");

  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  const projectionMatrix = mat4.create();
  mat4.perspective(
    projectionMatrix,
    (75 * Math.PI) / 180,
    gl.drawingBufferWidth / gl.drawingBufferHeight,
    0.1,
    1000
  );

  const modelViewMatrix = mat4.create();
  let angle = 0;

  const render = () => {
    angle += 0.01;
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, angle);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, angle);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
    gl.flush();
    gl.endFrameEXP();
    requestAnimationFrame(render);
  };

  render();
};

export default function App() {
  const handlers = PanResponder.create({}).panHandlers;

  const [isGestureActive, setIsGestureActive] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setIsGestureActive(false);
    }, 3000);
  }, []);

  return (
    // The rendering freezes after 3 seconds. (iOS * newArch)
    <View style={{ flex: 1 }} {...(isGestureActive ? handlers : {})}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
