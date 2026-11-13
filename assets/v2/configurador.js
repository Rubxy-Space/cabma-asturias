/* CABMA Asturias: configurador «Diseña tu puerta». Modelo, acabado (madera o cualquier color de la carta RAL),
   diseño del panel, marco, perfil, herrajes, interior, lado de la cerradura y medida, en 3D.
   El diseño va en la direccion (?m=...&ac=...) para compartirlo y llega a Contacto al pedir presupuesto.
   Usa window.CabmaPuerta3D (puerta3d.js) con su opcion «ajustes» y window.CABMA_RAL (ral.js). */
(function () {
	'use strict';
	var THREE = window.THREE, P3 = window.CabmaPuerta3D, RAL = window.CABMA_RAL || [];
	var raizCfg = document.querySelector('[data-cfg]');
	if (!raizCfg) return;
	var lienzo = raizCfg.querySelector('.cfg-canvas');
	var form = raizCfg.querySelector('.cfg-panel');

	/* ---------- opciones (las de las fichas de CABMA) */
	var THOR = ['thor-20-plus', 'thor-20', 'idom', 'eco-thor'], PREMIUM = ['premium-5c', 'premium-4c', 'premium-3c'];
	var MADERAS = {
		roble: { nombre: 'Roble', tono: [206, 152, 92] },
		sapelly: { nombre: 'Sapelly', tono: [196, 120, 74] },
		haya: { nombre: 'Haya', tono: [232, 184, 134] },
		nogal: { nombre: 'Nogal', tono: [126, 83, 54] }
	};
	var MARCOS = {
		sapelly: { nombre: 'Sapelly', tono: MADERAS.sapelly.tono }, roble: { nombre: 'Roble', tono: MADERAS.roble.tono },
		haya: { nombre: 'Haya', tono: MADERAS.haya.tono }, nogal: { nombre: 'Nogal', tono: MADERAS.nogal.tono },
		inox: { nombre: 'Gris inox', liso: 0xb9bcbf, metal: true }, antracita: { nombre: 'Gris antracita', liso: 0x383e42 },
		blanco: { nombre: 'Blanco', liso: 0xf1f0ec }, negro: { nombre: 'Negro', liso: 0x18191a }
	};
	var DISENOS = { liso: 'Liso', moldura: 'Moldura perimetral', cuadros1: 'Un cuadro', cuadros2: 'Dos cuadros', cuadros4: 'Cuatro cuadros', rayas: 'Cuatro rayas', fresado: 'Fresado horizontal', verticales: 'Rayas verticales' };
	var ACABADOS_METAL = { cromo: 'Cromado', laton: 'Dorado', negro: 'Negro' };
	var PERFILES = { cromo: 'Cromado', dorado: 'Dorado', negro: 'Negro' };
	var MEDIDAS = {
		thor: ['202x83', '205x86', '205x92', '207x90'],
		premium: ['206x89', '209x91', '209x95'],
		trastero: []
	};
	var colorRal = {};
	RAL.forEach(function (g) { g.colores.forEach(function (c) { colorRal[c[0]] = { nombre: c[1], hex: c[2], grupo: g.grupo }; }); });

	function familia(m) { return THOR.indexOf(m) >= 0 ? 'thor' : (PREMIUM.indexOf(m) >= 0 ? 'premium' : 'trastero'); }

	/* ---------- estado (y lectura desde la direccion) */
	var q = {};
	location.search.replace(/^\?/, '').split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
	var estado = {
		modelo: P3 && P3.MODELOS[q.m] ? q.m : 'thor-20-plus',
		acabado: q.ac || 'serie',      // serie | madera:roble | ral:7016
		diseno: q.di || 'serie', marco: q.ma || 'serie', perfil: q.pe || 'serie', herrajes: q.he || 'serie',
		interior: q.in || 'serie', lado: q.la || 'serie', medida: q.me || 'serie'
	};

	function valido() {
		/* corrige lo que no existe para el modelo elegido */
		var f = familia(estado.modelo);
		var ac = estado.acabado.split(':');
		if (ac[0] === 'madera' && (!MADERAS[ac[1]] || f === 'trastero')) estado.acabado = 'serie';
		if (ac[0] === 'ral' && !colorRal[ac[1]]) estado.acabado = 'serie';
		if (estado.diseno !== 'serie' && (!DISENOS[estado.diseno] || (f === 'trastero' && estado.diseno !== 'liso'))) estado.diseno = 'serie';
		if (f !== 'thor' && estado.marco !== 'serie') estado.marco = 'serie';
		if (estado.marco !== 'serie' && !MARCOS[estado.marco]) estado.marco = 'serie';
		if (f !== 'thor' && estado.perfil !== 'serie') estado.perfil = 'serie';
		if (estado.perfil !== 'serie' && !PERFILES[estado.perfil]) estado.perfil = 'serie';
		if (estado.herrajes !== 'serie' && !ACABADOS_METAL[estado.herrajes]) estado.herrajes = 'serie';
		if (['serie', 'igual'].indexOf(estado.interior) < 0 || f === 'trastero') estado.interior = 'serie';
		if (['serie', 'izq', 'der'].indexOf(estado.lado) < 0) estado.lado = 'serie';
		if (estado.medida !== 'serie' && estado.medida !== 'especial' && MEDIDAS[f].indexOf(estado.medida) < 0) estado.medida = 'serie';
	}

	function ajustes() {
		var m = P3.MODELOS[estado.modelo], a = {}, f = familia(estado.modelo);
		var ac = estado.acabado.split(':');
		if (ac[0] === 'madera') { a.tono = MADERAS[ac[1]].tono; a.acabado = null; if (m.tablero === 'chapa') a.tablero = 'liso'; }
		if (ac[0] === 'ral') {
			a.acabado = 'lacado'; a.colorPanel = parseInt(colorRal[ac[1]].hex.slice(1), 16);
			if (f === 'trastero') a.colorMarco = a.colorPanel;
		}
		if (estado.diseno !== 'serie') {
			var d = estado.diseno;
			if (f === 'trastero') d = 'liso';
			a.tablero = d === 'fresado' ? 'liso' : d;
			if (f === 'trastero' && d === 'liso') a.tablero = 'chapa';
			a.fresado = d === 'fresado' ? { v: [0.13, 0.84], h: 7 } : null;
		}
		if (f === 'thor' && estado.marco !== 'serie') {
			var mc = MARCOS[estado.marco];
			if (mc.tono) { a.tonoMarco = mc.tono; a.marcoLiso = null; } else { a.marcoLiso = mc.liso; a.marcoMetal = !!mc.metal; }
		}
		if (f === 'thor' && m.perfil && estado.perfil !== 'serie') a.perfil = Object.assign({}, m.perfil, { acabado: estado.perfil });
		if (estado.herrajes !== 'serie') {
			a.herraje = estado.herrajes;
			if (m.manilla) a.manilla = Object.assign({}, m.manilla, { acabado: estado.herrajes });
		}
		if (estado.interior === 'igual') a.panelInt = 'igual';
		if (estado.lado !== 'serie') a.lado = estado.lado;
		if (estado.medida !== 'serie' && estado.medida !== 'especial') {
			var hw = estado.medida.split('x');
			a.block = [Number(hw[1]) / 100, Number(hw[0]) / 100];
		}
		return a;
	}

	/* ---------- textos del resumen */
	function txtAcabado() {
		var ac = estado.acabado.split(':'), m = P3.MODELOS[estado.modelo];
		if (ac[0] === 'madera') return 'Madera de ' + MADERAS[ac[1]].nombre.toLowerCase();
		if (ac[0] === 'ral') return 'Lacado RAL ' + ac[1] + ' (' + colorRal[ac[1]].nombre + ')';
		return m.acabado === 'lacado' ? 'Lacado blanco (de serie)' : (m.tablero === 'chapa' ? 'Vinilo blanco (de serie)' : 'Madera de serie, como en la foto');
	}
	function txtSerie(v, mapa, serie) { return v === 'serie' ? serie : mapa[v]; }
	function lineas() {
		var m = P3.MODELOS[estado.modelo], f = familia(estado.modelo), L = [];
		L.push(['Modelo', m.nombre]);
		L.push(['Panel exterior', txtAcabado()]);
		L.push(['Diseño', estado.diseno === 'serie' ? (m.tablero === 'moldura' ? 'Moldura perimetral (de serie)' : (m.fresado ? 'Fresado horizontal (de serie)' : 'Liso (de serie)')) : DISENOS[estado.diseno]]);
		if (f === 'thor') {
			L.push(['Marco', estado.marco === 'serie' ? 'De serie, como en la foto' : 'Vinilo ' + MARCOS[estado.marco].nombre.toLowerCase()]);
			L.push(['Perfil', txtSerie(estado.perfil, PERFILES, (m.perfil && m.perfil.acabado === 'dorado' ? 'Dorado' : 'Cromado') + ' (de serie)')]);
		} else L.push(['Marco', f === 'premium' ? 'Acero galvanizado' : 'Del color de la puerta']);
		L.push(['Herrajes', txtSerie(estado.herrajes, ACABADOS_METAL, (m.herraje === 'laton' ? 'Dorado' : 'Cromado') + ' (de serie)')]);
		if (f !== 'trastero') L.push(['Panel interior', estado.interior === 'igual' ? 'Igual que el exterior' : 'Blanco (de serie)']);
		var lado = estado.lado === 'serie' ? m.lado : estado.lado;
		L.push(['Cerradura', lado === 'izq' ? 'A la izquierda, vista desde fuera' : 'A la derecha, vista desde fuera']);
		var med = estado.medida === 'serie' ? Math.round(m.block[1] * 100) + ' x ' + Math.round(m.block[0] * 100) + ' cm' : (estado.medida === 'especial' ? 'A medida (la tomamos nosotros)' : estado.medida.replace('x', ' x ') + ' cm');
		L.push(['Medida total del block', med]);
		return L;
	}

	/* ---------- escena 3D */
	var renderer = null, escena, camara, puerta = null, pared = null, luces = {};
	var vista = { az: 0.42, el: 0.08, objetivoAz: 0.42, objetivoEl: 0.08, abierta: 0, objetivoAbierta: 0 };
	if (THREE && P3 && lienzo) {
		try {
			renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true });
		} catch (err) { renderer = null; }
	}
	if (!renderer) {
		raizCfg.classList.add('cfg-sin-3d');
	} else {
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.setClearColor(0xeee9e2, 1);
		escena = new THREE.Scene();
		escena.fog = new THREE.Fog(0xeee9e2, 9, 18);
		camara = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
		P3.precargar().then(function () {
			escena.environment = P3.entorno(renderer, 'blanco');
			luces.hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c7, 0.95); escena.add(luces.hemi);
			luces.clave = new THREE.DirectionalLight(0xfff6ec, 1.35);
			luces.clave.castShadow = true; luces.clave.shadow.mapSize.set(2048, 2048);
			var sc = luces.clave.shadow.camera; sc.left = -2.5; sc.right = 2.5; sc.top = 3; sc.bottom = -1; sc.near = 0.5; sc.far = 16;
			luces.clave.shadow.bias = -0.0003; luces.clave.shadow.normalBias = 0.02;
			escena.add(luces.clave); escena.add(luces.clave.target);
			luces.relleno = new THREE.DirectionalLight(0xffffff, 0.4); escena.add(luces.relleno);
			/* suelo */
			var tb = P3.texBaldosa(); tb.wrapS = tb.wrapT = THREE.RepeatWrapping; tb.repeat.set(6, 6);
			var suelo = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: tb, color: 0xf2eee8, roughness: 0.55, envMapIntensity: 0.4 }));
			suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);
			montar();
			raizCfg.classList.add('cfg-listo');
			medir();
			bucle();
		});
	}

	function hacerPared(WT, HT) {
		/* pared de yeso con el hueco de la puerta (se ve por las dos caras) */
		var ancho = 6, alto = 3.2, s = new THREE.Shape();
		s.moveTo(-ancho / 2, 0); s.lineTo(ancho / 2, 0); s.lineTo(ancho / 2, alto); s.lineTo(-ancho / 2, alto); s.lineTo(-ancho / 2, 0);
		var h = new THREE.Path(), m = 0.012;
		h.moveTo(-WT / 2 + m, 0); h.lineTo(WT / 2 - m, 0); h.lineTo(WT / 2 - m, HT - m); h.lineTo(-WT / 2 + m, HT - m); h.lineTo(-WT / 2 + m, 0);
		s.holes.push(h);
		var ty = P3.texYeso(); ty.wrapS = ty.wrapT = THREE.RepeatWrapping; ty.repeat.set(0.35, 0.35);
		var g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
		g.translate(0, 0, -0.125);
		var mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: ty, color: 0xf3efe9, roughness: 0.92, envMapIntensity: 0.35 }));
		mesh.receiveShadow = true; mesh.castShadow = false;
		/* rodapie */
		var rod = new THREE.Group();
		[-1, 1].forEach(function (lado) {
			var w = ancho / 2 - WT / 2;
			[0.012, -0.137].forEach(function (z) {
				var r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.012), new THREE.MeshStandardMaterial({ color: 0xf7f5f1, roughness: 0.5 }));
				r.position.set(lado * (WT / 2 + w / 2), 0.04, z); r.receiveShadow = true; rod.add(r);
			});
		});
		var gr = new THREE.Group(); gr.add(mesh, rod);
		return gr;
	}

	function montar() {
		if (!renderer || !escena.environment) return;
		if (puerta) escena.remove(puerta.grupo);
		if (pared) escena.remove(pared);
		puerta = P3.crearPuerta({ modelo: estado.modelo, patillas: false, ajustes: ajustes() });
		if (puerta.verPorDentro) puerta.verPorDentro(false);
		escena.add(puerta.grupo);
		pared = hacerPared(puerta.medidas.WT, puerta.medidas.HT);
		escena.add(pared);
		if (puerta.hoja) puerta.hoja.rotation.y = vista.abierta * 1.35;
		pedirPintado();
	}

	var ultW = 0, ultH = 0;
	function medir() {
		if (!renderer) return;
		var w = lienzo.clientWidth || 300, h = lienzo.clientHeight || 400;
		ultW = w; ultH = h;
		renderer.setSize(w, h, false);
		camara.aspect = w / h; camara.updateProjectionMatrix();
		pedirPintado();
	}
	var sucio = true, visible = true;
	function pedirPintado() { sucio = true; }
	if ('IntersectionObserver' in window && lienzo) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) pedirPintado(); }).observe(lienzo);
	function bucle() { paso(); requestAnimationFrame(bucle); }
	function paso() {
		if (!puerta) return;
		if (lienzo.clientWidth !== ultW || lienzo.clientHeight !== ultH) medir();
		/* animaciones suaves de camara y apertura */
		var anim = false;
		['az', 'el', 'abierta'].forEach(function (k) {
			var o = vista['objetivo' + k.charAt(0).toUpperCase() + k.slice(1)], d = o - vista[k];
			if (Math.abs(d) > 0.0005) { vista[k] += d * 0.14; anim = true; } else vista[k] = o;
		});
		if (!sucio && !anim) return;
		if (!visible && !anim) return;
		sucio = false;
		if (puerta.hoja) puerta.hoja.rotation.y = vista.abierta * 1.35;
		var HT = puerta.medidas.HT, d = (HT * 0.62) / Math.tan(THREE.MathUtils.degToRad(15)) / Math.min(1, camara.aspect / 0.62);
		var ct = new THREE.Vector3(0, HT * 0.5, 0);
		camara.position.set(d * Math.sin(vista.az) * Math.cos(vista.el), ct.y + d * Math.sin(vista.el), d * Math.cos(vista.az) * Math.cos(vista.el));
		camara.lookAt(ct);
		var lado = Math.cos(vista.az) >= 0 ? 1 : -1;
		luces.clave.position.set(camara.position.x * 0.5 - 1.6 * lado, 3.4, camara.position.z * 0.6 + 0.5 * lado);
		luces.clave.target.position.set(0, 1, 0);
		luces.relleno.position.set(-camara.position.x, 2, camara.position.z);
		renderer.render(escena, camara);
	}
	window.__cfg = { estado: estado, paso: function () { sucio = true; paso(); }, vista: vista, montar: montar };

	/* giro arrastrando */
	var arr = null;
	if (lienzo) {
		lienzo.addEventListener('pointerdown', function (e) { arr = { x: e.clientX, y: e.clientY, az: vista.objetivoAz, el: vista.objetivoEl }; try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* nada */ } });
		lienzo.addEventListener('pointermove', function (e) {
			if (!arr) return;
			vista.objetivoAz = arr.az - (e.clientX - arr.x) * 0.008;
			vista.objetivoEl = Math.max(-0.12, Math.min(0.6, arr.el + (e.clientY - arr.y) * 0.005));
			vista.az = vista.objetivoAz; vista.el = vista.objetivoEl; pedirPintado();
			marcarVista(null);
		});
		['pointerup', 'pointercancel'].forEach(function (t) { lienzo.addEventListener(t, function () { arr = null; }); });
	}
	function marcarVista(v) {
		raizCfg.querySelectorAll('[data-vista]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vista') === v ? 'true' : 'false'); });
	}
	raizCfg.querySelectorAll('[data-vista]').forEach(function (b) {
		b.addEventListener('click', function () {
			var v = b.getAttribute('data-vista');
			var az = { frente: 0, tres: 0.6, int: Math.PI - 0.35 }[v];
			/* gira por el camino corto */
			var actual = vista.objetivoAz, dif = ((az - actual) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
			vista.objetivoAz = actual + dif; vista.objetivoEl = v === 'frente' ? 0.04 : 0.1;
			marcarVista(v);
		});
	});
	var botonAbrir = raizCfg.querySelector('[data-abrir]');
	if (botonAbrir) botonAbrir.addEventListener('click', function () {
		vista.objetivoAbierta = vista.objetivoAbierta ? 0 : 1;
		botonAbrir.setAttribute('aria-pressed', vista.objetivoAbierta ? 'true' : 'false');
		botonAbrir.textContent = vista.objetivoAbierta ? 'Cerrar' : 'Abrir';
	});

	/* ---------- carta RAL */
	var cajaRal = raizCfg.querySelector('[data-ral]');
	if (cajaRal) {
		var html = '';
		RAL.forEach(function (g) {
			html += '<div class="cfg-ral-grupo"><h4>' + g.grupo + '</h4><div class="cfg-ral-colores">';
			g.colores.forEach(function (c) {
				html += '<button type="button" class="cfg-ral-c" data-ral-c="' + c[0] + '" style="--c:' + c[2] + '" title="RAL ' + c[0] + ' · ' + c[1] + '" aria-label="RAL ' + c[0] + ', ' + c[1] + '" aria-pressed="false"><span>' + c[0] + '</span></button>';
			});
			html += '</div></div>';
		});
		cajaRal.querySelector('.cfg-ral-lista').innerHTML = html;
		var buscar = cajaRal.querySelector('.cfg-ral-buscar');
		var vacio = cajaRal.querySelector('.cfg-ral-vacio');
		var normal = function (t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
		buscar.addEventListener('input', function () {
			var t = normal(buscar.value.replace(/ral\s*/i, '').trim()), hay = 0;
			cajaRal.querySelectorAll('.cfg-ral-c').forEach(function (b) {
				var c = b.getAttribute('data-ral-c'), ok = !t || c.indexOf(t) === 0 || normal(colorRal[c].nombre).indexOf(t) >= 0;
				b.hidden = !ok; if (ok) hay++;
			});
			cajaRal.querySelectorAll('.cfg-ral-grupo').forEach(function (g) { g.hidden = !g.querySelector('.cfg-ral-c:not([hidden])'); });
			vacio.hidden = hay > 0;
		});
		cajaRal.addEventListener('click', function (e) {
			var b = e.target.closest('[data-ral-c]');
			if (!b) return;
			estado.acabado = 'ral:' + b.getAttribute('data-ral-c');
			cambio();
		});
	}

	/* ---------- controles */
	form.addEventListener('submit', function (e) { e.preventDefault(); });
	form.addEventListener('change', function (e) {
		var c = e.target;
		if (!c.name || c.type === 'search') return;
		if (c.name === 'modelo') estado.modelo = c.value;
		else if (c.name === 'acabado') estado.acabado = c.value;
		else estado[c.name] = c.value;
		cambio(c.name === 'modelo');
	});

	var resumen = raizCfg.querySelector('.cfg-resumen-lista');
	var botonPres = raizCfg.querySelector('[data-cfg-presupuesto]');
	var enlaceTxt = raizCfg.querySelector('.cfg-enlace');
	function direccion() {
		var p = ['m=' + estado.modelo];
		[['ac', 'acabado'], ['di', 'diseno'], ['ma', 'marco'], ['pe', 'perfil'], ['he', 'herrajes'], ['in', 'interior'], ['la', 'lado'], ['me', 'medida']].forEach(function (k) {
			if (estado[k[1]] !== 'serie') p.push(k[0] + '=' + encodeURIComponent(estado[k[1]]));
		});
		return location.pathname + '?' + p.join('&');
	}
	function enlaceCompleto() { return location.protocol === 'file:' ? location.href.split('?')[0] + direccion().slice(location.pathname.length) : location.origin + direccion(); }

	function pintarControles() {
		var f = familia(estado.modelo), m = P3.MODELOS[estado.modelo];
		form.querySelectorAll('input[type="radio"]').forEach(function (r) {
			var v = estado[r.name];
			r.checked = r.value === v;
		});
		raizCfg.querySelectorAll('[data-solo]').forEach(function (el) {
			el.hidden = el.getAttribute('data-solo').split(' ').indexOf(f) < 0;
		});
		/* trastero: solo color liso y diseño liso */
		form.querySelectorAll('[data-no-trastero]').forEach(function (el) { el.hidden = f === 'trastero'; });
		/* medidas del modelo */
		var sel = form.querySelector('select[name="medida"]');
		if (sel) {
			var ops = '<option value="serie">' + Math.round(m.block[1] * 100) + ' x ' + Math.round(m.block[0] * 100) + ' cm (la de la foto)</option>';
			MEDIDAS[f].forEach(function (md) { if (md !== Math.round(m.block[1] * 100) + 'x' + Math.round(m.block[0] * 100)) ops += '<option value="' + md + '">' + md.replace('x', ' x ') + ' cm</option>'; });
			ops += '<option value="especial">A medida (la tomamos nosotros)</option>';
			sel.innerHTML = ops; sel.value = estado.medida;
		}
		var ac = estado.acabado.split(':');
		raizCfg.querySelectorAll('.cfg-ral-c').forEach(function (b) { b.setAttribute('aria-pressed', ac[0] === 'ral' && b.getAttribute('data-ral-c') === ac[1] ? 'true' : 'false'); });
		var elegido = raizCfg.querySelector('.cfg-ral-elegido');
		if (elegido) {
			if (ac[0] === 'ral') { elegido.innerHTML = '<span class="cfg-muestra" style="--c:' + colorRal[ac[1]].hex + '"></span> RAL ' + ac[1] + ' · ' + colorRal[ac[1]].nombre; elegido.hidden = false; }
			else elegido.hidden = true;
		}
		/* si el color RAL no esta entre los rapidos, se marca el boton de la carta */
		var rapido = form.querySelector('input[name="acabado"][value="' + estado.acabado + '"]');
		var bCarta = raizCfg.querySelector('[data-abrir-ral]');
		if (bCarta) bCarta.classList.toggle('activo', ac[0] === 'ral' && !rapido);
		/* resumen */
		var L = lineas();
		resumen.innerHTML = L.map(function (l) { return '<div><dt>' + l[0] + '</dt><dd>' + l[1] + '</dd></div>'; }).join('');
		var titulo = raizCfg.querySelector('.cfg-resumen-modelo');
		if (titulo) titulo.textContent = m.nombre;
		var txt = 'Hola, me gustaría recibir presupuesto de esta puerta que he diseñado en la web:\n' + L.map(function (l) { return '- ' + l[0] + ': ' + l[1]; }).join('\n') + '\nDiseño: ' + enlaceCompleto();
		if (botonPres) botonPres.href = botonPres.getAttribute('data-base') + '?puerta=' + estado.modelo + '&diseno=' + encodeURIComponent(txt);
		if (enlaceTxt) enlaceTxt.value = enlaceCompleto();
	}

	function cambio(modeloNuevo) {
		valido();
		try { history.replaceState(null, '', direccion()); } catch (err) { /* file:// en algunos navegadores */ }
		pintarControles();
		montar();
		if (modeloNuevo) { vista.objetivoAbierta = 0; if (botonAbrir) { botonAbrir.textContent = 'Abrir'; botonAbrir.setAttribute('aria-pressed', 'false'); } }
	}

	/* abrir y cerrar la carta RAL completa */
	var bCarta = raizCfg.querySelector('[data-abrir-ral]');
	if (bCarta && cajaRal) bCarta.addEventListener('click', function () {
		var abierta = cajaRal.hidden;
		cajaRal.hidden = !abierta;
		bCarta.setAttribute('aria-expanded', abierta ? 'true' : 'false');
		if (abierta) { var bu = cajaRal.querySelector('.cfg-ral-buscar'); if (bu) bu.focus(); }
	});

	/* compartir y descargar */
	var bCopiar = raizCfg.querySelector('[data-cfg-copiar]');
	if (bCopiar) bCopiar.addEventListener('click', function () {
		var url = enlaceCompleto(), hecho = function () { bCopiar.textContent = 'Enlace copiado'; setTimeout(function () { bCopiar.textContent = 'Copiar enlace'; }, 2000); };
		if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(hecho, function () { enlaceTxt.hidden = false; enlaceTxt.select(); });
		else { enlaceTxt.hidden = false; enlaceTxt.select(); }
	});
	var bImg = raizCfg.querySelector('[data-cfg-imagen]');
	if (bImg) bImg.addEventListener('click', function () {
		if (!renderer || !puerta) return;
		sucio = true; paso();
		var a = document.createElement('a');
		a.download = 'mi-puerta-cabma-' + estado.modelo + '.png';
		a.href = lienzo.toDataURL('image/png');
		document.body.appendChild(a); a.click(); a.remove();
	});

	valido();
	pintarControles();
	window.addEventListener('resize', medir);
})();
