import * as THREE from 'three';
import { FIELD, BASES, PITCHING_PLATE } from '../constants.js';

// --- Coordinate mapping -----------------------------------------------
// Field coordinates are (x, y) in feet, with home plate at the origin and
// +y pointing toward center field. We map that onto the three.js world's
// horizontal XZ plane (Y is up) so the camera can look straight down and
// get a true top-down, correctly-proportioned view no matter the screen
// size (the camera frustum is fit to the field, not the other way round).
export function toWorld(x, y, height = 0) {
  return new THREE.Vector3(x, height, -y);
}

export function fieldPosFromWorld(vec3) {
  return { x: vec3.x, y: -vec3.z };
}

const COLORS = {
  grass: 0x2e7d32,
  grassAlt: 0x2b7130,
  dirt: 0xb5793b,
  chalk: 0xffffff,
  base: 0xf5f5f5,
  homePlate: 0xffffff,
  laneLine: 0xffffff,
  outOfPlay: 0x1f5c26,
};

function flatShapeMesh(shape, color, y = 0) {
  const geometry = new THREE.ShapeGeometry(shape, 64);
  const material = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

// Builds a flat "chalk line" quad strip along a polyline of field-space
// (x,y) points, with the given width in feet.
function chalkStrip(points, width = 0.2, color = COLORS.chalk, y = 0.02) {
  const shape = new THREE.Shape();
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1] || p;
    const next = points[i + 1] || p;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);
    left.push({ x: p.x + nx, y: p.y + ny });
    right.push({ x: p.x - nx, y: p.y - ny });
  }
  const outline = [...left, ...right.reverse()];
  shape.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i++) shape.lineTo(outline[i].x, outline[i].y);
  shape.closePath();
  return flatShapeMesh(shape, color, y);
}

function arcPoints(cx, cy, radius, startAngle, endAngle, segments = 64) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = startAngle + ((endAngle - startAngle) * i) / segments;
    pts.push({ x: cx + radius * Math.cos(t), y: cy + radius * Math.sin(t) });
  }
  return pts;
}

function rectPoints(cx, cy, w, h, angle = 0) {
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
    { x: -hw, y: -hh },
  ];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return corners.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
}

function rectOutline(cx, cy, w, h, angle = 0, width = 0.15, color = COLORS.chalk) {
  return chalkStrip(rectPoints(cx, cy, w, h, angle), width, color);
}

// Angle (from +x axis, standard math convention) toward each foul line.
const FIRST_ANGLE = Math.PI / 4; // 45 deg
const THIRD_ANGLE = (3 * Math.PI) / 4; // 135 deg
const CF_ANGLE = Math.PI / 2; // 90 deg

