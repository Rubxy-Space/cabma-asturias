/* CABMA Asturias: visor 3D de la cabecera (boton "En 3D" junto a las fotos reales).
   Misma luz de estudio que el comparador. Gira solo despacio y se puede mover arrastrando.
   En Inicio arranca ya en 3D (data-inicio="3d") y los botones [data-modelo-visor] cambian de puerta. */
(function () {
	'use strict';
	var fig = document.querySelector('.v2-foto[data-modelo]');
	if (!fig) return;
	var lienzo = fig.querySelector('.v2-foto-3d');
	var THREE = window.THREE, P3 = window.CabmaPuerta3D;
	var botonesModelo = document.querySelectorAll('[data-modelo-visor]');
	if (!lienzo || !THREE || !P3) {
		var b = fig.querySelector('[data-cara="3d"]'); if (b) b.hidden = true;
		if (lienzo && fig.getAttribute('data-inicio') === '3d') { lienzo.hidden = true; fig.querySelector('.v2-foto-ext').hidden = false; }
		return;
	}
	var iniciado = false, activo = fig.getAttribute('data-inicio') === '3d' && !lienzo.hidden;
	var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var escena, camara, renderer, puerta = null, clave, relleno, st = { az: 0.35, el: 0.05, auto: true }, t0 = performance.now();
	document.addEventListener('cabma:cara', function (e) {
		activo = e.detail === '3d';
		if (activo && !iniciado) iniciar();
	});

	/* cambio de modelo (Inicio): fotos, 3D y enlace a la ficha */
	var fotos = fig.getAttribute('data-fotos');
	var nombreFicha = document.querySelector('[data-ficha-visor]');
	Array.prototype.forEach.call(botonesModelo, function (b) {
		b.addEventListener('click', function () {
			var m = b.getAttribute('data-modelo-visor');
			Array.prototype.forEach.call(botonesModelo, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
			fig.setAttribute('data-modelo', m);
			if (fotos) {
				fig.querySelector('.v2-foto-ext').src = fotos + m + '-ext.jpg';
				fig.querySelector('.v2-foto-int').src = fotos + m + '-int.jpg';
			}
			if (nombreFicha) {
				nombreFicha.href = b.getAttribute('data-ficha');
				nombreFicha.textContent = 'Ver la ficha de la ' + b.textContent;
			}
			ponerPuerta(m);
		});
	});

	function ponerPuerta(m) {
		if (!escena) return;
		if (puerta) escena.remove(puerta.grupo);
		puerta = P3.crearPuerta({ modelo: m, patillas: false });
		escena.add(puerta.grupo);
		st.auto = true; t0 = performance.now(); st.el = 0.05;
	}

	function iniciar() {
		iniciado = true;
		renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.setClearColor(0xffffff, 0);
		renderer.shadowMap.enabled = true;
		escena = new THREE.Scene();
		camara = new THREE.PerspectiveCamera(18, 1, 0.1, 60);
		P3.precargar().then(function () {
			escena.environment = P3.entorno(renderer, 'estudio');
			escena.add(new THREE.HemisphereLight(0xffffff, 0xdedede, 1.0));
			clave = new THREE.DirectionalLight(0xffffff, 1.42); clave.castShadow = true; clave.shadow.mapSize.set(2048, 2048);
			var sc = clave.shadow.camera; sc.left = -2; sc.right = 2; sc.top = 3; sc.bottom = -1; sc.near = 1; sc.far = 15; clave.shadow.normalBias = 0.02;
			relleno = new THREE.DirectionalLight(0xffffff, 0.42);
			escena.add(clave, relleno);
			ponerPuerta(fig.getAttribute('data-modelo'));
			medir(); bucle();
		});
	}
	var ultW = 0, ultH = 0;
	function medir() {
		var w = lienzo.clientWidth || 400, h = lienzo.clientHeight || 560;
		ultW = w; ultH = h;
		renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
	}
	window.addEventListener('resize', function () { if (renderer) medir(); });
	var objetivo = new THREE.Vector3(0, 1.03, 0), enPantalla = true;
	if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { enPantalla = e[0].isIntersecting; }).observe(fig);   // sin gastar GPU fuera de la vista
	function bucle() {
		requestAnimationFrame(bucle);
		if (!activo || !puerta || !enPantalla) return;
		if (lienzo.clientWidth && (lienzo.clientWidth !== ultW || lienzo.clientHeight !== ultH)) medir();   // responsive
		if (st.auto && !reducido) st.az = 0.35 * Math.sin((performance.now() - t0) / 2600);
		var d = (puerta.cfg.block[1] * 0.56) / Math.tan(THREE.MathUtils.degToRad(9)) / Math.min(1, camara.aspect / 0.44);
		camara.position.set(d * Math.sin(st.az) * Math.cos(st.el), 1.03 + d * Math.sin(st.el), d * Math.cos(st.az) * Math.cos(st.el));
		camara.lookAt(objetivo);
		clave.position.set(camara.position.x - 1.2 * Math.cos(st.az), camara.position.y + 2, camara.position.z + 1.2 * Math.sin(st.az));
		relleno.position.set(camara.position.x + 3 * Math.cos(st.az), 2, camara.position.z - 3 * Math.sin(st.az));
		renderer.render(escena, camara);
	}
	var arr = null;
	lienzo.addEventListener('pointerdown', function (e) { st.auto = false; arr = { x: e.clientX, y: e.clientY, az: st.az, el: st.el }; lienzo.setPointerCapture(e.pointerId); });
	lienzo.addEventListener('pointermove', function (e) {
		if (!arr) return;
		st.az = arr.az - (e.clientX - arr.x) * 0.008;
		st.el = Math.max(-0.3, Math.min(0.6, arr.el + (e.clientY - arr.y) * 0.005));
	});
	lienzo.addEventListener('pointerup', function () { arr = null; });
	lienzo.addEventListener('pointercancel', function () { arr = null; });
	/* en Inicio espera a que termine la intro de la puerta para no quitarle fluidez */
	var raizDoc = document.documentElement;
	if (activo) {
		if (raizDoc.classList.contains('con-intro')) {
			new MutationObserver(function (cambios, obs) {
				if (!raizDoc.classList.contains('con-intro')) { obs.disconnect(); if (!iniciado) iniciar(); }
			}).observe(raizDoc, { attributes: true, attributeFilter: ['class'] });
		} else iniciar();
	}
	if (location.search.indexOf('depurar') > -1) window.__visor = { st: st, puerta: function () { return puerta; }, ponerPuerta: ponerPuerta };
})();
