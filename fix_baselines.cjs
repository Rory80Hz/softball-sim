const fs = require('fs');

let field = fs.readFileSync('src/field/Field.js', 'utf8');

const baseContent = `
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    return mesh;
}

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

export function buildField() {
`;

field = field.replace(
    /export function buildField\(\) \{/,
    baseContent.trim()
);

const baseContentGroup = `
  // Base paths (dotted lines)
  group.add(dottedLineStrip([BASES.home, BASES.first]));
  group.add(dottedLineStrip([BASES.first, BASES.second]));
  group.add(dottedLineStrip([BASES.second, BASES.third]));
  group.add(dottedLineStrip([BASES.third, BASES.home]));

  return group;
}
`;

field = field.replace(
    /return group;\n\}/,
    baseContentGroup.trim()
);

fs.writeFileSync('src/field/Field.js', field);
