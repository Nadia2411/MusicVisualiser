const TWO_PI = 2 * Math.PI;

onmessage = function (e) {
  let data = e.data;
  switch (data.cmd) {
    case 'updateFlowField':
      let field = calculateFlowField(
        data.cols,
        data.rows,
        data.resolution,
        data.amplitudeLevel
      );
      postMessage({ cmd: 'updatedFlowField', field: field });
      break;
  }
};

function calculateFlowField(cols, rows, resolution, amplitudeLevel) {
  let field = new Array(cols)
    .fill(null)
    .map(() => new Array(rows).fill({ x: 0, y: 0 }));

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
                  const theta = map(Math.random(), 0, 1, 0, TWO_PI);
      field[col][row] = { x: Math.cos(theta), y: Math.sin(theta) };
    }
  }

  return field;
}

function map(value, start1, stop1, start2, stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}
