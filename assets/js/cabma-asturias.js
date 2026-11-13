/* CABMA Asturias: carruseles, visor de imagenes, aviso de cookies y formulario (sin dependencias) */
(function () {
	'use strict';

	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- carrusel */
	function Carousel(root, opts) {
		var items = Array.prototype.filter.call(root.children, function (el) { return el.classList.contains('item'); });
		if (!items.length) return;
		var track = document.createElement('div');
		track.className = 'ca-track';
		items.forEach(function (it) { track.appendChild(it); });
		root.insertBefore(track, root.firstChild);
		root.classList.add('ca');
		if (opts.gap) root.classList.add('ca-gap');

		var index = 0, timer = null, paused = false, dots = null;

		function perView() { return opts.perView ? opts.perView(window.innerWidth) : 1; }
		function maxIndex() { return Math.max(0, items.length - perView()); }

		function buildDots() {
			if (!opts.dots) return;
			if (dots) dots.remove();
			var n = maxIndex() + 1;
			if (n < 2) { dots = null; return; }
			dots = document.createElement('div');
			dots.className = 'ca-dots';
			for (var i = 0; i < n; i++) {
				var b = document.createElement('button');
				b.type = 'button';
				b.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
				b.addEventListener('click', (function (k) { return function () { go(k); restart(); }; })(i));
				dots.appendChild(b);
			}
			root.appendChild(dots);
		}

		function layout() {
			var pv = perView();
			items.forEach(function (it) { it.style.flexBasis = (100 / pv) + '%'; });
			buildDots();
			go(Math.min(index, maxIndex()));
		}

		function go(i) {
			var max = maxIndex();
			if (i > max) i = 0;
			if (i < 0) i = max;
			index = i;
			track.style.transform = 'translateX(' + (-index * 100 / perView()) + '%)';
			items.forEach(function (it, k) {
				var visible = k >= index && k < index + perView();
				it.setAttribute('aria-hidden', visible ? 'false' : 'true');
				Array.prototype.forEach.call(it.querySelectorAll('a, button, iframe'), function (el) {
					if (visible) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', '-1');
				});
			});
			if (dots) Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === index ? 'true' : 'false'); });
		}

		function restart() {
			if (timer) clearInterval(timer);
			if (!opts.autoplay || reduceMotion) return;
			timer = setInterval(function () { if (!paused && !document.hidden) go(index + 1); }, opts.autoplay);
		}

		root.addEventListener('mouseenter', function () { paused = true; });
		root.addEventListener('mouseleave', function () { paused = false; });
		root.addEventListener('focusin', function () { paused = true; });
		root.addEventListener('focusout', function () { paused = false; });

		// deslizar con el dedo
		var startX = null;
		root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
		root.addEventListener('touchend', function (e) {
			if (startX === null) return;
			var dx = e.changedTouches[0].clientX - startX;
			if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
			startX = null;
		});

		if (opts.prev) opts.prev.addEventListener('click', function (e) { e.preventDefault(); go(index - 1); restart(); });
		if (opts.next) opts.next.addEventListener('click', function (e) { e.preventDefault(); go(index + 1); restart(); });
		window.addEventListener('resize', layout);
		layout();
		restart();
	}

	document.querySelectorAll('.owl-carousel-inicio').forEach(function (el) {
		new Carousel(el, { autoplay: 4000, dots: true });
	});
	document.querySelectorAll('.owl-carousel-puerta').forEach(function (el) {
		new Carousel(el, { autoplay: 3000, dots: true, gap: true });
	});
	document.querySelectorAll('.fila-puertas .owl-carousel').forEach(function (el) {
		var wrap = el.closest('.fila-puertas');
		new Carousel(el, {
			autoplay: 3000,
			gap: true,
			perView: function (w) { return w >= 1000 ? 4 : (w >= 600 ? 2 : 1); },
			prev: wrap && wrap.querySelector('.customNavigation .prev'),
			next: wrap && wrap.querySelector('.customNavigation .next')
		});
	});

	/* ---------- visor de imagenes (enlaces rel="lightbox") */
	var visor = document.createElement('div');
	visor.className = 'visor';
	visor.hidden = true;
	visor.setAttribute('role', 'dialog');
	visor.setAttribute('aria-modal', 'true');
	visor.innerHTML = '<button type="button" class="visor-cerrar" aria-label="Cerrar">&times;</button><img alt="">';
	document.body.appendChild(visor);
	var visorImg = visor.querySelector('img');
	var ultimoFoco = null;

	function cerrarVisor() {
		visor.hidden = true;
		visorImg.removeAttribute('src');
		if (ultimoFoco) ultimoFoco.focus();
	}
	visor.addEventListener('click', cerrarVisor);
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !visor.hidden) cerrarVisor(); });
	document.addEventListener('click', function (e) {
		var a = e.target.closest && e.target.closest('a[rel~="lightbox"]');
		if (!a || !/\.(jpe?g|png|gif|webp|svg)$/i.test(a.getAttribute('href') || '')) return;
		e.preventDefault();
		ultimoFoco = a;
		var img = a.querySelector('img');
		visorImg.alt = img ? img.alt : '';
		visorImg.src = a.getAttribute('href');
		visor.hidden = false;
		visor.querySelector('.visor-cerrar').focus();
	});

	/* ---------- aviso de cookies */
	var aviso = document.getElementById('aviso-cookies');
	if (aviso) {
		var aceptado = false;
		try { aceptado = window.localStorage.getItem('cabma-asturias-cookies') === 'ok'; } catch (err) { aceptado = false; }
		if (!aceptado) aviso.hidden = false;
		aviso.querySelector('.aviso-cookies-aceptar').addEventListener('click', function () {
			try { window.localStorage.setItem('cabma-asturias-cookies', 'ok'); } catch (err) { /* sin almacenamiento */ }
			aviso.hidden = true;
		});
	}

	/* ---------- formulario de contacto: prepara un correo con los datos */
	document.querySelectorAll('.formulario-contacto').forEach(function (form) {
		var aviso = form.querySelector('.form-aviso');
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var errores = [];
			Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (campo) {
				var ok = campo.type === 'checkbox' ? campo.checked : campo.value.trim() !== '' && campo.checkValidity();
				campo.classList.toggle('campo-error', !ok);
				campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
				if (!ok) errores.push(campo);
			});
			if (errores.length) {
				aviso.className = 'form-aviso error';
				aviso.textContent = 'Revise los campos marcados: son obligatorios y el correo debe ser válido.';
				errores[0].focus();
				return;
			}
			var d = function (n) { var c = form.elements[n]; return c ? c.value.trim() : ''; };
			var destino = form.getAttribute('data-email');
			var porCorreo = function (previo) {
				var cuerpo = 'Nombre: ' + d('nombre') + '\nCorreo: ' + d('email') + '\nTeléfono: ' + (d('telefono') || '-') + '\n\n' + d('consulta');
				window.location.href = 'mailto:' + destino + '?subject=' + encodeURIComponent('[Web] ' + d('asunto')) + '&body=' + encodeURIComponent(cuerpo);
				aviso.className = 'form-aviso ok';
				aviso.textContent = (previo || '') + 'Se ha abierto tu programa de correo con la consulta preparada. Si no se abre, escríbenos a ' + destino + '.';
			};
			/* con un servicio de formularios configurado (data-envio) la consulta se manda desde la web */
			var envio = form.getAttribute('data-envio');
			if (!envio || !window.fetch || !window.FormData) { porCorreo(); return; }
			var gracias = function () {
				form.reset();
				aviso.className = 'form-aviso ok';
				aviso.textContent = 'Gracias. Hemos recibido tu consulta y te contestaremos lo antes posible.';
			};
			if (d('web')) { gracias(); return; } /* campo trampa relleno: es un robot */
			var datos = new FormData(form);
			datos.delete('web');
			datos.append('_subject', '[Web] ' + d('asunto'));
			var boton = form.querySelector('[type="submit"]');
			if (boton) boton.disabled = true;
			aviso.className = 'form-aviso';
			aviso.textContent = 'Enviando…';
			fetch(envio, { method: 'POST', body: datos, headers: { Accept: 'application/json' } })
				.then(function (r) { if (!r.ok) throw new Error(r.status); gracias(); })
				.catch(function () { porCorreo('No se ha podido enviar desde la web. '); })
				.then(function () { if (boton) boton.disabled = false; });
		});
	});
})();
