/* Cómo medir tu puerta: asistente de cinco pasos con un dibujo de la puerta (de frente y desde arriba)
   que marca en rojo qué medir en cada paso. Al final arma el texto con las medidas y lo lleva a Contacto
   (?medidas=...&puerta=...), donde v2.js lo pone en la consulta. Sin JavaScript se ven todos los pasos seguidos. */
(function () {
	'use strict';
	var raiz = document.querySelector('[data-medir]');
	if (!raiz) return;
	var form = raiz.querySelector('.med-form'), dibujo = raiz.querySelector('.med-dibujo');
	if (!form || !dibujo) return;
	var pasos = Array.prototype.slice.call(form.querySelectorAll('.med-paso'));
	var ORDEN = pasos.map(function (p) { return p.getAttribute('data-paso'); });
	var VISTA = { ahora: 'alzado', ancho: 'alzado', alto: 'alzado', grosor: 'planta', abre: 'planta', resumen: 'alzado' };
	var PIE = {
		ahora: 'La puerta vista de frente, desde fuera.',
		ancho: 'En rojo, dónde medir el ancho: arriba, en el centro y abajo.',
		alto: 'En rojo, dónde medir el alto: desde el suelo terminado.',
		grosor: 'Vista desde arriba: el grosor es el canto de la pared.',
		abre: 'Vista desde arriba: así abriría tu puerta.',
		resumen: 'Tus medidas sobre el dibujo.'
	};
	var NOMBRE = { ancho: 'Ancho', alto: 'Alto', grosor: 'Grosor' };
	var EJEMPLO = { ancho: '92', alto: '205', grosor: '12' };
	var RANGO = { ancho: [60, 140], alto: [180, 260], grosor: [5, 70] };
	var datos = {};
	try { datos = JSON.parse(document.getElementById('med-datos').textContent); } catch (err) { datos = {}; }

	var est = { i: 0, ahora: 'puerta', ancho: null, alto: null, grosor: null, abre: '', lado: '', puerta: '' };
	var pedida = (location.search.match(/[?&]puerta=([a-z0-9-]+)/) || [])[1];
	if (pedida && datos[pedida]) est.puerta = pedida;

	var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var hoja = dibujo.querySelector('.med-hoja-planta'), etCerr = dibujo.querySelector('.med-et-cerr'), pie = dibujo.querySelector('.med-pie');
	var progreso = form.querySelector('.med-progreso'), nav = form.querySelector('.med-nav');
	var btnAtras = form.querySelector('[data-med-atras]'), btnSig = form.querySelector('.med-siguiente');
	var sel = form.querySelector('select[name="puerta"]'), enviar = form.querySelector('[data-med-enviar]');
	var baseEnvio = enviar ? enviar.getAttribute('href').split('?')[0] : '';

	/* numeros en centimetros: admite coma decimal y «cm» al final */
	function num(v) {
		v = String(v || '').replace(/\s+/g, '').replace(/cm$/i, '').replace(',', '.');
		if (!v) return null;
		return /^\d+(\.\d+)?$/.test(v) ? parseFloat(v) : NaN;
	}
	function fmt(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }
	function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
	function valor(k) { return est[k] ? fmt(est[k]) + ' cm' : ''; }

	/* ---------- dibujo */
	function pintar() {
		var paso = ORDEN[est.i], izq = est.lado === 'izq', fuera = est.abre === 'fuera';
		raiz.setAttribute('data-ahora', est.ahora);
		dibujo.setAttribute('data-paso', paso);
		dibujo.setAttribute('data-ahora', est.ahora);
		dibujo.setAttribute('data-lado', izq ? 'izq' : 'der');
		dibujo.setAttribute('data-abre', fuera ? 'fuera' : 'dentro');
		['ancho', 'alto', 'grosor'].forEach(function (k) {
			Array.prototype.forEach.call(dibujo.querySelectorAll('[data-cota="' + k + '"]'), function (g) {
				g.querySelector('text').textContent = est[k] ? fmt(est[k]) + ' cm' : NOMBRE[k];
				g.classList.toggle('con-valor', !!est[k]);
			});
		});
		/* la hoja de la planta esta dibujada abriendo hacia dentro con la cerradura a la derecha: se refleja */
		if (hoja) hoja.setAttribute('transform', 'matrix(' + (izq ? -1 : 1) + ' 0 0 ' + (fuera ? -1 : 1) + ' ' + (izq ? 490 : 0) + ' ' + (fuera ? 348 : 0) + ')');
		if (etCerr) {
			etCerr.setAttribute('x', izq ? 181 : 309);
			etCerr.setAttribute('text-anchor', izq ? 'start' : 'end');
			etCerr.setAttribute('y', fuera ? 172 : 186);
		}
	}
	function verVista(v) {
		dibujo.setAttribute('data-vista', v);
		Array.prototype.forEach.call(dibujo.querySelectorAll('button[data-vista]'), function (b) {
			b.setAttribute('aria-pressed', b.getAttribute('data-vista') === v ? 'true' : 'false');
		});
	}
	Array.prototype.forEach.call(dibujo.querySelectorAll('button[data-vista]'), function (b) {
		b.addEventListener('click', function () { verVista(b.getAttribute('data-vista')); });
	});

	/* ---------- pasos */
	function hecho(k) {
		if (k === 'ahora') return true;
		if (k === 'abre') return !!(est.abre && est.lado);
		if (k === 'resumen') return false;
		return !!est[k];
	}
	function marcarProgreso() {
		Array.prototype.forEach.call(progreso.querySelectorAll('[data-ir]'), function (b) {
			var k = b.getAttribute('data-ir'), actual = k === ORDEN[est.i];
			if (actual) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
			b.classList.toggle('hecho', !actual && hecho(k));
		});
	}
	function ir(i, foco) {
		est.i = Math.max(0, Math.min(ORDEN.length - 1, i));
		var paso = ORDEN[est.i];
		pasos.forEach(function (p, j) { p.classList.toggle('activo', j === est.i); });
		verVista(VISTA[paso] || 'alzado');
		if (pie) pie.textContent = PIE[paso] || '';
		btnAtras.disabled = est.i === 0;
		nav.hidden = paso === 'resumen';
		btnSig.textContent = paso === 'abre' ? 'Ver el resumen' : 'Siguiente';
		if (paso === 'resumen') resumen();
		marcarProgreso();
		pintar();
		if (!foco) return;
		/* en el movil el dibujo va encima: se sube para verlo junto al paso */
		var arriba = window.innerWidth <= 900 ? dibujo : form;
		if (arriba.getBoundingClientRect().top < 70) arriba.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
		var activo = pasos[est.i], campo = activo.querySelector('input[type="text"]');
		var fino = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
		var destino = campo && fino ? campo : activo.querySelector('h2');
		if (destino) { try { destino.focus({ preventScroll: true }); } catch (err) { destino.focus(); } }
	}

	/* ---------- medidas */
	['ancho', 'alto', 'grosor'].forEach(function (k) {
		var input = form.elements[k], aviso = document.getElementById('med-aviso-' + k);
		if (!input || !aviso) return;
		function sugerir(t, v) {
			aviso.textContent = t + ' ';
			var b = document.createElement('button');
			b.type = 'button'; b.textContent = 'Usar ' + fmt(v) + ' cm';
			b.addEventListener('click', function () { input.value = fmt(v); revisar(); input.focus(); });
			aviso.appendChild(b);
		}
		function revisar() {
			var n = num(input.value), r = RANGO[k], mm = k === 'grosor' ? 100 : 400, m = k === 'grosor' ? 1 : 3;
			aviso.textContent = '';
			est[k] = n && !isNaN(n) ? n : null;
			if (n === null) { /* vacio: se puede seguir y darla luego */ }
			else if (isNaN(n)) aviso.textContent = 'Escribe solo el número, en centímetros. Por ejemplo, ' + EJEMPLO[k] + '.';
			else if (n >= mm) sugerir('¿Lo has medido en milímetros? En centímetros serían ' + fmt(n / 10) + ' cm.', n / 10);
			else if (n < m) sugerir('¿Lo has medido en metros? En centímetros serían ' + fmt(n * 100) + ' cm.', n * 100);
			else if (n < r[0] || n > r[1]) aviso.textContent = 'Es una medida poco habitual ' + (k === 'grosor' ? 'para una pared' : 'para una puerta de entrada') + '. Revísala y, si está bien, sigue.';
			pintar();
			marcarProgreso();
		}
		input.addEventListener('input', revisar);
		input.addEventListener('change', revisar);
	});
	Array.prototype.forEach.call(form.querySelectorAll('input[type="radio"]'), function (r) {
		r.addEventListener('change', function () {
			if (!r.checked) return;
			est[r.name] = r.value;
			pintar();
			marcarProgreso();
		});
	});

	/* ---------- resumen */
	function resumen() {
		var filas = [
			['ahora', 'Ahora hay', est.ahora === 'hueco' ? 'Un hueco sin puerta' : 'Una puerta para cambiar', ''],
			['ancho', 'Ancho', valor('ancho'), 'Sin medir'],
			['alto', 'Alto', valor('alto'), 'Sin medir'],
			['grosor', 'Grosor de la pared', valor('grosor'), 'Sin medir'],
			['abre', 'Abre hacia', est.abre ? (est.abre === 'fuera' ? 'Fuera' : 'Dentro de casa') : '', 'Sin indicar'],
			['abre', 'Cerradura, vista desde fuera', est.lado ? (est.lado === 'izq' ? 'A la izquierda' : 'A la derecha') : '', 'Sin indicar']
		];
		form.querySelector('.med-lista').innerHTML = filas.map(function (f) {
			return '<div><dt>' + esc(f[1]) + '</dt><dd' + (f[2] ? '' : ' class="falta"') + '><span>' + esc(f[2] || f[3]) + '</span>'
				+ '<button type="button" data-ir="' + f[0] + '" aria-label="Cambiar: ' + esc(f[1].toLowerCase()) + '">Cambiar</button></dd></div>';
		}).join('');
		estandar();
		if (enviar) enviar.setAttribute('href', baseEnvio + '?medidas=' + encodeURIComponent(texto()) + (datos[est.puerta] ? '&puerta=' + est.puerta : ''));
	}
	/* medidas estandar de la puerta elegida y la que mas se parece al hueco (solo como referencia) */
	function estandar() {
		var caja = form.querySelector('.med-estandar'), d = datos[est.puerta];
		if (!caja) return;
		if (!d) { caja.innerHTML = ''; return; }
		var mejor = -1, dist = Infinity;
		if (est.ancho && est.alto) d.medidas.forEach(function (m, j) {
			var x = Math.abs(m[0] - est.alto) + Math.abs(m[1] - est.ancho);
			if (x < dist) { dist = x; mejor = j; }
		});
		var lis = d.medidas.map(function (m, j) {
			var paso = m[2] ? 'paso ' + m[2] + ' × ' + m[3] + ' cm' : (m[3] ? 'paso de ' + m[3] + ' cm de ancho' : '');
			return '<li' + (j === mejor ? ' class="cerca"' : '') + '><strong>' + m[0] + ' × ' + m[1] + ' cm</strong>' + (paso ? '<span>' + paso + '</span>' : '') + '</li>';
		}).join('');
		var m = d.medidas[mejor];
		caja.innerHTML = '<p class="med-estandar-tit">Medidas estándar de ' + esc(d.la) + ' <small>(block completo, alto × ancho)</small></p><ul>' + lis + '</ul><p>'
			+ (m ? 'La que más se parece a tu hueco es la de ' + m[0] + ' × ' + m[1] + ' cm. Es solo una referencia: la medida buena la tomamos en tu casa. ' : '')
			+ (d.aMedida ? 'Esta puerta se fabrica casi a cualquier medida.' : 'Si ninguna encaja, se pide una medida especial a fábrica.') + '</p>';
	}
	function texto() {
		var l = ['Hola, os paso las medidas de mi puerta, tomadas con la guía de la web:'];
		l.push('- Ahora hay ' + (est.ahora === 'hueco' ? 'un hueco sin puerta' : 'una puerta que quiero cambiar'));
		l.push('- Ancho: ' + (valor('ancho') || 'sin medir'));
		l.push('- Alto: ' + (valor('alto') || 'sin medir'));
		l.push('- Grosor de la pared: ' + (valor('grosor') || 'sin medir'));
		l.push('- Abre hacia ' + (est.abre ? (est.abre === 'fuera' ? 'fuera' : 'dentro') : 'dentro o fuera (sin indicar)'));
		l.push('- Cerradura ' + (est.lado ? (est.lado === 'izq' ? 'a la izquierda' : 'a la derecha') + ', vista desde fuera' : 'sin indicar'));
		if (datos[est.puerta]) l.push('- Me interesa ' + datos[est.puerta].la);
		l.push('', 'Me gustaría recibir presupuesto.');
		return l.join('\n');
	}
	if (sel) {
		sel.value = est.puerta;
		sel.addEventListener('change', function () { est.puerta = sel.value; resumen(); });
	}

	/* ---------- botones */
	form.addEventListener('click', function (e) {
		var b = e.target.closest ? e.target.closest('[data-ir]') : null;
		if (b && form.contains(b)) { ir(ORDEN.indexOf(b.getAttribute('data-ir')), true); return; }
		if (e.target.closest && e.target.closest('[data-med-atras]')) { ir(est.i - 1, true); return; }
		if (e.target.closest && e.target.closest('[data-med-reiniciar]')) {
			form.reset();
			est.ahora = 'puerta'; est.ancho = est.alto = est.grosor = null; est.abre = est.lado = '';
			var r0 = form.querySelector('input[name="ahora"][value="puerta"]'); if (r0) r0.checked = true;
			if (sel) sel.value = est.puerta;
			Array.prototype.forEach.call(form.querySelectorAll('.med-aviso'), function (a) { a.textContent = ''; });
			ir(0, true);
			return;
		}
		var copiar = e.target.closest ? e.target.closest('[data-med-copiar]') : null;
		if (copiar) {
			var t = texto();
			var listo = function () { copiar.textContent = 'Copiadas'; setTimeout(function () { copiar.textContent = 'Copiar las medidas'; }, 2200); };
			var aMano = function () {
				var ta = document.createElement('textarea');
				ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
				document.body.appendChild(ta); ta.select();
				try { if (document.execCommand('copy')) listo(); } catch (err) { /* nada */ }
				document.body.removeChild(ta);
			};
			if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(listo, aMano); else aMano();
		}
	});
	/* Intro en un campo o «Siguiente» */
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		if (est.i < ORDEN.length - 1) ir(est.i + 1, true);
	});

	/* ---------- arranque */
	var r0 = form.querySelector('input[name="ahora"][value="puerta"]');
	if (r0) r0.checked = true;
	form.classList.add('med-listo');
	progreso.hidden = false;
	nav.hidden = false;
	ir(0, false);
})();
