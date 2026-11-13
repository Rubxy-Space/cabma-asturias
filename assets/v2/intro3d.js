/* CABMA Asturias: intro de Inicio con una Thor 20 Plus real montada en la pared.
   Entra la llave Mauer en el escudo, da dos vueltas, la puerta se abre hacia dentro, entra la luz,
   la camara cruza la puerta, fundido a blanco y aparece la web.
   Requiere three.min.js, gsap.min.js, tex.js y puerta3d.js. Solo actua si <html class="con-intro">. */
(function () {
	'use strict';
	var raiz = document.documentElement;
	var intro = document.getElementById('intro-puerta');
	if (!intro || !raiz.classList.contains('con-intro')) return;

	var terminada = false, tl = null, renderer = null, animando = true;
	var AJUSTE = { tono: [210, 157, 95], tonoMarco: [172, 132, 112], alu: 0xd5d8db, aluBrillo: 1.25, cromo: 0xc4d4ea };
	if (location.search.indexOf('depurar') > -1) window.__AJUSTE = AJUSTE;
	function terminar() {
		if (terminada) return;
		terminada = true;
		if (tl) tl.kill();
		intro.classList.add('fase-fin');
		try { window.sessionStorage.setItem('cabma-intro', '1'); } catch (err) { /* sin almacenamiento */ }
		setTimeout(function () {
			animando = false;
			raiz.classList.remove('con-intro');
			if (renderer) { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); }
			if (intro.parentNode) intro.parentNode.removeChild(intro);
		}, 850);
	}
	var saltar = intro.querySelector('.intro-saltar');
	saltar.addEventListener('click', terminar);
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') terminar(); });

	var THREE = window.THREE, gsap = window.gsap, P3 = window.CabmaPuerta3D;
	if (!THREE || !gsap || !P3) { terminar(); return; }
	var canvas = intro.querySelector('.intro-canvas');
	try {
		renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
	} catch (err) { terminar(); return; }
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.62;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setClearColor(0xe9e4dc, 1);

	P3.precargar().then(montar);

	function montar() {
		if (terminada) return;
		intro.classList.add('lista');   // se va el indicador de carga y entra la escena
		var escena = new THREE.Scene();
		escena.environment = P3.entorno(renderer, 'entrada');

		/* tonos y aluminio calibrados midiendo el render frente a la foto real de la Thor 20 Plus */
		var puerta = P3.crearPuerta({ modelo: 'thor-20-plus', placa: true, llave: true, tono: AJUSTE.tono, tonoMarco: AJUSTE.tonoMarco });
		/* aluminio menos brillante y cromo con un punto frio: con la luz calida del recibidor el cromo parecia laton */
		var M0 = P3.materiales(), cambio = {};
		cambio[M0.aluCromo.uuid] = M0.aluCromo.clone(); cambio[M0.aluCromo.uuid].color.setHex(AJUSTE.alu); cambio[M0.aluCromo.uuid].envMapIntensity = AJUSTE.aluBrillo;
		[M0.cromo, M0.niquel, M0.cromoSatinado].forEach(function (m) { var c = m.clone(); c.color.setHex(AJUSTE.cromo); cambio[m.uuid] = c; });
		puerta.grupo.traverse(function (o) { if (o.material && !Array.isArray(o.material) && cambio[o.material.uuid]) o.material = cambio[o.material.uuid]; });
		escena.add(puerta.grupo);
		var md = puerta.medidas;
		var ZP = -0.0125;                 // pared justo detras de la cara del marco
		var anchoH = md.WT - 0.04, altoH = md.HT - 0.02;

		/* pared con el hueco */
		/* pared de yeso y suelo de marmol con texturas fotograficas (Poly Haven, CC0) */
		var yesoC = P3.textura('yesoColor') || P3.texYeso(), yesoN = P3.textura('yesoNormal', { color: false });
		var matPared = new THREE.MeshStandardMaterial({ map: yesoC, normalMap: yesoN, normalScale: new THREE.Vector2(0.7, 0.7), color: 0xffffff, roughness: 0.93, envMapIntensity: 0.4, side: THREE.DoubleSide });
		var forma = new THREE.Shape();
		forma.moveTo(-6, 0); forma.lineTo(6, 0); forma.lineTo(6, 4.2); forma.lineTo(-6, 4.2); forma.lineTo(-6, 0);
		var agujero = new THREE.Path();
		agujero.moveTo(-anchoH / 2, 0); agujero.lineTo(-anchoH / 2, altoH); agujero.lineTo(anchoH / 2, altoH); agujero.lineTo(anchoH / 2, 0); agujero.lineTo(-anchoH / 2, 0);
		forma.holes.push(agujero);
		var pared = new THREE.Mesh(new THREE.ShapeGeometry(forma), matPared);
		pared.position.z = ZP; pared.receiveShadow = true; pared.castShadow = true; escena.add(pared);
		var paredInt = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshStandardMaterial({ color: 0xfbfaf8, roughness: 1, side: THREE.DoubleSide }));
		paredInt.position.z = ZP - 0.2; paredInt.castShadow = true; escena.add(paredInt);
		var matRevoco = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.95 });
		[-1, 1].forEach(function (s) {
			var j = new THREE.Mesh(new THREE.BoxGeometry(0.02, altoH, 0.2), matRevoco);
			j.position.set(s * (anchoH / 2 + 0.01), altoH / 2, ZP - 0.1); j.castShadow = true; j.receiveShadow = true; escena.add(j);
		});
		var dintel = new THREE.Mesh(new THREE.BoxGeometry(anchoH + 0.04, 0.02, 0.2), matRevoco);
		dintel.position.set(0, altoH + 0.01, ZP - 0.1); dintel.castShadow = true; escena.add(dintel);

		/* rodapie */
		var matRodapie = new THREE.MeshPhysicalMaterial({ color: 0xf7f6f3, roughness: 0.35, clearcoat: 0.5 });
		var lado = 6 - md.WT / 2;
		[-1, 1].forEach(function (s) {
			var r = new THREE.Mesh(new THREE.BoxGeometry(lado, 0.09, 0.014), matRodapie);
			r.position.set(s * (md.WT / 2 + lado / 2), 0.045, ZP + 0.007); r.castShadow = true; r.receiveShadow = true; escena.add(r);
		});

		/* suelos y estancia interior luminosa */
		var rm = [10 / 1.5, 9 / 1.5];
		var marmolC = P3.textura('marmolColor', { rep: rm }), marmolN = P3.textura('marmolNormal', { color: false, rep: rm }), marmolR = P3.textura('marmolRugosidad', { color: false, rep: rm });
		var baldosa = marmolC || P3.texBaldosa();
		var suelo = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ map: baldosa, normalMap: marmolN, roughnessMap: marmolR, roughness: 0.55, envMapIntensity: 0.7 }));
		suelo.rotation.x = -Math.PI / 2; suelo.position.set(0, 0, ZP + 4.5); suelo.receiveShadow = true; escena.add(suelo);
		var baldosaI = baldosa.clone(); baldosaI.needsUpdate = true; baldosaI.repeat.set(10 / 1.5, 7 / 1.5);
		var sueloI = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshStandardMaterial({ map: baldosaI, color: 0xfffcf6, roughness: 0.3 }));
		sueloI.rotation.x = -Math.PI / 2; sueloI.position.set(0, 0.001, ZP - 3.5); sueloI.receiveShadow = true; escena.add(sueloI);
		var fondoLuz = new THREE.MeshBasicMaterial({ color: 0xffffff }); fondoLuz.color.setRGB(1.6, 1.56, 1.48);
		var fondo = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.2), fondoLuz); fondo.position.set(0, 2.1, ZP - 6.5); escena.add(fondo);
		var matInt = new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.9 });
		[-1, 1].forEach(function (s) {
			var lat = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), matInt);
			lat.rotation.y = -s * Math.PI / 2; lat.position.set(s * 2.4, 2.1, ZP - 3.5); escena.add(lat);
		});
		var techo = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), matInt);
		techo.rotation.x = Math.PI / 2; techo.position.set(0, 2.75, ZP - 3.5); escena.add(techo);

		/* luces */
		escena.add(new THREE.HemisphereLight(0xfff1df, 0x3b3128, 0.1));
		var clave = new THREE.SpotLight(0xffd2a6, 95, 0, 0.55, 0.9, 2);
		clave.position.set(-1.1, 3.1, 2.5); clave.target.position.set(0.1, 1.05, 0);
		clave.castShadow = true; clave.shadow.mapSize.set(2048, 2048); clave.shadow.bias = -0.0002; clave.shadow.normalBias = 0.02;
		clave.shadow.camera.near = 0.5; clave.shadow.camera.far = 9;
		escena.add(clave, clave.target);
		var relleno = new THREE.DirectionalLight(0xdfe8ff, 0.3); relleno.position.set(3, 2, 4); escena.add(relleno);
		var luzDentro = new THREE.SpotLight(0xfff4e4, 0, 0, 0.8, 0.75, 2);
		luzDentro.position.set(0.05, 2.25, ZP - 2.1); luzDentro.target.position.set(0, 0, 2.2);
		luzDentro.castShadow = true; luzDentro.shadow.mapSize.set(1024, 1024); luzDentro.shadow.bias = -0.0003; luzDentro.shadow.normalBias = 0.03;
		escena.add(luzDentro, luzDentro.target);
		var puntoDentro = new THREE.PointLight(0xffffff, 0, 4.2, 2); puntoDentro.position.set(0, 1.9, ZP - 2.6); escena.add(puntoDentro);

		/* brillos de la luz que entra */
		var brilloTex = new THREE.CanvasTexture((function () {
			var c = document.createElement('canvas'); c.width = c.height = 256;
			var g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
			gr.addColorStop(0, 'rgba(255,250,240,1)'); gr.addColorStop(0.35, 'rgba(255,248,235,0.55)'); gr.addColorStop(1, 'rgba(255,245,230,0)');
			g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return c;
		})());
		var brilloHueco = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
		brilloHueco.scale.set(1.7, 2.6, 1); brilloHueco.position.set(0.05, 1.05, ZP - 0.35); escena.add(brilloHueco);
		var brilloFrente = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilloTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
		brilloFrente.scale.set(3.4, 4.2, 1); brilloFrente.position.set(0, 1.15, 0.4); brilloFrente.renderOrder = 10; escena.add(brilloFrente);

		/* camara: la puerta llena casi toda la altura (o la anchura en movil) */
		var camara = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
		var cam = { acercar: 0.12, cruzar: 0, fov: 30 };
		var base = { d: 4.5, x: 0.1, y: 1.14 };
		var ultW = 0, ultH = 0;
		function encuadre() {
			var w = window.innerWidth, h = window.innerHeight;
			ultW = w; ultH = h;
			renderer.setSize(w, h, false);
			camara.aspect = w / h;
			var t = Math.tan(THREE.MathUtils.degToRad(30) / 2);
			base.d = Math.max((2.16 / 2) / t, ((md.WT + 0.14) / 2) / (t * camara.aspect));
			camara.updateProjectionMatrix();
		}
		encuadre();
		window.addEventListener('resize', encuadre);
		var desde = new THREE.Vector3(), hasta = new THREE.Vector3(), mirarA = new THREE.Vector3(), fin = new THREE.Vector3(0.05, 1.28, ZP - 6);
		function colocarCamara() {
			desde.set(base.x, base.y, base.d * (1 + cam.acercar));
			hasta.set(0.12, 1.32, ZP - 1.7);
			camara.position.lerpVectors(desde, hasta, cam.cruzar);
			mirarA.set(0, 1.06, 0).lerp(fin, cam.cruzar);
			camara.lookAt(mirarA);
			camara.fov = cam.fov; camara.updateProjectionMatrix();
		}
		(function bucle() {
			if (!animando) return;
			if (window.innerWidth !== ultW || window.innerHeight !== ultH) encuadre();   // responsive
			colocarCamara();
			renderer.render(escena, camara);
			requestAnimationFrame(bucle);
		})();

		/* linea de tiempo */
		var hoja = puerta.hoja, llave = puerta.llave, blanco = intro.querySelector('.intro-blanco');
		var ud = llave.userData;
		llave.position.z = ud.zFuera + 0.06; llave.visible = false;
		puerta.bulones.forEach(function (b) { b.position.x = b.userData.x1; });
		var giro = { v: 0 };
		tl = gsap.timeline({ delay: 0.15, onComplete: terminar });
		tl.to(canvas, { opacity: 1, duration: 0.9, ease: 'power1.out' }, 0)
			.to(cam, { acercar: 0, duration: 3.2, ease: 'power2.out' }, 0)
			.call(function () { llave.visible = true; }, null, 0.75)
			.to(llave.position, { z: ud.zDentro, duration: 0.55, ease: 'power2.out' }, 0.75)
			/* dos vueltas de llave: los bulones se recogen */
			.to(giro, { v: 1, duration: 1.25, ease: 'power1.inOut', onUpdate: function () {
				llave.rotation.z = -giro.v * Math.PI * 4;
				puerta.bulones.forEach(function (b) { b.position.x = b.userData.x1 + (b.userData.x0 - b.userData.x1) * giro.v; });
			} }, 1.35)
			.to(hoja.rotation, { y: 0.028, duration: 0.12, ease: 'power1.out' }, 2.62)
			.to(hoja.rotation, { y: 1.72, duration: 2.2, ease: 'power2.inOut' }, 2.74)
			.to(luzDentro, { intensity: 170, duration: 1.7, ease: 'power1.in' }, 2.7)
			.to(puntoDentro, { intensity: 28, duration: 1.7, ease: 'power1.in' }, 2.7)
			.to(brilloHueco.material, { opacity: 0.85, duration: 1.6, ease: 'power1.in' }, 2.8)
			.to(cam, { cruzar: 1, fov: 46, duration: 1.8, ease: 'power2.in' }, 3.85)
			.to(renderer, { toneMappingExposure: 2.6, duration: 1.0, ease: 'power2.in' }, 4.5)
			.to(brilloFrente.material, { opacity: 1, duration: 0.9, ease: 'power2.in' }, 4.55)
			.to(blanco, { opacity: 1, duration: 0.35, ease: 'power1.in' }, 5.25)
			.to({}, { duration: 0.05 }, 5.6);
		if (location.search.indexOf('depurar') > -1) { window.__introTL = tl; window.__intro = { renderer: renderer, clave: clave, escena: escena, camara: camara, puerta: puerta, pintar: function () { colocarCamara(); renderer.render(escena, camara); } }; }
		saltar.focus({ preventScroll: true });
	}
})();
