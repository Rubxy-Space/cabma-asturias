/* CABMA Asturias: comparador de puertas. Hasta tres puertas lado a lado (dos en el movil), con los datos de las
   fichas tecnicas de CABMA (#cmpz-datos). La seleccion va en la direccion (?p=thor-20-plus,premium-4c,premium-5c). */
(function () {
	'use strict';
	var raiz = document.querySelector('[data-comparador]');
	if (!raiz) return;
	var datos;
	try { datos = JSON.parse(document.getElementById('cmpz-datos').textContent); } catch (err) { return; }
	var orden = Object.keys(datos);
	var sels = Array.prototype.slice.call(raiz.querySelectorAll('.cmpz-sel select'));
	var tabla = raiz.querySelector('.cmpz-tabla'), cab = raiz.querySelector('.cmpz-cab'), cuerpo = raiz.querySelector('.cmpz-cuerpo');
	var dif = raiz.querySelector('[data-diferencias]');
	var movil = window.matchMedia('(max-width: 700px)');
	var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var q = (location.search.match(/[?&]p=([^&]+)/) || [])[1];
	var eleg = (q ? decodeURIComponent(q).split(',') : []).filter(function (s, i, a) { return datos[s] && a.indexOf(s) === i; });
	['thor-20-plus', 'premium-4c', 'premium-5c', 'thor-20', 'premium-3c'].forEach(function (s) { if (eleg.length < 3 && eleg.indexOf(s) < 0 && datos[s]) eleg.push(s); });
	eleg = eleg.slice(0, 3);

	function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
	function n() { return movil.matches ? 2 : 3; }
	var ND = '<span class="cmpz-nd">No indicado</span>';

	/* valores: html y valor para comparar */
	function grado(d) {
		if (!/^\d$/.test(d.grado)) return { h: ND, v: '' };
		var g = +d.grado, seg = '';
		for (var i = 1; i <= 6; i++) seg += '<span class="' + (i <= g ? 'on' : '') + '"></span>';
		return { h: '<div class="cmpz-nivel" role="img" aria-label="Grado ' + g + ' de 6">' + seg + '</div><strong class="cmpz-grande">Grado ' + g + '</strong>', v: g };
	}
	function clase(d) {
		if (!/^[ABC]$/.test(d.clase)) return { h: ND, v: '' };
		var p = ['A', 'B', 'C'].map(function (c) { return '<span class="' + (c === d.clase ? 'on' : '') + '">' + c + '</span>'; }).join('');
		return { h: '<div class="cmpz-clase" role="img" aria-label="Clase ' + d.clase + '">' + p + '</div>', v: d.clase.charCodeAt(0) - 64 };
	}
	function puntos(d) { return d.puntos ? { h: '<strong class="cmpz-grande">' + d.puntos + '</strong>', v: d.puntos } : { h: ND, v: '' }; }
	function texto(k) { return function (d) { var t = d[k]; return !t || t === 'No indicado' || t === 'No indicada' ? { h: ND, v: '' } : { h: esc(t), v: t }; }; }
	function cilindro(d) { return d.cilindro ? { h: '<a class="v2-enlace" href="' + esc(d.cilindro.url) + '">' + esc(d.cilindro.nombre) + '</a>', v: d.cilindro.nombre } : { h: esc(d.bombillo), v: d.bombillo }; }
	function medidas(d) {
		var h = '<ul class="cmpz-lista">' + d.medidas.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
		if (d.aMedida) h += '<p class="cmpz-nota">' + esc(d.aMedida) + '</p>';
		return { h: h, v: d.medidas.join('|') + (d.aMedida || '') };
	}
	var FILAS = [
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

	function pintar() {
		var c = n(), vis = eleg.slice(0, c);
		tabla.setAttribute('data-cols', c);
		sels.forEach(function (s, i) { s.closest('.cmpz-elige').hidden = i >= c; if (i < eleg.length) s.value = eleg[i]; });
		cab.innerHTML = vis.map(function (s) {
			var d = datos[s];
			return '<div class="cmpz-col" role="columnheader">' +
				'<a class="cmpz-foto" href="' + esc(d.ficha) + '"><img src="' + esc(d.foto) + '" alt="' + esc(d.nombre) + '" loading="lazy"></a>' +
				'<span class="v2-chip">' + esc(d.chip) + '</span><h3>' + esc(d.nombre) + '</h3><p>' + esc(d.tipo) + '</p></div>';
		}).join('');
		var html = '';
		FILAS.forEach(function (fila) {
			if (fila.grupo) { html += '<div class="cmpz-grupo" role="row"><h2 role="rowheader">' + esc(fila.grupo) + '</h2></div>'; return; }
			var vals = vis.map(function (s) { return fila.f(datos[s]); });
			var iguales = vals.every(function (v) { return String(v.v) === String(vals[0].v); });
			var max = null;
			/* «La más alta» solo si todas las puertas tienen el dato: con uno sin indicar no se puede saber */
			var todos = vals.every(function (v) { return v.v !== ''; });
			if (fila.alta && !iguales && todos) vals.forEach(function (v) { if (max === null || v.v > max) max = v.v; });
			html += '<div class="cmpz-fila' + (iguales ? ' igual' : '') + '" role="row">' +
				(fila.sinTitulo ? '<span class="v2-sr" role="rowheader">' + esc(fila.t) + '</span>' : '<div class="cmpz-et" role="rowheader"><strong>' + esc(fila.t) + '</strong>' + (fila.s ? '<small>' + esc(fila.s) + '</small>' : '') + '</div>') +
				'<div class="cmpz-vals">' + vals.map(function (v) {
					var alta = max !== null && v.v === max;
					return '<div class="cmpz-val' + (alta ? ' alta' : '') + '" role="cell">' + v.h + (alta ? '<span class="cmpz-alta">La más alta</span>' : '') + '</div>';
				}).join('') + '</div></div>';
		});
		html += '<div class="cmpz-fila cmpz-acc" role="row"><span class="v2-sr" role="rowheader">Acciones</span><div class="cmpz-vals">' + vis.map(function (s) {
			var d = datos[s];
			return '<div class="cmpz-val" role="cell"><a class="v2-btn" href="' + esc(d.presupuesto) + '">Pedir presupuesto</a><a class="v2-enlace" href="' + esc(d.ficha) + '">Ver la ficha</a><a class="v2-enlace" href="' + esc(d.disena) + '">Diseñarla en 3D</a></div>';
		}).join('') + '</div></div>';
		cuerpo.innerHTML = html;
		tabla.classList.toggle('cmpz-solo-dif', !!(dif && dif.checked));
		Array.prototype.forEach.call(raiz.querySelectorAll('[data-comparar]'), function (b) {
			b.setAttribute('aria-pressed', vis.indexOf(b.getAttribute('data-comparar')) >= 0 ? 'true' : 'false');
		});
		try { history.replaceState(null, '', location.pathname + '?p=' + eleg.join(',')); } catch (err) { /* sin historial */ }
	}

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
})();
