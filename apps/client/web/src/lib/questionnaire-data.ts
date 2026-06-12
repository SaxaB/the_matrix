import { Question } from "./types";

export const QUESTIONNAIRE: Question[] = [
  {
    id: "q1",
    category: "Horizonte temporal",
    text: "¿Cuál es tu horizonte de inversión?",
    description: "El tiempo que planeas mantener tus inversiones antes de necesitar el dinero.",
    options: [
      { id: "q1a", text: "Menos de 2 años", score: 10 },
      { id: "q1b", text: "Entre 2 y 5 años", score: 40 },
      { id: "q1c", text: "Entre 5 y 10 años", score: 70 },
      { id: "q1d", text: "Más de 10 años", score: 100 },
    ],
  },
  {
    id: "q2",
    category: "Tolerancia al riesgo",
    text: "Si tu portafolio perdiera un 20% en un mes, ¿qué harías?",
    description: "Esta pregunta mide tu reacción emocional ante las pérdidas.",
    options: [
      { id: "q2a", text: "Vendería todo inmediatamente para evitar más pérdidas", score: 10 },
      { id: "q2b", text: "Vendería una parte para reducir el riesgo", score: 35 },
      { id: "q2c", text: "Mantendría mis posiciones y esperaría la recuperación", score: 70 },
      { id: "q2d", text: "Compraría más, aprovechando los precios bajos", score: 100 },
    ],
  },
  {
    id: "q3",
    category: "Objetivos financieros",
    text: "¿Cuál es tu objetivo principal al invertir?",
    options: [
      { id: "q3a", text: "Preservar mi capital y protegerme de la inflación", score: 15 },
      { id: "q3b", text: "Generar ingresos regulares (dividendos, intereses)", score: 40 },
      { id: "q3c", text: "Crecimiento moderado con algo de ingresos", score: 65 },
      { id: "q3d", text: "Maximizar el crecimiento a largo plazo", score: 100 },
    ],
  },
  {
    id: "q4",
    category: "Experiencia",
    text: "¿Cuánta experiencia tienes invirtiendo?",
    options: [
      { id: "q4a", text: "Ninguna, soy completamente nuevo", score: 15 },
      { id: "q4b", text: "Básica, he invertido en fondos o depósitos", score: 40 },
      { id: "q4c", text: "Intermedia, invierto regularmente en acciones y ETFs", score: 70 },
      { id: "q4d", text: "Avanzada, uso derivados y estrategias complejas", score: 100 },
    ],
  },
  {
    id: "q5",
    category: "Situación financiera",
    text: "¿Qué porcentaje de tus ahorros totales planeas invertir?",
    description: "Esto nos ayuda a entender tu capacidad de absorber pérdidas.",
    options: [
      { id: "q5a", text: "Menos del 10%", score: 15 },
      { id: "q5b", text: "Entre 10% y 30%", score: 40 },
      { id: "q5c", text: "Entre 30% y 60%", score: 70 },
      { id: "q5d", text: "Más del 60%", score: 100 },
    ],
  },
  {
    id: "q6",
    category: "Tolerancia al riesgo",
    text: "¿Cómo te sientes con la volatilidad del mercado?",
    options: [
      { id: "q6a", text: "Me genera mucha ansiedad, prefiero estabilidad total", score: 10 },
      { id: "q6b", text: "La tolero si es temporal y no muy pronunciada", score: 40 },
      { id: "q6c", text: "La acepto como parte natural de invertir", score: 70 },
      { id: "q6d", text: "Me motiva, veo oportunidades en la volatilidad", score: 100 },
    ],
  },
  {
    id: "q7",
    category: "Preferencias",
    text: "¿Qué tipo de inversión te resulta más atractiva?",
    options: [
      { id: "q7a", text: "Bonos del gobierno o cuentas de ahorro de alto rendimiento", score: 15 },
      { id: "q7b", text: "Un mix de bonos corporativos y acciones blue-chip", score: 45 },
      { id: "q7c", text: "ETFs indexados al S&P 500 o mercados globales", score: 70 },
      { id: "q7d", text: "Acciones de crecimiento, startups o criptomonedas", score: 100 },
    ],
  },
  {
    id: "q8",
    category: "Situación financiera",
    text: "¿Tienes un fondo de emergencia que cubra al menos 6 meses de gastos?",
    options: [
      { id: "q8a", text: "No, y es mi prioridad crearlo primero", score: 10 },
      { id: "q8b", text: "Tengo para 3 meses aproximadamente", score: 40 },
      { id: "q8c", text: "Sí, tengo entre 6 y 12 meses cubiertos", score: 70 },
      { id: "q8d", text: "Sí, tengo más de 12 meses y otras fuentes de ingreso", score: 100 },
    ],
  },
  {
    id: "q9",
    category: "Apalancamiento",
    text: "¿Qué relación quieres tener con el apalancamiento (margen, CFDs, futuros, etc.)?",
    description:
      "El apalancamiento amplifica ganancias y pérdidas; no es adecuado para todos los perfiles.",
    options: [
      { id: "q9a", text: "No lo uso ni planeo usarlo; solo efectivo o sin margen", score: 10 },
      { id: "q9b", text: "Solo productos sin apalancamiento o apalancamiento muy bajo y controlado", score: 35 },
      { id: "q9c", text: "Acepto algo de margen o productos apalancados puntuales con límites claros", score: 65 },
      { id: "q9d", text: "Estoy cómodo con margen, CFDs, futuros u opciones apalancadas como parte de mi estrategia", score: 100 },
    ],
  },
  {
    id: "q10",
    category: "Cripto y activos digitales",
    text: "¿Cómo encajan las criptomonedas u otros activos digitales en tu estrategia?",
    options: [
      { id: "q10a", text: "No invierto ni me interesan para mi cartera principal", score: 15 },
      { id: "q10b", text: "Solo exposición muy pequeña o formatos regulados (ETNs, etc.)", score: 40 },
      { id: "q10c", text: "Forman parte relevante pero acotada de la cartera", score: 70 },
      { id: "q10d", text: "Son un pilar importante; asumo su alta volatilidad", score: 100 },
    ],
  },
  {
    id: "q11",
    category: "Mercados internacionales",
    text: "¿Hasta qué punto quieres salir de tu mercado o divisa de referencia?",
    options: [
      { id: "q11a", text: "Casi todo en mercado doméstico y moneda local", score: 20 },
      { id: "q11b", text: "Principalmente EE. UU. y Europa desarrollada", score: 45 },
      { id: "q11c", text: "Incluyo emergentes, Asia u otras regiones de forma deliberada", score: 75 },
      { id: "q11d", text: "Busco activamente diversificación global, divisas y nichos", score: 100 },
    ],
  },
  {
    id: "q12",
    category: "IPOs y nuevas cotizaciones",
    text: "¿Qué opinas de participar en IPOs, SPACs o empresas recién cotizadas?",
    options: [
      { id: "q12a", text: "Las evito; prefiero historial y liquidez probada", score: 15 },
      { id: "q12b", text: "Solo casos muy analizados y con poco peso en cartera", score: 45 },
      { id: "q12c", text: "Me interesan cuando encajan con mi tesis y el riesgo es asumible", score: 75 },
      { id: "q12d", text: "Me gusta seguir salidas a bolsa y nuevas cotizaciones", score: 100 },
    ],
  },
  {
    id: "q13",
    category: "Derivados y productos complejos",
    text: "Más allá de acciones y fondos simples, ¿usas o quieres usar opciones, warrants o productos estructurados?",
    options: [
      { id: "q13a", text: "No; solo acciones, fondos o ETFs sin complejidad añadida", score: 10 },
      { id: "q13b", text: "Coberturas sencillas o productos con folleto muy claro, poco frecuentes", score: 40 },
      { id: "q13c", text: "Estrategias con opciones o estructurados cuando encajan con mi plan", score: 70 },
      { id: "q13d", text: "Los uso con frecuencia para retorno, cobertura o arbitraje", score: 100 },
    ],
  },
  {
    id: "q14",
    category: "Ingresos y dependencia",
    text: "¿En qué medida dependes del rendimiento de tus inversiones para cubrir gastos esenciales?",
    description:
      "Quien depende más del rendimiento suele necesitar menor riesgo en la parte vitalicia.",
    options: [
      { id: "q14a", text: "Casi todo mi presupuesto vital depende del rendimiento de las inversiones", score: 10 },
      { id: "q14b", text: "Una parte importante de gastos corrientes depende del rendimiento", score: 35 },
      { id: "q14c", text: "Cubre extras; lo esencial viene de trabajo, pensiones u otros ingresos", score: 65 },
      { id: "q14d", text: "No cubre gastos esenciales; invierto con horizonte largo y otros ingresos estables", score: 100 },
    ],
  },
  {
    id: "q15",
    category: "Estilo de gestión",
    text: "¿Cómo describirías tu estilo respecto al seguimiento y la operativa?",
    options: [
      { id: "q15a", text: "Compro y mantengo años sin tocar salvo revisiones muy puntuales", score: 25 },
      { id: "q15b", text: "Revisiones trimestrales o anuales, cambios poco frecuentes", score: 45 },
      { id: "q15c", text: "Seguimiento mensual y ajustes cuando hace falta", score: 70 },
      { id: "q15d", text: "Activo: reviso a menudo y opero con cierta frecuencia", score: 100 },
    ],
  },
  {
    id: "q16",
    category: "Inflación y tipos",
    text: "Ante subida de tipos o inflación persistente, ¿qué postura encaja más contigo?",
    options: [
      { id: "q16a", text: "Me inquieta; priorizo capital preservado y deuda de calidad", score: 20 },
      { id: "q16b", text: "Busco equilibrio entre protección y crecimiento", score: 50 },
      { id: "q16c", text: "Ajusto hacia activos que históricamente se benefician de entornos inflacionistas", score: 75 },
      { id: "q16d", text: "Lo incorporo a la tesis y busco oportunidades (sectores, valor, etc.)", score: 100 },
    ],
  },
  {
    id: "q17",
    category: "Patrimonio",
    text: "¿En qué orden de magnitud se sitúa tu patrimonio financiero invertible (aprox., sin contar la vivienda habitual)?",
    description:
      "Rangos orientativos; no necesitas cifra exacta. Sirve ajustar el perfil a tu capacidad de asumir pérdidas.",
    options: [
      { id: "q17a", text: "Menos de 10.000 €", score: 20 },
      { id: "q17b", text: "Entre 10.000 € y 50.000 €", score: 45 },
      { id: "q17c", text: "Entre 50.000 € y 250.000 €", score: 70 },
      { id: "q17d", text: "Más de 250.000 €", score: 100 },
    ],
  },
  {
    id: "q18",
    category: "Ingresos",
    text: "¿Cuál es el orden de magnitud de los ingresos anuales netos de tu unidad familiar (las que declaras o percibes al año)?",
    description:
      "Aproximado. Refleja la estabilidad y holgura con la que afrontas imprevistos.",
    options: [
      { id: "q18a", text: "Menos de 18.000 € al año", score: 25 },
      { id: "q18b", text: "Entre 18.000 € y 45.000 €", score: 45 },
      { id: "q18c", text: "Entre 45.000 € y 90.000 €", score: 70 },
      { id: "q18d", text: "Más de 90.000 € al año", score: 100 },
    ],
  },
  {
    id: "q19",
    category: "Deudas y compromisos",
    text: "Excluyendo hipoteca o préstamos asociados a la vivienda habitual, ¿cómo describirías tu situación de deuda?",
    options: [
      { id: "q19a", text: "Tengo deudas que me generan tensión o riesgo de impago", score: 10 },
      { id: "q19b", text: "Pagos que reducen mucho mi capacidad de ahorro cada mes", score: 35 },
      { id: "q19c", text: "Deudas controladas (tarjetas, préstamos) con cuotas asumibles", score: 65 },
      { id: "q19d", text: "Poca o ninguna deuda; o solo financiación cómoda (coche, etc.)", score: 100 },
    ],
  },
  {
    id: "q20",
    category: "Ahorro",
    text: "¿Cómo es tu capacidad media de ahorro respecto a tus ingresos netos?",
    description:
      "Indica la parte que sueles poder destinar a inversión o reserva, no el gasto corriente.",
    options: [
      { id: "q20a", text: "Casi nada o nada; a veces el mes cierra justo", score: 15 },
      { id: "q20b", text: "Menos del 5 % de mis ingresos netos", score: 35 },
      { id: "q20c", text: "Entre el 5 % y el 15 %", score: 65 },
      { id: "q20d", text: "Más del 15 % o ahorro muy estable mes a mes", score: 100 },
    ],
  },
];
