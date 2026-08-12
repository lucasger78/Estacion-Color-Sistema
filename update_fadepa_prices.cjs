const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const envContent = fs.readFileSync("c:\\Users\\Majo\\Desktop\\LUCAS PC\\Disco 1\\Lucas\\La Evolución\\Proyectos\\Estacion Color Sistema\\estacion-color-stock\\.env","utf8");
const env = {};
envContent.split("\n").forEach(line => { const i = line.indexOf("="); if (i > 0) env[line.slice(0,i).trim()] = line.slice(i+1).trim(); });
const supabase = createClient(env["VITE_SUPABASE_URL"],"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cGxtb2xnbmt0bWxtcWN1bHpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgzNjU1MCwiZXhwIjoyMDk1NDEyNTUwfQ.CD53iFmhb7UF9dbyIPvVmDm9KugzztyMf0lTiYWQghM");

function parseEs(s){ return parseFloat((s||"").trim().replace(/\./g,"").replace(",","."))||0; }

function norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(); }

function scoreMatch(a,b){ const wa=new Set(a.split(" ").filter(w=>w.length>1)); const wb=new Set(b.split(" ").filter(w=>w.length>1)); if(!wa.size)return 0; let m=0; for(const w of wa) if(wb.has(w))m++; return m/wa.size; }

