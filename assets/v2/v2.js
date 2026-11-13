/* CABMA Asturias, estilo nuevo: menu movil, foto exterior/interior y aparicion de bloques al hacer scroll */
(function () {
	'use strict';
	document.documentElement.classList.remove('sin-js');
	/* quien ya esta navegando por la web no vuelve a ver la intro de la puerta al ir a Inicio */
	try { window.sessionStorage.setItem('cabma-intro', '1'); } catch (err) { /* sin almacenamiento */ }

	var cab = document.querySelector('.v2-cab');
	var boton = cab && cab.querySelector('.v2-menu-btn');
	if (boton) {
		boton.addEventListener('click', function () {
			var abierta = cab.classList.toggle('abierta');
			boton.setAttribute('aria-expanded', abierta ? 'true' : 'false');
			boton.textContent = abierta ? 'Cerrar' : 'Menú';
			document.body.style.overflow = abierta ? 'hidden' : '';
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && cab.classList.contains('abierta')) boton.click();
		});
	}

	Array.prototype.forEach.call(document.querySelectorAll('.v2-foto'), function (fig) {
		var botones = fig.querySelectorAll('[data-cara]');
		Array.prototype.forEach.call(botones, function (b) {
			b.addEventListener('click', function () {
				var cara = b.getAttribute('data-cara');
				Array.prototype.forEach.call(botones, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
				fig.querySelector('.v2-foto-ext').hidden = cara !== 'ext';
				fig.querySelector('.v2-foto-int').hidden = cara !== 'int';
				var c3 = fig.querySelector('.v2-foto-3d');
				if (c3) c3.hidden = cara !== '3d';
				document.dispatchEvent(new CustomEvent('cabma:cara', { detail: cara }));
			});
		});
	});

	/* carrusel de banners de la portada: pasa solo cada 6 s, se para al pasar el raton o con el teclado */
	var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	Array.prototype.forEach.call(document.querySelectorAll('[data-carrusel]'), function (car) {
		var pista = car.querySelector('.v2-carrusel-pista'), slides = pista.children, puntos = car.querySelectorAll('.v2-carrusel-puntos button:not(.v2-carrusel-pausa)'), i = 0, parado = false, pausado = false;
		var pausa = car.querySelector('.v2-carrusel-pausa');
		if (pausa) pausa.addEventListener('click', function () {
			pausado = !pausado;
			pausa.setAttribute('aria-pressed', pausado ? 'true' : 'false');
			pausa.setAttribute('aria-label', pausado ? 'Reanudar el carrusel' : 'Pausar el carrusel');
		});
		function marcar() { Array.prototype.forEach.call(puntos, function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); }); }
		function ir(n) { i = (n + slides.length) % slides.length; pista.scrollTo({ left: slides[i].offsetLeft, behavior: reducido ? 'auto' : 'smooth' }); marcar(); }
		pista.addEventListener('scroll', function () { var k = Math.round(pista.scrollLeft / (pista.clientWidth || 1)); if (k !== i && k >= 0 && k < slides.length) { i = k; marcar(); } }, { passive: true });
		Array.prototype.forEach.call(puntos, function (b, k) { b.addEventListener('click', function () { ir(k); }); });
		pista.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); ir(i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); ir(i - 1); } });
		['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { car.addEventListener(ev, function () { parado = true; }, { passive: true }); });
		['mouseleave', 'focusout'].forEach(function (ev) { car.addEventListener(ev, function () { parado = false; }); });
		if (!reducido && slides.length > 1) setInterval(function () {
			if (!parado && !pausado && !document.hidden && !document.documentElement.classList.contains('con-intro')) ir(i + 1);
		}, 6000);
	});

	/* ayuda para elegir puerta: tres preguntas y las puertas que encajan */
	Array.prototype.forEach.call(document.querySelectorAll('[data-elige]'), function (sec) {
		var form = sec.querySelector('form'), aviso = sec.querySelector('.v2-elige-aviso'), res = sec.querySelector('.v2-elige-res');
		var items = sec.querySelectorAll('[data-puerta]'), nombres = {};
		Array.prototype.forEach.call(items, function (li) { nombres[li.getAttribute('data-puerta')] = li.querySelector('.v2-tarjeta-nom, strong').textContent; });
		var TABLA = { maximo: ['premium-5c', 'premium-4c'], alto: ['thor-20-plus', 'premium-3c'], precio: ['thor-20', 'eco-thor'] };
		function valor(n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : null; }
		function actualizar() {
			var donde = valor('donde'), nivel = valor('nivel'), abrir = valor('abrir'), trastero = donde === 'trastero', elegidas = [];
			['nivel', 'abrir'].forEach(function (n) { form.querySelector('[data-grupo="' + n + '"]').disabled = trastero; });
			if (trastero) elegidas = ['puerta-trastero'];
			else if (donde && abrir === 'si') elegidas = ['idom'];
			else if (donde && nivel && abrir) elegidas = TABLA[nivel];
			Array.prototype.forEach.call(items, function (li) { li.hidden = elegidas.indexOf(li.getAttribute('data-puerta')) < 0; });
			elegidas.forEach(function (k) { res.appendChild(res.querySelector('[data-puerta="' + k + '"]')); });
			if (elegidas.length === 1) aviso.textContent = 'Te encaja la ' + nombres[elegidas[0]] + '.';
			else if (elegidas.length) aviso.textContent = 'Te encajan la ' + nombres[elegidas[0]] + ' y la ' + nombres[elegidas[1]] + '.';
			else aviso.textContent = donde ? 'Responde también a las otras preguntas.' : 'Elige una respuesta en cada pregunta.';
			sec.classList.toggle('con-resultado', elegidas.length > 0);
		}
		form.addEventListener('change', actualizar);
		form.addEventListener('submit', function (e) { e.preventDefault(); });
	});

	/* presupuesto con las medidas de «Cómo medir tu puerta» (?medidas=...&puerta=...): van en la consulta */
	var formP = document.querySelector('.formulario-contacto[data-puertas]');
	var pedida = (location.search.match(/[?&]puerta=([a-z0-9-]+)/) || [])[1];
	var medidasQ = (location.search.match(/[?&]medidas=([^&]+)/) || [])[1], conMedidas = false;
	if (formP && medidasQ) {
		try { medidasQ = decodeURIComponent(medidasQ.replace(/\+/g, ' ')); } catch (err) { medidasQ = ''; }
		if (medidasQ) {
			var nombresM = {};
			try { nombresM = JSON.parse(formP.getAttribute('data-puertas')); } catch (err) { nombresM = {}; }
			var puertaM = pedida ? nombresM[pedida] : null;
			if (formP.elements.asunto && !formP.elements.asunto.value) formP.elements.asunto.value = puertaM ? 'Presupuesto de la ' + puertaM + ' con mis medidas' : 'Presupuesto con mis medidas';
			if (formP.elements.consulta && !formP.elements.consulta.value) formP.elements.consulta.value = medidasQ.slice(0, 1990);
			var notaM = document.querySelector('.v2-form-nota'), ayudaM = document.querySelector('.v2-form-ayuda');
			if (notaM) { notaM.textContent = 'Tus medidas ya están en la consulta. Completa tus datos y envíanosla.'; notaM.hidden = false; }
			if (ayudaM) ayudaM.hidden = true;
			conMedidas = true;
		}
	}

	/* presupuesto desde una página de zona (?zona=oviedo): la zona va en el asunto */
	var zonaQ = (location.search.match(/[?&]zona=([a-z-]+)/) || [])[1];
	if (formP && zonaQ && !conMedidas) {
		var zonasP = {};
		try { zonasP = JSON.parse(formP.getAttribute('data-zonas') || '{}'); } catch (err) { zonasP = {}; }
		if (zonasP[zonaQ]) {
			if (formP.elements.asunto && !formP.elements.asunto.value) formP.elements.asunto.value = 'Presupuesto de una puerta acorazada ' + zonasP[zonaQ];
			if (formP.elements.consulta && !formP.elements.consulta.value) formP.elements.consulta.value = 'Hola, quiero presupuesto de una puerta acorazada. Vivo ' + zonasP[zonaQ] + ', en (tu pueblo o barrio): ';
			var notaZ = document.querySelector('.v2-form-nota');
			if (notaZ) { notaZ.textContent = 'Ya hemos puesto tu zona en el asunto. Completa la consulta con tu pueblo o barrio y tus datos.'; notaZ.hidden = false; }
			conMedidas = true;
		}
	}

	/* presupuesto: si se llega desde una ficha (?puerta=thor-20) la puerta ya va en el asunto */
	if (formP && pedida && !conMedidas) {
		var nombresP = {};
		try { nombresP = JSON.parse(formP.getAttribute('data-puertas')); } catch (err) { nombresP = {}; }
		var nombreP = nombresP[pedida];
		var diseno = (location.search.match(/[?&]diseno=([^&]+)/) || [])[1];
		if (nombreP && diseno) {
			/* viene del configurador: el diseño completo va en la consulta */
			try { diseno = decodeURIComponent(diseno.replace(/\+/g, ' ')); } catch (err) { diseno = ''; }
			if (formP.elements.asunto && !formP.elements.asunto.value) formP.elements.asunto.value = 'Presupuesto de mi ' + nombreP + ' diseñada en la web';
			if (formP.elements.consulta && !formP.elements.consulta.value) formP.elements.consulta.value = diseno.slice(0, 1990);
			var notaD = document.querySelector('.v2-form-nota');
			if (notaD) { notaD.textContent = 'Tu diseño de la ' + nombreP + ' ya está en la consulta. Completa tus datos y envíanosla.'; notaD.hidden = false; }
			nombreP = null;
		}
		if (nombreP) {
			if (formP.elements.asunto && !formP.elements.asunto.value) formP.elements.asunto.value = 'Presupuesto de la ' + nombreP;
			if (formP.elements.consulta && !formP.elements.consulta.value) formP.elements.consulta.value = 'Hola, me gustaría recibir presupuesto de la ' + nombreP + '. ';
			var nota = document.querySelector('.v2-form-nota');
			if (nota) { nota.textContent = 'Has llegado desde la ficha de la ' + nombreP + ': ya la hemos puesto en el asunto. Completa tus datos y envíanos la consulta.'; nota.hidden = false; }
		}
	}

	/* presupuesto de un cilindro (?cilindro=nw5) */
	var cilP = (location.search.match(/[?&]cilindro=([a-z0-9-]+)/) || [])[1];
	var NOMBRES_CIL = { 'nw5': 'Mauer NW5', 'nw4': 'Mauer NW4 CABMA', 'elite-2': 'Mauer Elite 2 Red Line', 'master': 'Keso 8000 Omega2 Master', 'premium': 'Keso 8000 Omega2 Premium', 'ultra': 'Keso 8000 Omega2 Ultra' };
	var formC = document.querySelector('.formulario-contacto');
	if (formC && cilP) {
		var asuntoC = cilP === 'amaestramiento' ? 'Amaestramiento o igualamiento de cilindros' : (NOMBRES_CIL[cilP] ? 'Cilindro ' + NOMBRES_CIL[cilP] : '');
		if (asuntoC) {
			if (formC.elements.asunto && !formC.elements.asunto.value) formC.elements.asunto.value = asuntoC;
			if (formC.elements.consulta && !formC.elements.consulta.value) formC.elements.consulta.value = cilP === 'amaestramiento' ? 'Hola, quiero que varias puertas se abran con la misma llave. ' : 'Hola, me gustaría recibir presupuesto del cilindro ' + NOMBRES_CIL[cilP] + ' para mi puerta. ';
		}
	}

	/* cilindros: filtrar por el ataque del que te quieres proteger */
	var ataques = document.querySelectorAll('.cil-ataque');
	var notaF = document.querySelector('.cil-filtro-nota');
	Array.prototype.forEach.call(ataques, function (b) {
		b.addEventListener('click', function () {
			var activo = b.getAttribute('aria-pressed') !== 'true', k = b.getAttribute('data-ataque'), n = 0;
			Array.prototype.forEach.call(ataques, function (o) { o.setAttribute('aria-pressed', o === b && activo ? 'true' : 'false'); });
			Array.prototype.forEach.call(document.querySelectorAll('.cil-tarjetas > li[data-protege]'), function (li) {
				var si = !activo || li.getAttribute('data-protege').split(' ').indexOf(k) >= 0;
				li.classList.toggle('atenuada', !si);
				var nd = li.querySelector('.cil-tarjeta-nd'); if (nd) nd.hidden = si;
				if (si && activo) n++;
			});
			if (notaF) notaF.textContent = activo ? n + ' de 6 cilindros lo indican en su ficha: ' + b.querySelector('strong').textContent.toLowerCase() + '.' : '';
		});
	});

	/* barra de llamar y presupuesto en el movil: solo cuando no tapa nada importante */
	var barra = document.querySelector('[data-barra]');
	if (barra) {
		var tapar = ['.v2-hero', '.v2-3d', '.v2-cierre', '.v2-pie'].map(function (q) { return document.querySelector(q); }).filter(Boolean);
		var pendiente = false;
		var revisar = function () {
			pendiente = false;
			var h = window.innerHeight, aviso = document.getElementById('aviso-cookies');
			var choca = tapar.some(function (el) { var r = el.getBoundingClientRect(); return r.top < h && r.bottom > 0; });
			barra.classList.toggle('visible', !choca && !(aviso && !aviso.hidden));
		};
		window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; setTimeout(revisar, 80); } }, { passive: true });
		window.addEventListener('resize', revisar);
		document.addEventListener('click', function () { setTimeout(revisar, 50); });
		revisar();
	}

	/* ---------- mapa propio de la ubicacion: se arrastra, se amplia y al pulsarlo abre la ruta en Google Maps */
	Array.prototype.forEach.call(document.querySelectorAll('[data-mapa]'), function (caja) {
		var svg = caja.querySelector('svg.mp-svg');
		if (!svg) return;
		var ruta = caja.getAttribute('data-ruta');
		var aviso = caja.querySelector('.v2-mapa-aviso');
		var lim = (svg.getAttribute('data-limites') || '').split(' ').map(Number);
		var vb = svg.getAttribute('viewBox').split(' ').map(Number);
		var cx0 = vb[0] + vb[2] / 2, cy0 = vb[1] + vb[3] / 2;
		var cx = cx0, cy = cy0, ancho = 0, MIN = 350, MAX = Math.min(lim[2] || 4200, 4200);
		function inicial() { var r = svg.getBoundingClientRect(); return r.width < 640 ? 1000 : vb[2]; }
		function pintar() {
			var r = svg.getBoundingClientRect();
			if (!r.width || !r.height) return;
			if (!ancho) ancho = inicial();
			ancho = Math.max(MIN, Math.min(MAX, ancho));
			var alto = ancho * r.height / r.width;
			if (lim.length === 4 && lim[2]) {
				cx = ancho >= lim[2] ? lim[0] + lim[2] / 2 : Math.max(lim[0] + ancho / 2, Math.min(lim[0] + lim[2] - ancho / 2, cx));
				cy = alto >= lim[3] ? lim[1] + lim[3] / 2 : Math.max(lim[1] + alto / 2, Math.min(lim[1] + lim[3] - alto / 2, cy));
			}
			svg.setAttribute('viewBox', (cx - ancho / 2).toFixed(1) + ' ' + (cy - alto / 2).toFixed(1) + ' ' + ancho.toFixed(1) + ' ' + alto.toFixed(1));
			svg.style.setProperty('--mp-k', (ancho / r.width).toFixed(4));
		}
		function zoom(f, px, py) {
			/* f > 1 acerca; px, py: punto de la pantalla que se queda quieto */
			var r = svg.getBoundingClientRect(), k = ancho / r.width;
			var mx = cx + ((px === undefined ? r.width / 2 : px) - r.width / 2) * k;
			var my = cy + ((py === undefined ? r.height / 2 : py) - r.height / 2) * k;
			var nuevo = Math.max(MIN, Math.min(MAX, ancho / f)), e = nuevo / ancho;
			cx = mx - (mx - cx) * e; cy = my - (my - cy) * e; ancho = nuevo;
			pintar();
		}
		var avisoT;
		function avisar(t) {
			if (!aviso) return;
			aviso.textContent = t; aviso.classList.add('visible');
			clearTimeout(avisoT); avisoT = setTimeout(function () { aviso.classList.remove('visible'); }, 1600);
		}
		caja.addEventListener('click', function (e) {
			var b = e.target.closest('button');
			if (!b) return;
			if (b.hasAttribute('data-mapa-zoom')) zoom(b.getAttribute('data-mapa-zoom') === '1' ? 1.5 : 1 / 1.5);
			if (b.hasAttribute('data-mapa-centrar')) { cx = cx0; cy = cy0; ancho = inicial(); pintar(); }
		});
		/* arrastrar con raton o un dedo, pellizcar con dos; un toque sin mover abre la ruta */
		var punteros = {}, inicio = null, movido = false, dist0 = 0;
		function lista() { return Object.keys(punteros).map(function (k) { return punteros[k]; }); }
		svg.addEventListener('pointerdown', function (e) {
			if (e.button) return;
			punteros[e.pointerId] = { x: e.clientX, y: e.clientY };
			try { svg.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
			var ps = lista();
			if (ps.length === 1) { inicio = { x: e.clientX, y: e.clientY }; movido = false; }
			if (ps.length === 2) { dist0 = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y); movido = true; }
		});
		svg.addEventListener('pointermove', function (e) {
			var p = punteros[e.pointerId];
			if (!p) return;
			var r = svg.getBoundingClientRect(), k = ancho / r.width, ps = lista();
			if (ps.length === 1) {
				if (Math.abs(e.clientX - inicio.x) + Math.abs(e.clientY - inicio.y) > 6) movido = true;
				if (movido) { cx -= (e.clientX - p.x) * k; cy -= (e.clientY - p.y) * k; caja.classList.add('arrastrando'); }
			}
			p.x = e.clientX; p.y = e.clientY;
			if (ps.length === 2) {
				var d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
				if (dist0) zoom(d / dist0, (ps[0].x + ps[1].x) / 2 - r.left, (ps[0].y + ps[1].y) / 2 - r.top);
				dist0 = d;
				return;
			}
			pintar();
		});
		function soltar(e) {
			var eraToque = punteros[e.pointerId] && lista().length === 1 && !movido && e.type === 'pointerup';
			delete punteros[e.pointerId];
			if (!lista().length) caja.classList.remove('arrastrando');
			if (eraToque && ruta) window.open(ruta, '_blank', 'noopener');
		}
		svg.addEventListener('pointerup', soltar);
		svg.addEventListener('pointercancel', soltar);
		svg.addEventListener('wheel', function (e) {
			if (!e.ctrlKey && !e.metaKey) { avisar('Usa Ctrl + rueda para acercar o alejar'); return; }
			e.preventDefault();
			var r = svg.getBoundingClientRect();
			zoom(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top);
		}, { passive: false });
		if ('ResizeObserver' in window) new ResizeObserver(pintar).observe(svg);
		else window.addEventListener('resize', pintar);
		pintar();
	});

	var bloques = document.querySelectorAll('[data-aparece]');
	if (!('IntersectionObserver' in window)) {
		Array.prototype.forEach.call(bloques, function (b) { b.classList.add('visto'); });
		return;
	}
	var obs = new IntersectionObserver(function (ents) {
		ents.forEach(function (en) {
			if (en.isIntersecting) { en.target.classList.add('visto'); obs.unobserve(en.target); }
		});
	}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
	Array.prototype.forEach.call(bloques, function (b, i) {
		b.style.transitionDelay = (b.parentElement && b.parentElement.classList.contains('v2-herrajes') ? (i % 4) * 70 : 0) + 'ms';
		obs.observe(b);
	});
})();

