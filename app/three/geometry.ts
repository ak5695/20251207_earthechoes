import * as THREE from "three";

/**
 * 创建渐变拖尾几何体（头部粗，尾部尖细）
 */
export const createTaperedTrailGeometry = (
  positions: THREE.Vector3[],
  headRadius: number,
  tailRadius: number
): THREE.BufferGeometry => {
  if (positions.length < 2) {
    return new THREE.BufferGeometry();
  }

  const segments = positions.length - 1;
  const radialSegments = 6;
  const vertices: number[] = [];
  const indices: number[] = [];

  // 为每个位置创建圆环顶点
  for (let i = 0; i < positions.length; i++) {
    const t = i / (positions.length - 1); // 0 到 1
    // 使用平滑的渐变曲线（尾部更尖细）
    const radius = headRadius * Math.pow(1 - t, 1.5) + tailRadius * t;

    const pos = positions[i];

    // 计算方向向量
    let direction: THREE.Vector3;
    if (i === 0) {
      direction = new THREE.Vector3()
        .subVectors(positions[1], positions[0])
        .normalize();
    } else if (i === positions.length - 1) {
      direction = new THREE.Vector3()
        .subVectors(positions[i], positions[i - 1])
        .normalize();
    } else {
      direction = new THREE.Vector3()
        .subVectors(positions[i + 1], positions[i - 1])
        .normalize();
    }

    // 创建垂直于方向的平面
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(up)) > 0.99) {
      up.set(1, 0, 0);
    }
    const right = new THREE.Vector3().crossVectors(direction, up).normalize();
    const upVec = new THREE.Vector3()
      .crossVectors(right, direction)
      .normalize();

    // 创建圆环顶点
    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const x =
        pos.x +
        Math.cos(angle) * radius * right.x +
        Math.sin(angle) * radius * upVec.x;
      const y =
        pos.y +
        Math.cos(angle) * radius * right.y +
        Math.sin(angle) * radius * upVec.y;
      const z =
        pos.z +
        Math.cos(angle) * radius * right.z +
        Math.sin(angle) * radius * upVec.z;
      vertices.push(x, y, z);
    }
  }

  // 创建三角形索引
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + 1;
      const c = a + radialSegments + 1;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};