const PDF=[
["Triple Accion Blanco Brillante x 1000cc",12392.19],["Triple Accion Blanco Brillante x 500cc",6725.70],["Triple Accion Blanco Brillante x 250cc",3303.07],["Triple Accion Blanco Brillante x 4000cc",38221.31],
["Triple Accion Blanco Satinado x 1000cc",9164.76],["Triple Accion Blanco Satinado x 500cc",5238.79],["Triple Accion Blanco Satinado x 250cc",3185.58],["Triple Accion Blanco Satinado x 4000cc",33552.74],
["Esmalte Sint. Blanco x 1000cc",7931.32],["Esmalte Sint. Blanco x 500cc",4520.55],["Esmalte Sint. Blanco x 250cc",2766.07],["Esmalte Sint. Blanco x 4000cc",30242.75],
["Esmalte Sint. Blanco Mate x 1000cc",7664.64],["Esmalte Sint. Blanco Mate x 500cc",4336.84],["Esmalte Sint. Blanco Mate x 250cc",2614.78],["Esmalte Sint. Blanco Mate x 4000cc",28115.88],
["Triple Accion Negro Brillante x 1000cc",7422.94],["Triple Accion Negro Brillante x 500cc",4266.58],["Triple Accion Negro Brillante x 250cc",2639.26],["Triple Accion Negro Brillante x 4000cc",26852.46],
["Triple Accion Negro Satinado x 1000cc",7216.52],["Triple Accion Negro Satinado x 500cc",4186.26],["Triple Accion Negro Satinado x 250cc",2617.10],["Triple Accion Negro Satinado x 4000cc",26558.34],
["Esmalte Sint. Negro Mate x 1000cc",5863.92],["Esmalte Sint. Negro Mate x 500cc",3440.14],["Esmalte Sint. Negro Mate x 250cc",2183.51],["Esmalte Sint. Negro Mate x 4000cc",20778.60],
["Triple Accion Amarillo x 1000cc",9069.13],["Triple Accion Amarillo x 500cc",5141.58],["Triple Accion Amarillo x 250cc",3095.29],["Triple Accion Amarillo x 4000cc",33772.86],
["Triple Accion Amarillo Mediano x 1000cc",9069.13],["Triple Accion Amarillo Mediano x 500cc",5141.58],["Triple Accion Amarillo Mediano x 250cc",2178.17],["Triple Accion Amarillo Mediano x 4000cc",33772.86],
["Triple Accion Azulejo x 1000cc",7931.32],["Triple Accion Azulejo x 500cc",4520.55],["Triple Accion Azulejo x 250cc",1946.50],["Triple Accion Azulejo x 4000cc",30242.75],
["Triple Accion Azul Marino x 1000cc",7931.32],["Triple Accion Azul Marino x 500cc",4520.55],["Triple Accion Azul Marino x 250cc",2766.07],["Triple Accion Azul Marino x 4000cc",30242.75],
["Triple Accion Azul Traful x 1000cc",7931.32],["Triple Accion Azul Traful x 500cc",4520.55],["Triple Accion Azul Traful x 250cc",1946.50],["Triple Accion Azul Traful x 4000cc",30242.75],
["Triple Accion Beige x 1000cc",7931.32],["Triple Accion Beige x 500cc",4520.55],["Triple Accion Beige x 250cc",2766.07],["Triple Accion Beige x 4000cc",30242.75],
["Triple Accion Bermell x 1000cc",9069.13],["Triple Accion Bermell x 500cc",5141.58],["Triple Accion Bermell x 250cc",3095.29],["Triple Accion Bermell x 4000cc",33772.86],
["Esmalte Sint Cedro x 1000cc",7422.94],["Esmalte Sint Cedro x 500cc",4266.58],["Esmalte Sint Cedro x 250cc",2639.26],["Esmalte Sint Cedro x 4000cc",26852.46],
["Esmalte Sint. Cafe x 1000cc",7422.94],["Esmalte Sint. Cafe x 500cc",4266.58],["Esmalte Sint. Cafe x 250cc",2639.26],["Esmalte Sint. Cafe x 4000cc",26852.46],
["Esmalte Sint. Celeste x 1000cc",7422.94],["Esmalte Sint. Celeste x 500cc",4266.58],["Esmalte Sint. Celeste x 250cc",2639.26],["Esmalte Sint. Celeste x 4000cc",26852.46],
["Triple Accion Grafito x 1000cc",10143.78],["Triple Accion Grafito x 500cc",5481.83],["Triple Accion Grafito x 4000cc",37605.37],
["Triple Accion Gris x 1000cc",7931.32],["Triple Accion Gris x 500cc",4520.55],["Triple Accion Gris x 250cc",2766.07],["Triple Accion Gris x 4000cc",30242.75],
["Triple Accion Gris Espacial x 1000cc",7931.32],["Triple Accion Gris Espacial x 500cc",4520.55],["Triple Accion Gris Espacial x 250cc",2766.07],["Triple Accion Gris Espacial x 4000cc",30242.75],
["Triple Accion Gris Hielo x 1000cc",7931.32],["Triple Accion Gris Hielo x 500cc",4520.55],["Triple Accion Gris Hielo x 250cc",1946.50],["Triple Accion Gris Hielo x 4000cc",30242.75],
["Triple Accion Perla x 1000cc",7931.32],["Triple Accion Perla x 500cc",4520.55],["Triple Accion Perla x 250cc",1946.50],["Triple Accion Perla x 4000cc",30242.75],
["Esmalte Hierro Micaceo x 1000cc",11011.04],["Esmalte Hierro Micaceo x 500cc",5921.20],
["Esmalte Sint. Marfil Champ. x 1000cc",7422.94],["Esmalte Sint. Marfil Champ. x 500cc",4266.58],["Esmalte Sint. Marfil Champ. x 4000cc",26852.46],
["Esmalte Sint. Marfil Seda x 1000cc",7931.32],["Esmalte Sint. Marfil Seda x 500cc",4520.55],["Esmalte Sint. Marfil Seda x 4000cc",30242.75],
["Triple Accion Marron x 1000cc",7422.94],["Triple Accion Marron x 500cc",4266.58],["Triple Accion Marron x 250cc",2639.26],["Triple Accion Marron x 4000cc",26852.46],
["Triple Accion Naranja x 1000cc",9069.13],["Triple Accion Naranja x 500cc",5141.58],["Triple Accion Naranja x 4000cc",33772.86],
["Esmalte Sint. Ocre x 1000cc",7422.94],["Esmalte Sint. Ocre x 500cc",4266.58],["Esmalte Sint. Ocre x 250cc",2639.26],["Esmalte Sint. Ocre x 4000cc",26852.46],
["Esmalte Sint. Tabaco x 1000cc",7422.94],["Esmalte Sint. Tabaco x 500cc",4266.58],["Esmalte Sint. Tabaco x 4000cc",26852.46],
["Esmalte Verde Esmeralda x 1000cc",7422.94],["Esmalte Verde Esmeralda x 500cc",4266.58],["Esmalte Verde Esmeralda x 4000cc",26852.46],
["Triple Accion Verde Ingles x 1000cc",7931.32],["Triple Accion Verde Ingles x 500cc",4520.55],["Triple Accion Verde Ingles x 250cc",2766.07],["Triple Accion Verde Ingles x 4000cc",30242.75],
["Esmalte Sint. Violeta x 1000cc",7422.94],["Esmalte Sint. Violeta x 500cc",4266.58],
["Esmalte Sint. Verde Noche x 1000cc",7422.94],["Esmalte Sint. Verde Noche x 500cc",4266.58],
["Pintura Alta Temperatura Negro x 250cc",8211.93],["Pintura Alta Temperatura Negro x 500cc",15162.95],
["Pintura Alta Temperatura Blanco x 250cc",10753.71],["Pintura Alta Temperatura Blanco x 500cc",19856.24],
["Pintura Alta Temperatura Aluminio x 250cc",3940.79],["Pintura Alta Temperatura Aluminio x 500cc",6520.64],
["Convertidor Negro x 1000cc",8636.07],["Convertidor Negro x 500cc",4928.45],["Convertidor Negro x 4000cc",32589.28],
["Convertidor Blanco x 1000cc",8636.07],["Convertidor Blanco x 500cc",4928.45],["Convertidor Blanco x 4000cc",32589.28],
["Convertidor Colorado x 1000cc",8636.07],["Convertidor Colorado x 500cc",4928.45],["Convertidor Colorado x 4000cc",32589.28],
["Convertidor Gris x 1000cc",8636.07],["Convertidor Gris x 500cc",4928.45],["Convertidor Gris x 4000cc",32589.28],
["Fondo Antiox. Indust. Gris x 1000cc",7442.92],["Fondo Antiox. Indust. Gris x 500cc",4264.36],["Fondo Antiox. Indust. Gris x 4000cc",27083.12],
["Fondo Antiox. Indust. Negro x 1000cc",7442.92],["Fondo Antiox. Indust. Negro x 500cc",4264.36],["Fondo Antiox. Indust. Negro x 4000cc",27083.12],
["Pintura Pizarron Negro x 500cc",3680.41],["Pintura Pizarron Verde x 500cc",3680.41],
["Barniz Marino Brill. x 1000cc",6151.05],["Barniz Marino Brill. x 500cc",3624.24],["Barniz Marino Brill. x 250cc",2312.27],["Barniz Marino Brill. x 4000cc",21702.60],
["Barniz Marino Sat. x 1000cc",6647.63],["Barniz Marino Sat. x 500cc",3856.76],["Barniz Marino Sat. x 250cc",2414.15],["Barniz Marino Sat. x 4000cc",23826.20],
["Barniz Marino Mate x 1000cc",7109.12],["Barniz Marino Mate x 500cc",4185.94],["Barniz Marino Mate x 250cc",2638.52],["Barniz Marino Mate x 4000cc",25305.31],
["Fondo Blanco para Maderas x 1000cc",6287.00],["Fondo Blanco para Maderas x 500cc",3696.07],["Fondo Blanco para Maderas x 4000cc",23072.11],
["Impregnante Cristal Brillante x 1000cc",6188.76],["Impregnante Cristal Brillante x 500cc",3699.85],["Impregnante Cristal Brillante x 4000cc",22645.69],
["Impregnante Cristal Satinado x 1000cc",7286.22],["Impregnante Cristal Satinado x 500cc",4169.31],["Impregnante Cristal Satinado x 4000cc",26308.98],
["Impreg. Acc Mult. Cedro x 1000cc",7286.22],["Impreg. Acc Mult. Cedro x 500cc",4169.31],["Impreg. Acc Mult. Cedro x 4000cc",26308.98],
["Impreg. Acc Mult. Caoba x 1000cc",7286.22],["Impreg. Acc Mult. Caoba x 500cc",4169.31],["Impreg. Acc Mult. Caoba x 4000cc",26308.98],
["Impreg. Acc Mult. Natural x 1000cc",7286.22],["Impreg. Acc Mult. Natural x 500cc",4169.31],["Impreg. Acc Mult. Natural x 4000cc",26308.98],
["Impreg. Acc Mult. Nogal x 1000cc",7286.22],["Impreg. Acc Mult. Nogal x 500cc",4169.31],["Impreg. Acc Mult. Nogal x 4000cc",26308.98],
["Impreg. Roble Oscuro Sat. x 1000cc",7286.22],["Impreg. Roble Oscuro Sat. x 500cc",4169.31],["Impreg. Roble Oscuro Sat. x 4000cc",26308.98],
["Impregnante Roble Claro Brillante x 1000cc",6188.76],["Impregnante Roble Claro Brillante x 500cc",3699.85],["Impregnante Roble Claro Brillante x 4000cc",22645.69],
["Barniz al Agua Brillante x 1000cc",7700.50],["Barniz al Agua Brillante x 500cc",4352.46],
["Barniz al Agua Mate x 1000cc",7700.50],
["Pintura Asfaltica x 1000cc",2924.06],["Pintura Asfaltica x 4000cc",9809.75],["Pintura Asfaltica x 20lts",44426.84],
["Latex Profesional Interior x 1lts",4145.09],["Latex Profesional Interior x 4lts",13428.58],["Latex Profesional Interior x 10lts",31187.76],["Latex Profesional Interior x 20lts",58028.46],
["Latex Profesional Exterior x 1lts",4609.64],["Latex Profesional Exterior x 4lts",15206.49],["Latex Profesional Ext-Int x 10lts",36125.31],["Latex Profesional Ext-Int x 20lts",67997.88],
["Latex Plus Ecol. x 20lts",37275.58],["Latex Plus Ecol. x 10lts",20806.55],["Latex Plus Ecol. x 4lts",9392.79],
["Latex Nacional x 20lts",47339.09],["Latex Nacional x 10lts",25518.73],["Latex Nacional x 4lts",11034.99],
["Dekorativ Cielorraso x 1lts",4498.60],["Dekorativ Cielorraso x 4lts",14462.47],["Dekorativ Cielorraso x 10lts",32823.66],["Dekorativ Cielorraso x 20lts",63883.62],
["Doble Impacto Base Latex x 1lts",4998.10],["Doble Impacto Base Latex x 4lts",16890.39],["Doble Impacto Base Latex x 10lts",40895.67],["Doble Impacto Base Latex x 20lts",80027.77],
["Imperm. p/Frentes y Muros x 1lts",7208.31],["Imperm. p/Frentes y Muros x 4lts",25282.70],["Imperm. p/Frentes y Muros x 10lts",58989.07],["Imperm. p/Frentes y Muros x 20lts",111775.44],
["Concentrado Base Latex P x 1lts",5937.49],["Concentrado Base Latex P x 4lts",20394.84],["Concentrado Base Latex P x 10lts",48989.26],["Concentrado Base Latex P x 20lts",93236.36],
["Manta Fibrada Blanca x 1.25kg",5967.09],["Manta Fibrada Blanca x 5kg",20445.70],["Manta Fibrada Blanca x 10kg",39849.12],["Manta Fibrada Blanca x 20kg",75333.00],
["Membrana Poliuretanica x 5kg",23973.97],["Membrana Poliuretanica x 10kg",46174.24],["Membrana Poliuretanica x 20kg",86574.78],
["Membrana Liquida PU x 1.2kg",4280.44],["Membrana Liquida PU x 4.8kg",15164.98],["Membrana Liquida PU x 12kg",35711.07],["Membrana Liquida PU x 24kg",66094.20],
["Enduido Plastico x 0.5lts",2024.83],["Enduido Plastico x 1lts",3227.55],["Enduido Plastico x 4lts",9478.04],["Enduido Plastico x 10lts",21346.55],["Enduido Plastico x 20lts",38769.31],
["Enduido Masilla Interior x 1.8kg",3048.73],["Enduido Masilla Interior x 7kg",9629.63],["Enduido Masilla Interior x 10lts",20993.89],["Enduido Masilla Interior x 25kg",29018.36],
["Prot. Acril. p/Ladrillos x 1lts",5003.37],["Prot. Acril. p/Ladrillos x 4lts",17422.22],["Prot. Acril. p/Ladrillos x 10lts",39912.09],["Prot. Acril. p/Ladrillos x 20lts",75281.20],
["Latex Ext. Arena India x 1lts",4908.79],["Latex Ext. Arena India x 4lts",17196.26],["Latex Ext. Arena India x 10lts",42352.07],["Latex Ext. Arena India x 20lts",81020.66],
["Latex Ext. Desierto x 1lts",4791.33],["Latex Ext. Desierto x 4lts",16303.32],
["Latex Ext. Fantasma x 1lts",4791.33],["Latex Ext. Fantasma x 4lts",16303.32],["Latex Ext. Fantasma x 10lts",38990.08],["Latex Ext. Fantasma x 20lts",72385.12],
["Latex Ext. Greige x 1lts",4791.33],["Latex Ext. Greige x 4lts",16303.32],["Latex Ext. Greige x 10lts",38990.08],["Latex Ext. Greige x 20lts",72385.12],
["Latex Ext. Humo Blanco x 1lts",4908.79],["Latex Ext. Humo Blanco x 4lts",17196.26],
["Latex Ext. Hojas Otono x 1lts",4791.33],["Latex Ext. Hojas Otono x 4lts",16303.32],
["Latex Ext. Kalua x 1lts",4791.33],["Latex Ext. Kalua x 4lts",16303.32],
["Latex Ext. Oso Polar x 1lts",4908.79],["Latex Ext. Oso Polar x 4lts",17196.26],["Latex Ext. Oso Polar x 10lts",42352.07],["Latex Ext. Oso Polar x 20lts",81020.66],
["Latex Ext. Silueta x 1lts",4908.79],["Latex Ext. Silueta x 4lts",17196.26],["Latex Ext. Silueta x 10lts",42352.07],["Latex Ext. Silueta x 20lts",81020.66],
["Latex Ext. Movidas Nocturnas x 1lts",4791.33],["Latex Ext. Movidas Nocturnas x 4lts",16303.32],["Latex Ext. Movidas Nocturnas x 10lts",38990.08],["Latex Ext. Movidas Nocturnas x 20lts",72385.12],
["Yeso Fadepa x 1kg",1875.95],
["Sellador Fijador x 1lts",3276.32],["Sellador Fijador x 4lts",9859.20],["Sellador Fijador x 10lts",21093.38],["Sellador Fijador x 20lts",40050.01],
["H2O Entonador Negro x 120cc",804.13],["H2O Entonador Amarillo x 120cc",804.13],["H2O Entonador Azul x 120cc",804.13],["H2O Entonador Bermellon x 120cc",804.13],
["H2O Entonador Cedro x 120cc",804.13],["H2O Entonador Marron x 120cc",804.13],["H2O Entonador Naranja x 120cc",804.13],["H2O Entonador Ocre x 120cc",804.13],
["H2O Entonador Siena x 120cc",804.13],["H2O Entonador Verde Claro x 120cc",804.13],["H2O Entonador Verde Oscuro x 120cc",804.13],["H2O Entonador Violeta x 120cc",804.13],
["Pisos Dep. Lava Volcanica x 1lts",5872.73],["Pisos Dep. Lava Volcanica x 4lts",20512.40],
["Pisos Dep. Bermellon x 1lts",5872.73],["Pisos Dep. Bermellon x 4lts",20512.40],
["Pisos Dep. Gris Cemento x 1lts",5872.73],["Pisos Dep. Gris Cemento x 4lts",20512.40],
["Pisos Dep. Blanco x 1lts",5872.73],["Pisos Dep. Blanco x 4lts",20512.40],
["Pisos Dep. Azul x 1lts",5872.73],["Pisos Dep. Azul x 4lts",20512.40],
["Pisos Dep. Borgona x 1lts",5872.73],["Pisos Dep. Borgona x 4lts",20512.40],
["Pisos Dep. Negro x 1lts",5872.73],["Pisos Dep. Negro x 4lts",20512.40],
["Pisos Dep. Verde x 1lts",5872.73],["Pisos Dep. Verde x 4lts",20512.40],
["Pisos Dep. Gris Hielo x 1lts",5872.73],["Pisos Dep. Gris Hielo x 4lts",20512.40],
["Aguarras Fadepa x 900cc",3719.83],["Thinner Fadepa x 900cc",2817.36],["Aguarras Fadepa x 5lts",19501.65],["Diluyente Generico x 900cc",2817.36],
["Pincel Sintetico V2 N10",1168.60],["Pincel Sintetico V2 N15",1386.78],["Pincel Sintetico V2 N20",2176.86],["Pincel Sintetico V2 N25",2442.98],["Pincel Sintetico V2 N30",3500.00],["Pincel Sintetico V2 N3040",4615.70],
["Pincel Condor 710 N10",827.27],["Pincel Condor 710 N15",1169.42],["Pincel Condor 710 N20",1366.94],["Pincel Condor 710 N25",1713.22],["Pincel Condor 710 N30",2319.83],["Pincel Condor 710 N40",3762.81],
["Rodillo Condor Zero Gota 959 N23",3209.09],["Rodillo Condor Pinta Mais 2012 N23",3674.38],["Soporte Rodillo Metal N23",2374.38]
];

