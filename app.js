function procesarTodo() {
    procesarLogs();
    procesarManuales();
}

function procesarLogs() {
    const text = document.getElementById('logInput').value;
    const lines = text.split('\n');
    let fallos = 0;
    let tiempos = [];
    let fechas = [];
    const regexTime = /(\d+)\s?ms/i;
    const regexDate = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

    lines.forEach(line => {
        if (line.match(/ERROR|EXCEPTION|FAIL/i)) fallos++;
        let matchT = line.match(regexTime);
        if (matchT) tiempos.push(parseInt(matchT[1]));
        let matchD = line.match(regexDate);
        if (matchD) fechas.push(new Date(matchD[0]));
    });

    // MTBF (Fiabilidad)
    let horas = 24;
    if (fechas.length >= 2) horas = Math.abs(fechas[fechas.length-1] - fechas[0]) / 36e5;
    if (horas < 1) horas = 1;
    let mtbf = fallos > 0 ? (horas / fallos) : horas;
    
    // Almacenar globalmente para el reporte (usando atributo data en body es un truco rapido)
    document.body.dataset.mtbf = mtbf;

    let elMtbf = document.getElementById('out-mtbf');
    let elBdgMtbf = document.getElementById('bdg-mtbf');
    elMtbf.innerText = mtbf.toFixed(1) + ' H';
    if(mtbf < 10) { 
        elMtbf.style.color = 'var(--corp-red)'; 
        elBdgMtbf.innerText="CRÍTICO"; 
        elBdgMtbf.style.background='var(--corp-red)'; 
        elBdgMtbf.style.color='#fff';
    } else { 
        elMtbf.style.color = 'var(--corp-black)'; 
        elBdgMtbf.innerText="ÓPTIMO"; 
        elBdgMtbf.style.background='var(--corp-black)';
        elBdgMtbf.style.color='#fff';
    }

    // TPR (Rendimiento)
    let tpr = 0;
    if (tiempos.length > 0) tpr = tiempos.reduce((a,b)=>a+b, 0) / tiempos.length;
    document.body.dataset.tpr = tpr;

    let elTpr = document.getElementById('out-tpr');
    let elBdgTpr = document.getElementById('bdg-tpr');
    elTpr.innerText = tpr.toFixed(0) + ' ms';
     if(tpr > 500) { 
         elTpr.style.color = 'var(--corp-red)'; 
         elBdgTpr.innerText="LENTO"; 
         elBdgTpr.style.background='var(--corp-red)';
         elBdgTpr.style.color='#fff';
    } else { 
        elTpr.style.color = 'var(--corp-black)'; 
        elBdgTpr.innerText="ÓPTIMO"; 
        elBdgTpr.style.background='var(--corp-black)';
        elBdgTpr.style.color='#fff';
    }

    dibujarGrafico(tiempos);
}

