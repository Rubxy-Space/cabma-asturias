/* CABMA Asturias: comparador de los modelos 3D con las fotos reales de CABMA.
   Fondo blanco de estudio como en las fotos de producto. Se gira arrastrando. */
(function () {
	'use strict';
	var THREE = window.THREE, P3 = window.CabmaPuerta3D;
	var lienzo = document.querySelector('.cmp-canvas');
	var foto = document.querySelector('.cmp-foto img');
	if (!THREE || !P3 || !lienzo) return;

	/* fotos reales de cada modelo en assets/v2/fotos: <modelo>-ext.jpg y <modelo>-int.jpg */
	function FOTO(modelo, cara) { return modelo + '-' + cara; }
	var renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setClearColor(0xffffff, 1);

	var escena = new THREE.Scene();
	var camara = new THREE.PerspectiveCamera(18, 1, 0.1, 60);
	var pedido = (location.search.match(/modelo=([a-z0-9-]+)/) || [])[1];
	var estado = { modelo: (pedido && P3.MODELOS[pedido]) ? pedido : 'thor-20-plus', az: 0, el: 0.03, desp: 0, cara: 'ext' };
	var puerta = null;

	P3.precargar().then(function () {
		escena.environment = P3.entorno(renderer, 'blanco');
		var hemi = new THREE.HemisphereLight(0xffffff, 0xdedede, 1.0); escena.add(hemi);
		var clave = new THREE.DirectionalLight(0xffffff, 1.42);
		clave.position.set(-1.2, 3, 7); clave.castShadow = true;
		clave.shadow.mapSize.set(2048, 2048);
		var sc = clave.shadow.camera; sc.left = -2; sc.right = 2; sc.top = 3; sc.bottom = -1; sc.near = 1; sc.far = 15;
		clave.shadow.bias = -0.0003; clave.shadow.normalBias = 0.02;
		escena.add(clave);
		var relleno = new THREE.DirectionalLight(0xffffff, 0.42); relleno.position.set(3, 2, 4); escena.add(relleno);
		window.__luces = { hemi: hemi, clave: clave, relleno: relleno };
		cambiar(estado.modelo);
		medir();
		bucle();
	});

	function cambiar(modelo) {
		if (puerta) escena.remove(puerta.grupo);
		estado.modelo = modelo;
		puerta = P3.crearPuerta({ modelo: modelo, patillas: false });
		if (puerta.verPorDentro) puerta.verPorDentro(estado.cara === 'int');
		escena.add(puerta.grupo);
		ponerFoto();
		document.querySelectorAll('[data-modelo]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-modelo') === modelo ? 'true' : 'false'); });
	}
	function ponerFoto() {
		var f = FOTO(estado.modelo, estado.cara);
		foto.src = foto.getAttribute('data-raiz') + f + '.jpg';
		foto.alt = 'Foto real de la ' + P3.MODELOS[estado.modelo].nombre + (estado.cara === 'ext' ? ' por fuera' : ' por dentro');
	}
	var ultW = 0, ultH = 0;
	function medir() {
		var w = lienzo.clientWidth || 300, h = lienzo.clientHeight || 400;
		ultW = w; ultH = h;
		renderer.setSize(w, h, false);
		camara.aspect = w / h; camara.updateProjectionMatrix();
	}
	window.addEventListener('resize', medir);

	var v = new THREE.Vector3(0, 1.03, 0);
	function bucle() { paso(); requestAnimationFrame(bucle); }
	function paso() {
		if (lienzo.clientWidth !== ultW || lienzo.clientHeight !== ultH) medir();   // responsive
		if (puerta) {
			var cfg = puerta.cfg, d = (cfg.block[1] * 0.56) / Math.tan(THREE.MathUtils.degToRad(9)) / Math.min(1, camara.aspect / 0.44);
			var az = estado.az + (estado.cara === 'int' ? Math.PI : 0);
			camara.position.set(d * Math.sin(az) * Math.cos(estado.el), 1.03 + d * Math.sin(estado.el), d * Math.cos(az) * Math.cos(estado.el));
			camara.lookAt(v);
			/* la luz principal sigue a la camara, como en un estudio de fotografia */
			var L = window.__luces; if (L) { L.clave.position.set(camara.position.x - 1.2 * Math.cos(az), camara.position.y + 2, camara.position.z + 1.2 * Math.sin(az)); L.relleno.position.set(camara.position.x + 3 * Math.cos(az), 2, camara.position.z - 3 * Math.sin(az)); }
			var e = estado.desp;
			var off = { panelExt: 0.42, chapaExt: 0.26, ceramica: 0.14, manganeso: 0.08, chapaInt: -0.2, panelInt: -0.36 };
			Object.keys(puerta.capas).forEach(function (k) { if (off[k] !== undefined) puerta.capas[k].position.z = puerta.capas[k].userData.z0 + e * off[k]; });
			puerta.herrajes.position.z = puerta.medidas.T / 2 + e * 0.42;
			puerta.marco.position.z = -e * 0.6;
			puerta.bulones.forEach(function (b) { b.position.x = b.userData.x0 + (b.userData.x1 - b.userData.x0) * Math.min(1, e * 2); });
			renderer.render(escena, camara);
		}
	}

	/* giro arrastrando */
	var arrastre = null;
	lienzo.addEventListener('pointerdown', function (ev) { arrastre = { x: ev.clientX, y: ev.clientY, az: estado.az, el: estado.el }; lienzo.setPointerCapture(ev.pointerId); });
	lienzo.addEventListener('pointermove', function (ev) {
		if (!arrastre) return;
		estado.az = arrastre.az - (ev.clientX - arrastre.x) * 0.008;
		estado.el = Math.max(-0.4, Math.min(0.8, arrastre.el + (ev.clientY - arrastre.y) * 0.006));
	});
	lienzo.addEventListener('pointerup', function () { arrastre = null; });
	lienzo.addEventListener('pointercancel', function () { arrastre = null; });

	document.querySelectorAll('[data-modelo]').forEach(function (b) { b.addEventListener('click', function () { cambiar(b.getAttribute('data-modelo')); }); });
	document.querySelectorAll('[data-vista]').forEach(function (b) {
		b.addEventListener('click', function () {
			var vista = b.getAttribute('data-vista');
			estado.cara = vista === 'int' ? 'int' : 'ext';
			if (puerta && puerta.verPorDentro) puerta.verPorDentro(vista === 'int');
			estado.az = vista === 'tres' ? 0.7 : (vista === 'canto' ? 1.45 : 0);
			estado.el = vista === 'tres' ? 0.12 : 0.03;
			ponerFoto();
		});
	});
	var desp = document.querySelector('.cmp-despiece');
	if (desp) desp.addEventListener('input', function () { estado.desp = desp.value / 100; });
	window.__cmp = { estado: estado, cambiar: cambiar, camara: camara, renderer: renderer, paso: paso, ponerFoto: ponerFoto, puerta: function () { return puerta; } };
})();