async function main(){
  const DRY_RUN=process.argv.includes("--dry-run");
  console.log(DRY_RUN?"🔍 DRY RUN\n":"🚀 ACTUALIZANDO EN SUPABASE\n");

  const {data:prods,error:e1}=await supabase.from("productos").select("id,nombre").eq("marca_id",46);
  if(e1)throw e1;
  const prodMap=new Map(prods.map(p=>[p.id,p.nombre]));

  let allVariants=[];
  for(let i=0;i<prods.length;i+=100){
    const {data:vars,error:e2}=await supabase.from("variantes").select("id,producto_id,variante,precio_sin_iva,precio_mostrador").in("producto_id",prods.slice(i,i+100).map(p=>p.id));
    if(e2)throw e2;
    allVariants.push(...vars);
  }

  const dbNorm=allVariants.map(v=>({...v,key:norm(prodMap.get(v.producto_id)+" "+v.variante),label:prodMap.get(v.producto_id)+" - "+v.variante}));
  console.log("DB variantes:",allVariants.length);
  console.log("PDF lineas:",PDF.length,"\n");

  const updates=[];
  const unmatched=[];
  const used=new Set();

  for(const [desc,sinIva] of PDF){
    const oN=norm(desc);
    let best=null,bestS=0;
    for(const v of dbNorm){
      if(used.has(v.id))continue;
      const s=scoreMatch(oN,v.key);
      if(s>bestS){bestS=s;best=v;}
    }
    if(!best||bestS<0.55){unmatched.push({desc,sinIva,bestS:bestS.toFixed(2),bestName:best?.label});continue;}
    used.add(best.id);
    const conIva=Math.round(sinIva*1.21*100)/100;
    const mostrador=Math.round(conIva*1.20*100)/100;
    updates.push({id:best.id,label:best.label,ocrDesc:desc,score:bestS.toFixed(2),sinIva,conIva,mostrador,old:best.precio_mostrador});
  }

  console.log("✅ MATCHES:",updates.length);
  updates.forEach((u,i)=>console.log(`[${i+1}](${u.score}) "${u.ocrDesc}" → "${u.label}" sinIva=$${u.sinIva} conIva=$${u.conIva} mostrador=$${u.mostrador} (antes=$${u.old})`));

  if(unmatched.length){
    console.log("\n⚠️  SIN MATCH:",unmatched.length);
    unmatched.forEach(u=>console.log(`  score=${u.bestS} "${u.desc}" → "${u.bestName}"`));
  }

  if(!DRY_RUN){
    console.log("\n💾 Actualizando...");
    let ok=0,fail=0;
    for(const u of updates){
      const {error}=await supabase.from("variantes").update({precio_sin_iva:u.sinIva,precio_con_iva:u.conIva,precio_mostrador:u.mostrador,updated_at:new Date().toISOString()}).eq("id",u.id);
      if(error){console.error("❌",u.label,error.message);fail++;}else ok++;
    }
    console.log(`\n✅ OK:${ok} ❌ Errores:${fail}`);
  } else {
    console.log("\n→ Corré sin --dry-run para aplicar.");
  }
}
main().catch(console.error);