function procesarManuales() {
    // ISO 29110 - Procesos
    let plan = v('in-plan'); let real = v('in-real');
    let icp = plan > 0 ? (real/plan)*100 : 0;
    document.getElementById('big-icp').innerText = icp.toFixed(0) + "%";
    document.getElementById('bar-icp').style.width = Math.min(icp, 100) + "%";
    updateCard('icp', icp.toFixed(0)+'%', icp, [50, 85], true);
    document.body.dataset.icp = icp;

    // ISO 9001 - Gestion
    let aud = v('in-aud'); let nc = v('in-nc');
    let rnc = aud > 0 ? (nc/aud)*100 : 0;
    document.getElementById('big-nc').innerText = rnc.toFixed(0) + "%";
    document.getElementById('bar-nc').style.width = Math.min(rnc, 100) + "%";
    updateCard('nc', rnc.toFixed(0)+'%', rnc, [10, 25], false);
    document.body.dataset.rnc = rnc;

    // CISQ - Seguridad
    let vtot = v('in-vtot'); let vcrit = v('in-vcrit');
    let ivc = vtot > 0 ? (vcrit/vtot)*100 : 0;
    updateCard('ivc', ivc.toFixed(1)+'%', ivc, [0.1, 10], false);
    document.body.dataset.ivc = ivc;
    
    let cc = v('in-cc');
    updateCard('cc', cc, cc, [10, 20], false);
    document.body.dataset.cc = cc;

    // ISO 25022 - Efectividad (Tasa de Completitud)
    // Formula: (Tareas Exitosas / Totales) * 100
    let ttot = v('in-ttot'); let tok = v('in-tok');
    let usa = ttot > 0 ? (tok/ttot)*100 : 0;
    updateCard('usa', usa.toFixed(0)+'%', usa, [70, 90], true);
    document.body.dataset.usa = usa;

    // ISO 25022 - Eficiencia
    // Métrica: Comparación con Benchmark. Si Tiempo Real > Benchmark es malo.
    let time = v('in-eff-time');
    let bench = v('in-eff-bench');
    // Calculo inverso: Que tan eficiente es respecto al benchmark (100% = igual, <100% mas lento)
    let eff = time > 0 ? (bench/time)*100 : 0;
    updateCard('eff', eff.toFixed(0)+'%', eff, [60, 95], true);
    document.body.dataset.eff = eff;

    // ISO 25022 - Satisfacción (NPS)
    // NPS = %Promotores - %Detractores
    let prom = v('in-nps-prom');
    let det = v('in-nps-det');
    let nps = prom - det;
    updateCard('nps', nps.toFixed(0), nps, [0, 30], true); // NPS > 30 es bueno, < 0 es critico
    document.body.dataset.nps = nps;
}

function updateCard(id, txt, val, limits, higherIsBetter) {
    let elVal = document.getElementById('kpi-'+id);
    let elSt = document.getElementById('st-'+id);
    let card = document.getElementById('card-'+id);
    elVal.innerText = txt;
    
    let isOk = false;
    const [bad, good] = limits;

    if(higherIsBetter) { isOk = val >= good; } 
    else { isOk = val <= bad; }
    
    if(isOk) {
        card.className = "kpi-card status-ok";
        elSt.innerText = "NORMAL";
        card.dataset.status = "OK";
    } else {
        card.className = "kpi-card status-alert";
        elSt.innerText = "ALERTA";
        card.dataset.status = "ALERT";
    }
}

function v(id) { return parseFloat(document.getElementById(id).value) || 0; }

