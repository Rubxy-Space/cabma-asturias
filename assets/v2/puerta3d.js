/* CABMA Asturias: modelos 3D de las puertas acorazadas CABMA, copiados de las fotos y fichas reales.
   Three.js r159 sin modulos (funciona con doble clic). Expone window.CabmaPuerta3D:
     precargar()                  -> Promise (texturas en data URI de tex.js)
     entorno(renderer, calido)    -> mapa de entorno para los reflejos del metal
     crearPuerta({ modelo, placa, patillas }) -> objeto con todas las piezas
     MODELOS                      -> medidas y herrajes de cada modelo
   Unidades en metros. Suelo en y = 0. La cara exterior mira a +z. La cara del marco esta en z = 0.
   Se construye siempre con la cerradura a la derecha (vista exterior) y se refleja si el modelo la lleva
   a la izquierda, como en las fotos de CABMA. */
(function () {
	'use strict';
	var THREE = window.THREE;
	if (!THREE) return;

	/* ---------- medidas y herrajes de cada modelo (sacados de las fotos y fichas de cabma.es) */
	var MODELOS = {
		'thor-20-plus': {
			nombre: 'Thor 20 Plus', block: [0.92, 2.05], marco: 'vinilo', anchoMarco: 0.078,
			perfil: { ancho: 0.016, acabado: 'cromo' }, tablero: 'liso', tono: [227, 172, 115], tonoMarco: [218, 174, 140],
			lado: 'izq', herraje: 'cromo',
			escudos: [1.04, 0.88], xEscudo: 0.082, pomo: { y: 0.79 }, mirilla: false,
			bulones: [0.92, 0.96, 1.0, 1.04], resbalon: 1.12,
			desviadores: [1.36, 1.62, 1.88, 0.62, 0.38, 0.14],
			bisagras: [0.24, 0.76, 1.3, 1.82], antipalancas: [0.12, 0.5, 0.98, 1.1, 1.56, 1.94],
			omegas: [0.13, 0.37, 0.61], tetracero: true, manganeso: 'rojo', ceramica: false,
			cepillo: true, grosor: 0.075, burlete: 'simple'
		},
		'thor-20': {
			nombre: 'Thor 20', block: [0.92, 2.05], marco: 'vinilo', anchoMarco: 0.078,
			perfil: { ancho: 0.01, acabado: 'dorado' }, tablero: 'liso', tono: [238, 178, 116], tonoMarco: [235, 192, 151],
			lado: 'der', herraje: 'laton',
			escudos: [0.865], xEscudo: 0.073, pomo: { y: 0.76 }, mirilla: 1.45,
			bulones: [0.9, 0.94, 0.98, 1.02], resbalon: 1.1,
			desviadores: [1.42, 1.82, 0.48, 0.14],
			bisagras: [0.26, 1.02, 1.78], antipalancas: [0.1, 0.42, 0.64, 0.86, 1.18, 1.4, 1.62, 1.94],
			omegas: [0.14, 0.38, 0.62], tetracero: false, manganeso: false, ceramica: false,
			cepillo: true, grosor: 0.07, burlete: 'simple'
		},
		'premium-5c': {
			nombre: 'Premium 5C', block: [0.89, 2.06], marco: 'galvanizado', anchoMarco: 0.045,
			perfil: null, tablero: 'moldura', tono: [192, 143, 86], tonoMarco: [242, 242, 241],
			lado: 'izq', herraje: 'cromo',
			escudos: [1.17, 0.99], xEscudo: 0.069, pomo: null, mirilla: false, escudo: 'keso',
			bulones: [0.96, 1.0, 1.04, 1.08], resbalon: 1.2,
			desviadores: [1.81, 1.36, 0.59, 0.14], gancho: true,
			bisagras: [0.21, 0.74, 1.26, 1.77], antipalancas: [0.1, 0.47, 1.0, 1.52, 1.95, 1.12],
			omegas: [0.16, 0.35, 0.6], tetracero: true, manganeso: 'oscuro', ceramica: true,
			cepillo: false, grosor: 0.085, burlete: 'simple', tapones: true, travesanos: [1.65, 1.34, 0.85, 0.37], placaCerradura: { ancho: 0.175, x: 0.12, y0: 0.9, y1: 1.27 },
			/* corte de la contratapa como en la foto interior: borde derecho al 70 % del ancho,
			   diagonal de 0,80 m (al 70 %) a 0,31 m (al 14 %), y ventanas cuadradas a la ceramica */
			corte: { x1: 0.7, y1: 0.8, x2: 0.14, y2: 0.31 }, ventanas: { x: [0.25, 0.47, 0.7], y: [0.12, 0.185, 0.25] },
			placasBisagra: true
		},
		'premium-4c': {
			/* panel de DM lacado en blanco, marco galvanizado con tapones, un escudo KESO, bulones de gancho */
			nombre: 'Premium 4C', block: [0.89, 2.06], marco: 'galvanizado', anchoMarco: 0.045,
			perfil: null, tablero: 'moldura', acabado: 'lacado', colorPanel: 0xe6e6e5, tono: [238, 236, 232], tonoMarco: [242, 242, 241],
			lado: 'izq', herraje: 'cromo',
			escudos: [1.04], xEscudo: 0.069, pomo: null, mirilla: false, escudo: 'keso',
			bulones: [0.9, 0.94, 0.98, 1.02], resbalon: 1.14,
			desviadores: [1.82, 1.42, 0.6, 0.2], gancho: true,
			bisagras: [0.26, 1.04, 1.82], antipalancas: [0.1, 0.42, 0.64, 0.86, 1.18, 1.4, 1.62, 1.94],
			omegas: [0.16, 0.35, 0.6], tetracero: true, manganeso: 'oscuro', ceramica: false,
			cepillo: true, grosor: 0.08, burlete: 'simple', tapones: true, colorTapon: 0xb5b6b7,
			travesanos: [1.74, 1.56, 1.37, 0.83, 0.65, 0.44, 0.26], placaCerradura: { ancho: 0.17, x: 0.115, y0: 0.88, y1: 1.3 },
			/* por dentro CABMA la fotografia con la contratapa cortada en vertical al 64 % del ancho */
			corte: { x1: 0.64, recto: true, color: 0xbdc1c5 }, placasBisagra: true
		},
		'premium-3c': {
			/* tablero liso de roble, marco galvanizado con tapones, un escudo KESO */
			nombre: 'Premium 3C', block: [0.89, 2.06], marco: 'galvanizado', anchoMarco: 0.045,
			perfil: null, tablero: 'moldura', tono: [209, 156, 92], tonoMarco: [242, 242, 241],
			lado: 'izq', herraje: 'laton',
			escudos: [1.02], xEscudo: 0.069, pomo: null, mirilla: false, escudo: 'keso',
			bulones: [0.9, 0.94, 0.98, 1.02], resbalon: 1.14,
			desviadores: [1.82, 1.42, 0.6, 0.2], gancho: false,
			bisagras: [0.26, 1.04, 1.82], antipalancas: [0.1, 0.42, 0.64, 0.86, 1.18, 1.4, 1.62, 1.94],
			omegas: [0.16, 0.35, 0.6], tetracero: false, manganeso: 'oscuro', ceramica: false,
			cepillo: true, grosor: 0.08, burlete: 'simple', tapones: true, colorTapon: 0xc8b8a2,
			placaCerradura: { ancho: 0.16, x: 0.11, y0: 0.86, y1: 1.26 },
			/* contratapa cortada en diagonal como en la foto interior: de 0,72 m (al 67 %) a 0,30 m (al 5 %) */
			corte: { x1: 0.67, y1: 0.72, x2: 0.05, y2: 0.3, color: 0xa3a7ab }, ventanas: { x: [0.22, 0.42, 0.62], y: [0.11, 0.17, 0.23] },
			placasBisagra: true
		},
		'idom': {
			/* la Thor 20 con cerradura electronica: tablero fresado de sapelly, teclado y manilla */
			nombre: 'iDOM', block: [0.92, 2.05], marco: 'vinilo', anchoMarco: 0.078,
			perfil: { ancho: 0.01, acabado: 'cromo' }, tablero: 'fresado', tono: [231, 166, 106], tonoMarco: [203, 130, 74],
			fresado: { v: [0.13, 0.84], h: 7 },
			lado: 'der', herraje: 'cromo',
			escudos: [0.95], xEscudo: 0.073, pomo: null, mirilla: 1.56,
			manilla: { y: 1.06, acabado: 'cromo' }, teclado: { y: 1.2 },
			bulones: [0.9, 0.94, 0.98, 1.02], resbalon: 1.06,
			desviadores: [1.42, 1.82, 0.48, 0.14],
			bisagras: [0.26, 1.02, 1.78], antipalancas: [0.1, 0.42, 0.64, 0.86, 1.18, 1.4, 1.62, 1.94],
			omegas: [0.14, 0.38, 0.62], tetracero: false, manganeso: 'gris', ceramica: false,
			cepillo: true, grosor: 0.07, burlete: 'simple', portapilas: true
		},
		'eco-thor': {
			/* gama economica de la serie Thor: un escudo, pomo, 2 desviadores, 2 bisagras y 2 antipalancas */
			nombre: 'Eco-Thor', block: [0.92, 2.05], marco: 'vinilo', anchoMarco: 0.078,
			perfil: { ancho: 0.01, acabado: 'cromo' }, tablero: 'liso', tono: [217, 166, 109], tonoMarco: [223, 184, 153],
			lado: 'izq', herraje: 'cromo',
			escudos: [0.96], xEscudo: 0.078, pomo: { y: 0.86 }, mirilla: false,
			bulones: [0.9, 0.94, 0.98, 1.02], resbalon: 1.1,
			desviadores: [1.62, 0.38],
			bisagras: [0.3, 1.75], antipalancas: [0.7, 1.35],
			omegas: [0.11, 0.33, 0.56, 0.78], tetracero: false, manganeso: false, ceramica: false,
			cepillo: true, grosor: 0.065, burlete: 'simple'
		},
		'puerta-trastero': {
			/* chapa galvanizada forrada de vinilo blanco por las dos caras, manilla negra y rejillas de ventilacion */
			nombre: 'Puerta de trastero', block: [0.8, 2.0], marco: 'galvanizado', anchoMarco: 0.055, colorMarco: 0xd0d0ce,
			perfil: null, tablero: 'chapa', colorPanel: 0xd2d2d0, tono: [230, 230, 228], tonoMarco: [232, 232, 230],
			lado: 'izq', herraje: 'cromo',
			escudos: [0.9], xEscudo: 0.062, pomo: null, mirilla: false,
			manilla: { y: 0.98, acabado: 'negro' },
			bulones: [0.86, 0.9, 0.94], resbalon: 0.98,
			desviadores: [1.6, 0.4],
			bisagras: [0.25, 1.0, 1.75], antipalancas: [0.7, 1.3],
			omegas: [0.22, 0.52], tetracero: false, manganeso: false, ceramica: false,
			cepillo: false, grosor: 0.05, burlete: 'simple',
			rejillas: { x: [0.27, 0.73], y: 0.2, n: 4, paso: 0.026, hueco: 0.0075 }, panelInt: 'chapa', interiorVisto: 'panel'
		}
	};


	/* ---------- utilidades */
	function azar(semilla) {
		var s = semilla || 7;
		return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
	}
	function lienzo(w, h, dibujar) {
		var c = document.createElement('canvas');
		c.width = w; c.height = h;
		dibujar(c.getContext('2d'), w, h);
		return c;
	}
	function texLienzo(c, color) {
		var t = new THREE.CanvasTexture(c);
		if (color !== false) t.colorSpace = THREE.SRGBColorSpace;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.anisotropy = 8;
		return t;
	}
	var imagenes = {};
	function cargar(nombre, src) {
		return new Promise(function (ok) {
			var img = new Image();
			img.onload = function () { imagenes[nombre] = img; ok(img); };
			img.onerror = function () { ok(null); };
			img.src = src;
		});
	}
	function precargar() {
		var T = window.CABMA_TEX || {};
		var lista = [];
		['robleColor', 'robleNormal', 'robleRugosidad', 'logo', 'yesoColor', 'yesoNormal', 'marmolColor', 'marmolNormal', 'marmolRugosidad', 'roble'].forEach(function (k) { if (T[k] && !imagenes[k]) lista.push(cargar(k, T[k])); });
		if (document.fonts && document.fonts.load) lista.push(document.fonts.load('800 80px "Archivo"').catch(function () {}));
		return Promise.all(lista);
	}
	function textura(nombre, op) {
		/* textura de una imagen precargada. op: { color: true|false, rep: [u, v], rot } */
		op = op || {};
		var img = op.lienzo || imagenes[nombre];
		if (!img) return null;
		var t = new THREE.Texture(img);
		t.colorSpace = op.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.anisotropy = 12;
		if (op.rep) t.repeat.set(op.rep[0], op.rep[1]);
		if (op.rot) { t.center.set(0.5, 0.5); t.rotation = op.rot; }
		t.needsUpdate = true;
		return t;
	}
	var lienzosTono = {};
	function lienzoTono(tono) {
		/* recolorea la chapa de roble para que su color medio sea el de la puerta real */
		var k = tono.join(',');
		if (lienzosTono[k]) return lienzosTono[k];
		var img = imagenes.robleColor || imagenes.roble;
		var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
		var g = c.getContext('2d'); g.drawImage(img, 0, 0);
		var d = g.getImageData(0, 0, c.width, c.height), px = d.data, n = px.length / 4, m = [0, 0, 0], i;
		for (i = 0; i < px.length; i += 4) { m[0] += px[i]; m[1] += px[i + 1]; m[2] += px[i + 2]; }
		m = m.map(function (v) { return v / n; });
		for (i = 0; i < px.length; i += 4) {
			for (var j = 0; j < 3; j++) { var v = tono[j] + (px[i + j] - m[j]) * 0.62; px[i + j] = v < 0 ? 0 : (v > 255 ? 255 : v); }
		}
		g.putImageData(d, 0, 0);
		return (lienzosTono[k] = c);
	}
	function texMadera(rot, ox, oy, rx, ry, tono) {
		var img = imagenes.roble;
		if (!img) return null;
		var t = new THREE.Texture(tono ? lienzoTono(tono) : img);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
		t.center.set(0.5, 0.5);
		t.rotation = rot || 0;
		t.offset.set(ox || 0, oy || 0);
		t.repeat.set(rx || 1, ry || 1);
		t.needsUpdate = true;
		return t;
	}

	/* ---------- texturas generadas */
	var cacheTex = {};
	function texYeso() {
		if (cacheTex.yeso) return cacheTex.yeso;
		var r = azar(11);
		var c = lienzo(1024, 1024, function (g, w, h) {
			g.fillStyle = '#ebe6de'; g.fillRect(0, 0, w, h);
			for (var i = 0; i < 40; i++) {
				var x = r() * w, y = r() * h, rad = 80 + r() * 260;
				var gr = g.createRadialGradient(x, y, 0, x, y, rad), a = 0.035 * r();
				gr.addColorStop(0, r() > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(150,135,115,' + a + ')');
				gr.addColorStop(1, 'rgba(0,0,0,0)');
				g.fillStyle = gr; g.fillRect(0, 0, w, h);
			}
			for (var j = 0; j < 60000; j++) {
				g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(90,80,65,0.07)';
				g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
			}
		});
		return (cacheTex.yeso = texLienzo(c));
	}
	function texBaldosa() {
		if (cacheTex.baldosa) return cacheTex.baldosa;
		var r = azar(23);
		var c = lienzo(1024, 1024, function (g, w, h) {
			var n = 2, s = w / n;
			g.fillStyle = '#a9a196'; g.fillRect(0, 0, w, h);
			for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
				var l = 196 + Math.floor(r() * 14);
				g.fillStyle = 'rgb(' + l + ',' + (l - 5) + ',' + (l - 13) + ')';
				g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
				for (var k = 0; k < 9000; k++) {
					g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(60,50,40,0.06)';
					g.fillRect(i * s + 3 + r() * (s - 6), j * s + 3 + r() * (s - 6), 2, 2);
				}
			}
		});
		return (cacheTex.baldosa = texLienzo(c));
	}
	function texGalvanizado() {
		/* chapa galvanizada: flor de zinc (cristales grandes en grises) */
		if (cacheTex.galv) return cacheTex.galv;
		var r = azar(5);
		var c = lienzo(1024, 1024, function (g, w, h) {
			g.fillStyle = '#d3d7db'; g.fillRect(0, 0, w, h);
			for (var i = 0; i < 2600; i++) {
				var x = r() * w, y = r() * h, s = 6 + r() * 26, l = 196 + Math.floor(r() * 42);
				g.fillStyle = 'rgba(' + l + ',' + (l + 2) + ',' + (l + 5) + ',0.2)';
				g.beginPath(); g.moveTo(x, y);
				for (var k = 0; k < 6; k++) g.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
				g.closePath(); g.fill();
			}
		});
		return (cacheTex.galv = texLienzo(c));
	}
	function texCeramica() {
		if (cacheTex.cer) return cacheTex.cer;
		var r = azar(3);
		var c = lienzo(512, 1024, function (g, w, h) {
			g.fillStyle = '#e8e3d8'; g.fillRect(0, 0, w, h);
			for (var k = 0; k < 20000; k++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(120,105,85,.08)'; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
			g.strokeStyle = 'rgba(120,108,90,.55)'; g.lineWidth = 3;
			for (var x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
			for (var y = 0; y <= h; y += h / 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
		});
		return (cacheTex.cer = texLienzo(c));
	}
	function texTetracero() {
		/* barra corrugada retorcida: franjas en helice */
		if (cacheTex.tetra) return cacheTex.tetra;
		var c = lienzo(64, 256, function (g, w, h) {
			g.fillStyle = '#4a3a2e'; g.fillRect(0, 0, w, h);
			for (var y = -64; y < h + 64; y += 16) {
				g.strokeStyle = 'rgba(160,130,105,.55)'; g.lineWidth = 5;
				g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 22); g.stroke();
				g.strokeStyle = 'rgba(20,14,10,.6)'; g.lineWidth = 3;
				g.beginPath(); g.moveTo(0, y + 7); g.lineTo(w, y + 29); g.stroke();
			}
		});
		var t = texLienzo(c); t.repeat.set(1, 18);
		return (cacheTex.tetra = t);
	}
	function texCepillo() {
		if (cacheTex.cepillo) return cacheTex.cepillo;
		var r = azar(17);
		var c = lienzo(512, 32, function (g, w, h) {
			g.fillStyle = '#141414'; g.fillRect(0, 0, w, h);
			for (var i = 0; i < 1400; i++) { g.fillStyle = 'rgba(90,90,90,' + (0.2 + r() * 0.4) + ')'; g.fillRect(r() * w, 0, 1, h * (0.6 + r() * 0.4)); }
		});
		var t = texLienzo(c); t.repeat.set(6, 1);
		return (cacheTex.cepillo = t);
	}
	function texPlaca() {
		/* placa de acero cepillado con el logo CABMA y la etiqueta ASTURIAS (grande) */
		var logo = imagenes.logo;
		var c = lienzo(1024, 700, function (g, w, h) {
			var gr = g.createLinearGradient(0, 0, w, h);
			gr.addColorStop(0, '#f4f5f6'); gr.addColorStop(0.45, '#d9dde1'); gr.addColorStop(0.6, '#f1f2f3'); gr.addColorStop(1, '#c9ced3');
			g.fillStyle = gr; g.fillRect(0, 0, w, h);
			var r = azar(9);
			for (var i = 0; i < 1600; i++) {
				g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(90,95,100,0.07)';
				g.lineWidth = 1; var y = r() * h;
				g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 2); g.stroke();
			}
			var lw = w * 0.62, lh = logo ? lw * logo.height / logo.width : 0;
			if (logo) g.drawImage(logo, (w - lw) / 2, 46, lw, lh);
			var by = 46 + lh + 26, bw = w * 0.84, bh = h - by - 46;
			g.fillStyle = '#a41714';
			g.fillRect((w - bw) / 2, by, bw, bh);
			g.fillStyle = '#ffffff';
			g.textAlign = 'center'; g.textBaseline = 'middle';
			var tam = Math.round(bh * 0.74);
			g.font = '800 ' + tam + 'px "Archivo", "Source Sans 3", "Source Sans Pro", Arial, sans-serif';
			if ('letterSpacing' in g) g.letterSpacing = Math.round(tam * 0.16) + 'px';
			var ancho = g.measureText('ASTURIAS').width;
			if (ancho > bw * 0.92) { tam = Math.floor(tam * bw * 0.92 / ancho); g.font = '800 ' + tam + 'px "Archivo", "Source Sans 3", Arial, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = Math.round(tam * 0.16) + 'px'; }
			g.fillText('ASTURIAS', w / 2 + Math.round(tam * 0.08), by + bh / 2 + Math.round(tam * 0.04));
			g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
		});
		return texLienzo(c);
	}

	/* ---------- mapa de entorno (estudio con paneles de luz) */
	function hdri(nombre, renderer) {
		var H = window.CABMA_HDRI && window.CABMA_HDRI[nombre];
		if (!H) return null;
		var bin = atob(H.d), w = H.w, h = H.h, datos = new Uint16Array(w * h * 4), aH = THREE.DataUtils.toHalfFloat;
		for (var y = 0; y < h; y++) {
			var destino = (h - 1 - y) * w * 4, origen = y * w * 4;   // el HDR viene de arriba abajo
			for (var x = 0; x < w; x++) {
				var o = origen + x * 4, e = bin.charCodeAt(o + 3), f = e ? Math.pow(2, e - 136) : 0, d = destino + x * 4;
				datos[d] = aH(bin.charCodeAt(o) * f); datos[d + 1] = aH(bin.charCodeAt(o + 1) * f); datos[d + 2] = aH(bin.charCodeAt(o + 2) * f); datos[d + 3] = aH(1);
			}
		}
		var t = new THREE.DataTexture(datos, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
		t.mapping = THREE.EquirectangularReflectionMapping;
		t.colorSpace = THREE.LinearSRGBColorSpace;
		t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
		var pm = new THREE.PMREMGenerator(renderer);
		var rt = pm.fromEquirectangular(t);
		pm.dispose(); t.dispose();
		return rt.texture;
	}
	function entorno(renderer, tipo) {
		var real = hdri(tipo === 'entrada' || tipo === true ? 'hdriEntrada' : 'hdriEstudio', renderer);
		if (real) return real;
		var escena = new THREE.Scene();
		var fondo0 = tipo === 'blanco' ? 0xe9e9e9 : (tipo ? 0x6d655c : 0x3a3d41);
		var caja0 = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshStandardMaterial({ color: fondo0, side: THREE.BackSide, roughness: 1 }));
		caja0.position.y = 3; escena.add(caja0);
		escena.add(new THREE.AmbientLight(0xffffff, 1.2));
		function panel(x, y, z, w, h, int, rx, ry) {
			var m = new THREE.MeshBasicMaterial({ color: 0xffffff }); m.color.setScalar(int);
			var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
			p.position.set(x, y, z); p.rotation.set(rx || 0, ry || 0, 0); escena.add(p);
		}
		panel(0, 6.9, 0, 8, 3, 6, Math.PI / 2, 0);
		panel(-5.9, 3, 1, 3, 5, 3.5, 0, Math.PI / 2);
		panel(5.9, 3.5, -1, 2, 4, 2.2, 0, -Math.PI / 2);
		panel(0, 2.5, 5.9, 6, 2.5, 2.4, 0, Math.PI);
		var pm = new THREE.PMREMGenerator(renderer);
		var rt = pm.fromScene(escena, 0.035);
		pm.dispose();
		return rt.texture;
	}

	/* ---------- materiales base */
	var base = null;
	function materiales() {
		if (base) return base;
		var galv = texGalvanizado();
		base = {
			galvanizado: new THREE.MeshStandardMaterial({ map: galv, color: 0xf4f6f8, metalness: 0.5, roughness: 0.36, envMapIntensity: 1.1 }),
			galvOscuro: new THREE.MeshStandardMaterial({ map: galv, color: 0xdfe3e7, metalness: 0.55, roughness: 0.4, envMapIntensity: 1 }),
			/* chapa galvanizada del interior de la hoja: mas gris que la de los marcos, calibrada con las fotos interiores */
			galvInt: new THREE.MeshStandardMaterial({ map: galv, color: 0xb9bdc1, metalness: 0.5, roughness: 0.42, envMapIntensity: 1 }),
			galvIntOsc: new THREE.MeshStandardMaterial({ map: galv, color: 0xa7abb0, metalness: 0.55, roughness: 0.44, envMapIntensity: 0.95 }),
			cromo: new THREE.MeshStandardMaterial({ color: 0xeef0f2, metalness: 1, roughness: 0.13, envMapIntensity: 1.2 }),
			aluCromo: new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: 1, roughness: 0.38, envMapIntensity: 2.1 }),
			aluDorado: new THREE.MeshStandardMaterial({ color: 0xd8b466, metalness: 1, roughness: 0.22, envMapIntensity: 1.1 }),
			laton: new THREE.MeshStandardMaterial({ color: 0xe0b85e, metalness: 1, roughness: 0.14, envMapIntensity: 1.25 }),
			niquel: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.32, envMapIntensity: 1 }),
			inox: new THREE.MeshStandardMaterial({ color: 0xc4c0b8, metalness: 1, roughness: 0.28, envMapIntensity: 1 }),
			negro: new THREE.MeshStandardMaterial({ color: 0x0f1011, metalness: 0.2, roughness: 0.55 }),
			goma: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.85 }),
			lacado: new THREE.MeshPhysicalMaterial({ color: 0xf2f0eb, roughness: 0.32, clearcoat: 0.4, envMapIntensity: 0.6 }),
			rojo: new THREE.MeshStandardMaterial({ color: 0xb2261d, metalness: 0.35, roughness: 0.45, envMapIntensity: 0.7 }),
			manganeso: new THREE.MeshStandardMaterial({ color: 0x7f8187, metalness: 0.95, roughness: 0.3, envMapIntensity: 1 }),
			manganesoOscuro: new THREE.MeshStandardMaterial({ color: 0x2e2824, metalness: 0.7, roughness: 0.42, envMapIntensity: 0.8 }),
			negroMate: new THREE.MeshStandardMaterial({ color: 0x141516, metalness: 0.35, roughness: 0.42, envMapIntensity: 0.8 }),
			aluNegro: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.75, roughness: 0.36, envMapIntensity: 1 }),
			ledAzul: new THREE.MeshBasicMaterial({ color: 0x4aa8ff }),
			azulKeso: new THREE.MeshStandardMaterial({ color: 0x1f56c8, roughness: 0.4 }),
			cromoSatinado: new THREE.MeshStandardMaterial({ color: 0xeef0f2, metalness: 1, roughness: 0.2, envMapIntensity: 1.35 }),
			tetracero: new THREE.MeshStandardMaterial({ map: texTetracero(), color: 0xffffff, metalness: 0.6, roughness: 0.55 }),
			ceramica: new THREE.MeshStandardMaterial({ map: texCeramica(), color: 0xffffff, roughness: 0.62, envMapIntensity: 0.5 }),
			cepillo: new THREE.MeshStandardMaterial({ map: texCepillo(), color: 0xffffff, roughness: 1 }),
			tapon: new THREE.MeshStandardMaterial({ color: 0x9b7650, roughness: 0.6 }),
			cristal: new THREE.MeshPhysicalMaterial({ color: 0x1d2a33, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.4 }),
			llave: new THREE.MeshStandardMaterial({ color: 0xf0b400, roughness: 0.45, metalness: 0 }),
			llaveNegro: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.6 })
		};
		return base;
	}
	var VETA = 1 / 1.83;   // la chapa de roble de la textura mide 1,83 m
	function madera(tono, op) {
		/* madera PBR a escala real (las piezas redondeadas usan UV en metros) */
		op = op || {};
		var rep = op.rep || [VETA, VETA];
		var m = new THREE.MeshPhysicalMaterial({
			map: textura(null, { lienzo: lienzoTono(tono), rep: rep, rot: op.rot }),
			normalMap: textura('robleNormal', { color: false, rep: rep, rot: op.rot }),
			normalScale: new THREE.Vector2(0.45, 0.45),
			roughnessMap: textura('robleRugosidad', { color: false, rep: rep, rot: op.rot }),
			color: new THREE.Color(1, 1, 1).multiplyScalar(op.osc || 1),
			roughness: 0.82, clearcoat: 0.3, clearcoatRoughness: 0.32, envMapIntensity: 0.55
		});
		return m;
	}
	/* caja con aristas redondeadas (en la realidad ninguna pieza tiene arista viva). UV en metros. */
	function cajaR(w, h, d, r, mats) {
		r = Math.min(r, w / 2 - 0.0002, h / 2 - 0.0002, d / 2 - 0.0002);
		var f = new THREE.Shape();
		f.moveTo(-w / 2 + r, -h / 2 + r); f.lineTo(w / 2 - r, -h / 2 + r); f.lineTo(w / 2 - r, h / 2 - r); f.lineTo(-w / 2 + r, h / 2 - r); f.lineTo(-w / 2 + r, -h / 2 + r);
		var g = new THREE.ExtrudeGeometry(f, { depth: Math.max(0.0001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 1 });
		g.translate(0, 0, -(d / 2 - r));
		var m = new THREE.Mesh(g, mats);
		m.castShadow = true; m.receiveShadow = true;
		return m;
	}
	/* sombra de contacto (oclusion) bajo herrajes */
	var texSombraC = null;
	function sombraContacto(radio, opacidad) {
		if (!texSombraC) texSombraC = new THREE.CanvasTexture(lienzo(128, 128, function (g) {
			var gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
			gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
			g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
		}));
		var m = new THREE.Mesh(new THREE.PlaneGeometry(radio * 2, radio * 2), new THREE.MeshBasicMaterial({ map: texSombraC, transparent: true, opacity: opacidad, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
		m.position.z = 0.0006;
		return m;
	}

	/* ---------- geometria */
	function caja(w, h, d, mat) {
		var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
		m.castShadow = true; m.receiveShadow = true;
		return m;
	}
	function cil(r, h, mat, seg) {
		var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 32), mat);
		m.castShadow = true; m.receiveShadow = true;
		return m;
	}
	function cilZ(r, h, mat, seg) { var m = cil(r, h, mat, seg); m.rotation.x = Math.PI / 2; return m; }
	function cilX(r, h, mat, seg) { var m = cil(r, h, mat, seg); m.rotation.z = Math.PI / 2; return m; }
	function torno(perfil, mat, seg) {
		/* perfil: [[radio, altura], ...] girado alrededor de z (la pieza sale de la puerta hacia +z) */
		var pts = perfil.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
		var m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg || 48), mat);
		m.rotation.x = Math.PI / 2;
		m.castShadow = true; m.receiveShadow = true;
		var g = new THREE.Group(); g.add(m);
		return g;
	}
	function grupo() { return new THREE.Group(); }

	/* ---------- herrajes */
	function escudoKeso(M, mat) {
		/* escudo F-522 de la Premium: aro abombado, disco central plano y bombillo KESO con su marca azul */
		var g = torno([[0, 0], [0.034, 0], [0.0352, 0.003], [0.0348, 0.008], [0.0325, 0.0135], [0.028, 0.0168], [0.0205, 0.0182], [0.0198, 0.0172], [0, 0.0172]], mat, 72);
		var disco = cilZ(0.0196, 0.0016, M.cromoSatinado || mat, 48); disco.position.z = 0.0176;
		var cara = cilZ(0.0118, 0.002, M.niquel, 40); cara.position.z = 0.019;
		var boca = grupo(); boca.position.z = 0.0202; boca.rotation.z = 0.6;
		var ranura = caja(0.014, 0.0028, 0.001, M.negro); boca.add(ranura);
		var marca = caja(0.005, 0.003, 0.0012, M.azulKeso); marca.position.x = 0.0045; boca.add(marca);
		g.add(disco, cara, boca);
		return g;
	}
	function escudo(M, mat) {
		/* escudo de seguridad redondo con el bombillo europeo en el centro */
		var g = torno([[0, 0], [0.0325, 0], [0.034, 0.002], [0.034, 0.006], [0.032, 0.011], [0.023, 0.0145], [0.0142, 0.0155], [0.0142, 0.0175], [0, 0.0175]], mat, 64);
		var cara = cilZ(0.0128, 0.004, M.niquel, 40); cara.position.z = 0.0175;
		var bocallave = grupo(); bocallave.position.z = 0.0196;
		var redondo = cilZ(0.0042, 0.001, M.negro, 24); redondo.position.y = 0.003;
		var ranura = caja(0.0032, 0.011, 0.001, M.negro); ranura.position.y = -0.003;
		bocallave.add(redondo, ranura);
		g.add(cara, bocallave);
		g.userData.cara = 0.02;
		return g;
	}
	function pomo(M, mat) {
		/* pomo fijo exterior: roseta + seta */
		return torno([[0, 0], [0.041, 0], [0.042, 0.003], [0.038, 0.008], [0.013, 0.011], [0.0115, 0.03], [0.018, 0.042], [0.029, 0.052], [0.031, 0.058], [0.027, 0.066], [0.013, 0.0705], [0, 0.071]], mat, 64);
	}
	function mirilla(M, mat) {
		var g = torno([[0, 0], [0.0145, 0], [0.0145, 0.004], [0.011, 0.008], [0.0065, 0.0085], [0, 0.0085]], mat, 40);
		var lente = new THREE.Mesh(new THREE.SphereGeometry(0.006, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.cristal);
		lente.rotation.x = Math.PI / 2; lente.position.z = 0.0075; g.add(lente);
		return g;
	}
	function llaveMauer(M) {
		/* llave Mauer NW4 con cabeza de color; la hoja entra en el bombillo a lo largo de -z */
		var g = grupo();
		var hoja = caja(0.0028, 0.0085, 0.036, M.niquel); hoja.position.z = -0.018;
		var tope = caja(0.004, 0.012, 0.004, M.niquel); tope.position.z = 0.002;
		var forma = new THREE.Shape();
		forma.moveTo(-0.006, 0); forma.lineTo(0.006, 0);
		forma.bezierCurveTo(0.017, 0.004, 0.019, 0.022, 0.012, 0.03);
		forma.bezierCurveTo(0.006, 0.036, -0.006, 0.036, -0.012, 0.03);
		forma.bezierCurveTo(-0.019, 0.022, -0.017, 0.004, -0.006, 0);
		var geoCab = new THREE.ExtrudeGeometry(forma, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 3 });
		/* la cabeza queda en el mismo plano vertical que la hoja de la llave y sale hacia +z */
		geoCab.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
		geoCab.translate(-0.003, 0, 0.006);
		var cab = new THREE.Mesh(geoCab, M.llave);
		cab.castShadow = true;
		var base0 = caja(0.0075, 0.016, 0.008, M.llaveNegro); base0.position.z = 0.007;
		g.add(hoja, tope, cab, base0);
		return g;
	}

	function manilla(mat) {
		/* manilla de palanca: roseta, cuello y palanca de 12 cm hacia -x (hacia las bisagras) */
		var g = torno([[0, 0], [0.026, 0], [0.027, 0.003], [0.024, 0.008], [0.011, 0.01], [0, 0.01]], mat, 48);
		var cuello = cilZ(0.0095, 0.05, mat, 28); cuello.position.z = 0.03; g.add(cuello);
		var pal = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.105, 8, 20), mat); pal.rotation.z = Math.PI / 2; pal.position.set(-0.058, 0, 0.055); pal.castShadow = true; g.add(pal);
		var codo = new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 12), mat); codo.position.set(0, 0, 0.055); g.add(codo);
		return g;
	}
	var matRejilla = null;
	function rejillas(rj, pw, ph, z) {
		/* rejillas de ventilacion: cuadricula de agujeros, como en la puerta de trastero */
		matRejilla = matRejilla || new THREE.MeshStandardMaterial({ color: 0x2b2c2e, roughness: 0.7 });
		var n = rj.n, total = rj.x.length * n * n;
		var hu = rj.hueco || 0.0085;
		var im = new THREE.InstancedMesh(new THREE.BoxGeometry(hu, hu, 0.0012), matRejilla, total), m4 = new THREE.Matrix4(), k = 0;
		rj.x.forEach(function (fx0) {
			var cx = -pw / 2 + fx0 * pw, cy = -ph / 2 + rj.y;
			for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
				m4.makeTranslation(cx + (i - (n - 1) / 2) * rj.paso, cy + (j - (n - 1) / 2) * rj.paso, z);
				im.setMatrixAt(k++, m4);
			}
		});
		return im;
	}

	/* omega: perfil de sombrero de chapa (alas + canal) extruido en altura */
	function omega(alto, mat) {
		var g = grupo(), e = 0.0015;
		var ala = 0.014, fondo = 0.032, canal = 0.05;
		[-1, 1].forEach(function (s) {
			var a = caja(ala, alto, e, mat); a.position.set(s * (canal / 2 + 0.006 + ala / 2), 0, -fondo / 2); g.add(a);
			var p = caja(e, alto, Math.hypot(fondo, 0.006), mat);
			p.position.set(s * (canal / 2 + 0.003), 0, 0); p.rotation.y = s * Math.atan2(0.006, fondo); g.add(p);
		});
		var tapa = caja(canal, alto, e, mat); tapa.position.z = fondo / 2; g.add(tapa);
		return g;
	}

	/* ---------- puerta completa */
	function crearPuerta(op) {
		op = op || {};
		var cfg = MODELOS[op.modelo] || MODELOS['thor-20-plus'];
		/* la intro ajusta el tono a su luz calida de recibidor sin tocar el resto de visores */
		if (op.tono || op.tonoMarco) { cfg = Object.assign({}, cfg); if (op.tono) cfg.tono = op.tono; if (op.tonoMarco) cfg.tonoMarco = op.tonoMarco; }
		/* configurador: cambia acabados, diseño del panel, marco, perfil, herrajes, lado y medida sin tocar los modelos */
		if (op.ajustes) cfg = Object.assign({}, cfg, op.ajustes);
		var M = materiales();
		var WT = cfg.block[0], HT = cfg.block[1];
		var FW = cfg.anchoMarco;          // ancho visto del marco
		var HOL = 0.004;                  // holgura hoja-marco
		var SOL = 0.014;                  // solape de la hoja por detras del marco
		var VIS_W = WT - 2 * FW, VIS_H = HT - FW - 0.006;
		var W = VIS_W + 2 * SOL, H = VIS_H + SOL;   // hoja real
		var T = cfg.grosor;
		var ZF = -0.013;                  // cara exterior de la hoja (por detras de la cara del marco)
		var herr = cfg.herraje === 'laton' ? M.laton : (cfg.herraje === 'negro' ? M.negroMate : M.cromo);
		var perfilMat = !cfg.perfil ? M.aluCromo : (cfg.perfil.acabado === 'dorado' ? M.aluDorado : (cfg.perfil.acabado === 'negro' ? M.aluNegro : M.aluCromo));
		var matManilla = function (ac) { return ac === 'negro' ? M.negroMate : (ac === 'laton' ? M.laton : M.cromo); };
		var maderaHoja = madera(cfg.tono || [220, 170, 110]);
		var liso = cfg.tablero === 'lacado' || cfg.tablero === 'chapa' || cfg.acabado === 'lacado', lacadoCanto = null;
		if (liso) {
			/* DM lacado (Premium 4C) o chapa forrada de vinilo (trastero): color liso, sin veta */
			maderaHoja = new THREE.MeshPhysicalMaterial({ color: cfg.colorPanel, roughness: cfg.tablero === 'chapa' ? 0.52 : 0.3, clearcoat: cfg.tablero === 'chapa' ? 0.12 : 0.45, clearcoatRoughness: 0.25, envMapIntensity: 0.7 });
			lacadoCanto = maderaHoja.clone(); lacadoCanto.color.multiplyScalar(0.93);
		}
		var maderaV = madera(cfg.tonoMarco);
		var maderaH = madera(cfg.tonoMarco, { rot: Math.PI / 2 });
		var maderaVc = madera(cfg.tonoMarco, { osc: 0.82 });
		if (cfg.marcoLiso !== undefined && cfg.marcoLiso !== null) {
			/* marco forrado de vinilo liso (inox, antracita, blanco o negro) */
			maderaV = new THREE.MeshPhysicalMaterial({ color: cfg.marcoLiso, roughness: cfg.marcoMetal ? 0.34 : 0.5, metalness: cfg.marcoMetal ? 0.55 : 0.04, clearcoat: 0.15, envMapIntensity: 0.8 });
			maderaH = maderaV; maderaVc = maderaV.clone(); maderaVc.color.multiplyScalar(0.86);
		}
		var maderaCanto = liso ? lacadoCanto : madera(cfg.tono, { osc: 0.8 });

		var raiz = grupo();               // se refleja si la cerradura va a la izquierda
		var grupoPuerta = grupo(); grupoPuerta.add(raiz);
		if (cfg.lado === 'izq') raiz.scale.x = -1;

		/* ===== marco (block) ===== */
		var marco = grupo(); raiz.add(marco);
		var PD = 0.1;                     // fondo del marco
		var jx = WT / 2 - FW / 2;
		var matCaraV = cfg.marco === 'vinilo' ? maderaV : M.galvanizado;
		var matCaraH = cfg.marco === 'vinilo' ? maderaH : M.galvanizado;
		var matCuerpo = M.galvOscuro;
		var matMarcoG = M.galvanizado, matMarcoP = M.galvOscuro;
		if (cfg.colorMarco) {
			/* marco de chapa pintada del mismo color que la hoja (trastero) */
			matMarcoG = new THREE.MeshStandardMaterial({ color: cfg.colorMarco, metalness: 0.15, roughness: 0.48, envMapIntensity: 0.8 });
			matMarcoP = matMarcoG.clone(); matMarcoP.color.multiplyScalar(0.88);
		}
		[-1, 1].forEach(function (s) {
			var altoL = HT - FW;
			if (cfg.marco === 'galvanizado') {
				/* el marco de chapa tiene dos planos: cara y pliegue interior */
				var anchoCara = FW - 0.011;
				var cara = caja(anchoCara, altoL, 0.012, matMarcoG);
				cara.position.set(s * (WT / 2 - anchoCara / 2), altoL / 2, -0.006); marco.add(cara);
				var pliegue = caja(0.011, altoL, 0.008, matMarcoP);
				pliegue.position.set(s * (VIS_W / 2 + 0.0055), altoL / 2, -0.008); marco.add(pliegue);
			} else {
				var cara = cajaR(FW, altoL, 0.012, 0.0022, [matCaraV, maderaVc]);
				cara.position.set(s * jx, altoL / 2, -0.006); marco.add(cara);
				/* por detras el marco es chapa galvanizada: el vinilo solo forra la cara vista */
				var dorsoV = caja(FW - 0.004, altoL - 0.004, 0.001, M.galvOscuro); dorsoV.position.set(s * jx, altoL / 2, -0.0122); marco.add(dorsoV);
			}
			/* larguero del marco: su cara interior queda a 4 mm del canto de la hoja */
			var anchoL = WT / 2 - (W / 2 + HOL);
			var cuerpo = caja(anchoL, HT, PD - 0.012, matCuerpo);
			cuerpo.position.set(s * (W / 2 + HOL + anchoL / 2), HT / 2, -0.012 - (PD - 0.012) / 2); marco.add(cuerpo);
			var tope = caja(0.022, H, 0.016, matCuerpo);
			tope.position.set(s * (VIS_W / 2 + 0.011), H / 2, ZF - T - 0.008); marco.add(tope);
			/* burlete negro entre marco y hoja */
			var b = caja(0.0028, VIS_H, 0.01, M.goma);
			b.position.set(s * (VIS_W / 2 + 0.0012), VIS_H / 2, -0.012); marco.add(b);
		});
		if (cfg.marco === 'galvanizado') {
			var cabe = caja(WT, FW - 0.011, 0.012, matMarcoG); cabe.position.set(0, HT - (FW - 0.011) / 2, -0.006); marco.add(cabe);
			var plS = caja(VIS_W + 0.022, 0.011, 0.008, matMarcoP); plS.position.set(0, HT - FW + 0.0055, -0.008); marco.add(plS);
		} else {
			var cabe = cajaR(WT, FW, 0.012, 0.0022, [matCaraH, maderaVc]);
			cabe.position.set(0, HT - FW / 2, -0.006); marco.add(cabe);
			var dorsoH = caja(WT - 0.004, FW - 0.004, 0.001, M.galvOscuro); dorsoH.position.set(0, HT - FW / 2, -0.0122); marco.add(dorsoH);
		}
		var cabeCuerpo = caja(WT - 0.06, 0.03, PD - 0.012, matCuerpo);
		cabeCuerpo.position.set(0, HT - 0.015, -0.012 - (PD - 0.012) / 2); marco.add(cabeCuerpo);
		var bSup = caja(VIS_W, 0.0028, 0.01, M.goma); bSup.position.set(0, VIS_H + 0.0012, -0.012); marco.add(bSup);
		if (cfg.marco === 'vinilo') {
			/* junta del forrado entre cara y canto del marco */
			[-1, 1].forEach(function (s) {
				var j = caja(0.0015, HT - FW, 0.0125, maderaVc); j.position.set(s * (VIS_W / 2 + 0.0008), (HT - FW) / 2, -0.006); marco.add(j);
			});
		}
		if (cfg.tapones) {
			/* tapones cuadrados de los anclajes, como en la foto */
			var tp = [];
			[0.16, 0.66, 1.3, 1.88].forEach(function (y) { tp.push([-jx, y], [jx, y]); });
			[-0.3, 0, 0.3].forEach(function (x) { tp.push([x * WT / 0.89, HT - FW / 2]); });
			var matTapon = cfg.colorTapon ? new THREE.MeshStandardMaterial({ color: cfg.colorTapon, roughness: 0.6 }) : M.tapon;
			tp.forEach(function (p) { var t = caja(0.013, 0.013, 0.002, matTapon); t.position.set(p[0], p[1], 0.0005); marco.add(t); });
		}
		/* patillas (espigos en X) para anclar al muro */
		var patillas = grupo(); marco.add(patillas);
		[-1, 1].forEach(function (s) {
			[0.55, 1.45].forEach(function (y) {
				[1, -1].forEach(function (d) {
					/* patilla de varilla fina doblada en X, como en la foto */
					var p = caja(0.085, 0.006, 0.003, M.galvanizado);
					p.position.set(s * (WT / 2 + 0.028), y, -0.03); p.rotation.z = d * 0.62; patillas.add(p);
				});
			});
		});
		patillas.visible = !!op.patillas;
		/* agujeros redondos con casquillo cromado: uno por cada bulon (cerradura y desviadores)
		   en el larguero de cerradura y uno por cada antipalanca en el de bisagras */
		var zBul = ZF - T / 2 - 0.004;
		function agujero(x, y, z, r, haciaDentro) {
			var hueco = cilX(r, 0.004, M.negro, 28); hueco.position.set(x - haciaDentro * 0.0015, y, z); marco.add(hueco);
			var aro = new THREE.Mesh(new THREE.TorusGeometry(r + 0.0012, 0.0013, 10, 32), M.cromo);
			aro.rotation.y = Math.PI / 2; aro.position.set(x - haciaDentro * 0.0002, y, z); marco.add(aro);
		}
		var xL = W / 2 + HOL;
		cfg.bulones.forEach(function (y) { agujero(xL, y, zBul, 0.0108, 1); });
		cfg.desviadores.forEach(function (y) { agujero(xL, y + 0.02, zBul, 0.0094, 1); agujero(xL, y - 0.02, zBul, 0.0094, 1); });
		cfg.antipalancas.forEach(function (y) { agujero(-xL, y, ZF - T / 2 - 0.008, 0.0095, -1); });
		/* regulador de resbalon: chapa con ventana rectangular */
		var resb = caja(0.0025, 0.09, 0.03, M.cromo); resb.position.set(xL - 0.0012, cfg.resbalon, zBul); marco.add(resb);
		var ventana = caja(0.003, 0.03, 0.016, M.negro); ventana.position.set(xL - 0.0018, cfg.resbalon, zBul); marco.add(ventana);

		/* ===== hoja (pivote en la bisagra, lado izquierdo antes de reflejar) ===== */
		var hoja = grupo();
		hoja.position.set(-W / 2, 0.006, ZF);
		raiz.add(hoja);
		var cuerpo = grupo();
		cuerpo.position.set(W / 2, H / 2, -T / 2);   // origen en el centro de la hoja
		hoja.add(cuerpo);
		var Y = function (y) { return y - 0.006 - H / 2; };   // altura desde el suelo -> coordenada local
		var XC = W / 2 - SOL;             // canto de cerradura visible (x local)

		var capas = {};
		function capa(nombre, obj, z) {
			var g = grupo(); g.add(obj); g.position.z = z || 0; g.userData.z0 = z || 0;
			cuerpo.add(g); capas[nombre] = g; return g;
		}

		/* tablero exterior */
		var eT = 0.007;
		var tab = grupo();
		var pa = cfg.perfil ? cfg.perfil.ancho : 0, pw = VIS_W - 2 * pa, ph = VIS_H - 2 * pa;
		var fx = function (f) { return -VIS_W / 2 + f * VIS_W; };   // fraccion del ancho visto -> x local
		if (cfg.tablero === 'moldura') {
			/* Premium: campo de roble con canto de roble alrededor */
			var campo = cajaR(pw - 0.044, ph - 0.044, eT, 0.0012, [maderaHoja, maderaCanto]);
			campo.position.set(0, 0, 0); tab.add(campo);
			var sombraM = new THREE.MeshStandardMaterial({ color: liso ? 0xa9a9a7 : 0x6b4423, roughness: 0.8 });
			[-1, 1].forEach(function (s0) {
				var lv = caja(0.0025, ph - 0.044, 0.002, sombraM); lv.position.set(s0 * (pw / 2 - 0.0225), 0, eT / 2 + 0.0005); tab.add(lv);
				var lh = caja(pw - 0.044, 0.0025, 0.002, sombraM); lh.position.set(0, s0 * (ph / 2 - 0.0225), eT / 2 + 0.0005); tab.add(lh);
			});
			var mV = liso ? maderaHoja : madera(cfg.tono, { osc: 0.86 });
			var mH = liso ? maderaHoja : madera(cfg.tono, { rot: Math.PI / 2, osc: 0.86 });
			[-1, 1].forEach(function (s) {
				var v = new THREE.Mesh(new THREE.ExtrudeGeometry(rect(0.022, ph), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 2 }), mV);
				v.position.set(s * (pw / 2 - 0.011) - 0.011, -ph / 2 - 0.0025, eT / 2 - 0.004); v.castShadow = true; tab.add(v);
				var hh = new THREE.Mesh(new THREE.ExtrudeGeometry(rect(pw, 0.022), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 2 }), mH);
				hh.position.set(-pw / 2, s * (ph / 2 - 0.011) - 0.011 - 0.0025, eT / 2 - 0.004); hh.castShadow = true; tab.add(hh);
			});
		} else {
			var t0 = cajaR(pw, ph, eT, cfg.tablero === 'chapa' ? 0.0008 : 0.0015, [maderaHoja, maderaCanto]);
			tab.add(t0);
			if (cfg.fresado) {
				/* iDOM: dos fresados verticales y fresados horizontales entre ellos, como en la foto */
				var surco = madera(cfg.tono, { osc: 0.42 });
				var xs = cfg.fresado.v.map(function (f) { return -pw / 2 + f * pw; });
				xs.forEach(function (x) { var sv = caja(0.0045, ph - 0.03, 0.002, surco); sv.position.set(x, 0, eT / 2 + 0.0002); tab.add(sv); });
				for (var k = 1; k <= cfg.fresado.h; k++) {
					var yy = -ph / 2 + k * ph / (cfg.fresado.h + 1);
					var sh = caja(xs[1] - xs[0], 0.0045, 0.002, surco); sh.position.set((xs[0] + xs[1]) / 2, yy, eT / 2 + 0.0002); tab.add(sh);
				}
			}
		}
		if (['cuadros1', 'cuadros2', 'cuadros4', 'rayas', 'verticales'].indexOf(cfg.tablero) >= 0) disenoPanel(cfg.tablero);
		function disenoPanel(tipo) {
			/* configurador: molduras en cuadro o fresados (rayas). La cerradura queda a la derecha (x > 0) */
			var surcoM;
			if (liso) { surcoM = maderaHoja.clone(); surcoM.color = maderaHoja.color.clone().multiplyScalar(0.42); surcoM.clearcoat = 0; surcoM.roughness = 0.8; }
			else surcoM = madera(cfg.tono, { osc: 0.42 });
			function surco(x, y, w, h) { var m0 = caja(w, h, 0.002, surcoM); m0.position.set(x, y, eT / 2 + 0.0002); tab.add(m0); }
			if (tipo === 'rayas') {
				var n = cfg.rayas || 4;
				for (var i = 1; i <= n; i++) surco(0, -ph / 2 + i * ph / (n + 1), pw - 0.09, 0.0065);
				return;
			}
			if (tipo === 'verticales') {
				for (var v0 = 1; v0 <= 4; v0++) surco(-pw / 2 + v0 * pw / 5, 0, 0.0065, ph - 0.09);
				return;
			}
			var mV = liso ? maderaHoja : madera(cfg.tono, { osc: 0.88 });
			var mH = liso ? maderaHoja : madera(cfg.tono, { rot: Math.PI / 2, osc: 0.88 });
			var sombra = new THREE.MeshStandardMaterial({ color: liso ? 0x9d9d9b : 0x5e3c1f, roughness: 0.85 });
			var a = 0.018, opE = { depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 };
			function cuadro(x0, y0, w, h) {
				[[x0, y0, a, h, mV], [x0 + w - a, y0, a, h, mV], [x0, y0, w, a, mH], [x0, y0 + h - a, w, a, mH]].forEach(function (q) {
					var m0 = new THREE.Mesh(new THREE.ExtrudeGeometry(rect(q[2], q[3]), opE), q[4]);
					m0.position.set(q[0], q[1], eT / 2 - 0.003); m0.castShadow = true; tab.add(m0);
				});
				var l1 = caja(w - 2 * a, 0.002, 0.0015, sombra); l1.position.set(x0 + w / 2, y0 + h - a - 0.001, eT / 2 + 0.0004); tab.add(l1);
				var l2 = caja(0.002, h - 2 * a, 0.0015, sombra); l2.position.set(x0 + a + 0.001, y0 + h / 2, eT / 2 + 0.0004); tab.add(l2);
			}
			var mx0 = -pw / 2 + 0.085, mx1 = pw / 2 - 0.15, my0 = -ph / 2 + 0.1, my1 = ph / 2 - 0.1, hueco = 0.07;
			var ancho = mx1 - mx0, alto = my1 - my0;
			if (tipo === 'cuadros1') cuadro(mx0, my0, ancho, alto);
			if (tipo === 'cuadros2') { var h2 = (alto - hueco) / 2; cuadro(mx0, my0, ancho, h2); cuadro(mx0, my0 + h2 + hueco, ancho, h2); }
			if (tipo === 'cuadros4') {
				var w4 = (ancho - hueco) / 2, h4 = (alto - hueco) / 2;
				[0, 1].forEach(function (cI) { [0, 1].forEach(function (fI) { cuadro(mx0 + cI * (w4 + hueco), my0 + fI * (h4 + hueco), w4, h4); }); });
			}
		}
		if (cfg.rejillas) tab.add(rejillas(cfg.rejillas, pw, ph, eT / 2 + 0.0004));
		tab.position.set(0, Y(0.006 + VIS_H / 2), 0);
		capa('panelExt', tab, T / 2 - eT / 2);

		/* perfil de aluminio con burlete alrededor de la hoja (Thor) */
		var perfil = null;
		if (cfg.perfil) {
			perfil = grupo();
			var a = cfg.perfil.ancho, alto = VIS_H;
			[-1, 1].forEach(function (s) {
				var v = new THREE.Mesh(new THREE.ExtrudeGeometry(rect(a, alto), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 2 }), perfilMat);
				v.position.set(s * (VIS_W / 2 - a / 2) - a / 2, Y(0.006), 0); v.castShadow = true; perfil.add(v);
				var r2 = caja(0.009, alto, 0.018, perfilMat); r2.position.set(s * (VIS_W / 2 + 0.004), Y(0.006) + alto / 2, -0.008); perfil.add(r2);
			});
			var hs = new THREE.Mesh(new THREE.ExtrudeGeometry(rect(VIS_W, a), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 2 }), perfilMat);
			hs.position.set(-VIS_W / 2, Y(0.006 + VIS_H - a), 0); hs.castShadow = true; perfil.add(hs);
			var hi = new THREE.Mesh(new THREE.ExtrudeGeometry(rect(VIS_W, a), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 2 }), perfilMat);
			hi.position.set(-VIS_W / 2, Y(0.006), 0); perfil.add(hi);
			perfil.position.z = T / 2 - 0.003;
			cuerpo.add(perfil);
		}

		/* bandeja de chapa galvanizada (frente + cantos) */
		var band = grupo(), fondoB = T - eT - 0.008;
		var fr = caja(W, H, 0.0015, M.galvInt); fr.position.z = fondoB / 2; band.add(fr);
		[-1, 1].forEach(function (s) {
			var cl = caja(0.0015, H, fondoB, M.galvInt); cl.position.x = s * (W / 2 - 0.001); band.add(cl);
			var ct = caja(W, 0.0015, fondoB, M.galvInt); ct.position.y = s * (H / 2 - 0.001); band.add(ct);
		});
		capa('chapaExt', band, -0.001);

		/* ceramica (solo Premium 5C) */
		if (cfg.ceramica) capa('ceramica', caja(W - 0.07, H - 0.07, 0.007, M.ceramica), fondoB / 2 - 0.006);

		/* estructura: omegas con tetracero, largueros y travesanos */
		var est = grupo();
		cfg.omegas.forEach(function (fx, i) {
			var x = -W / 2 + SOL + fx * VIS_W;
			/* la omega va soldada por sus alas a la chapa exterior y su cara cerrada mira al interior */
			var o = omega(H - 0.09, M.galvIntOsc); o.rotation.y = Math.PI; o.position.set(x, 0, 0.004); est.add(o);
			/* ranura abajo por la que se ve la barra de tetracero */
			var ran = caja(0.012, 0.26, 0.002, M.negro); ran.position.set(x, Y(0.25), -0.0128); est.add(ran);
			if (cfg.tetracero) { var tb = cil(0.0055, H - 0.14, M.tetracero, 14); tb.position.set(x, 0, 0.004); est.add(tb); }
			/* remaches en filas (puntos de soldadura) */
			var n = 16, rem = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0028, 8, 6), M.galvInt, n * 2);
			var m4 = new THREE.Matrix4();
			for (var k = 0; k < n; k++) for (var s = 0; s < 2; s++) {
				m4.makeTranslation(x + (s ? 0.038 : -0.038), -H / 2 + 0.08 + k * (H - 0.16) / (n - 1), 0.0205);
				rem.setMatrixAt(k * 2 + s, m4);
			}
			est.add(rem);
		});
		/* larguero de bisagras y camon de cerradura */
		var lb = caja(0.05, H - 0.04, 0.03, M.galvIntOsc); lb.position.set(-W / 2 + 0.03, 0, -0.006); est.add(lb);
		var camon = caja(0.075, H - 0.04, 0.03, M.galvIntOsc); camon.position.set(XC - 0.05, 0, -0.006); est.add(camon);
		if (cfg.tetracero) { var tc = cil(0.0055, H - 0.14, M.tetracero, 14); tc.position.set(XC - 0.075, 0, 0.012); est.add(tc); }
		[H / 2 - 0.035, -H / 2 + 0.035].forEach(function (y) { var u = caja(W - 0.06, 0.04, 0.026, M.galvIntOsc); u.position.set(0, y, -0.006); est.add(u); });
		/* travesanos estabilizadores del lado de cerradura (como en la foto interior) */
		if (cfg.travesanos) cfg.travesanos.forEach(function (y) {
			var largo = XC - fx(0.7) - 0.01, tr = cilX(0.0075, largo, M.cromoSatinado, 20);
			tr.position.set(fx(0.7) + largo / 2, Y(y), -0.016); est.add(tr);
			[fx(0.7) + 0.004, XC - 0.012].forEach(function (x0) { var so = caja(0.012, 0.03, 0.022, M.galvInt); so.position.set(x0, Y(y), -0.008); est.add(so); });
		});
		else cfg.desviadores.forEach(function (y) { var tr = caja(0.11, 0.012, 0.012, M.galvInt); tr.position.set(XC - 0.13, Y(y) - 0.07, -0.01); est.add(tr); });
		capa('estructura', est, 0);

		/* cerradura en el camon: caja, tapa, bombillos y bulones */
		var cer = grupo();
		var yMin = Math.min.apply(null, cfg.escudos.concat(cfg.bulones)) - 0.08;
		var yMax = Math.max.apply(null, cfg.escudos.concat([cfg.resbalon])) + 0.06;
		var cajaC = caja(0.085, yMax - yMin, 0.026, M.galvInt); cajaC.position.set(XC - 0.05, Y((yMin + yMax) / 2), -0.004); cer.add(cajaC);
		/* refuerzo de chapa galvanizada en toda la cerradura (lo que se ve desde dentro) */
		var pc = cfg.placaCerradura || { ancho: 0.13, x: 0.07, y0: yMin - 0.03, y1: yMax + 0.03 };
		/* en las Thor la caja de cerradura sobresale del camon, como se ve en las fotos interiores */
		var zT = cfg.placaCerradura ? -0.0185 : -0.0235;
		var tapaC = cfg.placaCerradura ? caja(pc.ancho, pc.y1 - pc.y0, 0.003, M.inox) : cajaR(pc.ancho, pc.y1 - pc.y0, 0.008, 0.002, M.galvIntOsc);
		tapaC.position.set(XC - pc.x, Y((pc.y0 + pc.y1) / 2), cfg.placaCerradura ? zT : zT + 0.0025); cer.add(tapaC);
		[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (s0) { var t = cilZ(0.004, 0.002, M.cromo, 12); t.position.set(XC - pc.x + s0[0] * (pc.ancho / 2 - 0.012), Y((pc.y0 + pc.y1) / 2) + s0[1] * ((pc.y1 - pc.y0) / 2 - 0.012), zT - 0.002); cer.add(t); });
		cfg.escudos.forEach(function (y) { var h0 = cilZ(0.012, 0.0025, M.negro, 24); h0.position.set(XC - cfg.xEscudo, Y(y), zT - 0.0013); cer.add(h0); });
		var frente = caja(0.004, H - 0.03, 0.024, M.inox); frente.position.set(XC + SOL - 0.003, 0, -0.004); cer.add(frente);
		/* varillas de los desviadores y cajas de desviador */
		var arriba = cfg.desviadores.filter(function (y) { return y > 1; }), abajo = cfg.desviadores.filter(function (y) { return y < 1; });
		[[yMax, arriba.length ? Math.max.apply(null, arriba) : yMax], [abajo.length ? Math.min.apply(null, abajo) : yMin, yMin]].forEach(function (tr) {
			if (Math.abs(tr[1] - tr[0]) < 0.01) return;
			var v = caja(0.014, tr[1] - tr[0], 0.004, M.inox); v.position.set(XC - 0.02, Y((tr[0] + tr[1]) / 2), 0.006); cer.add(v);
		});
		cfg.desviadores.forEach(function (y) {
			var d = cfg.placaCerradura ? caja(0.03, 0.085, 0.022, M.galvInt) : caja(0.045, 0.09, 0.022, M.galvInt);
			d.position.set(XC - (cfg.placaCerradura ? 0.02 : 0.03), Y(y), cfg.placaCerradura ? -0.004 : -0.0125); cer.add(d);
			var tor = cilZ(0.0035, 0.024, M.inox, 12); tor.position.set(XC - 0.02, Y(y) + 0.03, 0.005); cer.add(tor);
		});
		capa('cerradura', cer, 0);

		/* chapa de manganeso delante de la cerradura */
		if (cfg.manganeso) {
			var mg = caja(0.12, yMax - yMin + 0.04, 0.003, cfg.manganeso === 'rojo' ? M.rojo : (cfg.manganeso === 'oscuro' ? M.manganesoOscuro : M.manganeso));
			mg.position.set(XC - 0.065, Y((yMin + yMax) / 2), 0);
			capa('manganeso', mg, fondoB / 2 - 0.004);
		}

		/* contratapa y panel interior */
		capa('chapaInt', caja(W - 0.006, H - 0.006, 0.0015, M.galvInt), -fondoB / 2);
		/* version cortada de la contratapa, tal como CABMA la fotografia por dentro */
		var corte = null;
		if (cfg.corte) {
			var c0 = cfg.corte, fz = new THREE.Shape();
			var izq = -W / 2 + 0.035, arr = H / 2 - 0.02, xr = fx(c0.x1);
			if (c0.recto) { var ab0 = -H / 2 + 0.035; fz.moveTo(izq, arr); fz.lineTo(xr, arr); fz.lineTo(xr, ab0); fz.lineTo(izq, ab0); fz.lineTo(izq, arr); }
			else { fz.moveTo(izq, arr); fz.lineTo(xr, arr); fz.lineTo(xr, Y(c0.y1)); fz.lineTo(fx(c0.x2), Y(c0.y2)); fz.lineTo(izq, Y(c0.y2)); fz.lineTo(izq, arr); }
			var gC = new THREE.ShapeGeometry(fz);
			var chapaC = new THREE.Mesh(gC, new THREE.MeshStandardMaterial({ color: c0.color || 0xc9cdd1, metalness: 0.45, roughness: 0.5, envMapIntensity: 0.95, side: THREE.DoubleSide }));
			chapaC.castShadow = true; chapaC.receiveShadow = true;
			/* chapa inferior con ventanas cuadradas que dejan ver la ceramica */
			corte = grupo(); corte.add(chapaC);
			var chapaInf = null;
			if (!c0.recto && cfg.ventanas) {
				var inf = new THREE.Shape(), yb = -H / 2 + 0.04;
				inf.moveTo(izq, yb); inf.lineTo(xr, yb); inf.lineTo(xr, Y(c0.y2) - 0.04); inf.lineTo(izq, Y(c0.y2) - 0.04); inf.lineTo(izq, yb);
				cfg.ventanas.x.forEach(function (f) { cfg.ventanas.y.forEach(function (yy) {
					var h0 = new THREE.Path(), cx = fx(f), cy = Y(yy), a = 0.016;
					h0.moveTo(cx - a, cy - a); h0.lineTo(cx - a, cy + a); h0.lineTo(cx + a, cy + a); h0.lineTo(cx + a, cy - a); h0.lineTo(cx - a, cy - a); inf.holes.push(h0);
				}); });
				chapaInf = new THREE.Mesh(new THREE.ShapeGeometry(inf), chapaC.material); chapaInf.receiveShadow = true;
				corte.add(chapaInf);
			}
			var zonaC = caja(W / 2 - SOL - fx(c0.x1) + 0.01, H - 0.05, 0.0015, M.galvInt);
			zonaC.position.set((fx(c0.x1) + W / 2 - SOL) / 2, 0, 0.056); corte.add(zonaC);   // detras de los mecanismos, tapa la ceramica
			/* canal negro inferior */
			var cn = caja(W - 0.08, 0.016, 0.01, M.negro); cn.position.set(0, -H / 2 + 0.03, 0.02); corte.add(cn);
			corte.position.z = -fondoB / 2 - 0.001;
			if (chapaInf) chapaInf.position.z = 0.03;   // por detras de la cara de las omegas, que quedan a la vista
			cuerpo.add(corte); corte.visible = false;
		}
		var pint = grupo();
		pint.add(caja(W - 0.03, H - 0.03, 0.007, cfg.panelInt === 'chapa' || cfg.panelInt === 'igual' ? maderaHoja : M.lacado));
		if (cfg.rejillas) { var rjI = rejillas(cfg.rejillas, W - 0.03, H - 0.03, -0.0039); pint.add(rjI); }
		capa('panelInt', pint, -T / 2 + 0.0035);

		/* bulones de cerradura + resbalon + desviadores (2 bulones cada uno): salen por el canto */
		var bulones = [];
		function bulon(y, r, mat) {
			var b = cilX(r, 0.05, mat, 24);
			b.position.set(XC + SOL - 0.02, Y(y), -0.004);
			b.userData.x0 = XC + SOL - 0.02; b.userData.x1 = XC + SOL + 0.022;
			cuerpo.add(b); bulones.push(b); return b;
		}
		cfg.bulones.forEach(function (y) { bulon(y, 0.0095, M.cromo); });
		cfg.desviadores.forEach(function (y) {
			[0.02, -0.02].forEach(function (dy) {
				var b = bulon(y + dy, 0.008, M.cromo);
				if (cfg.gancho) { var u = caja(0.012, 0.01, 0.012, M.cromo); u.position.set(0.019, dy > 0 ? 0.006 : -0.006, 0); u.rotation.z = Math.PI / 2; b.add(u); }
			});
		});
		var resbalon = caja(0.03, 0.022, 0.018, M.inox); resbalon.position.set(XC + SOL - 0.006, Y(cfg.resbalon), -0.004); cuerpo.add(resbalon);

		/* antipalancas: pernos en el canto de bisagras con tapon cromado */
		var antipalancas = [];
		cfg.antipalancas.forEach(function (y) {
			var a = cilX(0.008, 0.026, M.cromo, 24); a.position.set(-W / 2 - 0.008, Y(y), -0.008);
			cuerpo.add(a); antipalancas.push(a);
		});
		/* placas de las bisagras en la cara interior de la hoja (cuadradas, con tornillo) */
		if (cfg.placasBisagra) cfg.bisagras.forEach(function (y) {
			var pl0 = caja(0.03, 0.03, 0.004, M.inox); pl0.position.set(-W / 2 + 0.03, Y(y) - 0.005, -T / 2 - 0.004); cuerpo.add(pl0);
			var t0 = cilZ(0.005, 0.003, M.cromo, 16); t0.position.set(-W / 2 + 0.03, Y(y) - 0.005, -T / 2 - 0.0065); cuerpo.add(t0);
		});
		/* bisagras de cañon regulables en 3D: media en la hoja y media en el marco */
		var bisagras = [];
		cfg.bisagras.forEach(function (y) {
			var g = grupo();
			var sup = cil(0.0115, 0.066, M.inox, 32); sup.position.y = 0.036;
			var inf = cil(0.0115, 0.066, M.inox, 32); inf.position.y = -0.036;
			var ani = cil(0.0122, 0.005, M.cromo, 32);
			var capS = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.inox); capS.position.y = 0.069;
			var capI = capS.clone(); capI.rotation.x = Math.PI; capI.position.y = -0.069;
			var pl = caja(0.004, 0.11, 0.045, M.inox); pl.position.set(0.012, 0, 0);
			[-0.032, 0, 0.032].forEach(function (yy) { var t = cilX(0.0045, 0.003, M.cromo, 16); t.position.set(0.0145, yy, 0); pl.add(t); });
			g.add(sup, inf, ani, capS, capI, pl);
			g.position.set(-W / 2 - 0.006, Y(y), -T / 2 + 0.006);
			cuerpo.add(g); bisagras.push(g);
		});
		/* cepillo cortavientos en la parte baja */
		if (cfg.cepillo) { var cp = caja(W - 0.06, 0.012, 0.018, M.cepillo); cp.position.set(0, -H / 2 - 0.002, -T / 2); cuerpo.add(cp); }

		/* herrajes exteriores sobre el tablero */
		var herrajes = grupo(); herrajes.position.z = T / 2;
		cuerpo.add(herrajes);
		var escudos = [], cilindros = [];
		var xE = XC - cfg.xEscudo;
		cfg.escudos.forEach(function (y) {
			var e = (cfg.escudo === 'keso' ? escudoKeso : escudo)(M, herr); e.position.set(xE, Y(y), 0); herrajes.add(e); escudos.push(e);
			var sc0 = sombraContacto(0.05, 0.5); sc0.position.set(xE, Y(y) - 0.004, 0.0006); herrajes.add(sc0);
			/* bombillo Mauer NW4 que atraviesa la hoja (se ve al despiezar) */
			var c0 = grupo();
			var cuerpoB = cilZ(0.0085, T + 0.02, M.niquel, 28);
			var lomo = caja(0.0098, 0.02, T + 0.02, M.niquel); lomo.position.y = -0.011;
			var leva = caja(0.014, 0.016, 0.007, M.negro); leva.position.set(0, -0.017, 0);
			c0.add(cuerpoB, lomo, leva);
			c0.position.set(xE, Y(y), 0.005); c0.userData.z0 = 0.005;
			cuerpo.add(c0); cilindros.push(c0);
		});
		var pomoObj = null;
		if (cfg.pomo) {
			pomoObj = pomo(M, herr); pomoObj.position.set(0, Y(cfg.pomo.y), 0); herrajes.add(pomoObj);
			var sp0 = sombraContacto(0.062, 0.55); sp0.position.set(0, Y(cfg.pomo.y) - 0.006, 0.0006); herrajes.add(sp0);
		}
		var mirillaObj = null;
		if (cfg.mirilla) { mirillaObj = mirilla(M, herr); mirillaObj.position.set(0, Y(cfg.mirilla), 0); herrajes.add(mirillaObj); }
		var manillaObj = null, tecladoObj = null, rejillaObj = null;
		if (cfg.manilla) {
			/* manilla exterior (trastero, iDOM): roseta y palanca que apunta hacia las bisagras */
			manillaObj = manilla(matManilla(cfg.manilla.acabado));
			manillaObj.position.set(xE, Y(cfg.manilla.y), 0); herrajes.add(manillaObj);
			var sm0 = sombraContacto(0.04, 0.45); sm0.position.set(xE, Y(cfg.manilla.y) - 0.004, 0.0006); herrajes.add(sm0);
		}
		if (cfg.teclado) {
			/* iDOM: teclado bluetooth redondo con aro cromado y luz azul */
			tecladoObj = torno([[0, 0], [0.03, 0], [0.031, 0.003], [0.029, 0.009], [0.024, 0.011], [0, 0.011]], M.cromo, 48);
			var vidrio = cilZ(0.0235, 0.002, M.cristal, 40); vidrio.position.z = 0.011; tecladoObj.add(vidrio);
			var led = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0009, 8, 40), M.ledAzul); led.position.z = 0.0125; tecladoObj.add(led);
			tecladoObj.position.set(xE, Y(cfg.teclado.y), 0); herrajes.add(tecladoObj);
		}
		if (cfg.rejillas) rejillaObj = new THREE.Object3D(), rejillaObj.position.set(-pw / 2 + cfg.rejillas.x[0] * pw, Y(cfg.rejillas.y + 0.006), 0.004), herrajes.add(rejillaObj);
		if (cfg.portapilas) { var pp = caja(0.16, 0.004, 0.03, M.negro); pp.position.set(0, H / 2 + 0.0015, -0.004); cuerpo.add(pp); }
		/* manilla interior (lado de dentro) */
		var interior = grupo(); interior.rotation.y = Math.PI;
		var yMI = cfg.manilla ? Y(cfg.manilla.y) : Y(cfg.escudos[0]) + 0.1, matMI = matManilla(cfg.manilla ? cfg.manilla.acabado : (op.ajustes && op.ajustes.herraje ? cfg.herraje : 'cromo'));
		var rosI = torno([[0, 0], [0.027, 0], [0.027, 0.006], [0.02, 0.01], [0, 0.01]], matMI, 40); rosI.position.set(-(xE), yMI, 0);
		var palI = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.11, 8, 20), matMI); palI.rotation.z = Math.PI / 2; palI.position.set(-(xE) + 0.062, yMI, 0.05);
		var cueI = cilZ(0.009, 0.045, matMI); cueI.position.set(-(xE), yMI, 0.028);
		interior.add(rosI, palI, cueI);
		capas.panelInt.add(interior);
		interior.position.z = -0.0035 - 0.004;

		/* placa con el logo (pedida por CABMA Asturias); va fuera del grupo reflejado para que el texto se lea */
		var placa = null;
		if (op.placa) {
			var tex = texPlaca();
			var frente0 = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.6, roughness: 0.32, clearcoat: 0.6, envMapIntensity: 0.9 });
			var pm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.274, 0.004), [M.aluCromo, M.aluCromo, M.aluCromo, M.aluCromo, frente0, M.aluCromo]);
			pm.castShadow = true;
			placa = grupo(); placa.add(pm); pm.position.z = 0.002;
			[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (s) {
				var t = cilZ(0.0055, 0.003, M.cromo, 20); t.position.set(s[0] * 0.18, s[1] * 0.117, 0.005); placa.add(t);
			});
			placa.position.set(0, Y(1.62), 0.0025);
			placa.scale.x = cfg.lado === 'izq' ? -1 : 1;     // compensa el reflejo para que el texto se lea
			herrajes.add(placa);
		}

		var llave = null;
		if (op.llave) {
			llave = llaveMauer(M);
			llave.position.set(xE, Y(cfg.escudos[0]), 0.0196 + 0.05);
			llave.userData.zDentro = 0.0196 + 0.004; llave.userData.zFuera = 0.0196 + 0.05;
			herrajes.add(llave);
		}

		/* vista interior como las fotos de CABMA: sin panel interior y con la contratapa cortada (5C) o sin ella (Thor) */
		function verPorDentro(si) {
			if (cfg.interiorVisto === 'panel') return;   // el trastero se ve por dentro con su panel terminado
			capas.panelInt.visible = !si;
			capas.chapaInt.visible = !si;
			if (corte) corte.visible = si;
		}
		return {
			verPorDentro: verPorDentro,
			cfg: cfg, grupo: grupoPuerta, raiz: raiz, marco: marco, patillas: patillas, hoja: hoja, cuerpo: cuerpo, capas: capas,
			perfil: perfil, bulones: bulones, resbalon: resbalon, antipalancas: antipalancas, bisagras: bisagras,
			herrajes: herrajes, escudos: escudos, cilindros: cilindros, pomo: pomoObj, mirilla: mirillaObj, placa: placa, llave: llave,
			manilla: manillaObj, teclado: tecladoObj, rejilla: rejillaObj,
			medidas: { W: W, H: H, T: T, VIS_W: VIS_W, VIS_H: VIS_H, WT: WT, HT: HT, FW: FW, ZF: ZF, XC: XC, SOL: SOL, anchoTotal: WT, altoTotal: HT },
			Y: Y
		};
	}
	function rect(w, h) {
		var s = new THREE.Shape();
		s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, h); s.lineTo(0, 0);
		return s;
	}

	window.CabmaPuerta3D = {
		MODELOS: MODELOS,
		precargar: precargar,
		entorno: entorno,
		materiales: materiales,
		crearPuerta: crearPuerta,
		texYeso: texYeso,
		texBaldosa: texBaldosa,
		textura: textura
	};
})();
