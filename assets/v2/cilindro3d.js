/* CABMA Asturias: cilindros de alta seguridad en 3D (Mauer NW5, NW4 CABMA, Elite 2 Red Line y KESO 8000 Omega2
   Master, Premium y Ultra), calcados de los renders oficiales de ASSA ABLOY.
   Perfil europeo DIN 18252 a escala, en cm: circulo de 17 mm, alma de 10 mm con el fondo redondo, 33 mm de alto.
   Mecanica real: la llave entra y sale; cada perno de llave se apoya en el perfil de la llave (chaflan de la punta y
   cortes en V) y empuja a su contraperno y a su muelle. Solo con la llave hasta el fondo todos los pernos quedan en la
   linea de corte y el rotor puede girar, y con el la leva. La llave solo sale recta.
   - Visor de cabecera: <figure class="v2-foto" data-cilindro="nw4"> con <canvas class="v2-foto-3d">. Se gira arrastrando
     el fondo; la llave se arrastra a lo largo para meterla o sacarla y, metida, de lado para girarla.
     Botones [data-cil-modo="entero|dentro"] y [data-cil-accion="llave|girar"]; en el indice, [data-cil-visor] cambia de cilindro.
   - Despiece guiado por el scroll: <section class="v2-3d" data-cilindro="..."> con las explicaciones <li class="l3d" data-k>.
   Requiere three.min.js; usa CabmaPuerta3D.entorno (puerta3d.js + hdri-estudio.js) para los reflejos del metal. */