/* Dónde instalamos: buscador de concejos y pueblos, y la tarjeta de cada zona ilumina su zona en el mapa */
(function () {
	'use strict';
	/* mapas de zonas: textos y marcas en pixeles de pantalla (--u = unidades del mapa por pixel) */
	var mapas = document.querySelectorAll('svg.zm');
	function escalar() {
		Array.prototype.forEach.call(mapas, function (m) {
			var w = m.getBoundingClientRect().width;
			if (w && m.viewBox && m.viewBox.baseVal) m.style.setProperty('--u', (m.viewBox.baseVal.width / w).toFixed(4));
		});
	}
	if (mapas.length) {
		escalar();
		if ('ResizeObserver' in window) { var ro = new ResizeObserver(escalar); Array.prototype.forEach.call(mapas, function (m) { ro.observe(m); }); }
		else window.addEventListener('resize', escalar);
	}
	var campo = document.querySelector('[data-zonas-buscar]');
	if (campo) {
		var items = document.querySelectorAll('[data-zonas-lista] li'), nota = document.querySelector('.zonas-nota');
		var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim(); };
		var claves = Array.prototype.map.call(items, function (li) { return norm(li.getAttribute('data-buscar')); });
		campo.addEventListener('input', function () {
			var q = norm(campo.value), n = 0;
			Array.prototype.forEach.call(items, function (li, i) {
				var lugar = li.hasAttribute('data-lugar');
				var ok = q ? claves[i].indexOf(q) >= 0 || (' ' + claves[i]).indexOf(' ' + q) >= 0 : !lugar;
				li.hidden = !ok;
				if (ok && q) n++;
			});
			if (nota) nota.textContent = !q ? '' : (n ? (n === 1 ? 'Un resultado.' : n + ' resultados.') : 'No lo tenemos en la lista, pero llegamos a toda Asturias: llámanos al 985 053 052.');
		});
	}
	Array.prototype.forEach.call(document.querySelectorAll('[data-zona-tarjeta]'), function (t) {
		var g = document.querySelector('.zm a[data-zona="' + t.getAttribute('data-zona-tarjeta') + '"]');
		if (!g) return;
		t.addEventListener('mouseenter', function () { g.classList.add('hover'); });
		t.addEventListener('mouseleave', function () { g.classList.remove('hover'); });
		t.addEventListener('focus', function () { g.classList.add('hover'); });
		t.addEventListener('blur', function () { g.classList.remove('hover'); });
	});
})();
