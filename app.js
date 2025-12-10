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

    // MTBF
    let horas = 24;
    if (fechas.length >= 2) horas = Math.abs(fechas[fechas.length-1] - fechas[0]) / 36e5;
    if (horas < 1) horas = 1;
    let mtbf = fallos > 0 ? (horas / fallos) : horas;
    
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

    // TPR
    let tpr = 0;
    if (tiempos.length > 0) tpr = tiempos.reduce((a,b)=>a+b, 0) / tiempos.length;
    
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
    // ISO 29110
    let plan = v('in-plan'); let real = v('in-real');
    let icp = plan > 0 ? (real/plan)*100 : 0;
    document.getElementById('big-icp').innerText = icp.toFixed(0) + "%";
    document.getElementById('bar-icp').style.width = Math.min(icp, 100) + "%";
    updateCard('icp', icp.toFixed(0)+'%', icp, [50, 85], true);

    // ISO 9001
    let aud = v('in-aud'); let nc = v('in-nc');
    let rnc = aud > 0 ? (nc/aud)*100 : 0;
    document.getElementById('big-nc').innerText = rnc.toFixed(0) + "%";
    document.getElementById('bar-nc').style.width = Math.min(rnc, 100) + "%";
    updateCard('nc', rnc.toFixed(0)+'%', rnc, [10, 25], false);

    // CISQ
    let vtot = v('in-vtot'); let vcrit = v('in-vcrit');
    let ivc = vtot > 0 ? (vcrit/vtot)*100 : 0;
    updateCard('ivc', ivc.toFixed(1)+'%', ivc, [0.1, 10], false);
    
    let cc = v('in-cc');
    updateCard('cc', cc, cc, [10, 20], false);

    // USABILIDAD
    let ttot = v('in-ttot'); let tok = v('in-tok');
    let usa = ttot > 0 ? (tok/ttot)*100 : 0;
    updateCard('usa', usa.toFixed(0)+'%', usa, [70, 90], true);
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
    } else {
        card.className = "kpi-card status-alert";
        elSt.innerText = "ALERTA";
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

// Inicialización
window.addEventListener('resize', procesarTodo);
document.addEventListener('DOMContentLoaded', procesarTodo);