function dibujarGrafico(data) {
    const canvas = document.getElementById('miGrafico');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid de fondo del canvas
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=20) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=20) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    if (data.length === 0) return;

    const maxVal = Math.max(...data, 100) * 1.2;
    const step = canvas.width / (data.length - 1 || 1);

    // AREA DEL GRAFICO (Relleno Rojo claro)
    ctx.beginPath();
    let startY = canvas.height - (data[0] / maxVal) * canvas.height;
    ctx.moveTo(0, startY);

    data.forEach((val, i) => {
        let x = i * step;
        let y = canvas.height - (val / maxVal) * canvas.height;
        if(data.length===1) ctx.lineTo(canvas.width, y);
        else ctx.lineTo(x, y);
    });

    // Cerrar para relleno
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fillStyle = "rgba(255, 42, 42, 0.1)"; // Rojo muy suave
    ctx.fill();

    // LINEA DEL GRAFICO (Rojo Intenso)
    ctx.beginPath();
    ctx.moveTo(0, startY);
     data.forEach((val, i) => {
        let x = i * step;
        let y = canvas.height - (val / maxVal) * canvas.height;
        if(data.length===1) ctx.lineTo(canvas.width, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.strokeStyle = "#ff2a2a";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- FUNCIONES DE REPORTE ---

function generarReporte() {
    // 1. Recopilar Datos
    const data = document.body.dataset;
    const now = new Date();
    
    let reportText = "";
    reportText += "==================================================\n";
    reportText += " REPORTE INTEGRAL DE CALIDAD DE SOFTWARE (SQA)\n";
    reportText += "==================================================\n";
    reportText += "FECHA: " + now.toLocaleString() + "\n";
    reportText += "SISTEMA: SIGB // CORE\n\n";

    // 2. Interpretación ISO 25022 (Calidad en Uso)
    reportText += ">>> 01. CALIDAD EN USO (ISO/IEC 25022)\n";
    reportText += "--------------------------------------\n";
    
    // Efectividad 
    reportText += "[EFECTIVIDAD] Tasa de Éxito: " + data.usa + "%\n";
    if(parseFloat(data.usa) >= 90) {
        reportText += "INTERPRETACIÓN: Alta efectividad. Los usuarios completan sus tareas sin fricción significativa.\n";
    } else {
        reportText += "INTERPRETACIÓN: ALERTA. Hay barreras de usabilidad que impiden completar flujos críticos.\n";
    }
    reportText += "\n";

    // Eficiencia 
    reportText += "[EFICIENCIA] Índice Relativo al Benchmark: " + data.eff + "%\n";
    if(parseFloat(data.eff) >= 95) {
        reportText += "INTERPRETACIÓN: El sistema es rápido y productivo, igualando o superando estándares.\n";
    } else {
        reportText += "INTERPRETACIÓN: Baja productividad. El sistema requiere más tiempo del esperado para tareas estándar.\n";
    }
    reportText += "\n";

    // Satisfacción 
    reportText += "[SATISFACCIÓN] NPS: " + data.nps + "\n";
    if(parseFloat(data.nps) > 30) {
        reportText += "INTERPRETACIÓN: Excelente percepción del usuario (Zona de Excelencia).\n";
    } else if (parseFloat(data.nps) > 0) {
        reportText += "INTERPRETACIÓN: Aceptable, pero con riesgo de churn (Zona de Crecimiento).\n";
    } else {
        reportText += "INTERPRETACIÓN: CRÍTICO. Hay más detractores que promotores. Revisar UX urgentemente.\n";
    }
    
    // 3. Interpretación Técnica
    reportText += "\n\n>>> 02. SALUD TÉCNICA DEL SISTEMA\n";
    reportText += "--------------------------------------\n";
    
    // MTBF
    let mtbf = parseFloat(data.mtbf);
    reportText += "[FIABILIDAD] MTBF Actual: " + mtbf.toFixed(1) + " Horas\n";
    if(mtbf < 10) reportText += "ESTADO: INESTABLE. Se requieren revisiones de logs de error inmediatas.\n";
    else reportText += "ESTADO: ESTABLE. Continuar monitoreo.\n";

    // Seguridad
    let ivc = parseFloat(data.ivc);
    reportText += "[SEGURIDAD] Vulnerabilidades Críticas: " + ivc.toFixed(1) + "%\n";
    if(ivc > 5) reportText += "ACCIÓN: Auditoría de seguridad requerida. Nivel de riesgo inaceptable.\n";
    else reportText += "ACCIÓN: Mantener parches de seguridad actualizados.\n";

    // 4. Conclusión Final
    reportText += "\n==================================================\n";
    reportText += "CONCLUSIÓN GENERADA AUTOMÁTICAMENTE:\n";
    
    let score = 0;
    if(parseFloat(data.usa) > 85) score++;
    if(parseFloat(data.eff) > 90) score++;
    if(parseFloat(data.nps) > 20) score++;
    if(parseFloat(data.mtbf) > 20) score++;

    if(score >= 3) {
        reportText += "El sistema se encuentra en estado SALUDABLE. Se recomienda mantener las políticas actuales.";
    } else if (score >= 1) {
        reportText += "El sistema requiere ATENCIÓN EN ÁREAS ESPECÍFICAS. Revisar las métricas marcadas en ALERTA.";
    } else {
        reportText += "ESTADO CRÍTICO GENERAL. Se recomienda detener despliegues hasta estabilizar indicadores.";
    }

    // 5. Mostrar Modal
    document.getElementById('report-body').innerText = reportText;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function cerrarReporte() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Inicialización
window.addEventListener('resize', procesarTodo);
document.addEventListener('DOMContentLoaded', procesarTodo);