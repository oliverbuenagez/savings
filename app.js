/* ===== Mis ahorros: lógica de la app ===== */
(function () {
  "use strict";

  var CLAVE = "ahorros_movimientos_v1";

  /* ---------- Estado ---------- */
  var movimientos = cargar();
  var hoy = new Date();
  var mesVisible = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  var fechaSeleccionada = null; // "YYYY-MM-DD"
  var editandoId = null;
  var tipoActual = "ingreso";

  /* ---------- Elementos ---------- */
  var $ = function (id) { return document.getElementById(id); };

  var tituloMes = $("titulo-mes");
  var btnAnterior = $("btn-mes-anterior");
  var btnSiguiente = $("btn-mes-siguiente");
  var resSaldo = $("res-saldo");
  var resIngresos = $("res-ingresos");
  var resGastos = $("res-gastos");
  var resDiasTrab = $("res-dias-trabajados");
  var resDiaMes = $("res-dia-mes");
  var grilla = $("calendario-dias");

  var panel = $("panel-dia");
  var panelTitulo = $("panel-titulo");
  var btnCerrar = $("btn-cerrar-panel");
  var lista = $("lista-movimientos");
  var sinMov = $("sin-movimientos");
  var formTitulo = $("form-titulo");
  var btnTipoIngreso = $("btn-tipo-ingreso");
  var btnTipoGasto = $("btn-tipo-gasto");
  var inputValor = $("input-valor");
  var inputNota = $("input-nota");
  var atajos = $("atajos");
  var btnGuardar = $("btn-guardar");
  var btnCancelarEdicion = $("btn-cancelar-edicion");

  var btnExportar = $("btn-exportar");
  var btnImportar = $("btn-importar");
  var inputImportar = $("input-importar");

  var btnHistorial = $("btn-historial");
  var panelHistorial = $("panel-historial");
  var btnCerrarHistorial = $("btn-cerrar-historial");
  var periodoSelector = $("periodo-selector");
  var histIngresos = $("hist-ingresos");
  var histGastos = $("hist-gastos");
  var histSaldo = $("hist-saldo");
  var histPromedio = $("hist-promedio");
  var histGrafico = $("hist-grafico");
  var histLista = $("hist-lista");
  var histSinDatos = $("hist-sin-datos");

  /* ---------- Almacenamiento ---------- */
  function cargar() {
    try {
      var texto = localStorage.getItem(CLAVE);
      var datos = texto ? JSON.parse(texto) : [];
      return Array.isArray(datos) ? datos.filter(movimientoValido) : [];
    } catch (e) {
      return [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(movimientos));
    } catch (e) {
      alert("No se pudo guardar en este navegador. Revisa que no estés en modo incógnito.");
    }
  }

  function movimientoValido(m) {
    return m &&
      typeof m.id === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(m.fecha) &&
      (m.tipo === "ingreso" || m.tipo === "gasto") &&
      typeof m.valor === "number" && m.valor > 0;
  }

  /* ---------- Utilidades ---------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function claveFecha(anio, mes, dia) {
    // mes: 0-11
    return anio + "-" + pad(mes + 1) + "-" + pad(dia);
  }

  function fechaDesdeClave(clave) {
    var p = clave.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function formatoPesos(n) {
    var negativo = n < 0;
    var texto = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (negativo ? "-$" : "$") + texto;
  }

  function formatoCorto(n) {
    if (n >= 1000) {
      var k = Math.round(n / 100) / 10;
      return String(k).replace(".", ",") + "k";
    }
    return String(n);
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function movimientosDelMes(anio, mes) {
    var prefijo = anio + "-" + pad(mes + 1) + "-";
    return movimientos.filter(function (m) { return m.fecha.indexOf(prefijo) === 0; });
  }

  function movimientosDelDia(fecha) {
    return movimientos.filter(function (m) { return m.fecha === fecha; });
  }

  /* ---------- Render: resumen ---------- */
  function renderResumen() {
    var anio = mesVisible.getFullYear();
    var mes = mesVisible.getMonth();
    var delMes = movimientosDelMes(anio, mes);

    var ingresos = 0;
    var gastos = 0;
    var diasTrabajados = {};

    delMes.forEach(function (m) {
      if (m.tipo === "ingreso") {
        ingresos += m.valor;
        diasTrabajados[m.fecha] = true;
      } else {
        gastos += m.valor;
      }
    });

    var saldo = ingresos - gastos;
    var diasEnMes = new Date(anio, mes + 1, 0).getDate();

    var diaActual;
    var esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth();
    var mesPasado = new Date(anio, mes, 1) < new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (esMesActual) diaActual = hoy.getDate();
    else if (mesPasado) diaActual = diasEnMes;
    else diaActual = 0;

    resSaldo.textContent = formatoPesos(saldo);
    resSaldo.classList.toggle("es-negativo", saldo < 0);
    resIngresos.textContent = formatoPesos(ingresos);
    resGastos.textContent = formatoPesos(gastos);
    resDiasTrab.textContent = Object.keys(diasTrabajados).length;
    resDiaMes.textContent = diaActual + " de " + diasEnMes;
  }

  /* ---------- Render: calendario ---------- */
  function renderCalendario() {
    var anio = mesVisible.getFullYear();
    var mes = mesVisible.getMonth();

    tituloMes.textContent = mesVisible.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

    var primerDia = new Date(anio, mes, 1).getDay(); // 0 = domingo
    var desfase = (primerDia + 6) % 7; // semana empieza en lunes
    var diasEnMes = new Date(anio, mes + 1, 0).getDate();
    var claveHoy = claveFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    grilla.textContent = "";

    for (var i = 0; i < desfase; i++) {
      var vacio = document.createElement("span");
      vacio.className = "dia dia-vacio";
      grilla.appendChild(vacio);
    }

    for (var d = 1; d <= diasEnMes; d++) {
      var fecha = claveFecha(anio, mes, d);
      var delDia = movimientosDelDia(fecha);
      var ingreso = 0;
      var gasto = 0;
      delDia.forEach(function (m) {
        if (m.tipo === "ingreso") ingreso += m.valor;
        else gasto += m.valor;
      });

      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "dia";
      boton.dataset.fecha = fecha;

      if (fecha === claveHoy) boton.classList.add("dia-hoy");
      if (ingreso > 0) boton.classList.add("dia-ingreso");
      if (gasto > 0) boton.classList.add("dia-gasto");

      var numero = document.createElement("span");
      numero.className = "dia-numero";
      numero.textContent = d;
      boton.appendChild(numero);

      var monto = document.createElement("span");
      monto.className = "dia-monto";
      if (ingreso > 0) monto.textContent = formatoCorto(ingreso);
      else if (gasto > 0) monto.textContent = "-" + formatoCorto(gasto);
      boton.appendChild(monto);

      var etiqueta = d + " de " + mesVisible.toLocaleDateString("es-CL", { month: "long" });
      if (ingreso > 0) etiqueta += ", pago " + formatoPesos(ingreso);
      if (gasto > 0) etiqueta += ", gasto " + formatoPesos(gasto);
      boton.setAttribute("aria-label", etiqueta);

      grilla.appendChild(boton);
    }
  }

  function renderTodo() {
    renderCalendario();
    renderResumen();
  }

  /* ---------- Panel del día ---------- */
  function abrirPanel(fecha) {
    fechaSeleccionada = fecha;
    reiniciarFormulario();
    renderPanel();
    if (typeof panel.showModal === "function") panel.showModal();
    else panel.setAttribute("open", "");
  }

  function cerrarPanel() {
    if (typeof panel.close === "function") panel.close();
    else panel.removeAttribute("open");
    fechaSeleccionada = null;
    editandoId = null;
  }

  function renderPanel() {
    var fecha = fechaDesdeClave(fechaSeleccionada);
    panelTitulo.textContent = fecha.toLocaleDateString("es-CL", {
      weekday: "long", day: "numeric", month: "long"
    });

    var delDia = movimientosDelDia(fechaSeleccionada);
    lista.textContent = "";
    sinMov.hidden = delDia.length > 0;

    delDia.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "movimiento";

      var info = document.createElement("div");
      info.className = "mov-info";

      var tipo = document.createElement("div");
      tipo.className = "mov-tipo";
      tipo.textContent = m.tipo === "ingreso" ? "Pago" : "Gasto";

      var nota = document.createElement("div");
      nota.className = "mov-nota";
      nota.textContent = m.nota || "Sin nota";

      info.appendChild(tipo);
      info.appendChild(nota);

      var valor = document.createElement("div");
      valor.className = "mov-valor " + m.tipo;
      valor.textContent = (m.tipo === "gasto" ? "-" : "+") + formatoPesos(m.valor);

      var acciones = document.createElement("div");
      acciones.className = "mov-acciones";

      var editar = document.createElement("button");
      editar.type = "button";
      editar.textContent = "Editar";
      editar.dataset.accion = "editar";
      editar.dataset.id = m.id;

      var borrar = document.createElement("button");
      borrar.type = "button";
      borrar.className = "borrar";
      borrar.textContent = "Borrar";
      borrar.dataset.accion = "borrar";
      borrar.dataset.id = m.id;

      acciones.appendChild(editar);
      acciones.appendChild(borrar);

      li.appendChild(info);
      li.appendChild(valor);
      li.appendChild(acciones);
      lista.appendChild(li);
    });
  }

  /* ---------- Formulario ---------- */
  function fijarTipo(tipo) {
    tipoActual = tipo;
    btnTipoIngreso.classList.toggle("activo", tipo === "ingreso");
    btnTipoGasto.classList.toggle("activo", tipo === "gasto");
    atajos.hidden = tipo !== "ingreso";
  }

  function reiniciarFormulario() {
    editandoId = null;
    fijarTipo("ingreso");
    inputValor.value = "";
    inputNota.value = "";
    formTitulo.textContent = "Agregar movimiento";
    btnGuardar.textContent = "Guardar";
    btnCancelarEdicion.hidden = true;
  }

  function valorNumerico() {
    var soloDigitos = inputValor.value.replace(/\D/g, "");
    return soloDigitos ? parseInt(soloDigitos, 10) : 0;
  }

  function formatearInputValor() {
    var n = valorNumerico();
    inputValor.value = n > 0 ? formatoPesos(n) : "";
  }

  function guardarMovimiento() {
    var valor = valorNumerico();
    if (valor <= 0) {
      inputValor.focus();
      return;
    }
    var nota = inputNota.value.trim();

    if (editandoId) {
      movimientos.forEach(function (m) {
        if (m.id === editandoId) {
          m.tipo = tipoActual;
          m.valor = valor;
          m.nota = nota;
        }
      });
    } else {
      movimientos.push({
        id: nuevoId(),
        fecha: fechaSeleccionada,
        tipo: tipoActual,
        valor: valor,
        nota: nota
      });
    }

    guardar();
    reiniciarFormulario();
    renderPanel();
    renderTodo();
  }

  function empezarEdicion(id) {
    var m = movimientos.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    editandoId = id;
    fijarTipo(m.tipo);
    inputValor.value = formatoPesos(m.valor);
    inputNota.value = m.nota || "";
    formTitulo.textContent = "Editar movimiento";
    btnGuardar.textContent = "Guardar cambios";
    btnCancelarEdicion.hidden = false;
    inputValor.focus();
  }

  function borrarMovimiento(id) {
    if (!confirm("¿Borrar este movimiento?")) return;
    movimientos = movimientos.filter(function (m) { return m.id !== id; });
    guardar();
    if (editandoId === id) reiniciarFormulario();
    renderPanel();
    renderTodo();
  }

  /* ---------- Historial ---------- */
  var periodoMeses = 6;

  function abrirDialogo(d) {
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  }

  function cerrarDialogo(d) {
    if (typeof d.close === "function") d.close();
    else d.removeAttribute("open");
  }

  function totalesMes(anio, mes) {
    var delMes = movimientosDelMes(anio, mes);
    var ingresos = 0;
    var gastos = 0;
    var dias = {};
    delMes.forEach(function (m) {
      if (m.tipo === "ingreso") {
        ingresos += m.valor;
        dias[m.fecha] = true;
      } else {
        gastos += m.valor;
      }
    });
    return {
      anio: anio,
      mes: mes,
      ingresos: ingresos,
      gastos: gastos,
      saldo: ingresos - gastos,
      dias: Object.keys(dias).length,
      cantidad: delMes.length
    };
  }

  function alturaBarra(valor, maximo) {
    if (maximo <= 0 || valor <= 0) return "0%";
    return Math.max(3, Math.round((valor / maximo) * 100)) + "%";
  }

  function renderHistorial() {
    var botones = periodoSelector.querySelectorAll("button[data-meses]");
    Array.prototype.forEach.call(botones, function (b) {
      b.classList.toggle("activo", Number(b.dataset.meses) === periodoMeses);
    });

    var meses = [];
    for (var i = periodoMeses - 1; i >= 0; i--) {
      var f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push(totalesMes(f.getFullYear(), f.getMonth()));
    }

    var totIngresos = 0;
    var totGastos = 0;
    var conDatos = 0;
    var maximo = 0;
    meses.forEach(function (t) {
      totIngresos += t.ingresos;
      totGastos += t.gastos;
      if (t.cantidad > 0) conDatos++;
      maximo = Math.max(maximo, t.ingresos, t.gastos);
    });

    var saldo = totIngresos - totGastos;
    histIngresos.textContent = formatoPesos(totIngresos);
    histGastos.textContent = formatoPesos(totGastos);
    histSaldo.textContent = formatoPesos(saldo);
    histSaldo.classList.toggle("negativo", saldo < 0);
    histSaldo.classList.toggle("positivo", saldo >= 0);
    histPromedio.textContent = conDatos > 0 ? formatoPesos(Math.round(totIngresos / conDatos)) : "$0";

    // Gráfico de barras
    histGrafico.textContent = "";
    meses.forEach(function (t) {
      var fecha = new Date(t.anio, t.mes, 1);
      var nombreCorto = fecha.toLocaleDateString("es-CL", { month: "short" }).replace(".", "");
      var nombreLargo = fecha.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

      var col = document.createElement("div");
      col.className = "grafico-col";
      col.setAttribute("title", nombreLargo + ": pagos " + formatoPesos(t.ingresos) + ", gastos " + formatoPesos(t.gastos));

      var barras = document.createElement("div");
      barras.className = "grafico-barras";

      var bi = document.createElement("div");
      bi.className = "barra barra-ingreso";
      bi.style.height = alturaBarra(t.ingresos, maximo);

      var bg = document.createElement("div");
      bg.className = "barra barra-gasto";
      bg.style.height = alturaBarra(t.gastos, maximo);

      barras.appendChild(bi);
      barras.appendChild(bg);

      var etiqueta = document.createElement("span");
      etiqueta.className = "grafico-mes";
      etiqueta.textContent = nombreCorto;

      col.appendChild(barras);
      col.appendChild(etiqueta);
      histGrafico.appendChild(col);
    });

    // Lista mes a mes (el más reciente primero)
    histLista.textContent = "";
    var hayDatos = false;
    meses.slice().reverse().forEach(function (t) {
      if (t.cantidad === 0) return;
      hayDatos = true;

      var fecha = new Date(t.anio, t.mes, 1);
      var li = document.createElement("li");

      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "hist-item";
      boton.dataset.mes = t.anio + "-" + pad(t.mes + 1);

      var nombre = document.createElement("span");
      nombre.className = "hist-item-mes";
      nombre.textContent = fecha.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

      var saldoMes = document.createElement("span");
      saldoMes.className = "hist-item-saldo" + (t.saldo < 0 ? " es-negativo" : "");
      saldoMes.textContent = formatoPesos(t.saldo);

      var detalle = document.createElement("span");
      detalle.className = "hist-item-detalle";
      detalle.textContent = "Ingresó " + formatoPesos(t.ingresos) +
        " · Gastó " + formatoPesos(t.gastos) +
        " · " + t.dias + (t.dias === 1 ? " día" : " días");

      boton.appendChild(nombre);
      boton.appendChild(saldoMes);
      boton.appendChild(detalle);
      li.appendChild(boton);
      histLista.appendChild(li);
    });

    histSinDatos.hidden = hayDatos;
  }

  function abrirHistorial() {
    renderHistorial();
    abrirDialogo(panelHistorial);
  }

  /* ---------- Respaldo ---------- */
  function exportar() {
    var contenido = JSON.stringify({ version: 1, movimientos: movimientos }, null, 2);
    var blob = new Blob([contenido], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "ahorros-respaldo-" + claveFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) + ".json";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importar(archivo) {
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var datos = JSON.parse(lector.result);
        var lista = Array.isArray(datos) ? datos : datos.movimientos;
        if (!Array.isArray(lista)) throw new Error("formato");
        var validos = lista.filter(movimientoValido);
        if (validos.length === 0 && lista.length > 0) throw new Error("sin válidos");

        var mensaje = "Se encontraron " + validos.length + " movimientos.\n\n" +
          "Aceptar: reemplaza todos tus datos actuales por los del respaldo.\n" +
          "Cancelar: no cambia nada.";
        if (!confirm(mensaje)) return;

        movimientos = validos;
        guardar();
        renderTodo();
        alert("Respaldo restaurado.");
      } catch (e) {
        alert("No se pudo leer el archivo. Usa un respaldo creado con esta app.");
      }
    };
    lector.readAsText(archivo);
  }

  /* ---------- Eventos ---------- */
  btnAnterior.addEventListener("click", function () {
    mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);
    renderTodo();
  });

  btnSiguiente.addEventListener("click", function () {
    mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
    renderTodo();
  });

  grilla.addEventListener("click", function (e) {
    var boton = e.target.closest("button.dia");
    if (boton && boton.dataset.fecha) abrirPanel(boton.dataset.fecha);
  });

  lista.addEventListener("click", function (e) {
    var boton = e.target.closest("button[data-accion]");
    if (!boton) return;
    if (boton.dataset.accion === "editar") empezarEdicion(boton.dataset.id);
    if (boton.dataset.accion === "borrar") borrarMovimiento(boton.dataset.id);
  });

  btnTipoIngreso.addEventListener("click", function () { fijarTipo("ingreso"); });
  btnTipoGasto.addEventListener("click", function () { fijarTipo("gasto"); });

  atajos.addEventListener("click", function (e) {
    var boton = e.target.closest("button[data-valor]");
    if (!boton) return;
    inputValor.value = formatoPesos(Number(boton.dataset.valor));
  });

  inputValor.addEventListener("input", formatearInputValor);

  inputValor.addEventListener("keydown", function (e) {
    if (e.key === "Enter") guardarMovimiento();
  });

  inputNota.addEventListener("keydown", function (e) {
    if (e.key === "Enter") guardarMovimiento();
  });

  btnGuardar.addEventListener("click", guardarMovimiento);
  btnCancelarEdicion.addEventListener("click", reiniciarFormulario);
  btnCerrar.addEventListener("click", cerrarPanel);

  // Cerrar al tocar fuera del panel
  panel.addEventListener("click", function (e) {
    if (e.target === panel) cerrarPanel();
  });

  panel.addEventListener("close", function () {
    fechaSeleccionada = null;
    editandoId = null;
  });

  btnHistorial.addEventListener("click", abrirHistorial);
  btnCerrarHistorial.addEventListener("click", function () { cerrarDialogo(panelHistorial); });

  panelHistorial.addEventListener("click", function (e) {
    if (e.target === panelHistorial) cerrarDialogo(panelHistorial);
  });

  periodoSelector.addEventListener("click", function (e) {
    var boton = e.target.closest("button[data-meses]");
    if (!boton) return;
    periodoMeses = Number(boton.dataset.meses);
    renderHistorial();
  });

  histLista.addEventListener("click", function (e) {
    var boton = e.target.closest("button[data-mes]");
    if (!boton) return;
    var partes = boton.dataset.mes.split("-");
    mesVisible = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);
    cerrarDialogo(panelHistorial);
    renderTodo();
  });

  btnExportar.addEventListener("click", exportar);
  btnImportar.addEventListener("click", function () { inputImportar.click(); });
  inputImportar.addEventListener("change", function () {
    if (inputImportar.files && inputImportar.files[0]) importar(inputImportar.files[0]);
    inputImportar.value = "";
  });

  /* ---------- Inicio ---------- */
  renderTodo();
})();