function dottedLineStrip(points, width = 0.2, color = COLORS.chalk, y = 0.02) {
    const material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2,
        dashSize: 2,
        gapSize: 2,
    });
    
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    points.forEach(p => {
        const w = toWorld(p.x, p.y, y);
        positions.push(w.x, w.y, w.z);
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // required for dotted lines
    return line;
}

export function buildField(bounds) {
  const group = new THREE.Group();
  group.name = 'field';

  // --- Ground base, constrained to the scene boundary --------------------
  const groundWidth = bounds.maxX - bounds.minX;
  const groundDepth = bounds.maxY - bounds.minY;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundWidth, groundDepth),
    new THREE.MeshLambertMaterial({ color: COLORS.outOfPlay })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(
    (bounds.minX + bounds.maxX) / 2,
    -0.02,
    -(bounds.minY + bounds.maxY) / 2
  );
  ground.receiveShadow = true;
  group.add(ground);

  // --- Fair territory grass (90 degree pie from foul line to foul line) --
  const fairShape = new THREE.Shape();
  fairShape.moveTo(0, 0);
  const fairArc = arcPoints(0, 0, FIELD.fenceDistance, FIRST_ANGLE, THIRD_ANGLE, 96);
  fairArc.forEach((p) => fairShape.lineTo(p.x, p.y));
  fairShape.lineTo(0, 0);
  group.add(flatShapeMesh(fairShape, COLORS.grass, -0.01));

  // --- Skinned infield dirt (circle offset toward the pitcher's mound) ---
  const skinCenter = { x: 0, y: 42 };
  const skinRadius = 62;
  const dirtShape = new THREE.Shape();
  const dirtArc = arcPoints(skinCenter.x, skinCenter.y, skinRadius, 0, Math.PI * 2, 96);
  dirtShape.moveTo(dirtArc[0].x, dirtArc[0].y);
  dirtArc.forEach((p) => dirtShape.lineTo(p.x, p.y));
  group.add(flatShapeMesh(dirtShape, COLORS.dirt, 0));

  // Pitcher's circle outline.
  group.add(
    chalkStrip(
      arcPoints(PITCHING_PLATE.x, PITCHING_PLATE.y, FIELD.pitchersCircleRadius, 0, Math.PI * 2, 48),
      0.15,
      COLORS.chalk,
      0.03
    )
  );

  // --- Foul lines (home plate through 1st/3rd base, out to the fence) ----
  group.add(chalkStrip([{ x: 0, y: 0 }, arcEndpoint(FIRST_ANGLE, FIELD.fenceDistance)], 0.25));
  group.add(chalkStrip([{ x: 0, y: 0 }, arcEndpoint(THIRD_ANGLE, FIELD.fenceDistance)], 0.25));

  // Dead-ball lines: 15 feet into foul territory, parallel to each foul line.
  const deadBallLine = (angle, outwardX, outwardY) => {
    const offset = 15;
    const start = { x: outwardX * offset, y: outwardY * offset };
    const end = {
      x: start.x + Math.cos(angle) * FIELD.fenceDistance,
      y: start.y + Math.sin(angle) * FIELD.fenceDistance,
    };
    return chalkStrip([start, end], 0.2, 0xb8bec5, 0.04);
  };
  group.add(deadBallLine(FIRST_ANGLE, Math.SQRT1_2, -Math.SQRT1_2));
  group.add(deadBallLine(THIRD_ANGLE, -Math.SQRT1_2, -Math.SQRT1_2));

  // --- Outfield fence / dead-ball line -----------------------------------
  group.add(chalkStrip(arcPoints(0, 0, FIELD.fenceDistance, FIRST_ANGLE, THIRD_ANGLE, 96), 0.4, 0x8a8a8a, 0.04));

  // --- Base paths (dirt-toned connective lines, mostly cosmetic) ---------
  const pathPts = [BASES.home, BASES.first, BASES.second, BASES.third, BASES.home];
  group.add(chalkStrip(pathPts, 4.5, COLORS.dirt, 0.005));

  // --- Bases --------------------------------------------------------------
  ['first', 'second', 'third'].forEach((key) => {
    const b = BASES[key];
    group.add(rectFilled(b.x, b.y, FIELD.baseSize, FIELD.baseSize, Math.PI / 4, COLORS.base, 0.05));
  });

  // Home plate - pentagon shape (flat edge toward pitcher, point toward
  // the backstop) approximated with real proportions.
  group.add(buildHomePlate());

  // --- Batter's boxes (both sides of the plate) --------------------------
  const boxInnerX = FIELD.homePlateWidth / 2 + FIELD.batterBoxGap;
  [1, -1].forEach((side) => {
    const cx = side * (boxInnerX + FIELD.batterBoxWidth / 2);
    group.add(rectOutline(cx, 1.5, FIELD.batterBoxWidth, FIELD.batterBoxLength, 0));
  });

  // --- Catcher's box -------------------------------------------------------
  group.add(
    rectOutline(
      0,
      -(FIELD.catcherBoxGap + FIELD.catcherBoxDepth / 2),
      FIELD.catcherBoxWidth,
      FIELD.catcherBoxDepth,
      0
    )
  );

  // --- Runner's lane (home to first, offset into foul territory) --------
  group.add(buildRunnersLane());

  // --- Coaches boxes (near first & third, outside the baseline) ----------
  group.add(buildCoachBox('first'));
  group.add(buildCoachBox('third'));

  // Base paths (dotted lines)
  group.add(dottedLineStrip([BASES.home, BASES.first]));
  group.add(dottedLineStrip([BASES.first, BASES.second]));
  group.add(dottedLineStrip([BASES.second, BASES.third]));
  group.add(dottedLineStrip([BASES.third, BASES.home]));

  return group;
}

function arcEndpoint(angle, radius) {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function rectFilled(cx, cy, w, h, angle, color, y) {
  const shape = new THREE.Shape();
  const pts = rectPoints(cx, cy, w, h, angle);
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  return flatShapeMesh(shape, color, y);
}

function buildHomePlate() {
  const w = FIELD.homePlateWidth;
  const shape = new THREE.Shape();
  // Pentagon: flat back edge (toward backstop), square corners toward
  // first/third, point toward the pitcher.
  const hw = w / 2;
  const pts = [
    { x: -hw, y: -w * 0.15 }, // back-left
    { x: -hw, y: w * 0.35 }, // left corner
    { x: 0, y: w * 0.75 }, // front point (toward pitcher)
    { x: hw, y: w * 0.35 }, // right corner
    { x: hw, y: -w * 0.15 }, // back-right
  ];
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();
  return flatShapeMesh(shape, COLORS.homePlate, 0.05);
}

function buildRunnersLane() {
  const group = new THREE.Group();
  const angle = FIRST_ANGLE;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  // Perpendicular pointing into foul territory (away from the infield).
  const perp = { x: dir.y, y: -dir.x };
  const start = { x: dir.x * FIELD.laneStart, y: dir.y * FIELD.laneStart };
  const end = {
    x: dir.x * (FIELD.laneStart + FIELD.laneLength),
    y: dir.y * (FIELD.laneStart + FIELD.laneLength),
  };
  const outerStart = { x: start.x + perp.x * FIELD.laneWidth, y: start.y + perp.y * FIELD.laneWidth };
  const outerEnd = { x: end.x + perp.x * FIELD.laneWidth, y: end.y + perp.y * FIELD.laneWidth };
  group.add(chalkStrip([start, end], 0.15));
  group.add(chalkStrip([outerStart, outerEnd], 0.15));
  return group;
}

function buildCoachBox(baseKey) {
  const base = BASES[baseKey];
  const angle = baseKey === 'first' ? FIRST_ANGLE : THIRD_ANGLE;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const perp = { x: dir.y, y: -dir.x };
  const outward = baseKey === 'first' ? 1 : -1;
  const cx = base.x + perp.x * outward * FIELD.coachBoxOffset;
  const cy = base.y + perp.y * outward * FIELD.coachBoxOffset;
  return rectOutline(cx, cy, FIELD.coachBoxWidth, FIELD.coachBoxLength, angle);
}
