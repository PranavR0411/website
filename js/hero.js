// ------------------------------------------------------------
// "Drag the redshift" — a toy Lyman-break demo.
// A star-forming galaxy SED is drawn in observed wavelength space.
// Moving z stretches the spectrum by (1+z); everything blueward of
// Lyman-alpha (121.6 nm rest) is progressively eaten by the IGM.
// Filter bands light up or go dark as the break sweeps through them.
// ------------------------------------------------------------
(function () {
  const canvas = document.getElementById('zcanvas');
  if (!canvas) return;
  const slider = document.getElementById('zslider');
  const zval = document.getElementById('zval');
  const readout = document.getElementById('zreadout');
  const ctx = canvas.getContext('2d');

  const W = 960, H = 360;
  canvas.width = W * 2; canvas.height = H * 2; // retina
  ctx.scale(2, 2);

  // wavelength axis: 300 nm .. 2500 nm, log scale
  const LMIN = 300, LMAX = 2500;
  const PAD_L = 46, PAD_R = 16, PAD_T = 18, PAD_B = 58;
  const x = (lam) => PAD_L + (Math.log10(lam / LMIN) / Math.log10(LMAX / LMIN)) * (W - PAD_L - PAD_R);

  // simplified filter set (nm): center, half-width, label, hue
  const filters = [
    { c: 355, w: 30,  n: 'u',  col: '#9C7BFF' },
    { c: 475, w: 70,  n: 'g',  col: '#7DB4FF' },
    { c: 625, w: 75,  n: 'r',  col: '#8FE0C0' },
    { c: 770, w: 75,  n: 'i',  col: '#F3C879' },
    { c: 890, w: 45,  n: 'z',  col: '#F5A96B' },
    { c: 1000, w: 45, n: 'y',  col: '#FF8E6E' },
    { c: 1250, w: 90, n: 'J',  col: '#FF7A5C' },
    { c: 1650, w: 140, n: 'H', col: '#E96A6A' },
    { c: 2160, w: 150, n: 'Ks', col: '#C95E7E' },
  ];

  // rest-frame SED of a young star-forming galaxy (arbitrary units),
  // wavelengths in nm. Blue UV slope + Ly-a emission + Balmer bump.
  function restSED(lam) {
    if (lam < 91.2) return 0.02;                       // Lyman limit
    let f = Math.pow(lam / 150, -0.7);                 // blue UV power law
    f += 2.6 * Math.exp(-Math.pow((lam - 121.6) / 2.2, 2)); // Ly-a emission
    f += 0.35 * Math.exp(-Math.pow((lam - 400) / 90, 2));   // Balmer region
    if (lam > 364.6) f *= 1.18;                        // Balmer jump
    return f;
  }

  // crude IGM transmission blueward of Ly-a as a function of z
  function igmT(lamRest, z) {
    if (lamRest >= 121.6) return 1;
    const strength = Math.min(1, Math.pow((1 + z) / 7, 3.4)); // grows with z
    if (lamRest < 91.2) return Math.max(0, 1 - Math.min(1, strength * 3)); // continuum: gone fast
    return Math.max(0.02, 1 - strength);               // forest blanketing
  }

  // approximate age of the universe at z (Gyr), flat LCDM-ish lookup
  const ages = [[0,13.8],[0.5,8.6],[1,5.9],[1.5,4.3],[2,3.3],[2.5,2.6],[3,2.1],[3.5,1.8],[4,1.5],[4.5,1.3],[5,1.2],[5.5,1.0],[6,0.93],[6.5,0.84],[7,0.77]];
  function ageAt(z) {
    for (let i = 0; i < ages.length - 1; i++) {
      const [z0, a0] = ages[i], [z1, a1] = ages[i + 1];
      if (z >= z0 && z <= z1) return a0 + (a1 - a0) * (z - z0) / (z1 - z0);
    }
    return ages[ages.length - 1][1];
  }

  function draw(z) {
    ctx.clearRect(0, 0, W, H);
    const plotBottom = H - PAD_B;
    const plotH = plotBottom - PAD_T;

    // measure band fluxes first (mean SED x IGM over band)
    const bandFlux = filters.map(f => {
      let s = 0, n = 0;
      for (let lam = f.c - f.w; lam <= f.c + f.w; lam += 4) {
        const lr = lam / (1 + z);
        s += restSED(lr) * igmT(lr, z); n++;
      }
      return s / n;
    });
    const maxBand = Math.max(...bandFlux, 0.001);

    // filter bands
    filters.forEach((f, i) => {
      const x0 = x(f.c - f.w), x1 = x(f.c + f.w);
      const detected = bandFlux[i] > 0.075 * maxBand + 0.012;
      ctx.fillStyle = detected ? f.col + '2E' : '#FFFFFF08';
      ctx.strokeStyle = detected ? f.col + '99' : '#FFFFFF14';
      ctx.lineWidth = 1;
      const r = 6;
      roundRect(ctx, x0, PAD_T + 8, x1 - x0, plotH - 8, r);
      ctx.fill(); ctx.stroke();
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = detected ? f.col : '#4A5578';
      ctx.fillText(f.n, (x0 + x1) / 2, plotBottom + 20);
      if (!detected) {
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#FF7A5C';
        ctx.fillText('dropout', (x0 + x1) / 2, plotBottom + 34);
      }
    });

    // SED curve
    let maxF = 0;
    const pts = [];
    for (let px = PAD_L; px <= W - PAD_R; px += 2) {
      const lam = LMIN * Math.pow(LMAX / LMIN, (px - PAD_L) / (W - PAD_L - PAD_R));
      const lr = lam / (1 + z);
      const f = restSED(lr) * igmT(lr, z);
      pts.push([px, f]);
      if (f > maxF) maxF = f;
    }
    const norm = (plotH - 26) / (maxF || 1);

    // gradient stroke: blue -> red across the canvas
    const grad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
    grad.addColorStop(0, '#7DB4FF'); grad.addColorStop(0.4, '#8FE0C0');
    grad.addColorStop(0.7, '#F3C879'); grad.addColorStop(1, '#FF7A5C');

    ctx.beginPath();
    pts.forEach(([px, f], i) => {
      const py = plotBottom - f * norm;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.strokeStyle = grad; ctx.lineWidth = 2.4; ctx.stroke();
    // soft fill
    ctx.lineTo(W - PAD_R, plotBottom); ctx.lineTo(PAD_L, plotBottom); ctx.closePath();
    ctx.fillStyle = '#7DB4FF10'; ctx.fill();

    // break marker
    const lamBreak = 121.6 * (1 + z);
    if (lamBreak > LMIN && lamBreak < LMAX) {
      const bx = x(lamBreak);
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = '#F3C879AA'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(bx, PAD_T); ctx.lineTo(bx, plotBottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#F3C879'; ctx.textAlign = 'left';
      ctx.fillText('Lyman break \u2192 ' + Math.round(lamBreak) + ' nm', Math.min(bx + 7, W - 190), PAD_T + 12);
    }

    // axis
    ctx.strokeStyle = '#24304F'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD_L, plotBottom); ctx.lineTo(W - PAD_R, plotBottom); ctx.stroke();
    ctx.font = '10px "IBM Plex Mono", monospace'; ctx.fillStyle = '#6B77A0';
    [300, 500, 1000, 2000].forEach(l => {
      ctx.textAlign = 'center';
      ctx.fillText(l + ' nm', x(l), plotBottom + 46);
    });
    ctx.save();
    ctx.translate(14, PAD_T + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText('flux', 0, 0);
    ctx.restore();

    // readout text
    updateReadout(z, bandFlux, maxBand);
  }

  function roundRect(c, x0, y0, w, h, r) {
    c.beginPath();
    c.moveTo(x0 + r, y0);
    c.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    c.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    c.arcTo(x0, y0 + h, x0, y0, r);
    c.arcTo(x0, y0, x0 + w, y0, r);
    c.closePath();
  }

  function updateReadout(z, bandFlux, maxBand) {
    const age = ageAt(z);
    const lamBreak = Math.round(121.6 * (1 + z));
    let msg;
    if (z < 1.9) {
      msg = 'At <span class="mono">z = ' + z.toFixed(1) + '</span>, the Lyman break sits at ' + lamBreak +
        ' nm \u2014 still blueward of every filter. The intergalactic medium leaves this galaxy\u2019s photometry untouched. Light left it when the universe was ' + age.toFixed(1) + ' Gyr old.';
    } else {
      // which is the bluest dark band?
      let dropoutBand = null;
      for (let i = 0; i < filters.length; i++) {
        const detected = bandFlux[i] > 0.075 * maxBand + 0.012;
        if (!detected) dropoutBand = filters[i].n; else break;
      }
      if (dropoutBand) {
        msg = 'At <span class="mono">z = ' + z.toFixed(1) + '</span>, hydrogen along the line of sight has swallowed everything blueward of ' + lamBreak +
          ' nm. The galaxy vanishes from the <span class="mono">' + dropoutBand + '</span> band \u2014 astronomers call it a <span class="mono">' + dropoutBand +
          '-dropout</span>. This light was emitted when the universe was just ' + age.toFixed(2) + ' Gyr old.';
      } else {
        msg = 'At <span class="mono">z = ' + z.toFixed(1) + '</span>, the break is at ' + lamBreak +
          ' nm and IGM absorption is starting to nibble at the bluest filters. The light was emitted ' + age.toFixed(1) + ' Gyr after the Big Bang.';
      }
    }
    readout.innerHTML = msg;
  }

  slider.addEventListener('input', () => {
    const z = parseFloat(slider.value);
    zval.textContent = 'z = ' + z.toFixed(1);
    draw(z);
  });

  // gentle intro animation to z=4 unless reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let z0 = 0;
  draw(0);
  if (!prefersReduced) {
    const target = 4.0;
    const anim = () => {
      z0 += 0.05;
      if (z0 >= target) z0 = target;
      slider.value = z0; zval.textContent = 'z = ' + z0.toFixed(1);
      draw(z0);
      if (z0 < target) requestAnimationFrame(anim);
    };
    setTimeout(() => requestAnimationFrame(anim), 700);
  } else {
    slider.value = 4; zval.textContent = 'z = 4.0'; draw(4);
  }
})();
