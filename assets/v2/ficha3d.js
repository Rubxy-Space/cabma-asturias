/* CABMA Asturias: despiece 3D de la puerta en la ficha de producto, guiado por el scroll.
   Requiere three.min.js, gsap.min.js, ScrollTrigger.min.js, tex.js y puerta3d.js.
   Las explicaciones son los <li class="l3d" data-k="..."> de la seccion .v2-3d (tambien sirven
   como lista accesible y como version fija si el visitante prefiere menos movimiento). */
(function () {
	'use strict';
	var sec = document.querySelector('.v2-3d');
	if (!sec) return;
	var THREE = window.THREE, gsap = window.gsap, ST = window.ScrollTrigger, P3 = window.CabmaPuerta3D;
	var reducido = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || location.search.indexOf('estatico') > -1;
	var canvas = sec.querySelector('.v2-3d-canvas');
	var pin = sec.querySelector('.v2-3d-pin');
	var titulo = sec.querySelector('.v2-3d-titulo');
	var barra = sec.querySelector('.v2-3d-barra');
	var gigante = sec.querySelector('.v2-3d-gigante');
	var et = {};
	Array.prototype.forEach.call(sec.querySelectorAll('.l3d'), function (li) {
		et[li.getAttribute('data-k')] = { li: li, punto: li.querySelector('.l3d-punto'), caja: li.querySelector('.l3d-caja'), v: 0 };
	});
	function estatico() { sec.classList.add('estatico'); }

	if (!THREE || !P3) { estatico(); if (canvas) canvas.style.display = 'none'; return; }
	var renderer;
	try {
		renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
	} catch (err) { estatico(); canvas.style.display = 'none'; return; }
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.setClearColor(0x000000, 0);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	var depurar = location.search.indexOf('depurar') > -1;
	var animable = !reducido && gsap && ST;
	if (!animable) estatico();

	P3.precargar().then(montar);

	function montar() {
		var escena = new THREE.Scene();
		escena.environment = P3.entorno(renderer, 'estudio');

		var clave = new THREE.DirectionalLight(0xffffff, 2.3);
		clave.position.set(2.6, 3.4, 4.2);
		clave.castShadow = true; clave.shadow.mapSize.set(2048, 2048);
		var sc = clave.shadow.camera; sc.left = -2.2; sc.right = 2.2; sc.top = 2.4; sc.bottom = -2.4; sc.near = 0.5; sc.far = 14;
		clave.shadow.bias = -0.0003; clave.shadow.normalBias = 0.02;
		escena.add(clave);
		var contra = new THREE.DirectionalLight(0xffe2d6, 1.5); contra.position.set(-3.2, 2.2, -3.4); escena.add(contra);
		escena.add(new THREE.HemisphereLight(0xdde5ee, 0x0e1012, 0.55));
		escena.add(new THREE.HemisphereLight(0xffffff, 0xe9e5df, 0.5));   // relleno claro para el fondo blanco

		var puerta = P3.crearPuerta({ modelo: sec.getAttribute('data-modelo') || 'premium-5c', patillas: false });
		var md = puerta.medidas, W = md.W, H = md.H, T = md.T;
		puerta.grupo.position.y = -md.HT / 2;
		escena.add(puerta.grupo);

		var sombra = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
		sombra.rotation.x = -Math.PI / 2; sombra.position.y = -md.HT / 2 - 0.002; sombra.receiveShadow = true;
		escena.add(sombra);

		var camara = new THREE.PerspectiveCamera(28, 1, 0.05, 60);
		var st = { az: 0, el: 0.04, dist: 7.0, tx: 0, ty: 0, tz: 0, bul: 0, marco: 0,
			panelExt: 0, chapaExt: 0, ceramica: 0, manganeso: 0, cerradura: 0, chapaInt: 0, panelInt: 0, bombillo: 0 };
		var DESP = {};
		[['panelExt', 0.62], ['chapaExt', 0.4], ['ceramica', 0.24], ['manganeso', 0.14], ['cerradura', 0.06], ['chapaInt', -0.24], ['panelInt', -0.46]].forEach(function (d) { if (puerta.capas[d[0]]) DESP[d[0]] = d[1]; });
		var raton = { x: 0, y: 0, sx: 0, sy: 0 };
		var factor = 1, bajar = 0;

		var ultW = 0, ultH = 0;
		function medir() {
			var w = pin.clientWidth || window.innerWidth, h = pin.clientHeight || window.innerHeight;
			ultW = w; ultH = h;
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			renderer.setSize(w, h, false);
			camara.aspect = w / h;
			factor = camara.aspect < 0.8 ? 1.32 : (camara.aspect < 1.2 ? 1.12 : 1);
			bajar = camara.aspect < 0.8 ? 0.3 : (camara.aspect < 1.2 ? 0.12 : 0);   // en pantallas estrechas la puerta baja para dejar sitio al titulo
			camara.updateProjectionMatrix();
		}
		medir();
		window.addEventListener('resize', function () { medir(); if (!animable) pintar(); });
		if (animable && window.matchMedia('(pointer: fine)').matches) {
			window.addEventListener('pointermove', function (e) {
				raton.x = e.clientX / window.innerWidth - 0.5;
				raton.y = e.clientY / window.innerHeight - 0.5;
			}, { passive: true });
		}

		/* anclas de cada explicacion, en coordenadas del mundo */
		var v = new THREE.Vector3();
		var capas = puerta.capas;
		var anclas = {
			puerta: function () { return capas.panelExt.localToWorld(v.set(W * 0.22, H * 0.28, 0.006)); },
			bulones: function () { puerta.bulones[1].getWorldPosition(v); v.x += 0.03; return v; },
			marco: function () { return puerta.marco.localToWorld(v.set(md.WT / 2 - md.FW / 2, md.HT * 0.82, 0.004)); },
			panelExt: function () { return capas.panelExt.localToWorld(v.set(W * 0.42, H * 0.36, 0.005)); },
			chapaExt: function () { return capas.chapaExt.localToWorld(v.set(W * 0.49, H * 0.22, 0.03)); },
			ceramica: function () { return (capas.ceramica || capas.chapaExt).localToWorld(v.set(W * 0.36, H * 0.08, 0.004)); },
			cerradura: function () { return capas.cerradura.localToWorld(v.set(md.XC - 0.05, puerta.Y(1.0), 0.014)); },
			estructura: function () { return capas.estructura.localToWorld(v.set(0.28, -H * 0.06, 0.012)); },
			manganeso: function () { return (capas.manganeso || capas.cerradura).localToWorld(v.set(md.XC - 0.065, puerta.Y(1.05), 0.003)); },
			escudo: function () { puerta.escudos[0].getWorldPosition(v); v.z += 0.02; return v; },
			bombillo: function () { puerta.cilindros[0].getWorldPosition(v); v.z += 0.05; return v; },
			bisagras: function () { return puerta.bisagras[Math.min(2, puerta.bisagras.length - 1)].getWorldPosition(v); },
			manilla: function () { puerta.manilla.getWorldPosition(v); v.z += 0.06; return v; },
			teclado: function () { puerta.teclado.getWorldPosition(v); v.z += 0.012; return v; },
			rejillas: function () { return puerta.rejilla.getWorldPosition(v); },
			antipalancas: function () { return puerta.antipalancas[1].getWorldPosition(v); },
			final: function () { return capas.panelExt.localToWorld(v.set(W * 0.2, H * 0.18, 0.006)); }
		};

		var objetivo = new THREE.Vector3();
		var LADO = puerta.cfg.lado === 'izq' ? -1 : 1;
		function aplicar() {
			Object.keys(DESP).forEach(function (k) {
				capas[k].position.z = capas[k].userData.z0 + st[k] * DESP[k];
			});
			puerta.herrajes.position.z = T / 2 + st.panelExt * DESP.panelExt;
			puerta.cilindros.forEach(function (c) { c.position.z = c.userData.z0 + st.panelExt * DESP.panelExt * 0.55 + st.bombillo * 0.5; });
			puerta.bulones.forEach(function (b) { b.position.x = b.userData.x0 + (b.userData.x1 - b.userData.x0) * st.bul; });
			puerta.marco.position.z = -st.marco * 0.8;
			raton.sx += (raton.x - raton.sx) * 0.06;
			raton.sy += (raton.y - raton.sy) * 0.06;
			/* LADO = -1 en las puertas reflejadas (bisagras a la derecha): el recorrido de camara se refleja para ver siempre el canto correcto */
			var az = LADO * st.az + raton.sx * 0.14, el = st.el - raton.sy * 0.06, d = st.dist * factor, tx = LADO * st.tx;
			var ty = st.ty + bajar * Math.min(1, Math.max(0, (st.dist - 4) / 2.4));   // sin saltos: se reduce al acercar la camara
			objetivo.set(tx, ty, st.tz);
			camara.position.set(tx + d * Math.sin(az) * Math.cos(el), ty + d * Math.sin(el), st.tz + d * Math.cos(az) * Math.cos(el));
			camara.lookAt(objetivo);
		}
		var proy = new THREE.Vector3();
		function etiquetas() {
			var w = pin.clientWidth, h = pin.clientHeight, movil = window.matchMedia('(max-width: 760px)').matches;   // mismo corte que la hoja de estilos
			Object.keys(et).forEach(function (k) {
				var e = et[k];
				if (!animable) return;
				var o = e.v;
				e.punto.style.opacity = o;
				e.caja.style.opacity = o;
				e.li.style.visibility = o > 0.01 ? 'visible' : 'hidden';
				if (o <= 0.01 || !anclas[k]) return;
				proy.copy(anclas[k]()).project(camara);
				var x = (proy.x * 0.5 + 0.5) * w, y = (-proy.y * 0.5 + 0.5) * h;
				e.punto.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
				if (movil) return;
				var izq = x > w * 0.56;
				e.li.classList.toggle('izq', izq);
				var cx = izq ? x - 34 - 320 : x + 34;
				var cy = Math.max(96, Math.min(h - 190, y - 22));
				e.caja.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) translateY(' + ((1 - o) * 10).toFixed(1) + 'px)';
			});
		}
		/* responsive: si el contenedor cambia de tamano (girar el movil, mover el panel, zoom) se vuelve a medir */
		function pintar() {
			if (pin.clientWidth !== ultW || pin.clientHeight !== ultH) medir();
			aplicar(); renderer.render(escena, camara); etiquetas();
		}
		if ('ResizeObserver' in window) {
			var esperaST = null;
			new ResizeObserver(function () {
				medir(); if (!animable) pintar();
				if (ST) { clearTimeout(esperaST); esperaST = setTimeout(function () { ST.refresh(); }, 200); }
			}).observe(document.documentElement);
		}

		if (!animable) {
			/* version fija: despiece completo en vista tres cuartos */
			Object.keys(DESP).forEach(function (k) { st[k] = 1; });
			st.marco = 1; st.bul = 1; st.az = 0.92; st.el = 0.2; st.dist = 7.4;
			pintar();
			return;
		}

		/* linea de tiempo guiada por el scroll (13 unidades) */
		var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
		function mostrar(k, t0, t1) {
			if (!et[k]) return;   // cada puerta trae solo las explicaciones de las piezas que tiene
			tl.to(et[k], { v: 1, duration: 0.3, ease: 'power1.out' }, t0);
			if (t1) tl.to(et[k], { v: 0, duration: 0.3, ease: 'power1.in' }, t1 - 0.3);
		}
		/* 1. puerta completa */
		tl.to(titulo, { autoAlpha: 0, y: -24, duration: 0.45, ease: 'power1.in' }, 0.25)
			.to(st, { az: -0.34, el: 0.08, duration: 1.2 }, 0)
			.to(gigante, { xPercent: -38, duration: 13, ease: 'none' }, 0);
		mostrar('puerta', 0.5, 1.9);
		/* 2. el marco se separa */
		tl.to(st, { az: 0.8, el: 0.18, dist: 6.6, duration: 1.0 }, 1.7)
			.to(st, { marco: 1, duration: 0.9 }, 1.9);
		mostrar('marco', 2.1, 3.1);
		/* 3. canto: salen los bulones */
		tl.to(st, { az: 1.25, el: 0.1, dist: 5.3, tx: 0.3, ty: 0, duration: 0.9 }, 2.9)
			.to(st, { bul: 1, duration: 0.6, ease: 'power3.inOut' }, 3.35);
		mostrar('bulones', 3.55, 4.7);
		/* 4. despiece por capas */
		tl.to(st, { az: 0.85, el: 0.2, dist: 7.4, tx: 0.04, ty: 0, duration: 1.2 }, 4.5)
			.to(st, { panelExt: 1, duration: 0.7 }, 4.7)
			.to(st, { chapaExt: 1, duration: 0.7 }, 4.95)
			.to(st, { ceramica: DESP.ceramica ? 1 : 0, duration: 0.7 }, 5.2)
			.to(st, { manganeso: DESP.manganeso ? 1 : 0, cerradura: DESP.cerradura ? 1 : 0, duration: 0.7 }, 5.4)
			.to(st, { chapaInt: 1, duration: 0.7 }, 5.55)
			.to(st, { panelInt: 1, duration: 0.7 }, 5.7)
			.to(st, { az: 1.0, duration: 2.4, ease: 'sine.inOut' }, 5.7);
		/* las explicaciones del despiece se reparten entre 5.0 y 8.55 segun las que haya */
		var capasDesp = ['panelExt', 'chapaExt', 'ceramica', 'cerradura', 'estructura', 'manganeso'].filter(function (k) { return et[k]; });
		capasDesp.forEach(function (k, i) {
			var paso = 3.55 / capasDesp.length;
			mostrar(k, 5.0 + i * paso, 5.0 + (i + 1) * paso);
		});
		/* 5. escudo y bombillo */
		tl.to(st, { az: 0.62, el: 0.12, dist: 3.9, tx: 0.24, ty: -0.06, tz: 0.55, duration: 0.9 }, 8.4)
			.to(st, { bombillo: 1, duration: 0.6 }, 8.8);
		/* herrajes exteriores: escudo, teclado, manilla, rejillas y bombillo, segun los tenga la puerta */
		var herr = ['escudo', 'teclado', 'manilla', 'rejillas', 'bombillo'].filter(function (k) { return et[k]; });
		herr.forEach(function (k, i) { var paso = 1.45 / herr.length; mostrar(k, 9.0 + i * paso, 9.0 + (i + 1) * paso); });
		/* 6. hoja montada vista por el lado de las bisagras */
		tl.to(st, { panelExt: 0, chapaExt: 0, ceramica: 0, manganeso: 0, cerradura: 0, chapaInt: 0, panelInt: 0, bombillo: 0, duration: 0.9 }, 10.3)
			.to(st, { az: -1.2, el: 0.1, dist: 4.8, tx: -0.3, ty: 0.08, tz: 0, duration: 1.0 }, 10.3);
		mostrar('bisagras', 10.9, 11.65);
		mostrar('antipalancas', 11.65, 12.35);
		/* 7. vuelve el marco y queda cerrada */
		tl.to(st, { marco: 0, duration: 0.8 }, 12.2)
			.to(st, { az: 0.3, el: 0.05, dist: 6.8, tx: 0, ty: 0, tz: 0, duration: 0.8 }, 12.2);
		mostrar('final', 12.5);
		tl.to({}, { duration: 0.2 }, 12.8);

		ST.create({
			trigger: sec,
			start: 'top top',
			end: function () { return '+=' + Math.round(window.innerHeight * 9.5); },
			pin: pin,
			scrub: depurar ? true : 1,
			animation: tl,
			invalidateOnRefresh: true,
			onUpdate: function (self) { barra.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
		});

		/* solo se pinta mientras la seccion esta a la vista */
		var visible = false;
		new IntersectionObserver(function (ents) { visible = ents[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(sec);
		(function bucle() {
			if (visible) pintar();
			requestAnimationFrame(bucle);
		})();
		pintar();
		if (depurar) window.__ficha = { tl: tl, st: st, pintar: pintar, puerta: puerta, camara: camara };
	}
})();
