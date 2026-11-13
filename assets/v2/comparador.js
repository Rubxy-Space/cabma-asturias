/* CABMA Asturias: comparador de puertas y de cilindros (data-comparador="puertas" | "cilindros").
   Hasta tres lado a lado (dos en el movil), con los datos de las fichas (#cmpz-datos) y en 3D:
   un solo lienzo WebGL pinta cada modelo en su columna (viewport y scissor), con la camara sincronizada.
   - Puertas: vistas Frente, 3/4, Canto y Por dentro, y Desmontar (boton animado y deslizador). Usa puerta3d.js.
   - Cilindros: Entero o Por dentro, y meter, sacar y girar la llave en todos a la vez. Usa cilindro3d.js.
   La seleccion va en la direccion (?p=thor-20-plus,premium-4c,premium-5c). */
(function () {
	'use strict';
	var raiz = document.querySelector('[data-comparador]');
	if (!raiz) return;
	var tipo = raiz.getAttribute('data-comparador');
	var datos;
	try { datos = JSON.parse(document.getElementById('cmpz-datos').textContent); } catch (err) { return; }
	var orden = Object.keys(datos);
	var sels = Array.prototype.slice.call(raiz.querySelectorAll('.cmpz-sel select'));
	var tabla = raiz.querySelector('.cmpz-tabla'), cab = raiz.querySelector('.cmpz-cab'), cuerpo = raiz.querySelector('.cmpz-cuerpo');
	var vis = raiz.querySelector('.cmpz-vis'), huecos = raiz.querySelector('.cmpz-huecos'), celdasCont = raiz.querySelector('.cmpz-celdas');
	var dif = raiz.querySelector('[data-diferencias]');
	var movil = window.matchMedia('(max-width: 700px)');
	var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var DOS_PI = Math.PI * 2;

	var POR_DEFECTO = tipo === 'cilindros' ? ['nw4', 'master', 'nw5', 'elite-2', 'ultra'] : ['thor-20-plus', 'premium-4c', 'premium-5c', 'thor-20', 'premium-3c'];
	var q = (location.search.match(/[?&]p=([^&]+)/) || [])[1];
	var eleg = (q ? decodeURIComponent(q).split(',') : []).filter(function (s, i, a) { return datos[s] && a.indexOf(s) === i; });
	POR_DEFECTO.forEach(function (s) { if (eleg.length < 3 && eleg.indexOf(s) < 0 && datos[s]) eleg.push(s); });
	eleg = eleg.slice(0, 3);

	function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
	function n() { return movil.matches ? 2 : 3; }
	var ND = '<span class="cmpz-nd">No indicado</span>';

	/* ---------- filas de cada tipo: devuelven el html y el valor para comparar */
	function texto(k) { return function (d) { var t = d[k]; return !t || t === 'No indicado' || t === 'No indicada' ? { h: ND, v: '' } : { h: esc(t), v: t }; }; }
	var FILAS;
	if (tipo === 'cilindros') {
		var ATQ = datos[orden[0]].ataques || [];
		FILAS = [{ grupo: 'Contra qué protege, según su ficha' }].concat(ATQ.map(function (a) {
			return { t: a[1], s: a[2], f: function (d) { var si = d.protege.indexOf(a[0]) >= 0; return { h: si ? '<span class="cmpz-si">Sí</span>' : ND, v: si ? 1 : 0 }; } };
		})).concat([
			{ grupo: 'Llave y materiales' },
			{ t: 'Control de copias', f: texto('copias') },
			{ t: 'Cuerpo', f: texto('cuerpo') },
			{ t: 'Certificación', f: texto('certif') },
			{ t: 'Amaestramiento', s: 'Varias puertas con una sola llave', f: texto('amaestrar') },
			{ grupo: 'En las puertas CABMA' },
			{ t: 'De serie en', f: function (d) { return d.serie.length ? { h: d.serie.map(function (s) { return '<a class="v2-enlace" href="' + esc(s.url) + '">' + esc(s.nombre) + '</a>'; }).join('<br>'), v: d.serie.map(function (s) { return s.nombre; }).join() } : { h: 'Bajo pedido', v: '-' }; } },
			{ grupo: 'Lo que más destaca' },
			{ t: 'Lo que más destaca', sinTitulo: true, f: function (d) { return { h: '<ul class="cmpz-lista">' + d.destacados.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', v: d.destacados.join() }; } }
		]);
	} else {
		var grado = function (d) {
			if (!/^\d$/.test(d.grado)) return { h: ND, v: '' };
			var g = +d.grado, seg = '';
			for (var i = 1; i <= 6; i++) seg += '<span class="' + (i <= g ? 'on' : '') + '"></span>';
			return { h: '<div class="cmpz-nivel" role="img" aria-label="Grado ' + g + ' de 6">' + seg + '</div><strong class="cmpz-grande">Grado ' + g + '</strong>', v: g };
		};
		var clase = function (d) {
			if (!/^[ABC]$/.test(d.clase)) return { h: ND, v: '' };
			var p = ['A', 'B', 'C'].map(function (c) { return '<span class="' + (c === d.clase ? 'on' : '') + '">' + c + '</span>'; }).join('');
			return { h: '<div class="cmpz-clase" role="img" aria-label="Clase ' + d.clase + '">' + p + '</div>', v: d.clase.charCodeAt(0) - 64 };
		};
		var puntos = function (d) { return d.puntos ? { h: '<strong class="cmpz-grande">' + d.puntos + '</strong>', v: d.puntos } : { h: ND, v: '' }; };
		var cilindro = function (d) { return d.cilindro ? { h: '<a class="v2-enlace" href="' + esc(d.cilindro.url) + '">' + esc(d.cilindro.nombre) + '</a>', v: d.cilindro.nombre } : { h: esc(d.bombillo), v: d.bombillo }; };
		var medidas = function (d) {
			var h = '<ul class="cmpz-lista">' + d.medidas.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
			if (d.aMedida) h += '<p class="cmpz-nota">' + esc(d.aMedida) + '</p>';
			return { h: h, v: d.medidas.join('|') + (d.aMedida || '') };
		};
		FILAS = [
			{ grupo: 'Seguridad' },
			{ t: 'Grado de seguridad', s: 'Resistencia al robo según UNE-EN 1627, de 1 a 6', f: grado, alta: true },
			{ t: 'Clase', s: 'Según UNE 85160: A, B o C', f: clase, alta: true },
			{ t: 'Puntos de cierre', s: 'Contando cerradura y antipalancas', f: puntos, alta: true },
			{ grupo: 'Cierre y herrajes' },
			{ t: 'Cerradura', f: texto('cerradura') },
			{ t: 'Desviadores', f: texto('desviadores') },
			{ t: 'Bisagras', f: texto('bisagras') },
			{ t: 'Antipalancas', f: texto('antipalancas') },
			{ t: 'Cilindro de serie', f: cilindro },
			{ grupo: 'Medidas' },
			{ t: 'Medidas estándar del block', s: 'Alto x ancho total', f: medidas },
			{ grupo: 'En una frase' },
			{ t: 'Lo que la hace distinta', f: texto('frase'), sinTitulo: true }
		];
	}

	/* ---------- tabla */
	var visor = null;
	function pintar() {
		var c = n(), vs = eleg.slice(0, c);
		tabla.setAttribute('data-cols', c);
		sels.forEach(function (s, i) { s.closest('.cmpz-elige').hidden = i >= c; if (i < eleg.length) s.value = eleg[i]; });
		celdasCont.innerHTML = vs.map(function (s) {
			var d = datos[s];
			return '<div class="cmpz-hueco"><img class="cmpz-hueco-foto" src="' + esc(d.foto) + '" alt="' + esc(d.nombre) + '" loading="lazy"></div>';
		}).join('');
		cab.innerHTML = vs.map(function (s) {
			var d = datos[s];
			return '<div class="cmpz-col" role="columnheader"><span class="v2-chip">' + esc(d.chip) + '</span><h2 class="cmpz-col-nombre"><a href="' + esc(d.ficha) + '">' + esc(d.nombre) + '</a></h2><p>' + esc(d.tipo) + '</p></div>';
		}).join('');
		var html = '';
		FILAS.forEach(function (fila) {
			if (fila.grupo) { html += '<div class="cmpz-grupo" role="row"><h2 role="rowheader">' + esc(fila.grupo) + '</h2></div>'; return; }
			var vals = vs.map(function (s) { return fila.f(datos[s]); });
			var iguales = vals.every(function (v) { return String(v.v) === String(vals[0].v); });
			/* «La más alta» solo si todas tienen el dato: con uno sin indicar no se puede saber */
			var todos = vals.every(function (v) { return v.v !== ''; }), max = null;
			if (fila.alta && !iguales && todos) vals.forEach(function (v) { if (max === null || v.v > max) max = v.v; });
			html += '<div class="cmpz-fila' + (iguales ? ' igual' : '') + '" role="row">' +
				(fila.sinTitulo ? '<span class="v2-sr" role="rowheader">' + esc(fila.t) + '</span>' : '<div class="cmpz-et" role="rowheader"><h3>' + esc(fila.t) + '</h3>' + (fila.s ? '<p>' + esc(fila.s) + '</p>' : '') + '</div>') +
				'<div class="cmpz-vals">' + vals.map(function (v) {
					var alta = max !== null && v.v === max;
					return '<div class="cmpz-val' + (alta ? ' alta' : '') + '" role="cell">' + v.h + (alta ? '<span class="cmpz-alta">La más alta</span>' : '') + '</div>';
				}).join('') + '</div></div>';
		});
		html += '<div class="cmpz-fila cmpz-acc" role="row"><span class="v2-sr" role="rowheader">Acciones</span><div class="cmpz-vals">' + vs.map(function (s) {
			var d = datos[s];
			return '<div class="cmpz-val" role="cell"><a class="v2-btn" href="' + esc(d.presupuesto) + '">Pedir presupuesto</a><a class="v2-enlace" href="' + esc(d.ficha) + '">Ver la ficha</a>' + (d.disena ? '<a class="v2-enlace" href="' + esc(d.disena) + '">Diseñarla en 3D</a>' : '') + '</div>';
		}).join('') + '</div></div>';
		cuerpo.innerHTML = html;
		tabla.classList.toggle('cmpz-solo-dif', !!(dif && dif.checked));
		Array.prototype.forEach.call(document.querySelectorAll('[data-comparar]'), function (b) {
			b.setAttribute('aria-pressed', vs.indexOf(b.getAttribute('data-comparar')) >= 0 ? 'true' : 'false');
		});
		try { history.replaceState(null, '', location.pathname + '?p=' + eleg.join(',')); } catch (err) { /* sin historial */ }
		if (visor) visor.columnas(vs); else iniciar3D(vs);
	}

	/* ---------- 3D: un lienzo, un viewport por columna */
	function iniciar3D(ids) {
		var THREE = window.THREE, P3 = window.CabmaPuerta3D, C3 = window.CabmaCilindro3D;
		if (!THREE || (tipo === 'puertas' ? !P3 : !C3)) { vis.setAttribute('data-ver', 'foto'); vis.classList.add('cmpz-sin3d'); return; }
		visor = { columnas: function (v) { pend = v; } };
		var pend = ids;
		var cargar = tipo === 'puertas' ? P3.precargar() : Promise.resolve();
		cargar.then(function () { visor = crearVisor(THREE, P3, C3); visor.columnas(pend); }).catch(function () { vis.setAttribute('data-ver', 'foto'); vis.classList.add('cmpz-sin3d'); });
	}
	function crearVisor(THREE, P3, C3) {
		var renderer = null, canvas = null, entorno = null, cols = [], cam = new THREE.PerspectiveCamera(tipo === 'puertas' ? 18 : 26, 1, 0.05, 300);
		var st = tipo === 'puertas'
			? { az: 0.62, el: 0.1, objAz: 0.62, objEl: 0.1, desp: 0, objDesp: 0, int: false }
			: { az: -0.72, el: 0.3, objAz: -0.72, objEl: 0.3, dentro: 0, objDentro: 0, ins: 1, objIns: 1, giro: 0, objGiro: 0 };
		var sucio = true, visible = true, arr = null;
		function montarCanvas() {
			if (renderer) return true;
			canvas = huecos.querySelector('.cmpz-canvas');
			try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); } catch (err) { vis.setAttribute('data-ver', 'foto'); vis.classList.add('cmpz-sin3d'); return false; }
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			if (tipo === 'cilindros') { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
			renderer.setClearColor(0xffffff, 0);
			renderer.autoClear = false;
			canvas.addEventListener('pointerdown', function (e) { arr = { x: e.clientX, y: e.clientY, az: st.az, el: st.el }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nada */ } });
			canvas.addEventListener('pointermove', function (e) {
				if (!arr) return;
				st.az = st.objAz = arr.az - (e.clientX - arr.x) * 0.008;
				st.el = st.objEl = Math.max(-0.35, Math.min(0.8, arr.el + (e.clientY - arr.y) * 0.005));
				sucio = true; marcarVista(null);
			});
			['pointerup', 'pointercancel'].forEach(function (t) { canvas.addEventListener(t, function () { arr = null; }); });
			return true;
		}
		function escenaPuerta(id) {
			var e = new THREE.Scene();
			e.environment = entorno || (entorno = P3.entorno(renderer, 'blanco'));
			var hemi = new THREE.HemisphereLight(0xffffff, 0xdedede, 1.0); e.add(hemi);
			var clave = new THREE.DirectionalLight(0xffffff, 1.42); e.add(clave);
			var relleno = new THREE.DirectionalLight(0xffffff, 0.42); e.add(relleno);
			var p = P3.crearPuerta({ modelo: id, patillas: false });
			e.add(p.grupo);
			return { id: id, escena: e, obj: p, clave: clave, relleno: relleno };
		}
		function escenaCilindro(id) {
			var e = C3.escena(renderer), c = C3.crear(id);
			e.add(c.grupo);
			return { id: id, escena: e, obj: c };
		}
		function liberar(c) {
			c.escena.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
		}
		var api = {
			columnas: function (ids) {
				if (!montarCanvas()) return;
				var nuevas = ids.map(function (id, i) {
					var viejo = cols.filter(function (c) { return c && c.id === id; })[0];
					return viejo || (tipo === 'puertas' ? escenaPuerta(id) : escenaCilindro(id));
				});
				cols.forEach(function (c) { if (nuevas.indexOf(c) < 0) liberar(c); });
				cols = nuevas; sucio = true;
				vis.classList.add('cmpz-listo3d');
			},
			st: st,
			pedir: function () { sucio = true; }
		};
		function aplicar(c) {
			if (tipo === 'puertas') {
				var p = c.obj, e = st.desp;
				if (p.verPorDentro) p.verPorDentro(st.int);
				var off = { panelExt: 0.42, chapaExt: 0.26, ceramica: 0.14, manganeso: 0.08, chapaInt: -0.2, panelInt: -0.36 };
				Object.keys(p.capas).forEach(function (k) { if (off[k] !== undefined) p.capas[k].position.z = p.capas[k].userData.z0 + e * off[k]; });
				p.herrajes.position.z = p.medidas.T / 2 + e * 0.42;
				p.marco.position.z = -e * 0.6;
				p.bulones.forEach(function (b) { b.position.x = b.userData.x0 + (b.userData.x1 - b.userData.x0) * Math.min(1, e * 2); });
			} else {
				c.obj.verPorDentro(st.dentro);
				c.obj.actualizar(st.ins, st.giro);
			}
		}
		function colocarCamara(c, aspecto) {
			if (tipo === 'puertas') {
				// encuadre: cabe el alto de la puerta y, en celdas estrechas, el ancho de la puerta despiezada
				// (las capas se separan en profundidad; se usa el peor giro para que no haga zoom al arrastrar)
				var cfg = c.obj.cfg, e = st.desp, tv = Math.tan(THREE.MathUtils.degToRad(9));
				var a = cfg.block[0] / 2, b = 0.51 * e + ((c.obj.medidas && c.obj.medidas.T) || 0.08) / 2 + 0.06;
				var d = Math.max((cfg.block[1] * 0.6) / tv, Math.sqrt(a * a + b * b) * 1.15 / (tv * aspecto));
				var az = st.az + (st.int ? Math.PI : 0), zc = -0.09 * e;
				cam.position.set(d * Math.sin(az) * Math.cos(st.el), 1.03 + d * Math.sin(st.el), zc + d * Math.cos(az) * Math.cos(st.el));
				cam.lookAt(0, 1.03, zc);
				c.clave.position.set(cam.position.x - 1.2 * Math.cos(az), cam.position.y + 2, cam.position.z + 1.2 * Math.sin(az));
				c.relleno.position.set(cam.position.x + 3 * Math.cos(az), 2, cam.position.z - 3 * Math.sin(az));
			} else {
				var falta = 1 - st.ins, dc = (16.5 + falta * 6) / Math.min(1, aspecto / 1.15), tx = -1.75 - falta * 1.7, ty = -0.8;
				cam.position.set(tx + dc * Math.sin(st.az) * Math.cos(st.el), ty + dc * Math.sin(st.el), dc * Math.cos(st.az) * Math.cos(st.el));
				cam.lookAt(tx, ty, 0);
			}
		}
		var ultW = 0, ultH = 0;
		function render() {
			if (!renderer || !cols.length) return;
			var rc = canvas.getBoundingClientRect();
			if (!rc.width || !rc.height) return;
			if (rc.width !== ultW || rc.height !== ultH) { ultW = rc.width; ultH = rc.height; renderer.setSize(rc.width, rc.height, false); }
			renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
			var celdas = huecos.querySelectorAll('.cmpz-hueco');
			cols.forEach(function (c, i) {
				var cel = celdas[i]; if (!cel) return;
				var r = cel.getBoundingClientRect();
				var x = r.left - rc.left, y = rc.bottom - r.bottom, w = r.width, h = r.height;
				renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
				cam.aspect = w / h; cam.updateProjectionMatrix();
				aplicar(c); colocarCamara(c, cam.aspect);
				renderer.render(c.escena, cam);
			});
		}
		var t0 = performance.now();
		function suave(k, vel, dt) { var o = 'obj' + k.charAt(0).toUpperCase() + k.slice(1), d = st[o] - st[k]; if (Math.abs(d) < 0.0005) { if (st[k] !== st[o]) { st[k] = st[o]; return true; } return false; } st[k] += d * Math.min(1, dt * vel); return true; }
		(function bucle() {
			var t = performance.now(), dt = Math.min(50, t - t0); t0 = t;
			var anim = false;
			if (!arr) { anim = suave('az', 0.008, dt) || anim; anim = suave('el', 0.008, dt) || anim; }
			if (tipo === 'puertas') anim = suave('desp', 0.006, dt) || anim;
			else {
				anim = suave('dentro', 0.012, dt) || anim; anim = suave('ins', 0.008, dt) || anim;
				var dg = st.objGiro - st.giro; if (Math.abs(dg) > 0.0005) { st.giro += (dg > 0 ? 1 : -1) * Math.min(Math.abs(dg), dt * 0.0055); anim = true; }
			}
			if (visible && vis.getAttribute('data-ver') === '3d' && (sucio || anim || arr)) { render(); sucio = false; }
			requestAnimationFrame(bucle);
		})();
		if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) sucio = true; }, { rootMargin: '100px 0px' }).observe(vis);
		window.addEventListener('resize', function () { sucio = true; });
		api.render = render;
		return api;
	}

	/* ---------- controles del 3D */
	function marcarVista(v) {
		Array.prototype.forEach.call(raiz.querySelectorAll('[data-vista]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vista') === v ? 'true' : 'false'); });
	}
	var VISTAS = { frente: [0, 0.03], tres: [0.62, 0.1], canto: [1.45, 0.04], int: [0.3, 0.06] };
	Array.prototype.forEach.call(raiz.querySelectorAll('button[data-modo]'), function (b) {
		b.addEventListener('click', function () {
			vis.setAttribute('data-ver', b.getAttribute('data-modo'));
			Array.prototype.forEach.call(raiz.querySelectorAll('button[data-modo]'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
			if (visor && visor.pedir) visor.pedir();
		});
	});
	Array.prototype.forEach.call(raiz.querySelectorAll('[data-vista]'), function (b) {
		b.addEventListener('click', function () {
			if (!visor || !visor.st) return;
			var v = b.getAttribute('data-vista'), s = visor.st;
			s.int = v === 'int'; s.objAz = VISTAS[v][0]; s.objEl = VISTAS[v][1];
			marcarVista(v); visor.pedir();
		});
	});
	var desm = raiz.querySelector('[data-desmontar]'), rango = raiz.querySelector('.cmpz-desm input');
	if (desm) desm.addEventListener('click', function () {
		if (!visor || !visor.st) return;
		var s = visor.st, abrir = s.objDesp < 0.5;
		s.objDesp = abrir ? 1 : 0;
		if (abrir && !s.int && Math.abs(s.objAz) < 0.2) { s.objAz = 0.62; s.objEl = 0.12; marcarVista('tres'); }
		desm.setAttribute('aria-pressed', abrir ? 'true' : 'false'); desm.textContent = abrir ? 'Montar' : 'Desmontar';
		if (rango) rango.value = abrir ? 100 : 0;
	});
	if (rango) rango.addEventListener('input', function () {
		if (!visor || !visor.st) return;
		visor.st.objDesp = visor.st.desp = rango.value / 100; visor.pedir();
		if (desm) { var ab = rango.value > 50; desm.setAttribute('aria-pressed', ab ? 'true' : 'false'); desm.textContent = ab ? 'Montar' : 'Desmontar'; }
	});
	function modoCil(dentro) {
		if (!visor || !visor.st) return;
		visor.st.objDentro = dentro ? 1 : 0;
		Array.prototype.forEach.call(raiz.querySelectorAll('[data-cil-modo]'), function (o) { o.setAttribute('aria-pressed', (o.getAttribute('data-cil-modo') === 'dentro') === !!dentro ? 'true' : 'false'); });
	}
	var primera = true;
	Array.prototype.forEach.call(raiz.querySelectorAll('[data-cil-modo]'), function (b) { b.addEventListener('click', function () { primera = false; modoCil(b.getAttribute('data-cil-modo') === 'dentro'); }); });
	var aviso = raiz.querySelector('.cmpz-aviso'), avisoT = null;
	function avisar(t) { if (!aviso) return; aviso.textContent = t; aviso.classList.add('visible'); clearTimeout(avisoT); avisoT = setTimeout(function () { aviso.classList.remove('visible'); }, 2600); }
	Array.prototype.forEach.call(raiz.querySelectorAll('[data-cil-accion]'), function (b) {
		b.addEventListener('click', function () {
			if (!visor || !visor.st) return;
			var s = visor.st;
			if (primera && s.objDentro === 0) { modoCil(true); avisar('Por dentro: mira cómo se mueven los pernos.'); }
			primera = false;
			if (b.getAttribute('data-cil-accion') === 'llave') {
				if (s.objIns > 0.5) {
					var m = ((s.objGiro % DOS_PI) + DOS_PI) % DOS_PI;
					if (m > 0.03 && m < DOS_PI - 0.03) { avisar('Espera a que la llave vuelva recta.'); return; }
					s.objIns = 0;
				} else s.objIns = 1;
				b.textContent = s.objIns > 0.5 ? 'Sacar las llaves' : 'Meter las llaves';
			} else {
				if (s.objIns < 1 || s.ins < 0.999) { avisar('Mete las llaves hasta el fondo: solo así los pernos dejan girar el rotor.'); return; }
				s.objGiro = Math.round(s.giro / DOS_PI) * DOS_PI + DOS_PI;
			}
		});
	});

	/* ---------- seleccion */
	sels.forEach(function (s, i) {
		s.innerHTML = orden.map(function (k) { return '<option value="' + k + '">' + esc(datos[k].nombre) + '</option>'; }).join('');
		s.addEventListener('change', function () {
			var nueva = s.value, j = eleg.indexOf(nueva);
			if (j >= 0 && j !== i) eleg[j] = eleg[i];   // si ya estaba en otra columna, se intercambian
			eleg[i] = nueva;
			pintar();
		});
	});
	if (dif) dif.addEventListener('change', function () { tabla.classList.toggle('cmpz-solo-dif', dif.checked); });
	function irA() { var y = tabla.getBoundingClientRect().top + window.pageYOffset - 90; window.scrollTo({ top: y, behavior: reducido ? 'auto' : 'smooth' }); }
	Array.prototype.forEach.call(raiz.querySelectorAll('[data-atajo]'), function (b) {
		b.addEventListener('click', function () { eleg = b.getAttribute('data-atajo').split(','); pintar(); });
	});
	Array.prototype.forEach.call(document.querySelectorAll('[data-comparar]'), function (b) {
		b.addEventListener('click', function () {
			var s = b.getAttribute('data-comparar'), c = n();
			if (eleg.slice(0, c).indexOf(s) < 0) {
				var j = eleg.indexOf(s);
				if (j >= 0) eleg.splice(j, 1);
				eleg.splice(c - 1, 0, s);
				eleg = eleg.slice(0, 3);
			}
			pintar(); irA();
		});
	});
	if (movil.addEventListener) movil.addEventListener('change', pintar);
	pintar();
	raiz.classList.add('cmpz-listo');
	window.__cmpz = { visor: function () { return visor; }, eleg: function () { return eleg; } };
})();