(function () {
	'use strict';
	var THREE = window.THREE;
	if (!THREE) return;
	var DOS_PI = Math.PI * 2;

	/* ---------- cada modelo. codigo: profundidad de cada corte de la llave (0 a 4) en las camaras del lado de fuera */
	var MODELOS = {
		'nw5': { nombre: 'Mauer NW5', marca: 'mauer', camaras: 5, codigo: [3, 1, 4, 2, 0], cabeza: 0x1b1c1f, inserto: 0xd2232a, bandas: true, ventana: true, discos: true, insertos: 6 },
		'nw4': { nombre: 'Mauer NW4 CABMA', marca: 'mauer', camaras: 5, codigo: [2, 4, 0, 3, 1], cabeza: 0x2b2c30, inserto: 0xd2232a, discos: true, insertos: 4 },
		'elite-2': { nombre: 'Mauer Elite 2 Red Line', marca: 'mauer', camaras: 6, codigo: [1, 3, 0, 4, 2, 3], cabeza: 0x1b1c1f, inserto: 0xd2232a, lineasRojas: true, insertos: 3 },
		'master': { nombre: 'KESO 8000 Omega2 Master', marca: 'keso', camaras: 5, filas: 3, codigo: [4, 1, 3, 0, 2], lateral: [1, 3, 0, 2, 1], capuchon: 0x1f56c8, insertos: 4 },
		'premium': { nombre: 'KESO 8000 Omega2 Premium', marca: 'keso', camaras: 5, filas: 3, codigo: [0, 3, 1, 4, 2], lateral: [2, 0, 3, 1, 0], capuchon: 0x6b7480, insertos: 8, crni: true },
		'ultra': { nombre: 'KESO 8000 Omega2 Ultra', marca: 'keso', camaras: 5, filas: 3, codigo: [2, 0, 4, 1, 3], lateral: [0, 2, 1, 3, 2], capuchon: 0x1d1e21, insertos: 8, crni: true, abocardado: true, puenteMacizo: true, rotorEndurecido: true }
	};

	/* medidas (cm) */
	var R = 0.85, RP = 0.65, ALMA = 0.5, ABAJO = -2.45, YC = ABAJO + ALMA, A = 3.0, B = 3.0, HUECO = 0.48, BIS = 0.05;
	var Y_PUENTE = -1.66;                 // parte de arriba del puente (debajo de la leva)
	var X_PUNTA = -HUECO - 0.1;           // punta de la llave metida hasta el fondo
	var L_HOJA = (X_PUNTA + A) + 0.16;    // la hoja asoma 1,6 mm de la cara antes del tope
	var RECORRIDO = L_HOJA + 0.4;         // con la llave fuera, la punta queda 4 mm delante de la cara
	/* perfiles de llave: rb0 = distancia del eje a la superficie sin cortar; rest = donde se paran los pernos sin llave */
	var PERFILES = {
		mauer: { rb0: 0.15, rest: 0.02, unidad: 0.02, pend: 1.1, plano: 0.05, punta: 0.32, fondo: 2.3, ld: 0.45, rp: 0.13, tope: 0.07, ancho: 0.84 },
		keso: { rb0: 0.36, rest: 0.14, unidad: 0.04, pend: 1.1, plano: 0.05, punta: 0.32, fondo: 2.3, ld: 0.5, rp: 0.13, tope: 0.36, ancho: 0.2 },
		lateral: { rb0: 0.13, rest: 0.07, unidad: 0.012, pend: 0.8, plano: 0.03, punta: 0.32, fondo: 0.79, ld: 0.07, rp: 0.085 }
	};
	var LEVA0 = -0.55;   // posicion de la leva en reposo, como en los renders de ASSA ABLOY
	var COLORES = [0x7b4fa6, 0xc8262b, 0x3a9a5b, 0x2f6fb5, 0xe8b923, 0xe07b2a];

	function recto(g) { var m = ((g % DOS_PI) + DOS_PI) % DOS_PI; return m < 0.03 || m > DOS_PI - 0.03; }
	function limitar(v, a, b) { return v < a ? a : (v > b ? b : v); }
	function semilla(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

	/* ---------- materiales y texturas */
	function lienzo(w, h, dibujar) {
		var c = document.createElement('canvas'); c.width = w; c.height = h; dibujar(c.getContext('2d'), w, h);
		var t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
	}
	function texCepillado() {
		/* niquel cepillado a lo largo del eje: rayas finas de distinta rugosidad */
		var az = semilla(9), filas = [];
		var t = lienzo(512, 16, function (g, w, h) {
			var img = g.createImageData(w, h), d = img.data, x, y, v = 0.5;
			for (x = 0; x < w; x++) { v = 0.55 + (az() - 0.5) * 0.18; if (az() < 0.06) v += (az() - 0.5) * 0.45; filas[x] = limitar(v, 0.2, 0.9); }
			for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var i = (y * w + x) * 4, k = Math.round(filas[x] * 255); d[i] = d[i + 1] = d[i + 2] = k; d[i + 3] = 255; }
			g.putImageData(img, 0, 0);
		});
		t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.45, 1);
		return t;
	}
	function grabado(g, texto, x, y, tam, peso, esp) {
		g.font = peso + ' ' + tam + 'px Archivo, "Arial Narrow", Arial, sans-serif';
		g.textAlign = 'center'; g.textBaseline = 'middle';
		if ('letterSpacing' in g) g.letterSpacing = (esp || 0) + 'px';
		g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillText(texto, x + 2, y + 2);
		g.fillStyle = 'rgba(55,59,66,0.72)'; g.fillText(texto, x, y);
	}
	var M = null;
	function materiales() {
		if (M) return M;
		var cep = texCepillado();
		function cuerpo(color, rug) { return new THREE.MeshStandardMaterial({ color: color, metalness: 0.8, roughness: rug, roughnessMap: cep, bumpMap: cep, bumpScale: 0.025, envMapIntensity: 1.15 }); }
		M = {
			niquel: cuerpo(0xdadee2, 0.5),
			crni: cuerpo(0xc8cdd3, 0.56),
			pulido: new THREE.MeshStandardMaterial({ color: 0xf4f6f8, metalness: 1, roughness: 0.1, envMapIntensity: 1.35 }),
			rotorLaton: new THREE.MeshStandardMaterial({ color: 0xcaa24e, metalness: 1, roughness: 0.32, envMapIntensity: 1.1 }),
			rotorNiquel: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }),
			laton: new THREE.MeshStandardMaterial({ color: 0xd6ad55, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 }),
			acero: new THREE.MeshStandardMaterial({ color: 0xb0b6bc, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }),
			endurecido: new THREE.MeshStandardMaterial({ color: 0x5a5f66, metalness: 0.9, roughness: 0.36, envMapIntensity: 1, emissive: 0xc11f1a, emissiveIntensity: 0 }),
			puenteMacizo: new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.9, roughness: 0.34, envMapIntensity: 1.1 }),
			muelle: new THREE.MeshStandardMaterial({ color: 0xbabec4, metalness: 1, roughness: 0.3 }),
			levaMauer: new THREE.MeshStandardMaterial({ color: 0x151618, metalness: 0.3, roughness: 0.48, envMapIntensity: 0.7 }),
			levaKeso: new THREE.MeshStandardMaterial({ color: 0x2c2f34, metalness: 0.65, roughness: 0.38, envMapIntensity: 0.9 }),
			hueco: new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.85, metalness: 0.1 }),
			canal: new THREE.MeshStandardMaterial({ color: 0x4f5459, roughness: 0.6, metalness: 0.5 }),
			hoja: new THREE.MeshStandardMaterial({ color: 0xdfe2e5, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }),
			ventana: new THREE.MeshPhysicalMaterial({ color: 0x0f1c2a, metalness: 0.25, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
			rojo: new THREE.MeshStandardMaterial({ color: 0xd2232a, roughness: 0.42, metalness: 0.2, emissive: 0x2a0303 }),
			goma: function (c) { return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.6 }); },
			plastico: function (c) { return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.45 }); },
			pin: function (c) { return new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.3, envMapIntensity: 1 }); }
		};
		return M;
	}

	/* ---------- geometria */
	function ejeX(g, x0) {
		/* (u, v, w) -> (x0 + w, v, u): el perfil queda en el plano YZ y la extrusion sigue el eje X.
		   El cambio de ejes es una simetria, asi que se invierte el sentido de cada triangulo. */
		var p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, i;
		for (i = 0; i < p.count; i++) {
			var u = p.getX(i), v = p.getY(i), w = p.getZ(i); p.setXYZ(i, x0 + w, v, u);
			var a = n.getX(i), b = n.getY(i), c = n.getZ(i); n.setXYZ(i, c, b, a);
		}
		[p, n, uv].forEach(function (at) {
			if (!at) return;
			var s = at.itemSize, arr = at.array;
			for (var t = 0; t < p.count; t += 3) for (var k = 0; k < s; k++) { var x = arr[(t + 1) * s + k]; arr[(t + 1) * s + k] = arr[(t + 2) * s + k]; arr[(t + 2) * s + k] = x; }
			at.needsUpdate = true;
		});
		g.computeBoundingSphere();
		return g;
	}
	function extruir(shape, x0, x1, mat, bisel, curvas) {
		var b = bisel || 0;
		var g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, x1 - x0 - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: b > 0 ? 3 : 0, curveSegments: curvas || 40 });
		g.translate(0, 0, b);
		ejeX(g, x0);
		var m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
		return m;
	}
	function perfil(lado, ins) {
		/* lado: 0 entero, 1 mitad delantera (z >= 0), -1 mitad trasera. ins: se encoge para el bisel */
		var r = R - ins, a = ALMA - ins, y0 = -Math.sqrt(r * r - a * a), t0 = Math.atan2(y0, a), s = new THREE.Shape();
		if (lado === 0) {
			s.moveTo(a, y0); s.absarc(0, 0, r, t0, Math.PI - t0, false); s.lineTo(-a, YC); s.absarc(0, YC, a, Math.PI, DOS_PI, false); s.lineTo(a, y0);
			return s;
		}
		s.moveTo(0, r);
		if (lado > 0) { s.absarc(0, 0, r, Math.PI / 2, t0, true); s.lineTo(a, YC); s.absarc(0, YC, a, 0, -Math.PI / 2, true); }
		else { s.absarc(0, 0, r, Math.PI / 2, Math.PI - t0, false); s.lineTo(-a, YC); s.absarc(0, YC, a, Math.PI, Math.PI * 1.5, false); }
		s.lineTo(0, YC - a); s.lineTo(0, r);
		return s;
	}
	function puente(lado, ins) {
		var a = ALMA - ins, s = new THREE.Shape(), yt = Y_PUENTE - ins;
		if (lado === 0) { s.moveTo(a, yt); s.lineTo(a, YC); s.absarc(0, YC, a, 0, -Math.PI, true); s.lineTo(-a, yt); s.lineTo(a, yt); }
		else if (lado > 0) { s.moveTo(0, yt); s.lineTo(a, yt); s.lineTo(a, YC); s.absarc(0, YC, a, 0, -Math.PI / 2, true); s.lineTo(0, yt); }
		else { s.moveTo(0, yt); s.lineTo(-a, yt); s.lineTo(-a, YC); s.absarc(0, YC, a, Math.PI, Math.PI * 1.5, false); s.lineTo(0, yt); }
		return s;
	}
	function circulo(r) { var s = new THREE.Shape(); s.absarc(0, 0, r, 0, DOS_PI, false); return s; }
	function aro(r0, r1) { var s = circulo(r1), h = new THREE.Path(); h.absarc(0, 0, r0, 0, DOS_PI, true); s.holes.push(h); return s; }
	function puntosBoca(marca) {
		/* hueco del bocallave en la cara del rotor, en (z, y). Mauer: horizontal con la visera inclinada. KESO: vertical */
		return marca === 'mauer'
			? [[-0.46, -0.18], [0.46, -0.18], [0.46, 0.06], [0.36, 0.11], [-0.46, 0.11]]
			: [[-0.125, -0.385], [0.125, -0.385], [0.125, 0.3], [0.06, 0.395], [-0.125, 0.395]];
	}
	function formaDe(pts, hueco) {
		var s = hueco ? new THREE.Path() : new THREE.Shape();
		s.moveTo(pts[0][0], pts[0][1]);
		for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
		s.lineTo(pts[0][0], pts[0][1]);
		return s;
	}
	function enCara(mesh, cara, x) {
		/* una pieza plana (en el plano XY) se coloca en la cara exterior (cara -1, mirando a -x) o interior (cara 1) */
		mesh.rotation.y = cara < 0 ? -Math.PI / 2 : Math.PI / 2;
		mesh.position.x = x;
		return mesh;
	}
	function cilEje(r, largo, mat, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, largo, seg || 32), mat); m.rotation.z = Math.PI / 2; m.castShadow = true; return m; }
	function cilY(r, alto, mat, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, alto, seg || 24), mat); m.castShadow = true; return m; }
	function caja(w, h, d, mat) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }
	function muelle(r, vueltas, mat) {
		/* muelle de alto 1 centrado en 0; se escala en Y para comprimirlo */
		var pts = [], n = vueltas * 18;
		for (var i = 0; i <= n; i++) { var a = i / 18 * DOS_PI; pts.push(new THREE.Vector3(Math.cos(a) * r, i / n - 0.5, Math.sin(a) * r)); }
		var m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.017, 6, false), mat);
		m.castShadow = true;
		return m;
	}
	function contacto(pf, cortes, xi) {
		/* distancia del eje a la superficie de la llave en xi (cm desde la punta): cortes en V con fondo plano y chaflan en la punta */
		var c = 0;
		for (var i = 0; i < cortes.length; i++) { var k = cortes[i]; c = Math.max(c, k.d - pf.pend * Math.max(0, Math.abs(xi - k.xi) - pf.plano)); }
		var r = pf.rb0 - c;
		if (xi < pf.punta) r = pf.rest + (r - pf.rest) * (xi / pf.punta);
		return r;
	}

	/* ---------- cilindro completo */
	function crear(id) {
		var cfg = MODELOS[id] || MODELOS.nw4, mt = materiales(), mauer = cfg.marca === 'mauer';
		var matCuerpo = cfg.crni ? mt.crni : mt.niquel;
		var grupo = new THREE.Group();
		var entero = new THREE.Group(), fijo = new THREE.Group(), frente = new THREE.Group(), interior = new THREE.Group();
		var rotorA = new THREE.Group(), rotorB = new THREE.Group();
		grupo.add(entero, fijo, frente, interior, rotorA, rotorB);
		var soloCorte = [];   // piezas que solo se ven por dentro

		/* --- cuerpo: dos mitades a cada lado del hueco de la leva, con el puente del tornillo debajo */
		[[-A, -HUECO], [HUECO, B]].forEach(function (t) {
			entero.add(extruir(perfil(0, BIS), t[0], t[1], matCuerpo, BIS));
			fijo.add(extruir(perfil(-1, BIS), t[0], t[1], matCuerpo, BIS));
			frente.add(extruir(perfil(1, BIS), t[0], t[1], matCuerpo, BIS));
		});
		var matPuente = cfg.puenteMacizo ? mt.puenteMacizo : matCuerpo;
		entero.add(extruir(puente(0, 0.03), -HUECO - 0.04, HUECO + 0.04, matPuente, 0.03));
		fijo.add(extruir(puente(-1, 0.03), -HUECO - 0.04, HUECO + 0.04, matPuente, 0.03));
		frente.add(extruir(puente(1, 0.03), -HUECO - 0.04, HUECO + 0.04, matPuente, 0.03));
		/* agujero ovalado del tornillo de fijacion, a los dos lados del puente */
		[1, -1].forEach(function (s) {
			var o1 = new THREE.Shape(); o1.absellipse(0, 0, 0.16, 0.27, 0, DOS_PI, false);
			var o2 = new THREE.Shape(); o2.absellipse(0, 0, 0.12, 0.23, 0, DOS_PI, false);
			var g = new THREE.Group();
			var m1 = new THREE.Mesh(new THREE.ShapeGeometry(o1, 32), mt.canal); var m2 = new THREE.Mesh(new THREE.ShapeGeometry(o2, 32), mt.hueco); m2.position.z = 0.001;
			g.add(m1, m2); g.position.set(0, -2.03, s * (ALMA + 0.003)); if (s < 0) g.rotation.y = Math.PI;
			(s > 0 ? frente : fijo).add(g);
			entero.add(g.clone());
		});

		/* --- caras: aro pulido (Mauer) o cara con KESO, junta oscura y rotor pulido con su bocallave */
		var bocaPts = puntosBoca(cfg.marca);
		[-1, 1].forEach(function (cara) {
			var xc = cara < 0 ? -A : B, rot = cara < 0 ? rotorA : rotorB;
			if (mauer) {
				entero.add(extruir(aro(RP + 0.012, R - 0.075), cara < 0 ? xc - 0.018 : xc - 0.01, cara < 0 ? xc + 0.01 : xc + 0.018, mt.pulido, 0.006, 64));
				var filo = new THREE.Mesh(new THREE.TorusGeometry(R - 0.075, 0.011, 10, 72), mt.pulido); filo.rotation.y = Math.PI / 2; filo.position.x = xc + cara * 0.012; entero.add(filo);
				/* grabado del alma: MAUER / ASSA ABLOY */
				var tex = lienzo(400, 560, function (g, w) {
					grabado(g, 'MAUER', w / 2, 92, 104, 800, 3);
					g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(53, 158, 298, 4); g.fillStyle = 'rgba(55,59,66,0.68)'; g.fillRect(51, 156, 298, 4);
					grabado(g, 'ASSA ABLOY', w / 2, 214, 52, 600, 1);
				});
				tex.colorSpace = THREE.SRGBColorSpace;
				var pl = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.84 * 560 / 400), new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 0.45, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
				pl.position.y = -0.73 - 0.84 * 560 / 400 / 2;
				entero.add(enCara(pl, cara, xc + cara * 0.003));
			} else {
				var texK = lienzo(256, 64, function (g, w, h) { grabado(g, 'KESO', w / 2, h / 2 + 2, 50, 800, 6); });
				texK.colorSpace = THREE.SRGBColorSpace;
				var plK = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshStandardMaterial({ map: texK, transparent: true, metalness: 0.45, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
				plK.position.y = -0.725;
				entero.add(enCara(plK, cara, xc + cara * 0.003));
			}
			var junta = new THREE.Mesh(new THREE.TorusGeometry(RP + 0.004, 0.007, 8, 64), mt.hueco); junta.rotation.y = Math.PI / 2; junta.position.x = xc + cara * 0.006; entero.add(junta);
			if (cfg.abocardado) { var ab = new THREE.Mesh(new THREE.TorusGeometry(RP + 0.03, 0.03, 12, 64), mt.endurecido); ab.rotation.y = Math.PI / 2; ab.position.x = xc + cara * 0.02; entero.add(ab); }
			/* cara del rotor (gira con la llave) con el hueco del bocallave y su fondo oscuro */
			var sh = circulo(RP - 0.01); sh.holes.push(formaDe(bocaPts, true));
			rot.add(extruir(sh, cara < 0 ? xc - 0.024 : xc - 0.01, cara < 0 ? xc + 0.01 : xc + 0.024, mt.pulido, 0.006, 56));
			var fondoBoca = new THREE.Mesh(new THREE.ShapeGeometry(formaDe(bocaPts)), mt.hueco);
			rot.add(enCara(fondoBoca, cara, xc + cara * 0.004));
		});

		/* --- detalles de cada modelo */
		if (cfg.lineasRojas) {
			/* Elite 2 Red Line: lineas rojas alrededor del cuerpo */
			[-1, 1].forEach(function (s) {
				var sh = perfil(0, -0.006); sh.holes.push(new THREE.Path(perfil(0, 0.02).getPoints(80)));
				entero.add(extruir(sh, s * (HUECO + 0.85) - 0.018, s * (HUECO + 0.85) + 0.018, mt.rojo, 0, 80));
			});
		}
		if (cfg.bandas) {
			/* NW5: bandas de acero que abrazan el alma junto a la leva, con su ranura */
			[-1, 1].forEach(function (s) {
				var a2 = ALMA + 0.045, yt = -1.02, sh = new THREE.Shape();
				sh.moveTo(a2, yt); sh.lineTo(a2, YC); sh.absarc(0, YC, a2, 0, -Math.PI, true); sh.lineTo(-a2, yt);
				sh.lineTo(-ALMA + 0.002, yt); sh.lineTo(-ALMA + 0.002, YC); sh.absarc(0, YC, ALMA - 0.002, Math.PI, 0, false); sh.lineTo(ALMA - 0.002, yt); sh.lineTo(a2, yt);
				var x0 = s * (HUECO + 0.34);
				entero.add(extruir(sh, x0 - 0.15, x0 + 0.15, mt.pulido, 0.008, 48));
				[1, -1].forEach(function (z) {
					var ra = new THREE.Shape(), w = 0.2, h = 0.08, r0 = 0.035;
					ra.moveTo(-w / 2 + r0, -h / 2); ra.lineTo(w / 2 - r0, -h / 2); ra.quadraticCurveTo(w / 2, -h / 2, w / 2, 0); ra.quadraticCurveTo(w / 2, h / 2, w / 2 - r0, h / 2);
					ra.lineTo(-w / 2 + r0, h / 2); ra.quadraticCurveTo(-w / 2, h / 2, -w / 2, 0); ra.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r0, -h / 2);
					var m = new THREE.Mesh(new THREE.ShapeGeometry(ra, 12), mt.hueco);
					m.position.set(x0, -1.4, z * (a2 + 0.012)); if (z < 0) m.rotation.y = Math.PI; entero.add(m);
				});
			});
		}
		if (cfg.ventana) {
			/* NW5: ventana oscura junto a la leva, a los dos lados */
			[-1, 1].forEach(function (s) {
				[0, Math.PI].forEach(function (giro) {
					var g = new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.7, 32, 1, true, giro - 1.25, 1.45);
					g.rotateZ(-Math.PI / 2);
					var m = new THREE.Mesh(g, mt.ventana); m.position.x = s * (HUECO + 0.5); entero.add(m);
				});
			});
		}
		if (!mauer) {
			/* KESO es modular: junta entre el tubo y el alma */
			[-1, 1].forEach(function (z) {
				[[-A + 0.1, -HUECO - 0.05], [HUECO + 0.05, B - 0.1]].forEach(function (t) {
					var l = caja(t[1] - t[0], 0.012, 0.006, mt.canal); l.position.set((t[0] + t[1]) / 2, -0.69, z * (ALMA + 0.002)); entero.add(l);
				});
			});
		}

		/* --- leva: buje que abraza el eje (la banda oscura) y la aleta */
		var leva = new THREE.Group();
		var matLeva = mauer ? mt.levaMauer : mt.levaKeso;
		leva.add(cilEje(R - 0.028, 2 * HUECO - 0.06, matLeva, 64));
		var aleta = new THREE.Shape();
		if (mauer) { aleta.moveTo(-0.36, -0.5); aleta.lineTo(0.36, -0.5); aleta.quadraticCurveTo(0.54, -0.98, 0.24, -1.44); aleta.quadraticCurveTo(0.05, -1.62, -0.14, -1.47); aleta.quadraticCurveTo(-0.47, -1.0, -0.36, -0.5); }
		else { aleta.moveTo(-0.3, -0.5); aleta.lineTo(0.3, -0.5); aleta.lineTo(0.27, -1.36); aleta.quadraticCurveTo(0, -1.6, -0.27, -1.36); aleta.lineTo(-0.3, -0.5); }
		leva.add(extruir(aleta, -HUECO + 0.06, HUECO - 0.06, matLeva, 0.03, 24));
		grupo.add(leva);

		/* --- rotores por dentro: medio rotor cortado, canal del bocallave y camaras */
		var matRotor = mauer ? mt.rotorLaton : mt.rotorNiquel;
		var ys = bocaPts.map(function (p) { return p[1]; }), yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
		[[rotorA, -A + 0.03, -HUECO - 0.01], [rotorB, HUECO + 0.01, B - 0.03]].forEach(function (t) {
			var largo = t[2] - t[1], xm = (t[1] + t[2]) / 2;
			var g = new THREE.CylinderGeometry(RP - 0.004, RP - 0.004, largo, 48, 1, false, Math.PI / 2, Math.PI); g.rotateZ(-Math.PI / 2);
			var medio = new THREE.Mesh(g, matRotor); medio.position.x = xm; medio.castShadow = true;
			var tapa = caja(largo, 2 * (RP - 0.004), 0.004, matRotor); tapa.position.set(xm, 0, -0.002);
			var canalBoca = caja(largo, yMax - yMin, 0.004, mt.hueco); canalBoca.position.set(xm, (yMin + yMax) / 2, 0.001);
			t[0].add(medio, tapa, canalBoca); soloCorte.push(medio, tapa, canalBoca);
		});

		/* --- camaras: perno de llave (en el rotor), contraperno y muelle (en el cuerpo) */
		var camaras = [];
		function camara(lado, x, phi, pf, codigo, idx) {
			var d = codigo * pf.unidad, Lk = RP - (pf.rb0 - d);
			var mR = new THREE.Group(); mR.position.x = x; mR.rotation.x = phi;
			var mC = new THREE.Group(); mC.position.x = x; mC.rotation.x = phi;
			(lado === 'A' ? rotorA : rotorB).add(mR); interior.add(mC);
			var matL = mauer ? mt.pin(COLORES[idx % COLORES.length]) : mt.laton, matC = mauer ? mt.laton : mt.acero;
			var gL = new THREE.Group();
			var cuerpoL = cilY(pf.rp, Lk - 0.05, matL); cuerpoL.position.y = -0.05 - (Lk - 0.05) / 2; gL.add(cuerpoL);
			var punta = new THREE.Mesh(new THREE.CylinderGeometry(pf.rp * 0.45, pf.rp, 0.05, 24), matL); punta.position.y = -0.025; gL.add(punta);
			mR.add(gL);
			var pc = cilY(pf.rp, pf.ld, matC); mC.add(pc);
			var mu = muelle(pf.rp * 0.78, pf.fondo > 1 ? 9 : 3, mt.muelle); mC.add(mu);
			if (phi === 0) {
				var cr = caja(2 * pf.rp + 0.05, RP, 0.004, mt.canal); cr.position.set(0, -RP / 2, 0.002); mR.add(cr); soloCorte.push(cr);
				var cc = caja(2 * pf.rp + 0.05, pf.fondo - RP, 0.004, mt.canal); cc.position.set(0, -(RP + (pf.fondo - RP) / 2), 0.002); mC.add(cc); soloCorte.push(cc);
			}
			camaras.push({ lado: lado, x: x, phi: phi, pf: pf, d: d, Lk: Lk, xi: X_PUNTA - x, gL: gL, pc: pc, mu: mu, delante: phi < -0.1, mR: mR, mC: mC });
		}
		var pfMain = PERFILES[cfg.marca], n = cfg.camaras, idx = 0;
		[['A', -A + 0.42, -HUECO - 0.42], ['B', HUECO + 0.42, B - 0.42]].forEach(function (t) {
			for (var i = 0; i < n; i++) {
				var x = t[1] + (t[2] - t[1]) * (n === 1 ? 0.5 : i / (n - 1));
				var j = t[0] === 'A' ? i : n - 1 - i;
				camara(t[0], x, 0, pfMain, cfg.codigo[j % cfg.codigo.length], idx++);
				if (cfg.filas === 3) {
					camara(t[0], x + 0.11, 0.95, PERFILES.lateral, (cfg.lateral || [])[j] || 0, idx++);
					camara(t[0], x - 0.11, -0.95, PERFILES.lateral, (cfg.lateral || [])[(j + 2) % n] || 0, idx++);
				}
			}
		});
		var cortesA = { main: [], lateral: [] };
		camaras.forEach(function (k) { if (k.lado === 'A') cortesA[k.pf === PERFILES.lateral ? 'lateral' : 'main'].push({ xi: k.xi, d: k.d }); });

		/* --- insertos endurecidos antitaladro (delante de las camaras) */
		var insertos = [];
		var posCuerpo = [-0.98, -1.48, -1.98, -2.28];
		var porLado = Math.min(4, Math.ceil(cfg.insertos / 2));
		[-1, 1].forEach(function (s) {
			for (var q = 0; q < porLado; q++) {
				var r0 = cilEje(0.075, 0.3, mt.endurecido, 16); r0.position.set(s < 0 ? -A + 0.2 : B - 0.2, posCuerpo[q], 0); interior.add(r0); insertos.push(r0);
			}
		});
		if (cfg.rotorEndurecido) {
			/* Ultra: 12 elementos de metal endurecido en el rotor */
			[[rotorA, -A + 0.17], [rotorB, B - 0.17]].forEach(function (t) {
				[0.3, 0.95, 2.2, 2.85, 3.6, 5.8].forEach(function (a) {
					var r1 = cilEje(0.05, 0.22, mt.endurecido, 12); r1.position.set(t[1], 0.4 * Math.sin(a), 0.4 * Math.cos(a)); t[0].add(r1); insertos.push(r1);
				});
			});
		}

		/* --- llave (la hoja sale del perfil de cortes, asi los pernos se apoyan exactamente en ella) */
		var llave = new THREE.Group();
		var pf = pfMain, hoja = new THREE.Shape(), paso = 0.02, xi;
		hoja.moveTo(0, -pf.rest);
		for (xi = paso; xi <= L_HOJA + 1e-6; xi += paso) hoja.lineTo(-xi, -contacto(pf, cortesA.main, xi));
		hoja.lineTo(-L_HOJA, pf.tope); hoja.lineTo(-0.2, pf.tope); hoja.lineTo(0, pf.tope - (mauer ? 0.06 : 0.16)); hoja.lineTo(0, -pf.rest);
		var hg = new THREE.ExtrudeGeometry(hoja, { depth: pf.ancho, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
		hg.translate(0, 0, -pf.ancho / 2);
		var hojaM = new THREE.Mesh(hg, mt.hoja); hojaM.castShadow = true; llave.add(hojaM);
		var yMedio = (pf.tope - pf.rb0) / 2;
		if (mauer) {
			/* hoyuelos y discos activos en la cara de arriba, y regata en los cantos */
			cortesA.main.forEach(function (k, i) {
				[-0.2, 0.2].forEach(function (z) {
					var h = new THREE.Mesh(new THREE.CircleGeometry(0.055 + (i % 2) * 0.012, 20), mt.canal); h.rotation.x = -Math.PI / 2; h.position.set(-k.xi, pf.tope + 0.013, z + (i % 2 ? 0.04 : -0.04)); llave.add(h);
				});
			});
			if (cfg.discos) [0.85, 1.45].forEach(function (x) { var dsc = cilY(0.075, 0.03, mt.pulido, 24); dsc.position.set(-x, pf.tope + 0.003, 0.26); llave.add(dsc); });
			[-1, 1].forEach(function (z) { var rg = caja(L_HOJA - 0.4, 0.03, 0.01, mt.canal); rg.position.set(-(L_HOJA - 0.4) / 2 - 0.25, yMedio - 0.03, z * (pf.ancho / 2 + 0.012)); llave.add(rg); });
			/* tope metalico y cabeza de goma con forma de gota, inserto de color y agujero */
			var tp = caja(0.32, 0.26, 0.74, mt.hoja); tp.position.set(-L_HOJA - 0.16, yMedio, 0); llave.add(tp);
			var cs = new THREE.Shape();
			cs.moveTo(0, -0.36); cs.lineTo(-0.3, -0.42); cs.bezierCurveTo(-0.9, -0.7, -1.15, -1.0, -1.72, -1.0); cs.bezierCurveTo(-2.42, -1.0, -2.78, -0.52, -2.78, 0);
			cs.bezierCurveTo(-2.78, 0.52, -2.42, 1.0, -1.72, 1.0); cs.bezierCurveTo(-1.15, 1.0, -0.9, 0.7, -0.3, 0.42); cs.lineTo(0, 0.36); cs.lineTo(0, -0.36);
			var ag = new THREE.Path(); ag.absarc(-2.33, 0, 0.21, 0, DOS_PI, true); cs.holes.push(ag);
			var cg = new THREE.ExtrudeGeometry(cs, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 28 });
			cg.translate(0, 0, -0.15); cg.rotateX(Math.PI / 2);
			var cab = new THREE.Mesh(cg, mt.goma(cfg.cabeza)); cab.position.set(-L_HOJA - 0.3, yMedio, 0); cab.castShadow = true; llave.add(cab);
			var ins = new THREE.Shape(); ins.absellipse(0, 0, 0.62, 0.56, 0, DOS_PI, false);
			var ig = new THREE.ExtrudeGeometry(ins, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 32 });
			ig.translate(0, 0, -0.21); ig.rotateX(Math.PI / 2);
			var insM = new THREE.Mesh(ig, mt.plastico(cfg.inserto)); insM.position.set(-L_HOJA - 0.3 - 1.62, yMedio, 0); llave.add(insM);
		} else {
			/* KESO: llave reversible con hoyuelos a los dos lados, tope y cabeza en escudo con capuchon de color */
			cortesA.lateral.concat(cortesA.main).forEach(function (k, i) {
				[1, -1].forEach(function (z) {
					var h = new THREE.Mesh(new THREE.CircleGeometry(0.05 + (i % 3) * 0.008, 20), mt.canal);
					h.position.set(-k.xi - 0.02 * (i % 2), -0.05 + ((i * 7) % 3 - 1) * 0.13, z * (pf.ancho / 2 + 0.013)); if (z < 0) h.rotation.y = Math.PI; llave.add(h);
				});
			});
			var tpK = caja(0.42, 0.66, 0.26, mt.hoja); tpK.position.set(-L_HOJA - 0.21, yMedio, 0); llave.add(tpK);
			var ks = new THREE.Shape();
			ks.moveTo(0, -0.33); ks.lineTo(-0.3, -0.42); ks.quadraticCurveTo(-1.15, -0.62, -1.9, -1.05); ks.quadraticCurveTo(-2.4, -1.3, -2.68, -0.98);
			ks.quadraticCurveTo(-2.88, -0.55, -2.88, 0); ks.quadraticCurveTo(-2.88, 0.55, -2.68, 0.98); ks.quadraticCurveTo(-2.4, 1.3, -1.9, 1.05);
			ks.quadraticCurveTo(-1.15, 0.62, -0.3, 0.42); ks.lineTo(0, 0.33); ks.lineTo(0, -0.33);
			var tri = new THREE.Path(); tri.moveTo(-2.12, -0.32); tri.quadraticCurveTo(-2.62, -0.05, -2.62, 0); tri.quadraticCurveTo(-2.62, 0.05, -2.12, 0.32); tri.quadraticCurveTo(-2.05, 0, -2.12, -0.32); ks.holes.push(tri);
			var kg = new THREE.ExtrudeGeometry(ks, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 28 });
			kg.translate(0, 0, -0.12);
			var cabK = new THREE.Mesh(kg, mt.plastico(cfg.capuchon)); cabK.position.set(-L_HOJA - 0.4, yMedio, 0); cabK.castShadow = true; llave.add(cabK);
			var texL = lienzo(256, 64, function (g, w, h) { g.font = '800 46px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '6px'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('KESO', w / 2, h / 2 + 2); });
			texL.colorSpace = THREE.SRGBColorSpace;
			[1, -1].forEach(function (z) {
				var lg = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshBasicMaterial({ map: texL, transparent: true, depthWrite: false }));
				lg.position.set(-L_HOJA - 0.4 - 1.2, yMedio + 0.02, z * 0.185); if (z < 0) lg.rotation.y = Math.PI; llave.add(lg);
			});
		}
		grupo.add(llave);

		/* --- estado: llave dentro (0 a 1) y giro del rotor */
		var obj = { cfg: cfg, grupo: grupo, llave: llave, leva: leva, insertos: insertos, alineado: true, puedeGirar: true };
		obj.verPorDentro = function (v) {
			var corte = v > 0.001;
			entero.visible = !corte; fijo.visible = corte; frente.visible = corte && v < 0.97;
			/* la mitad delantera sale hacia arriba y hacia delante, fuera del encuadre */
			frente.position.set(0, v * v * 6.5, v * 2.2);
			soloCorte.forEach(function (m) { m.visible = corte; });
			camaras.forEach(function (k) { if (k.delante) { k.mR.visible = k.mC.visible = !corte; } });
		};
		obj.actualizar = function (ins, giro) {
			var xTip = X_PUNTA - (1 - ins) * RECORRIDO, derecho = recto(giro), alineado = true;
			llave.position.x = xTip; llave.rotation.x = giro;
			rotorA.rotation.x = giro; leva.rotation.x = giro + LEVA0;
			camaras.forEach(function (k) {
				var rTip = k.pf.rest;
				if (k.lado === 'A') {
					var x2 = xTip - k.x;
					if (x2 >= 0 && x2 <= L_HOJA) rTip = Math.max(k.pf.rest, contacto(k.pf, k.pf === PERFILES.lateral ? cortesA.lateral : cortesA.main, x2));
				}
				k.gL.position.y = -rTip;
				var rCorte = rTip + k.Lk;
				var rD = derecho || k.lado === 'B' ? rCorte : RP;   // con el rotor girado, el contraperno se apoya en el rotor
				k.pc.position.y = -(rD + k.pf.ld / 2);
				var r0 = rD + k.pf.ld, largo = Math.max(0.02, k.pf.fondo - r0);
				k.mu.scale.y = largo; k.mu.position.y = -(r0 + largo / 2);
				if (k.lado === 'A' && Math.abs(rCorte - RP) > 0.006) alineado = false;
			});
			obj.alineado = alineado;
			obj.puedeGirar = ins >= 0.999 && alineado;
			return alineado;
		};
		obj.resaltar = function (v) { mt.endurecido.emissiveIntensity = v * 0.6; };
		obj.anclas = {
			cilindro: new THREE.Vector3(B * 0.55, R + 0.05, 0.35),
			pernos: new THREE.Vector3(-A * 0.5, -1.15, 0.15),
			taladro: new THREE.Vector3(-A + 0.2, -1.48, 0.1),
			extraccion: new THREE.Vector3(0.1, -1.25, 0.5),
			final: new THREE.Vector3(B * 0.4, 0.4, 0.8)
		};
		obj.verPorDentro(0);
		obj.actualizar(1, 0);
		grupo.position.x = -(B - A) / 2;
		return obj;
	}

	/* ---------- escena comun: estudio de fotografia de producto (caja clara y focos) para los reflejos */
	function entornoEstudio(renderer) {
		/* cada lienzo tiene su propio contexto WebGL, asi que el entorno se crea para cada renderer */
		if (renderer.userDataCil) return renderer.userDataCil;
		var e = new THREE.Scene();
		var caja0 = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0xc9ccd0, side: THREE.BackSide }));
		caja0.position.y = 4; e.add(caja0);
		function foco(w, h, x, y, z, rx, ry, k) {
			var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide }));
			m.position.set(x, y, z); m.rotation.set(rx, ry, 0); e.add(m);
		}
		foco(14, 7, 0, 10.8, 0, Math.PI / 2, 0, 3.2);          // techo
		foco(3, 9, -11.5, 4, 3, 0, Math.PI / 2, 2.4);          // tira izquierda
		foco(3, 9, 11.5, 4, -3, 0, -Math.PI / 2, 2.0);         // tira derecha
		foco(12, 6, 0, 4, 11.5, 0, Math.PI, 1.6);              // frente
		var suelo0 = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: 0x55585d })); suelo0.rotation.x = -Math.PI / 2; suelo0.position.y = -2.9; e.add(suelo0);
		var pm = new THREE.PMREMGenerator(renderer);
		renderer.userDataCil = pm.fromScene(e, 0.035).texture;
		pm.dispose();
		return renderer.userDataCil;
	}
	function escenaBase(renderer) {
		var escena = new THREE.Scene();
		escena.environment = entornoEstudio(renderer);
		var clave = new THREE.DirectionalLight(0xffffff, 2.1); clave.position.set(4, 7, 9); clave.castShadow = true;
		clave.shadow.mapSize.set(2048, 2048);
		var sc = clave.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 30;
		clave.shadow.bias = -0.0004; clave.shadow.normalBias = 0.01;
		escena.add(clave);
		var contra = new THREE.DirectionalLight(0xffe7dc, 1.2); contra.position.set(-6, 3, -5); escena.add(contra);
		escena.add(new THREE.HemisphereLight(0xffffff, 0xd9d4cc, 1.0));
		var frontal = new THREE.DirectionalLight(0xffffff, 0.75); frontal.position.set(-3, 1.5, 10); escena.add(frontal);
		var suelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.12 }));
		suelo.rotation.x = -Math.PI / 2; suelo.position.y = ABAJO - 1.0; suelo.receiveShadow = true; escena.add(suelo);
		return escena;
	}
	function nuevoRenderer(canvas, alpha) {
		var r;
		try { r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: !!alpha }); } catch (err) { return null; }
		r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		r.outputColorSpace = THREE.SRGBColorSpace;
		r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
		r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
		r.setClearColor(0xffffff, alpha ? 0 : 1);
		return r;
	}
	function precargar() { var P3 = window.CabmaPuerta3D; return P3 && P3.precargar ? P3.precargar() : Promise.resolve(); }

	/* ---------- visor de cabecera: gira solo, se arrastra, y la llave se mete, se saca y se gira */
	function visor(fig) {
		var canvas = fig.querySelector('.v2-foto-3d');
		if (!canvas) return;
		var renderer = nuevoRenderer(canvas, true);
		if (!renderer) {
			var b3 = fig.querySelector('[data-cara="3d"]'); if (b3) b3.hidden = true;
			canvas.hidden = true; var ex = fig.querySelector('.v2-foto-ext'); if (ex) ex.hidden = false;
			fig.classList.add('cil-sin-3d');
			return;
		}
		var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		var st = { az: -0.72, el: 0.3, auto: !reducido, dentro: 0, objDentro: 0, ins: 1, objIns: 1, giro: 0, objGiro: 0, cam: 0, sac: 0 };
		var cil = null, escena, camara = new THREE.PerspectiveCamera(26, 1, 0.1, 300);
		var activo = !canvas.hidden;
		document.addEventListener('cabma:cara', function (e) { activo = e.detail === '3d'; fig.classList.toggle('cil-3d-oculto', !activo); });
		var aviso = fig.querySelector('.cil-aviso'), avisoT = null;
		function avisar(t) {
			if (!aviso) return;
			aviso.textContent = t; aviso.classList.add('visible');
			clearTimeout(avisoT); avisoT = setTimeout(function () { aviso.classList.remove('visible'); }, 2800);
		}
		function modo(dentro) {
			st.objDentro = dentro ? 1 : 0;
			Array.prototype.forEach.call(fig.querySelectorAll('[data-cil-modo]'), function (o) { o.setAttribute('aria-pressed', (o.getAttribute('data-cil-modo') === 'dentro') === !!dentro ? 'true' : 'false'); });
		}
		var primera = true;
		function verPernos() {
			if (primera && st.objDentro === 0) { modo(true); avisar('Por dentro: mira cómo se mueven los pernos con la llave.'); }
			primera = false;
		}
		function textos() {
			var bL = fig.querySelector('[data-cil-accion="llave"]');
			if (bL) bL.textContent = st.objIns > 0.5 ? 'Sacar la llave' : 'Meter la llave';
		}
		precargar().then(function () {
			escena = escenaBase(renderer);
			poner(fig.getAttribute('data-cilindro'));
			bucle();
		});
		function poner(id) {
			if (cil) escena.remove(cil.grupo);
			cil = crear(id); escena.add(cil.grupo);
			st.giro = st.objGiro = 0;
			cil.verPorDentro(st.dentro); cil.actualizar(st.ins, 0);
		}
		Array.prototype.forEach.call(document.querySelectorAll('[data-cil-visor]'), function (b) {
			b.addEventListener('click', function () {
				var id = b.getAttribute('data-cil-visor');
				Array.prototype.forEach.call(document.querySelectorAll('[data-cil-visor]'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
				fig.setAttribute('data-cilindro', id);
				var foto = fig.querySelector('.v2-foto-ext'); if (foto && b.getAttribute('data-foto')) foto.src = b.getAttribute('data-foto');
				var corte = fig.querySelector('.v2-foto-int'); if (corte && b.getAttribute('data-corte')) corte.src = b.getAttribute('data-corte');
				var enl = document.querySelector('[data-ficha-cil]'); if (enl) { enl.href = b.getAttribute('data-ficha'); enl.textContent = 'Ver la ficha del ' + b.getAttribute('data-nombre'); }
				if (escena) poner(id);
			});
		});
		Array.prototype.forEach.call(fig.querySelectorAll('[data-cil-modo]'), function (b) {
			b.addEventListener('click', function () { primera = false; modo(b.getAttribute('data-cil-modo') === 'dentro'); });
		});
		Array.prototype.forEach.call(fig.querySelectorAll('[data-cil-accion]'), function (b) {
			b.addEventListener('click', function () {
				if (!cil) return;
				st.auto = false; verPernos();
				if (b.getAttribute('data-cil-accion') === 'llave') {
					if (st.objIns > 0.5) {
						if (!recto(st.objGiro)) { avisar('Pon la llave recta para poder sacarla.'); return; }
						st.objIns = 0;
					} else st.objIns = 1;
					textos();
				} else {
					if (st.objIns < 1 || st.ins < 0.999) { st.sac = 1; avisar('Mete la llave hasta el fondo: solo así los pernos dejan girar el rotor.'); return; }
					st.objGiro = Math.round(st.giro / DOS_PI) * DOS_PI + DOS_PI;
				}
			});
		});

		/* arrastrar: el fondo gira la vista; la llave se mete o se saca a lo largo y, metida, se gira de lado */
		var arr = null, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
		function sobreLlave(e) {
			if (!cil) return false;
			var r = canvas.getBoundingClientRect();
			ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
			ray.setFromCamera(ndc, camara);
			return ray.intersectObject(cil.llave, true).length > 0;
		}
		function ejePantalla() {
			var r = canvas.getBoundingClientRect();
			cil.llave.getWorldPosition(p0); p1.copy(p0); p1.x += 1;
			p0.project(camara); p1.project(camara);
			return { x: (p1.x - p0.x) * r.width / 2, y: -(p1.y - p0.y) * r.height / 2 };
		}
		canvas.addEventListener('pointerdown', function (e) {
			if (e.button) return;
			st.auto = false;
			if (sobreLlave(e)) { arr = { tipo: 'llave', x: e.clientX, y: e.clientY, ins: st.ins, giro: st.giro, eje: ejePantalla(), modo: null }; verPernos(); }
			else arr = { tipo: 'vista', x: e.clientX, y: e.clientY, az: st.az, el: st.el };
			try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
		});
		canvas.addEventListener('pointermove', function (e) {
			if (!arr) { if (e.pointerType === 'mouse') canvas.style.cursor = sobreLlave(e) ? 'grab' : ''; return; }
			var dx = e.clientX - arr.x, dy = e.clientY - arr.y;
			if (arr.tipo === 'vista') { st.az = arr.az - dx * 0.009; st.el = limitar(arr.el + dy * 0.006, -0.5, 1.1); return; }
			canvas.style.cursor = 'grabbing';
			var ex = arr.eje, l = Math.hypot(ex.x, ex.y) || 1, ux = ex.x / l, uy = ex.y / l;
			var largo = dx * ux + dy * uy, lado = -dx * uy + dy * ux;
			if (!arr.modo && Math.abs(largo) + Math.abs(lado) > 7) arr.modo = (Math.abs(largo) >= Math.abs(lado) || st.ins < 0.999) ? 'meter' : 'girar';
			if (arr.modo === 'meter') {
				if (!recto(st.giro)) { avisar('Pon la llave recta para poder sacarla.'); return; }
				st.ins = st.objIns = limitar(arr.ins + largo / l / RECORRIDO, 0, 1); textos();
			} else if (arr.modo === 'girar') {
				if (!cil.puedeGirar) { st.sac = 1; avisar('Mete la llave hasta el fondo: solo así los pernos dejan girar el rotor.'); return; }
				st.giro = st.objGiro = arr.giro + lado * 0.022;
			}
		});
		function soltar() {
			if (arr && arr.tipo === 'llave' && arr.modo === 'girar') st.objGiro = Math.round(st.giro / DOS_PI) * DOS_PI;
			arr = null; canvas.style.cursor = '';
		}
		canvas.addEventListener('pointerup', soltar);
		canvas.addEventListener('pointercancel', soltar);

		var visible = true;
		if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
		var ultW = 0, ultH = 0, t0 = performance.now();
		function paso() {
			if (!cil) return;
			var w = canvas.clientWidth, h = canvas.clientHeight;
			if (!w || !h) return;
			if (w !== ultW || h !== ultH) { ultW = w; ultH = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); }
			var t = performance.now(), dt = Math.min(50, t - t0); t0 = t;
			if (st.auto) st.az += dt * 0.00025;
			if (!arr || arr.tipo !== 'llave') {
				st.ins += (st.objIns - st.ins) * Math.min(1, dt * 0.009);
				if (Math.abs(st.objIns - st.ins) < 0.0008) st.ins = st.objIns;
				var dg = st.objGiro - st.giro;
				st.giro += (dg > 0 ? 1 : -1) * Math.min(Math.abs(dg), dt * 0.0055);
			}
			st.dentro += (st.objDentro - st.dentro) * Math.min(1, dt * 0.012);
			if (Math.abs(st.objDentro - st.dentro) < 0.001) st.dentro = st.objDentro;
			if (!arr) st.cam += ((1 - st.objIns) - st.cam) * Math.min(1, dt * 0.004);
			cil.verPorDentro(st.dentro);
			cil.actualizar(st.ins, st.giro);
			if (st.sac > 0) { st.sac = Math.max(0, st.sac - dt * 0.0025); cil.llave.rotation.x = st.giro + Math.sin(t / 22) * 0.05 * st.sac; }
			var d = (16.5 + st.cam * 6) / Math.min(1, camara.aspect / 1.15);
			var tx = -1.75 - st.cam * 1.7, ty = -0.8;
			camara.position.set(tx + d * Math.sin(st.az) * Math.cos(st.el), ty + d * Math.sin(st.el), d * Math.cos(st.az) * Math.cos(st.el));
			camara.lookAt(tx, ty, 0);
			renderer.render(escena, camara);
		}
		function bucle() { if (activo && visible) paso(); requestAnimationFrame(bucle); }
		textos();
		window.__cilVisor = { paso: paso, st: st, poner: poner, cil: function () { return cil; }, camara: camara };
	}

	/* ---------- despiece guiado por el scroll (misma maquetacion que las puertas) */
	function despiece(sec) {
		var gsap = window.gsap, ST = window.ScrollTrigger;
		var reducido = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || location.search.indexOf('estatico') > -1;
		var canvas = sec.querySelector('.v2-3d-canvas'), pin = sec.querySelector('.v2-3d-pin');
		var titulo = sec.querySelector('.v2-3d-titulo'), barra = sec.querySelector('.v2-3d-barra'), gigante = sec.querySelector('.v2-3d-gigante');
		var et = {};
		Array.prototype.forEach.call(sec.querySelectorAll('.l3d'), function (li) {
			et[li.getAttribute('data-k')] = { li: li, punto: li.querySelector('.l3d-punto'), caja: li.querySelector('.l3d-caja'), v: 0 };
		});
		var animable = !reducido && gsap && ST;
		var renderer = nuevoRenderer(canvas, true);
		if (!renderer) { sec.classList.add('estatico'); canvas.style.display = 'none'; return; }
		if (!animable) sec.classList.add('estatico');
		precargar().then(function () {
			var escena = escenaBase(renderer);
			var cil = crear(sec.getAttribute('data-cilindro'));
			escena.add(cil.grupo);
			var camara = new THREE.PerspectiveCamera(26, 1, 0.1, 300);
			var st = { az: -0.6, el: 0.28, dist: 21, tx: -0.9, ty: -0.75, tz: 0, dentro: 0, llave: 1, giro: 0, brillo: 0 };
			var factor = 1, ultW = 0, ultH = 0;
			function medir() {
				var w = pin.clientWidth || window.innerWidth, h = pin.clientHeight || window.innerHeight;
				ultW = w; ultH = h; renderer.setSize(w, h, false); camara.aspect = w / h;
				factor = camara.aspect < 0.8 ? 1.9 : (camara.aspect < 1.2 ? 1.35 : 1);
				camara.updateProjectionMatrix();
			}
			medir();
			var v = new THREE.Vector3(), proy = new THREE.Vector3();
			function aplicar() {
				cil.verPorDentro(st.dentro); cil.actualizar(st.llave, st.giro); cil.resaltar(st.brillo);
				var d = st.dist * factor;
				camara.position.set(st.tx + d * Math.sin(st.az) * Math.cos(st.el), st.ty + d * Math.sin(st.el), st.tz + d * Math.cos(st.az) * Math.cos(st.el));
				camara.lookAt(st.tx, st.ty, st.tz);
			}
			function ancla(k) {
				if (k === 'llave') { cil.llave.getWorldPosition(v); v.x -= 1.9; v.y += 0.45; v.z += 0.2; return v; }
				if (!cil.anclas[k]) return null;
				v.copy(cil.anclas[k]); return cil.grupo.localToWorld(v);
			}
			function etiquetas() {
				var w = pin.clientWidth, h = pin.clientHeight, movil = window.matchMedia('(max-width: 760px)').matches;
				Object.keys(et).forEach(function (k) {
					var e = et[k];
					if (!animable) return;
					var o = e.v;
					e.punto.style.opacity = o; e.caja.style.opacity = o;
					e.li.style.visibility = o > 0.01 ? 'visible' : 'hidden';
					if (o <= 0.01) return;
					var p = ancla(k); if (!p) return;
					proy.copy(p).project(camara);
					var x = (proy.x * 0.5 + 0.5) * w, y = (-proy.y * 0.5 + 0.5) * h;
					e.punto.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
					if (movil) return;
					var izq = x > w * 0.56;
					e.li.classList.toggle('izq', izq);
					var cx = izq ? x - 34 - 320 : x + 34, cy = Math.max(96, Math.min(h - 190, y - 22));
					e.caja.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) translateY(' + ((1 - o) * 10).toFixed(1) + 'px)';
				});
			}
			function pintar() { if (pin.clientWidth !== ultW || pin.clientHeight !== ultH) medir(); aplicar(); renderer.render(escena, camara); etiquetas(); }
			if ('ResizeObserver' in window) new ResizeObserver(function () { medir(); if (!animable) pintar(); }).observe(document.documentElement);
			if (!animable) { st.dentro = 1; st.az = -0.5; st.el = 0.3; pintar(); return; }

			var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
			function mostrar(k, t0, t1) {
				if (!et[k]) return;
				tl.to(et[k], { v: 1, duration: 0.3, ease: 'power1.out' }, t0);
				if (t1) tl.to(et[k], { v: 0, duration: 0.3, ease: 'power1.in' }, t1 - 0.3);
			}
			/* 1. el cilindro entero */
			tl.to(titulo, { autoAlpha: 0, y: -24, duration: 0.45, ease: 'power1.in' }, 0.25)
				.to(st, { az: 0.55, el: 0.22, dist: 19, duration: 1.4 }, 0)
				.to(gigante, { xPercent: -38, duration: 10.8, ease: 'none' }, 0);
			mostrar('cilindro', 0.5, 1.9);
			/* 2. por dentro: sale la mitad delantera y la llave sale y vuelve a entrar despacio; los pernos siguen su perfil */
			tl.to(st, { az: 0.06, el: 0.08, dist: 14.5, tx: -1.2, ty: -0.85, duration: 1.0 }, 1.7)
				.to(st, { dentro: 1, duration: 0.8 }, 1.9)
				.to(st, { llave: 0, duration: 0.8, ease: 'power1.inOut' }, 2.5)
				.to(st, { llave: 1, duration: 1.1, ease: 'power1.inOut' }, 3.3);
			mostrar('pernos', 2.3, 4.4);
			/* 3. antitaladro: la llave fuera y la cara exterior con los insertos endurecidos */
			tl.to(st, { az: -0.95, el: 0.18, dist: 11, tx: -2.2, ty: -1.0, duration: 1.0 }, 4.3)
				.to(st, { llave: 0, duration: 0.6 }, 4.3)
				.to(st, { brillo: 1, duration: 0.5 }, 4.7)
				.to(st, { brillo: 0, duration: 0.5 }, 5.8);
			mostrar('taladro', 4.7, 6.2);
			/* 4. la llave entra hasta el fondo y gira: rotor y leva */
			tl.to(st, { llave: 1, duration: 0.6 }, 6.1)
				.to(st, { az: 0.35, el: 0.05, dist: 12.5, tx: -0.4, ty: -0.9, duration: 1.0 }, 6.1)
				.to(st, { giro: DOS_PI, duration: 1.5, ease: 'power1.inOut' }, 6.8);
			mostrar('extraccion', 6.5, 8.2);
			/* 5. la llave sale y se ve entera */
			tl.to(st, { llave: 0, duration: 0.8 }, 8.1)
				.to(st, { az: -0.4, el: 0.35, dist: 16, tx: -5.4, ty: -0.4, duration: 1.0 }, 8.1);
			mostrar('llave', 8.5, 9.8);
			/* 6. se vuelve a montar */
			tl.to(st, { llave: 1, dentro: 0, duration: 0.9 }, 9.7)
				.to(st, { az: 0.7, el: 0.25, dist: 19, tx: -0.9, ty: -0.75, duration: 1.0 }, 9.7);
			mostrar('final', 10.2);
			tl.to({}, { duration: 0.2 }, 10.9);

			ST.create({
				trigger: sec, start: 'top top',
				end: function () { return '+=' + Math.round(window.innerHeight * 8); },
				pin: pin, scrub: 1, animation: tl, invalidateOnRefresh: true,
				onUpdate: function (self) { barra.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
			});
			var visible = false;
			new IntersectionObserver(function (ents) { visible = ents[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(sec);
			(function bucle() { if (visible) pintar(); requestAnimationFrame(bucle); })();
			pintar();
			window.__cilDesp = { tl: tl, st: st, pintar: pintar, cil: cil, camara: camara };
		});
	}

	window.CabmaCilindro3D = { MODELOS: MODELOS, crear: crear };
	Array.prototype.forEach.call(document.querySelectorAll('.v2-foto[data-cilindro]'), visor);
	var sec = document.querySelector('.v2-3d[data-cilindro]');
	if (sec) despiece(sec);
})();
