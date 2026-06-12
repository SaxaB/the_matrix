import type { AppLocale } from "@/lib/i18n/config";
import { messageAtPath } from "@/lib/i18n/t-path";

/** Nested UI strings (Spanish default copy mirrors current product). */
export type MessageTree = Record<string, unknown>;

const ES: MessageTree = {
  language: {
    label: "Idioma",
    es: "Español",
    en: "English",
  },
  nav: {
    dashboard: "Dashboard",
    diagnosis: "Diagnóstico",
    portfolio: "Portafolio",
    analysis: "Análisis",
    explore: "Explorar",
    howItWorks: "Cómo funciona",
    accountMenu: "Menú de cuenta",
    myProfile: "Mi perfil",
    settings: "Ajustes",
    signOut: "Cerrar sesión",
  },
  assetClasses: {
    stocks: "Acciones",
    bonds: "Bonos",
    cash: "Efectivo",
    alternatives: "Alternativos",
  },
  market: {
    impactHigh: "alto",
    impactMed: "medio",
    impactLow: "bajo",
    contextTitle: "Contexto del día",
    updated: "Actualizado",
    macroTz: "macro",
    earningsTz: "resultados",
    macroUnavailable:
      "Calendario macro no disponible ahora{detail}. Los resultados de tu cartera pueden seguir mostrándose abajo.",
    relevantToday:
      "Hay eventos relevantes previstos para hoy (macro de impacto medio o alto, y/o resultados en tus valores).",
    macroSection: "Macro (EE. UU. / internacional)",
    portfolioSection: "Tu cartera (resultados)",
    estimateSuffix: "(fecha estimada)",
    noRelevantToday:
      "No hay eventos relevantes previstos para hoy: ni datos macro de impacto medio o alto en el calendario, ni fechas de resultados de tus valores en renta variable para esta jornada.",
    nextRelevant: "Siguiente evento relevante:",
    macroKind: "Macro",
    earningsKind: "Resultados",
    noNext: "No hay un próximo evento macro o de resultados identificado con los datos disponibles.",
    addEquitiesHint:
      "Añade posiciones en acciones o alternativas en el portafolio para ver aquí las fechas de resultados de tus empresas (datos vía Yahoo Finance).",
    impactWord: "impacto",
  },
  landing: {
    signIn: "Iniciar sesión",
    signUp: "Crear cuenta",
    heroA: "Tu portafolio,",
    heroB: "alineado con tu perfil",
    heroSub:
      "Matrix te guía en cuatro pasos: desde conocer tu perfil de inversor hasta obtener recomendaciones basadas en tu situación real.",
    ctaSignUp: "Crear cuenta",
    ctaHasAccount: "Ya tengo cuenta",
    howTitle: "Cómo funciona",
    howSub:
      "Tras registrarte, la encuesta de perfil solo se muestra la primera vez. Luego accedes al portafolio, al análisis y a las recomendaciones cuando quieras.",
    featuresTitle: "Todo lo que necesitas para invertir mejor",
    featuresSub:
      "Herramientas profesionales de análisis financiero, accesibles para cualquier inversor.",
    ctaBannerTitle: "Empieza a optimizar tu portafolio hoy",
    ctaBannerSub:
      "Completa el cuestionario de perfil de riesgo, carga tus posiciones y obtén recomendaciones personalizadas en minutos.",
    footerTagline: "Análisis de portafolio, exploración de activos y datos de mercado.",
    disclaimer:
      "Esto no constituye asesoramiento financiero. Consulta con un profesional antes de tomar decisiones de inversión.",
    step1Title: "Define tu perfil de inversor",
    step1Desc:
      "Completa una breve encuesta para conocer tu tolerancia al riesgo y tu horizonte. Así sabremos qué cartera te encaja.",
    step2Title: "Introduce tu portafolio",
    step2Desc:
      "Añade tus posiciones (ticker, cantidad, precio medio). Matrix calcula valor, rentabilidad y reparto por clase de activo.",
    step3Title: "Análisis frente a tu perfil",
    step3Desc:
      "Comparamos tu asignación actual con la que encaja tu perfil y te mostramos brechas y métricas clave.",
    step4Title: "Recomendaciones",
    step4Desc:
      "Obtén ideas de rebalanceo alineadas con tu perfil y un contexto claro para decidir con más criterio.",
    feat1Title: "Perfil de Riesgo",
    feat1Desc:
      "Cuestionario de finanzas conductuales que determina tu tolerancia al riesgo y horizonte de inversión.",
    feat2Title: "Auditoría de Portafolio",
    feat2Desc:
      "Analiza tu portafolio actual comparando tu asignación con el portafolio ideal para tu perfil.",
    feat3Title: "Recomendaciones de Rebalanceo",
    feat3Desc:
      "Sugerencias específicas de trades basadas en optimización de media-varianza (Mean-Variance).",
    feat4Title: "Exploración de activos",
    feat4Desc:
      "Profundiza por ticker en cotizaciones, histórico e indicadores, y revisa paneles de fundamentales a partir de información pública y de mercado para contextualizar cada posición.",
  },
  auth: {
    welcomeBack: "Bienvenido de vuelta",
    signInSub: "Inicia sesión para acceder a tu portafolio",
    orEmail: "o con email y contraseña",
    email: "Email",
    password: "Contraseña",
    signingIn: "Iniciando sesión...",
    signIn: "Iniciar Sesión",
    noAccount: "¿No tienes cuenta?",
    register: "Regístrate",
    authNotConfigured: "Autenticación no configurada",
    createTitle: "Crea tu cuenta",
    createSub: "Empieza a analizar tu portafolio con IA",
    signupDivider: "o regístrate con email",
    namePlaceholder: "Tu nombre",
    passwordMinPlaceholder: "Mínimo 6 caracteres",
    fullName: "Nombre completo",
    creating: "Creando cuenta...",
    createAccount: "Crear cuenta",
    hasAccount: "¿Ya tienes cuenta?",
    logIn: "Inicia sesión",
  },
  riskProfiles: {
    conservative: {
      label: "Conservador",
      description:
        "Priorizas la preservación de capital sobre los rendimientos. Prefieres inversiones estables con menor volatilidad, como bonos y depósitos.",
    },
    moderate: {
      label: "Moderado",
      description:
        "Buscas un equilibrio entre crecimiento y seguridad. Aceptas algo de volatilidad a cambio de mejores rendimientos a largo plazo.",
    },
    aggressive: {
      label: "Agresivo",
      description:
        "Buscas maximizar rendimientos a largo plazo. Estás cómodo con alta volatilidad y potenciales pérdidas temporales significativas.",
    },
  },
  onboarding: {
    signOut: "Cerrar sesión",
    backHome: "Volver al inicio",
    riskTitle: "Perfil de Riesgo",
    introSub: "Antes de empezar, lee este aviso",
    understoodContinue: "Entendido, continuar con la encuesta",
    start: "Comenzar encuesta",
    questionOf: "Pregunta {current} de {total}",
    resultTitle: "Tu Perfil de Riesgo",
    resultSub: "Basado en tus respuestas, hemos determinado tu perfil",
    profileLabel: "Perfil",
    scoreLabel: "Puntuación",
    idealTitle: "Asignación Ideal",
    expectedReturn: "Retorno Esperado",
    maxVol: "Volatilidad Máx.",
    ctaPortfolio: "Analizar Mi Portafolio",
    ctaDashboard: "Ir al Dashboard",
    back: "Atrás",
    next: "Siguiente",
    previous: "Anterior",
    questionProgress: "Pregunta {current} de {total}",
  },
  dashboard: {
    title: "Dashboard",
    sub: "Resumen de tu portafolio y métricas clave",
    totalValue: "Valor Total",
    performance: "Rendimiento",
    sharpe: "Sharpe Ratio",
    maxDd: "Max Drawdown",
    sharpeGood: "Bueno",
    sharpePoor: "Mejorable",
    ddControlled: "Controlado",
    ddHigh: "Alto",
    emptyTitle: "Aún no tienes posiciones",
    emptySub:
      "Añade activos en tu portafolio para ver aquí el resumen, gráficos y métricas.",
    goPortfolio: "Ir al portafolio",
    historyHint:
      "El porcentaje bajo valor total y rendimiento refleja la variación desde el primer día del histórico visible ({first}), alineado con la gráfica. Respecto al coste de adquisición de las posiciones actuales: {retPct} ({retAbs}).",
    chartTitle: "Valor del portafolio (histórico)",
    chartSub:
      "Datos guardados por día (máx. 90 días visibles). Sin datos inventados: solo lo registrado al visitar el dashboard, cambiar posiciones o actualizar precios.",
    daysRecorded: "{n} día(s) con registro",
    noHistoryYet: "Sin puntos en el histórico todavía.",
    historyEmptyHint:
      "Cuando exista al menos un día guardado en base de datos, verás la evolución aquí. Si acabas de añadir posiciones, deberías ver un punto tras cargar esta página.",
    singleDayHint:
      "Solo hay registro de un día. El gráfico mostrará la línea cuando haya al menos dos días con datos.",
    tooltipValue: "Valor",
    allocationTitle: "Asignación Actual",
    viewAnalysis: "Ver análisis",
    positionsTitle: "Posiciones",
    thTicker: "Ticker",
    thName: "Nombre",
    thQty: "Cantidad",
    thPrice: "Precio",
    thValue: "Valor",
    thReturn: "Rendimiento",
  },
  analysis: {
    title: "Análisis",
    sub: "Comparación de tu portafolio actual vs. una asignación objetivo calculada con tu puntuación (0–100) y reglas sobre tu encuesta (horizonte, liquidez, tolerancia a caídas, etc.).",
    refresh: "Generar análisis",
    emptyTitle: "Sin datos para comparar",
    emptySub:
      "Añade posiciones en tu portafolio para comparar tu asignación actual con la ideal de tu perfil de riesgo.",
    howTitle: "Cómo leer el objetivo y el rebalanceo",
    howFoot:
      "Las cantidades son orientativas por clase de activo (no sustituyen asesoramiento). Fiscalidad, comisiones, mínimos de inversión y liquidez real pueden impedir un ajuste inmediato al 100% del teórico; conviene rebalancear por tramos y revisar cada posición.",
    concTitle: "Concentración en renta variable",
    concStats:
      "(Top 1: {largest}% · Top 3: {top3}% del total en acciones, {n} posición(es)).",
    equityRiskTitle: "Riesgo intrínseco (renta variable)",
    equityRiskIntro:
      "Puntuación 5–95 por posición (Matrix), ponderada por valor en acciones. Si existe puntuación persistida en BD (ETL etl:ticker-risk), se usa; si no, heurística al vuelo con Yahoo o prior por sector. No es valoración de calidad empresarial ni recomendación de compra o venta. La narrativa con IA por valor se muestra en Explorar; aquí el foco es el hueco agregado.",
    equityWeighted:
      "Riesgo medio ponderado de la RV: {score} · Puntuación de perfil (cuestionario): {profile}.",
    equityHintHigh:
      " La cesta de acciones se ve algo más agresiva o castigada en precio de lo que sugiere solo el cuestionario.",
    equityHintLow:
      " La cesta parece más defensiva que la referencia del cuestionario.",
    equityHintMid: " En línea razonable con el perfil declarado.",
    thPctEq: "% en RV",
    thRisk: "Riesgo",
    thSignals: "Señales",
    alignedGoodTitle: "Tu portafolio está razonablemente alineado",
    alignedBadTitle: "Se detectaron brechas significativas",
    alignedGoodSub:
      "Las desviaciones son menores al 10%. Tu asignación actual es cercana al ideal.",
    alignedBadSub:
      "Tu portafolio tiene una desviación total del {gap}% respecto al ideal. Revisa las recomendaciones de rebalanceo.",
    chartVsIdeal: "Actual vs. ideal",
    radarChart: "Radar de asignación",
    chartActual: "Actual",
    chartIdeal: "Ideal",
    gapDetail: "Detalle de brechas",
    gapActual: "Actual",
    gapIdeal: "Ideal",
    investVerb: "Invertir",
    reduceVerb: "Reducir",
    rebalTitle: "Recomendaciones de rebalanceo",
    rebalSub:
      "Acciones orientativas por clase para acercarte al mix objetivo (modelo determinista en servidor, sin optimización media-varianza sobre correlaciones reales de tus activos).",
    buy: "Comprar",
    sell: "Vender",
    hold: "Mantener",
  },
  portfolio: {
    title: "Mi portafolio",
    sub: "Añade tus posiciones para obtener un análisis personalizado",
    refreshPrices: "Actualizar precios",
    refreshPricesTitle:
      "Fuerza cotización nueva en Alpha Vantage (no solo la caché de 15 min). Plan gratuito ~5 llamadas/min: con muchos tickers unos pueden quedar sin actualizar hasta el siguiente intento.",
    addPosition: "Añadir posición",
    priceRefreshUpdated:
      "Actualizadas {n} posición(es) con cotización en vivo (Alpha Vantage).",
    priceRefreshNoRows:
      "Ninguna fila se actualizó en base de datos. Comprueba que la migración con price_updated_at esté aplicada y revisa la consola del servidor.",
    priceRefreshError: "Error al actualizar precios.",
    summaryTitle: "Resumen del portafolio",
    summaryDeltaHistory:
      "Variación desde {first} (mismo criterio que el dashboard / histórico guardado). Rentabilidad vs coste de las posiciones actuales: {retPct} ({retAbs}).",
    summaryDeltaCostOnly:
      "Rentabilidad vs coste medio de compra. Cuando haya al menos dos días en el histórico de valor, el porcentaje principal seguirá la evolución registrada (como en el dashboard).",
    cost: "Coste",
    positionsLines: "Posiciones (líneas)",
    distribution: "Distribución",
    addForDistribution: "Añade posiciones para ver la distribución",
    analyzeGaps: "Analizar brechas",
    newPosition: "Nueva posición",
    assetType: "Tipo de activo",
    hintStocks:
      "El nombre de la empresa, el precio de mercado actual y el sector se obtienen de Alpha Vantage (y de la caché en base de datos cuando aplica). Indica el ticker cotizado, la cantidad de títulos y tu precio medio de compra.",
    hintBonds:
      "Usa el ticker de un bono cotizado, fondo de renta fija o ETF de bonos. La cantidad son títulos/participaciones y el precio medio es el de compra por título.",
    hintAlternatives:
      "Usa el ticker de un ETF, REIT, materias primas u otro activo alternativo cotizado. La cantidad y el precio medio siguen el mismo criterio que en acciones.",
    hintCash:
      "Registra el saldo en efectivo (cuenta corriente, depósito a la vista, etc.). No se consulta ningún mercado: solo moneda e importe.",
    currency: "Moneda",
    cashAmount: "Importe en efectivo",
    labelTickerBonds: "Ticker (bono / fondo / ETF de renta fija)",
    labelTickerAlt: "Ticker (ETF, REIT, materias primas, etc.)",
    labelTicker: "Ticker",
    qtyTitles: "Cantidad (títulos)",
    avgBuyPrice: "Precio medio de compra",
    saving: "Guardando…",
    resolving: "Consultando…",
    add: "Añadir",
    cancel: "Cancelar",
    positionsTitle: "Posiciones actuales",
    emptyTitle: "No hay posiciones",
    emptySub:
      "Añade tu primera posición para empezar a seguir tu portafolio.",
    emptyCta: "Añadir posición",
    thTicker: "Ticker",
    thName: "Nombre",
    thType: "Tipo",
    thQty: "Cant.",
    thPrice: "Precio",
    thValue: "Valor",
    thPnl: "P&L",
    removeCashTitle: "Eliminar línea de efectivo",
    confirmRemoveCash: "¿Eliminar esta línea de efectivo del portafolio?",
    positionMenuTitle: "Opciones de posición",
    sellPartial: "Venta parcial (a efectivo)",
    sellFull: "Venta total a efectivo",
    confirmRemoveOnly:
      "¿Eliminar esta posición sin registrar venta ni sumar importe al efectivo? Usa esto solo para corregir datos.",
    deleteNoConversion: "Eliminar sin conversión a efectivo",
    dialogSellFull: "Venta total a efectivo",
    dialogSellPartial: "Venta parcial a efectivo",
    sellDialogBody:
      "{ticker} · {name}. El importe de la venta se sumará a la posición de efectivo en {currency} (o se creará si no existe).",
    soldUnits: "Títulos vendidos",
    soldPlaceholder: "p. ej. 10",
    maxUnits: "Máximo: {n} títulos",
    sellPriceLabel: "Precio de venta por título",
    sellPriceHint:
      "Por defecto puedes usar el último precio de mercado cargado; ajústalo si la venta fue a otro precio.",
    cashProceeds: "Importe a efectivo:",
    sellErrQty: "Indica una cantidad válida.",
    sellErrPrice: "Indica un precio de venta válido.",
    sellErrMax: "La cantidad supera lo que tienes en cartera.",
    sellErrDb: "No se pudo registrar la venta.",
    confirming: "Guardando…",
    confirmSale: "Confirmar venta",
    lineStockOne: "1 acción",
    lineStockMany: "{n} acciones",
    lineBondOne: "1 bono",
    lineBondMany: "{n} bonos",
    lineCash: "{n} efectivo",
    lineAlt: "{n} alt.",
    cashDisplayName: "Efectivo ({currency})",
    cashSector: "Efectivo",
    etlSecUpdated: "SEC EDGAR actualizado",
    etlYahooUpdated: "Yahoo Finance actualizado",
    etlAlreadyHadData: "Datos de mercado ya estaban en la base",
    etlRiskUpdated: "Riesgo Matrix actualizado",
    tickerImporting: "Descargando datos del valor…",
    refresh: {
      errNoApiKey: "Configura ALPHA_VANTAGE_API_KEY en .env.local",
      errNoSupabase: "Supabase no configurado",
      errSignIn: "Inicia sesión",
      msgNoHoldings: "No hay posiciones",
      msgCashOnly:
        "Solo hay efectivo en el portafolio; no hay cotizaciones que actualizar.",
    },
  },
  confidentiality: {
    title: "Confidencialidad y uso de la información",
    p1a: "La información que facilites en esta encuesta es",
    p1b: "confidencial y está protegida",
    p1c:
      ": solo se utiliza para calcular tu perfil de inversor y personalizar la experiencia en Matrix, con medidas técnicas y organizativas acordes a su tratamiento.",
    p2: "No vendemos tus respuestas a terceros para fines comerciales ajenos al servicio. Puedes revisar y modificar tus respuestas en cualquier momento desde tu cuenta.",
    p3a: "Esta herramienta",
    p3b: "no constituye asesoramiento de inversiones",
    p3c:
      " ni recomendación personalizada de instrumentos financieros. Si necesitas asesoramiento regulado, dirígete a una entidad o profesional autorizado.",
    p4: "En el marco del Reglamento (UE) 2016/679 (RGPD) y la normativa aplicable, puedes ejercer los derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición respecto de tus datos personales, según lo previsto en la política de privacidad del servicio y los canales que en ella se indiquen.",
  },
  encuesta: {
    loadError: "No se pudo cargar tu perfil.",
    missingQuestions: "Faltan {n} pregunta(s) por responder.",
    saveError: "No se pudo guardar el perfil.",
    backDashboard: "Volver al panel",
    title: "Editar encuesta de perfil",
    sub: "Todas las preguntas en una sola vista. Toca otra opción para cambiar tu respuesta y guarda al final.",
    saved: "Cambios guardados. Tu perfil de riesgo se ha actualizado.",
    aiRegenOk:
      "El informe técnico (IA) en tu perfil se ha vuelto a generar con las nuevas respuestas.",
    aiRegenFail: "Perfil guardado, pero el informe IA no se pudo regenerar: {msg}",
    aiNoKey:
      "Sin ANTHROPIC_API_KEY en el servidor no se puede regenerar el informe IA automáticamente.",
    save: "Guardar cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    lockedTitle: "Edición de encuesta no disponible aún",
    lockedBody: "Podrás editar de nuevo el {date}.",
  },
  ajustes: {
    title: "Ajustes",
    sub: "Preferencias de la aplicación. Contenido en construcción.",
  },
  signup: {
    accountCreated: "Cuenta creada",
    checkEmail:
      "Revisa tu email para confirmar tu cuenta. Una vez confirmada, podrás iniciar sesión.",
    goLogin: "Ir a Iniciar Sesión",
  },
  perfil: {
    title: "Perfil Financiero",
    sub: "Basado en tu encuesta de tolerancia al riesgo y objetivos.",
    editSurvey: "Editar encuesta",
    assigned: "Perfil asignado",
    scoreBadge: "Puntuación global: {score}/100",
    volBadge: "Volatilidad máx. asumida ~{v}%",
    scaleLabel: "Escala de riesgo (0 = muy conservador, 100 = muy agresivo)",
    idealCardTitle: "Asignación ideal (referencia)",
    idealCardSub:
      "Porcentajes orientativos según tu perfil; el análisis de brechas usa además tu puntuación numérica y reglas de la encuesta.",
    radarTitle: "Lectura por dimensiones (encuesta)",
    radarSub:
      "Cada barra es la puntuación numérica de una pregunta (no el ordinal 1–4). Sirve para ver matices dentro del mismo perfil.",
    questionCol: "Pregunta",
    categoryCol: "Categoría",
    scoreCol: "Puntuación",
    aiTitle: "Informe conductual (IA)",
    aiSub:
      "Texto generado automáticamente a partir de un resumen anónimo de tu perfil y respuestas (sin tickers ni datos identificativos). No es asesoramiento financiero.",
    aiEmpty:
      "Aún no hay informe IA. Si acabas de completar la encuesta, vuelve en unos segundos o revisa que exista ANTHROPIC_API_KEY en el servidor.",
    downloadMd: "Descargar .md",
    generatedAt: "Última generación:",
    aiEmptyDetail:
      "Aún no hay informe guardado. Debería crearse al terminar el onboarding o al guardar la encuesta si ANTHROPIC_API_KEY está definida en el entorno del servidor (p. ej. Vercel).",
    dimChartTitle: "Respuestas por dimensión",
    dimChartSub:
      "Puntuación de cada bloque (0–100). Pasa el cursor sobre las barras para ver la pregunta.",
    tooltipScore: "Puntuación: {score}",
    idealPieSub:
      "Referencia teórica según tu perfil ({label}), no tu cartera actual.",
    expectedReturnTitle: "Rango de rentabilidad esperada",
    expectedReturnSub:
      "Orientativo según el perfil; no es una promesa de resultados.",
    annualEstNote: "anual (estimación genérica)",
    zone1: "0–33 {label}",
    zone2: "34–66 {label}",
    zone3: "67–100 {label}",
  },
  stockExplore: {
    aiTitle: "Análisis IA",
    aiSub:
      "Basado en la puntuación Matrix en base de datos (no la recalcula). Carga automática al abrir el ticker.",
    aiGenerating: "Generando interpretación…",
    title: "Explorar acciones",
    sub:
      "Cotización (Alpha Vantage), precios históricos y ratios (Yahoo en BD) y cuentas US-GAAP (SEC EDGAR), unidos por ticker.",
    searchPlaceholder: "Buscar ticker (ej: AAPL, MSFT, NVDA)…",
    analyze: "Analizar",
    loading: "Cargando…",
    popular: "Populares:",
    sentimentBullish: "Alcista",
    sentimentNeutral: "Neutral",
    sentimentBearish: "Bajista",
    hintAlphaCached: "Cotización Alpha Vantage desde caché (<15 min).",
    hintAlphaLive: "Cotización Alpha Vantage en vivo.",
    hintAlphaErrPrefix: "Alpha Vantage:",
    hintYahooFundamentals: "Fundamentales Yahoo (BD) actualizados {when}.",
    hintYahooMissing:
      "Sin snapshot Yahoo en base de datos — ejecuta npm run etl:yahoo para este ticker.",
    hintEarningsOk:
      "Próximos resultados y consenso de analistas (Yahoo Finance en vivo).",
    hintEarningsErrPrefix: "Resultados Yahoo:",
    hintFundPanels:
      "Fundamentos (SEC en BD): {n} bloques con ratios derivados.",
    hintSecSummary:
      "SEC EDGAR: {rows} filas en BD ({concepts} conceptos en resumen).",
    hintSecMissing:
      "Sin métricas SEC en BD — ejecuta npm run etl:sec para este ticker.",
    hintNonUs:
      "Ticker no está en catálogo US (SEC); solo cotización Alpha si está disponible.",
    hintFooter:
      "El chip Alcista/Neutral/Bajista es demostración. «Riesgo Matrix» y la interpretación de texto (si hay API) cargan desde la base de datos al abrir el ticker.",
    badgeAlpha: "Alpha Vantage",
    badgeYahooDb: "Yahoo (BD)",
    badgeYahooEarnings: "Yahoo resultados (vivo)",
    badgeSec: "SEC EDGAR",
    priceLastCloseDb: "Último cierre histórico (Yahoo BD)",
    priceDemo: "Precio demostración",
    priceUnavailable: "Sin precio disponible",
    finAiRisk: "Riesgo Matrix",
    finAiTooltip:
      "Heurística determinista en base de datos (Yahoo + SEC + EOD). Más alto = más tensión en analítica de cartera, no recomendación de compra/venta. Escala acotada 5–95 (no 1–100).",
    finAiUpdated: "Actualizado:",
    noFinAiScore: "Sin puntuación Matrix",
    noFinAiHelp:
      "Ejecuta npm run etl:ticker-risk tras cargar Yahoo (y SEC para la capa de fundamentales).",
    profileFitTitle: "Ajuste al perfil",
    profileFitTooltip:
      "Compara tu puntuación del cuestionario (0–100) con el riesgo Matrix del valor (5–95), normalizados a la misma escala. Cuanto más cercanos, mayor ajuste: un perfil conservador suele encajar mejor con valores de menor riesgo Matrix; uno agresivo, con mayor riesgo Matrix. No es una recomendación de compra o venta.",
    profileFitVerdictStrong: "Muy alineado",
    profileFitVerdictModerate: "Alineación razonable",
    profileFitVerdictWeak: "Alineación baja",
    profileFitVerdictPoor: "Poco alineado",
    profileFitRecommended: "Encaja con tu tolerancia al riesgo",
    profileFitCaution: "Desalineado respecto a tu tolerancia",
    profileFitNoFinAi: "Sin riesgo Matrix",
    profileFitNoFinAiHelp: "Necesitas la puntuación Matrix en base de datos para calcular el ajuste.",
    profileFitNoProfile: "Sin perfil",
    profileFitNoProfileHelp:
      "Completa el cuestionario de perfil para ver si este valor encaja con tu tolerancia.",
    profileFitCtaQuestionnaire: "Ir al cuestionario",
    profileFitDetailScores:
      "Tu perfil (cuestionario): {user}/100 · Riesgo Matrix del valor: {stock} (5–95)",
    earningsTitle: "Próximos resultados y previsiones",
    earningsIntro:
      "Yahoo Finance en vivo · calendario {tz}. Tras aplicar la migración SQL, npm run etl:yahoo puede guardar estos campos en yahoo_asset_snapshot.",
    earningsDateLabel: "Fecha de resultados:",
    earningsEstimate: "Estimada",
    consensusPeriod: "Periodo consenso (Yahoo):",
    epsNext: "EPS consenso (próximo)",
    revenueNext: "Ingresos consenso (próximo)",
    analysts: "Analistas:",
    earningsDisclaimer:
      "Las previsiones dependen de cobertura de analistas en Yahoo; no constituyen asesoramiento.",
    earningsNoDate:
      "Yahoo no devolvió fecha de resultados para este símbolo.",
    mcap: "Cap. de mercado",
    peTrailing: "P/E trailing",
    divYield: "Rend. dividendo",
    beta: "Beta",
    fundPanelsTitle: "Fundamentos (estilo paneles)",
    fiscalPeriodHint: "Periodo base (cuando aplica):",
    fundPanelsEmpty:
      "No hay hechos US-GAAP parseables en el JSON almacenado. Ejecuta el ETL de companyfacts para este CIK o revisa el payload en BD.",
    techTitle: "Indicadores técnicos (calculados desde velas Yahoo en BD)",
    techIntro:
      "RSI (14), medias móviles y rendimientos se calculan en el servidor a partir de los cierres almacenados; no vienen precargados de la API.",
    techRsiShort: " Con menos de ~15 sesiones, el RSI no aplica.",
    rsi14: "RSI (14)",
    sma20: "SMA 20",
    sma50: "SMA 50",
    sma200: "SMA 200",
    ret20: "Rend. ~20 sesiones",
    ret60: "Rend. ~60 sesiones",
    cacheAlphaTitle: "Caché Alpha Vantage (`asset_quotes`)",
    cacheAlphaLine:
      "Precio: {price} {currency} · actualizado {when}",
    lastSessionTitle: "Última sesión en BD (Yahoo EOD)",
    ohlcOpen: "Apertura",
    ohlcHigh: "Máx.",
    ohlcLow: "Mín.",
    ohlcClose: "Cierre",
    ohlcAdj: "Cierre aj.",
    ohlcVol: "Volumen",
    priceChartTitle:
      "Precio de cierre (Yahoo, BD — últimas {n} sesiones mostradas)",
    chartClose: "Cierre",
    yahooRawTitle: "Yahoo Finance — datos del snapshot (`raw_summary` en BD)",
    yahooRawSub:
      "Campos extraídos del JSON guardado por el ETL (módulos precio, resumen, perfil, estadísticas clave, datos financieros).",
    thField: "Campo",
    thValue: "Valor",
    statsYahooDemo: "Estadísticas (columnas Yahoo + demostración)",
    stat52High: "Máximo 52 sem.",
    stat52Low: "Mínimo 52 sem.",
    statVolAvg: "Vol. medio (Yahoo)",
    sectorIndustry: "Sector / Industria",
    currencyExchange: "Divisa / Bolsa",
    volLastSession: "Vol. última sesión (snapshot)",
    sentimentDemo: "Sentimiento (demostración)",
    companyFactsDownloaded:
      "Company facts SEC (JSON) en BD: descargado {when}",
    secSummaryTitle: "SEC EDGAR — resumen (un periodo reciente por concepto)",
    secAllRowsTitle: "SEC EDGAR — todas las filas en BD (hasta 300)",
    thConcept: "Concepto",
    thPeriod: "Fin periodo",
    thValueSec: "Valor",
    emptySearchTitle: "Busca un ticker",
    emptySearchSub:
      "Verás cotización Alpha Vantage, histórico Yahoo y métricas SEC cuando estén cargadas en la base de datos (mismo ticker en todas las tablas).",
    sourceCalc: "Calc.",
    errorInvalidTicker: "Ticker no válido.",
    errorSupabase: "Servicio no disponible.",
    errorAuth: "Inicia sesión para continuar.",
    errorExplorerAuth: "Inicia sesión para explorar valores.",
  },
  tickerPrep: {
    phase1: "Descargando información del valor…",
    phase2: "Sincronizando datos de mercado y fundamentales…",
    phase3: "Ejecutando análisis y métricas…",
    phase4: "Un momento más, casi listo…",
    errors: {
      invalidTicker: "Introduce un ticker válido (letras y números, formato US).",
      notUsListed:
        "Ese símbolo no aparece como valor cotizado en Estados Unidos en nuestra fuente de referencia (listado US).",
      config:
        "No se puede descargar la información en este momento (falta configuración del servidor para la ingesta).",
      ingestFailed:
        "No se pudieron completar todas las descargas. Inténtalo de nuevo más tarde.",
      auth: "Debes iniciar sesión.",
    },
  },
  howItWorks: {
    title: "Cómo funciona Matrix",
    subtitle:
      "Te contamos con transparencia cómo perfilamos a cada inversor con rigor metodológico, qué significa el análisis de cada valor y cómo personalizamos la orientación a tu situación.",
    profileTitle: "Tu perfil de inversor",
    profileLead:
      "Partimos de un cuestionario de perfil de riesgo construido con enfoque analítico: las preguntas siguen la misma lógica que los cuestionarios de idoneidad que las normas europeas (MiFID II y normativa equivalente) y las guías supervisoras recomiendan para conocer tu tolerancia al riesgo, tu horizonte temporal y la coherencia con tus objetivos.",
    profileP2:
      "Tus respuestas se integran de forma sistemática en una puntuación que clasifica tu perfil (conservador, moderado o agresivo) y deriva una combinación orientativa entre acciones, bonos, efectivo y alternativos. Es una referencia estable en el tiempo para contrastar tu cartera real con un reparto coherente con lo declarado; no es un producto financiero ni una instrucción automática.",
    profileBullet1:
      "El diseño se inspira en buenas prácticas de idoneidad del inversor y en marcos reconocidos por la industria; puedes revisar y actualizar tus respuestas cuando quieras desde tu perfil.",
    profileBullet2:
      "No hay “mejor” perfil: el adecuado es el que encaja contigo y con tus objetivos.",
    stocksTitle: "Análisis de cada valor",
    stocksLead:
      "Al explorar un ticker unimos la información de mercado disponible con una lectura fundamental pública cuando los datos están a tu disposición en la plataforma.",
    stocksP2:
      "Verás indicadores de contexto, evolución reciente y, cuando aplica, una lectura propia del nivel de tensión del valor dentro de nuestra herramienta (el “riesgo Matrix”). Ese indicador resume de forma sintética factores como la volatilidad percibida o el comportamiento reciente frente al mercado: es material informativo, no una orden de compra o venta.",
    stocksBullet1:
      "Además puedes contrastar ese contexto con tu perfil mediante un ajuste orientativo que indica si la “intensidad” del valor encaja mejor con perfiles más conservadores o más arriesgados.",
    recoTitle: "Recomendaciones personalizadas",
    recoLead:
      "El análisis de cartera te muestra cómo está repartido hoy tu patrimonio entre clases de activos y lo compara con la mezcla orientativa asociada a tu perfil.",
    recoP2:
      "A partir de esa comparación priorizamos sugerencias educativas: qué tipos de posición podrían acercarte más a un equilibrio alineado con tus preferencias, siempre en términos generales (por clase de activo o enfoque), sin ejecutar operaciones en tu nombre.",
    recoBullet1:
      "El informe de perfil puede incorporar texto de apoyo elaborado para ayudarte a interpretar tus resultados; sigue siendo información de apoyo, no asesoramiento financiero individual regulado.",
    transparencyTitle: "Transparencia y límites",
    transparencyP:
      "Matrix está diseñada para ordenar datos, ponerte contexto y reducir ruido. No sustituye al asesoramiento personal ni a la fiscalidad de tu país: las decisiones finales son siempre tuyas. Si necesitas revisar impuestos, regulación MiFID u ofertas concretas de inversión, lo adecuado es acudir a un profesional autorizado.",
    disclaimer:
      "La información mostrada tiene carácter meramente educativo e informativo y no constituye oferta, solicitud de oferta ni recomendación personalizada de inversión.",
  },
  investorReport: {
    copy: "Copiar",
    copied: "Copiado",
    copyFail: "No se pudo copiar",
  },
  googleAuth: {
    continue: "Continuar con Google",
    redirecting: "Redirigiendo…",
  },
  authDivider: {
    or: "o",
  },
};

const EN: MessageTree = {
  language: {
    label: "Language",
    es: "Spanish",
    en: "English",
  },
  nav: {
    dashboard: "Dashboard",
    diagnosis: "Profile",
    portfolio: "Portfolio",
    analysis: "Analysis",
    explore: "Explore",
    howItWorks: "How it works",
    accountMenu: "Account menu",
    myProfile: "My profile",
    settings: "Settings",
    signOut: "Sign out",
  },
  assetClasses: {
    stocks: "Stocks",
    bonds: "Bonds",
    cash: "Cash",
    alternatives: "Alternatives",
  },
  market: {
    impactHigh: "high",
    impactMed: "medium",
    impactLow: "low",
    contextTitle: "Today’s context",
    updated: "Updated",
    macroTz: "macro",
    earningsTz: "earnings",
    macroUnavailable:
      "Macro calendar unavailable right now{detail}. Your portfolio earnings may still appear below.",
    relevantToday:
      "Relevant events are scheduled for today (medium/high macro impact and/or earnings for your holdings).",
    macroSection: "Macro (US / international)",
    portfolioSection: "Your portfolio (earnings)",
    estimateSuffix: "(estimated date)",
    noRelevantToday:
      "No relevant events are scheduled for today: no medium/high macro releases on the calendar, and no equity earnings dates for your holdings on this session.",
    nextRelevant: "Next relevant event:",
    macroKind: "Macro",
    earningsKind: "Earnings",
    noNext: "No upcoming macro or earnings event identified with the available data.",
    addEquitiesHint:
      "Add stock or alternative positions to see your companies’ earnings dates here (data via Yahoo Finance).",
    impactWord: "impact",
  },
  landing: {
    signIn: "Sign in",
    signUp: "Create account",
    heroA: "Your portfolio,",
    heroB: "aligned with your profile",
    heroSub:
      "Matrix guides you in four steps—from understanding your investor profile to recommendations grounded in your real situation.",
    ctaSignUp: "Create account",
    ctaHasAccount: "I already have an account",
    howTitle: "How it works",
    howSub:
      "After you sign up, the profiling questionnaire appears once. Then you can open your portfolio, analysis, and recommendations anytime.",
    featuresTitle: "Everything you need to invest more clearly",
    featuresSub:
      "Professional portfolio analytics, accessible to any investor.",
    ctaBannerTitle: "Start optimizing your portfolio today",
    ctaBannerSub:
      "Complete the risk questionnaire, load your positions, and get personalized suggestions in minutes.",
    footerTagline: "Portfolio analysis, asset exploration, and market data.",
    disclaimer:
      "This is not financial advice. Speak with a qualified professional before making investment decisions.",
    step1Title: "Define your investor profile",
    step1Desc:
      "A short survey on risk tolerance and horizon so we know which portfolio style fits you.",
    step2Title: "Enter your portfolio",
    step2Desc:
      "Add positions (ticker, quantity, average price). Matrix computes value, return, and asset-class weights.",
    step3Title: "Analysis vs your profile",
    step3Desc:
      "We compare your current allocation with the target that fits your profile and surface gaps and key metrics.",
    step4Title: "Recommendations",
    step4Desc:
      "Rebalancing ideas aligned with your profile and clearer context for decisions.",
    feat1Title: "Risk profile",
    feat1Desc:
      "Behavioral finance questionnaire that sets your risk tolerance and investment horizon.",
    feat2Title: "Portfolio audit",
    feat2Desc:
      "Compare your current allocation with the ideal portfolio for your profile.",
    feat3Title: "Rebalancing ideas",
    feat3Desc:
      "Concrete trade suggestions inspired by mean–variance optimization.",
    feat4Title: "Asset exploration",
    feat4Desc:
      "Drill into each ticker with quotes, history, indicators, and fundamentals built from public market data.",
  },
  auth: {
    welcomeBack: "Welcome back",
    signInSub: "Sign in to access your portfolio",
    orEmail: "or with email and password",
    email: "Email",
    password: "Password",
    signingIn: "Signing in...",
    signIn: "Sign in",
    noAccount: "Don’t have an account?",
    register: "Sign up",
    authNotConfigured: "Authentication is not configured",
    createTitle: "Create your account",
    createSub: "Start analyzing your portfolio with AI-assisted insights",
    signupDivider: "or sign up with email",
    namePlaceholder: "Your name",
    passwordMinPlaceholder: "At least 6 characters",
    fullName: "Full name",
    creating: "Creating account...",
    createAccount: "Create account",
    hasAccount: "Already have an account?",
    logIn: "Sign in",
  },
  riskProfiles: {
    conservative: {
      label: "Conservative",
      description:
        "You prioritize capital preservation over returns. You prefer steadier investments with lower volatility, such as bonds and deposits.",
    },
    moderate: {
      label: "Moderate",
      description:
        "You seek a balance between growth and safety. You accept some volatility in exchange for better long-term returns.",
    },
    aggressive: {
      label: "Aggressive",
      description:
        "You aim to maximize long-term returns. You are comfortable with high volatility and potentially large temporary drawdowns.",
    },
  },
  onboarding: {
    signOut: "Sign out",
    backHome: "Back to home",
    riskTitle: "Risk profile",
    introSub: "Before you start, please read this notice",
    understoodContinue: "I understand—continue to the questionnaire",
    start: "Start questionnaire",
    questionOf: "Question {current} of {total}",
    resultTitle: "Your risk profile",
    resultSub: "Based on your answers, we’ve determined your profile",
    profileLabel: "Profile",
    scoreLabel: "Score",
    idealTitle: "Target allocation",
    expectedReturn: "Expected return",
    maxVol: "Max volatility",
    ctaPortfolio: "Analyze my portfolio",
    ctaDashboard: "Go to dashboard",
    back: "Back",
    next: "Next",
    previous: "Previous",
    questionProgress: "Question {current} of {total}",
  },
  dashboard: {
    title: "Dashboard",
    sub: "Portfolio snapshot and key metrics",
    totalValue: "Total value",
    performance: "Performance",
    sharpe: "Sharpe ratio",
    maxDd: "Max drawdown",
    sharpeGood: "Good",
    sharpePoor: "Could improve",
    ddControlled: "Controlled",
    ddHigh: "High",
    emptyTitle: "No positions yet",
    emptySub: "Add holdings to see charts and metrics here.",
    goPortfolio: "Go to portfolio",
    historyHint:
      "The percentage under total value and performance reflects the change from the first day in the visible history ({first}), aligned with the chart. Versus current positions’ cost basis: {retPct} ({retAbs}).",
    chartTitle: "Portfolio value (history)",
    chartSub:
      "Data stored per day (up to 90 days visible). Nothing invented—only what was recorded when you visited the dashboard, changed positions, or refreshed prices.",
    daysRecorded: "{n} day(s) on record",
    noHistoryYet: "No history points yet.",
    historyEmptyHint:
      "When at least one day is stored you’ll see the trend here. If you just added positions, you should see a point after reloading.",
    singleDayHint:
      "Only one day is recorded. The line appears once there are at least two days of data.",
    tooltipValue: "Value",
    allocationTitle: "Current allocation",
    viewAnalysis: "View analysis",
    positionsTitle: "Positions",
    thTicker: "Ticker",
    thName: "Name",
    thQty: "Quantity",
    thPrice: "Price",
    thValue: "Value",
    thReturn: "Return",
  },
  analysis: {
    title: "Analysis",
    sub: "Compare your current portfolio vs a target allocation computed from your score (0–100) and survey rules (horizon, liquidity, drawdown tolerance, etc.).",
    refresh: "Run analysis",
    emptyTitle: "Nothing to compare",
    emptySub:
      "Add portfolio positions to compare your current allocation with your risk profile target.",
    howTitle: "How to read the target and rebalancing",
    howFoot:
      "Amounts are indicative by asset class (not advice). Taxes, fees, minimums, and real liquidity may prevent an immediate 100% theoretical rebalance; prefer staged adjustments and review each line.",
    concTitle: "Equity concentration",
    concStats:
      "(Top 1: {largest}% · Top 3: {top3}% of total stock exposure, {n} position(s)).",
    equityRiskTitle: "Intrinsic risk (equities)",
    equityRiskIntro:
      "5–95 score per position (Matrix), weighted by equity value. If a persisted DB score exists (ETL etl:ticker-risk), it is used; otherwise a Yahoo/heuristic blend. Not a quality assessment or buy/sell advice. Per-ticker AI narrative lives under Explore; here we focus on the aggregate gap.",
    equityWeighted:
      "Weighted equity risk: {score} · Questionnaire profile score: {profile}.",
    equityHintHigh:
      " Your stock basket looks somewhat more aggressive or more price-stressed than the questionnaire alone would suggest.",
    equityHintLow:
      " Your basket looks more defensive than the questionnaire reference.",
    equityHintMid: " Reasonably in line with the stated profile.",
    thPctEq: "% of equity",
    thRisk: "Risk",
    thSignals: "Signals",
    alignedGoodTitle: "Your portfolio is reasonably aligned",
    alignedBadTitle: "Meaningful gaps detected",
    alignedGoodSub:
      "Deviations are below 10%. Your current allocation is close to the target.",
    alignedBadSub:
      "Total deviation from the target is about {gap}%. Review the rebalancing suggestions.",
    chartVsIdeal: "Current vs. target",
    radarChart: "Allocation radar",
    chartActual: "Current",
    chartIdeal: "Target",
    gapDetail: "Gap detail",
    gapActual: "Current",
    gapIdeal: "Target",
    investVerb: "Invest",
    reduceVerb: "Reduce",
    rebalTitle: "Rebalancing suggestions",
    rebalSub:
      "Indicative class-level moves toward the target mix (deterministic server model; not full mean–variance optimization on your assets’ correlations).",
    buy: "Buy",
    sell: "Sell",
    hold: "Hold",
  },
  portfolio: {
    title: "My portfolio",
    sub: "Add your holdings to get a personalized analysis",
    refreshPrices: "Refresh prices",
    refreshPricesTitle:
      "Force a fresh Alpha Vantage quote (not just the 15‑minute cache). Free tier ~5 calls/min—with many tickers some may not refresh until the next attempt.",
    addPosition: "Add position",
    priceRefreshUpdated:
      "Updated {n} line(s) with a live quote (Alpha Vantage).",
    priceRefreshNoRows:
      "No rows were updated in the database. Ensure the migration with price_updated_at is applied and check the server console.",
    priceRefreshError: "Could not refresh prices.",
    summaryTitle: "Portfolio summary",
    summaryDeltaHistory:
      "Change since {first} (same definition as the dashboard / stored history). Return vs current positions’ cost: {retPct} ({retAbs}).",
    summaryDeltaCostOnly:
      "Return vs average purchase cost. Once there are at least two days in the value history, the main percentage will follow the stored series (as on the dashboard).",
    cost: "Cost",
    positionsLines: "Positions (lines)",
    distribution: "Allocation",
    addForDistribution: "Add positions to see allocation",
    analyzeGaps: "Run gap analysis",
    newPosition: "New position",
    assetType: "Asset type",
    hintStocks:
      "Company name, market price, and sector come from Alpha Vantage (and DB cache when applicable). Enter the listed ticker, number of shares, and your average purchase price.",
    hintBonds:
      "Use the ticker of a listed bond, bond fund, or bond ETF. Quantity is shares/units; average price is per unit.",
    hintAlternatives:
      "Use the ticker of an ETF, REIT, commodity product, or other listed alternative. Quantity and average price follow the same rules as stocks.",
    hintCash:
      "Record your cash balance (checking, savings, etc.). No market lookup—currency and amount only.",
    currency: "Currency",
    cashAmount: "Cash amount",
    labelTickerBonds: "Ticker (bond / fund / bond ETF)",
    labelTickerAlt: "Ticker (ETF, REIT, commodities, etc.)",
    labelTicker: "Ticker",
    qtyTitles: "Quantity (units)",
    avgBuyPrice: "Average purchase price",
    saving: "Saving…",
    resolving: "Looking up…",
    add: "Add",
    cancel: "Cancel",
    positionsTitle: "Current positions",
    emptyTitle: "No positions",
    emptySub: "Add your first position to start tracking your portfolio.",
    emptyCta: "Add position",
    thTicker: "Ticker",
    thName: "Name",
    thType: "Type",
    thQty: "Qty",
    thPrice: "Price",
    thValue: "Value",
    thPnl: "P&L",
    removeCashTitle: "Remove cash line",
    confirmRemoveCash: "Remove this cash line from the portfolio?",
    positionMenuTitle: "Position actions",
    sellPartial: "Partial sale (to cash)",
    sellFull: "Full sale to cash",
    confirmRemoveOnly:
      "Remove this position without recording a sale or adding to cash? Use only to fix data.",
    deleteNoConversion: "Delete without cash conversion",
    dialogSellFull: "Full sale to cash",
    dialogSellPartial: "Partial sale to cash",
    sellDialogBody:
      "{ticker} · {name}. Sale proceeds will be added to your cash position in {currency} (or created if missing).",
    soldUnits: "Units sold",
    soldPlaceholder: "e.g. 10",
    maxUnits: "Maximum: {n} units",
    sellPriceLabel: "Sale price per unit",
    sellPriceHint:
      "You can keep the last loaded market price by default; change it if you sold at a different price.",
    cashProceeds: "Cash proceeds:",
    sellErrQty: "Enter a valid quantity.",
    sellErrPrice: "Enter a valid sale price.",
    sellErrMax: "Quantity exceeds your holding.",
    sellErrDb: "Could not record the sale.",
    confirming: "Saving…",
    confirmSale: "Confirm sale",
    lineStockOne: "1 stock",
    lineStockMany: "{n} stocks",
    lineBondOne: "1 bond",
    lineBondMany: "{n} bonds",
    lineCash: "{n} cash",
    lineAlt: "{n} alt.",
    cashDisplayName: "Cash ({currency})",
    cashSector: "Cash",
    etlSecUpdated: "SEC EDGAR updated",
    etlYahooUpdated: "Yahoo Finance updated",
    etlAlreadyHadData: "Market data was already in the database",
    etlRiskUpdated: "Matrix risk refreshed",
    tickerImporting: "Fetching market data…",
    refresh: {
      errNoApiKey: "Set ALPHA_VANTAGE_API_KEY in .env.local",
      errNoSupabase: "Supabase not configured",
      errSignIn: "Sign in",
      msgNoHoldings: "No positions",
      msgCashOnly:
        "Only cash in the portfolio; nothing to quote.",
    },
  },
  confidentiality: {
    title: "Confidentiality and use of information",
    p1a: "The information you provide in this questionnaire is",
    p1b: "confidential and protected",
    p1c:
      ": it is used only to compute your investor profile and personalize your Matrix experience, with appropriate technical and organizational measures.",
    p2: "We do not sell your answers to third parties for unrelated commercial purposes. You can review and update your answers anytime from your account.",
    p3a: "This tool",
    p3b: "does not constitute investment advice",
    p3c:
      " or a personalized recommendation of financial instruments. If you need regulated advice, contact an authorized firm or professional.",
    p4: "Under Regulation (EU) 2016/679 (GDPR) and applicable law, you may exercise access, rectification, erasure, restriction, portability, and objection rights regarding your personal data, as described in the service privacy policy and the channels indicated there.",
  },
  encuesta: {
    loadError: "Could not load your profile.",
    missingQuestions: "{n} question(s) still unanswered.",
    saveError: "Could not save your profile.",
    backDashboard: "Back to dashboard",
    title: "Edit risk questionnaire",
    sub: "All questions on one page. Tap another option to change an answer, then save.",
    saved: "Saved. Your risk profile has been updated.",
    aiRegenOk:
      "The technical (AI) report on your profile was regenerated from your new answers.",
    aiRegenFail: "Profile saved, but the AI report could not be regenerated: {msg}",
    aiNoKey:
      "Without ANTHROPIC_API_KEY on the server the AI report cannot be regenerated automatically.",
    save: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    lockedTitle: "Questionnaire edit not available yet",
    lockedBody: "You can edit again on {date}.",
  },
  ajustes: {
    title: "Settings",
    sub: "App preferences. Content under construction.",
  },
  signup: {
    accountCreated: "Account created",
    checkEmail:
      "Check your email to confirm your account. Once confirmed, you can sign in.",
    goLogin: "Go to sign in",
  },
  perfil: {
    title: "Financial profile",
    sub: "Based on your risk tolerance and goals questionnaire.",
    editSurvey: "Edit questionnaire",
    assigned: "Assigned profile",
    scoreBadge: "Overall score: {score}/100",
    volBadge: "Assumed max volatility ~{v}%",
    scaleLabel: "Risk scale (0 = very conservative, 100 = very aggressive)",
    idealCardTitle: "Ideal allocation (reference)",
    idealCardSub:
      "Indicative weights for your profile; gap analysis also uses your numeric score and survey rules.",
    radarTitle: "Survey dimension read",
    radarSub:
      "Each bar is a question’s numeric score (not the 1–4 ordinal). Useful to see nuance within the same profile label.",
    questionCol: "Question",
    categoryCol: "Category",
    scoreCol: "Score",
    aiTitle: "Behavioral report (AI)",
    aiSub:
      "Automatically generated from an anonymous summary of your profile and answers (no tickers or identifying data). Not financial advice.",
    aiEmpty:
      "No AI report yet. If you just finished the questionnaire, wait a few seconds or verify ANTHROPIC_API_KEY is set on the server.",
    downloadMd: "Download .md",
    generatedAt: "Last generated:",
    aiEmptyDetail:
      "No saved report yet. It should be created when you finish onboarding or save the questionnaire if ANTHROPIC_API_KEY is set in the server environment (e.g. Vercel).",
    dimChartTitle: "Answers by dimension",
    dimChartSub:
      "Score for each block (0–100). Hover the bars to see the question text.",
    tooltipScore: "Score: {score}",
    idealPieSub:
      "Theoretical reference for your profile ({label}), not your current portfolio.",
    expectedReturnTitle: "Expected return range",
    expectedReturnSub:
      "Indicative for the profile; not a promise of results.",
    annualEstNote: "annual (generic estimate)",
    zone1: "0–33 {label}",
    zone2: "34–66 {label}",
    zone3: "67–100 {label}",
  },
  stockExplore: {
    aiTitle: "AI analysis",
    aiSub:
      "Based on the Matrix score stored in the database (not recalculated here). Loads automatically when you open the ticker.",
    aiGenerating: "Generating interpretation…",
    title: "Explore stocks",
    sub:
      "Quotes (Alpha Vantage), historical prices and ratios (Yahoo in DB), and US-GAAP filings (SEC EDGAR), linked by ticker.",
    searchPlaceholder: "Search ticker (e.g. AAPL, MSFT, NVDA)…",
    analyze: "Analyze",
    loading: "Loading…",
    popular: "Popular:",
    sentimentBullish: "Bullish",
    sentimentNeutral: "Neutral",
    sentimentBearish: "Bearish",
    hintAlphaCached: "Alpha Vantage quote from cache (<15 min).",
    hintAlphaLive: "Live Alpha Vantage quote.",
    hintAlphaErrPrefix: "Alpha Vantage:",
    hintYahooFundamentals: "Yahoo fundamentals (DB) updated {when}.",
    hintYahooMissing:
      "No Yahoo snapshot in the database — run npm run etl:yahoo for this ticker.",
    hintEarningsOk:
      "Upcoming earnings and analyst consensus (Yahoo Finance live).",
    hintEarningsErrPrefix: "Yahoo earnings:",
    hintFundPanels:
      "Fundamentals (SEC in DB): {n} panels with derived ratios.",
    hintSecSummary:
      "SEC EDGAR: {rows} rows in DB ({concepts} concepts summarized).",
    hintSecMissing:
      "No SEC metrics in DB — run npm run etl:sec for this ticker.",
    hintNonUs:
      "Ticker is not in the US catalogue (SEC); Alpha quote only if available.",
    hintFooter:
      "The Bullish/Neutral/Bearish chip is a demo. Matrix risk and narrative (if API) load from the DB when you open the ticker.",
    badgeAlpha: "Alpha Vantage",
    badgeYahooDb: "Yahoo (DB)",
    badgeYahooEarnings: "Yahoo earnings (live)",
    badgeSec: "SEC EDGAR",
    priceLastCloseDb: "Last historical close (Yahoo DB)",
    priceDemo: "Demo price",
    priceUnavailable: "No price available",
    finAiRisk: "Matrix risk",
    finAiTooltip:
      "Deterministic heuristic from DB (Yahoo + SEC + EOD). Higher = more tension in portfolio analytics, not a buy/sell recommendation. Bounded scale 5–95 (not 1–100).",
    finAiUpdated: "Updated:",
    noFinAiScore: "No Matrix score",
    noFinAiHelp:
      "Run npm run etl:ticker-risk after Yahoo (and SEC for fundamentals layer).",
    profileFitTitle: "Profile fit",
    profileFitTooltip:
      "Compares your questionnaire score (0–100) with the stock’s Matrix risk (5–95), both normalized to the same scale. Closer values mean better fit: a conservative profile usually fits lower Matrix risk; an aggressive profile fits higher Matrix risk. Not a buy/sell recommendation.",
    profileFitVerdictStrong: "Strong fit",
    profileFitVerdictModerate: "Reasonable fit",
    profileFitVerdictWeak: "Weak fit",
    profileFitVerdictPoor: "Poor fit",
    profileFitRecommended: "Matches your risk tolerance",
    profileFitCaution: "Misaligned with your risk tolerance",
    profileFitNoFinAi: "No Matrix risk",
    profileFitNoFinAiHelp:
      "The Matrix score must be stored in the database to compute profile fit.",
    profileFitNoProfile: "No profile",
    profileFitNoProfileHelp:
      "Complete the profile questionnaire to see whether this stock fits your tolerance.",
    profileFitCtaQuestionnaire: "Open questionnaire",
    profileFitDetailScores:
      "Your profile (questionnaire): {user}/100 · Stock Matrix risk: {stock} (5–95)",
    earningsTitle: "Upcoming earnings and estimates",
    earningsIntro:
      "Yahoo Finance live · calendar {tz}. After applying the SQL migration, npm run etl:yahoo may persist these fields in yahoo_asset_snapshot.",
    earningsDateLabel: "Earnings date:",
    earningsEstimate: "Estimated",
    consensusPeriod: "Consensus period (Yahoo):",
    epsNext: "EPS consensus (next)",
    revenueNext: "Revenue consensus (next)",
    analysts: "Analysts:",
    earningsDisclaimer:
      "Forecasts depend on Yahoo analyst coverage; not advice.",
    earningsNoDate:
      "Yahoo did not return an earnings date for this symbol.",
    mcap: "Market cap",
    peTrailing: "Trailing P/E",
    divYield: "Dividend yield",
    beta: "Beta",
    fundPanelsTitle: "Fundamentals (panel style)",
    fiscalPeriodHint: "Base period (when applicable):",
    fundPanelsEmpty:
      "No parseable US-GAAP facts in stored JSON. Run companyfacts ETL for this CIK or check the DB payload.",
    techTitle: "Technical indicators (from Yahoo candles in DB)",
    techIntro:
      "RSI (14), moving averages and returns are computed server-side from stored closes; not prefetched from the API.",
    techRsiShort: " With fewer than ~15 sessions, RSI does not apply.",
    rsi14: "RSI (14)",
    sma20: "SMA 20",
    sma50: "SMA 50",
    sma200: "SMA 200",
    ret20: "~20-session return",
    ret60: "~60-session return",
    cacheAlphaTitle: "Alpha Vantage cache (`asset_quotes`)",
    cacheAlphaLine:
      "Price: {price} {currency} · updated {when}",
    lastSessionTitle: "Last DB session (Yahoo EOD)",
    ohlcOpen: "Open",
    ohlcHigh: "High",
    ohlcLow: "Low",
    ohlcClose: "Close",
    ohlcAdj: "Adj. close",
    ohlcVol: "Volume",
    priceChartTitle:
      "Close price (Yahoo DB — last {n} sessions shown)",
    chartClose: "Close",
    yahooRawTitle: "Yahoo Finance — snapshot data (`raw_summary` in DB)",
    yahooRawSub:
      "Fields extracted from JSON saved by ETL (price, summary, profile, key statistics, financial data).",
    thField: "Field",
    thValue: "Value",
    statsYahooDemo: "Statistics (Yahoo columns + demo)",
    stat52High: "52-week high",
    stat52Low: "52-week low",
    statVolAvg: "Avg. volume (Yahoo)",
    sectorIndustry: "Sector / Industry",
    currencyExchange: "Currency / Exchange",
    volLastSession: "Last session volume (snapshot)",
    sentimentDemo: "Sentiment (demo)",
    companyFactsDownloaded:
      "SEC company facts (JSON) in DB: downloaded {when}",
    secSummaryTitle:
      "SEC EDGAR — summary (one recent period per concept)",
    secAllRowsTitle: "SEC EDGAR — all rows in DB (up to 300)",
    thConcept: "Concept",
    thPeriod: "Period end",
    thValueSec: "Value",
    emptySearchTitle: "Search for a ticker",
    emptySearchSub:
      "You’ll see Alpha Vantage quotes, Yahoo history and SEC metrics once they are loaded in the database (same ticker across tables).",
    sourceCalc: "Calc.",
    errorInvalidTicker: "Invalid ticker.",
    errorSupabase: "Service unavailable.",
    errorAuth: "Sign in to continue.",
    errorExplorerAuth: "Sign in to explore tickers.",
  },
  tickerPrep: {
    phase1: "Downloading market data for this symbol…",
    phase2: "Syncing fundamentals and history…",
    phase3: "Running analytics…",
    phase4: "Almost there…",
    errors: {
      invalidTicker: "Enter a valid US-style ticker (letters and numbers).",
      notUsListed:
        "That symbol is not listed as a US-traded name in our reference data.",
      config:
        "Automatic download isn’t available right now (server ingest configuration).",
      ingestFailed:
        "We couldn’t finish downloading everything. Please try again later.",
      auth: "You must be signed in.",
    },
  },
  howItWorks: {
    title: "How Matrix works",
    subtitle:
      "A transparent overview of how we profile each investor with disciplined methodology, what stock-level analysis means here, and how we tailor guidance to your situation.",
    profileTitle: "Your investor profile",
    profileLead:
      "We begin with a structured risk-profiling questionnaire built on solid analytical foundations: the question blocks mirror the logic of investor-suitability questionnaires that European rules (MiFID II and equivalent frameworks) and supervisory guidance recommend for assessing risk tolerance, time horizon, and fit with your objectives.",
    profileP2:
      "Your answers are combined systematically into a score that maps you to a profile (conservative, moderate, or aggressive) and to a reference blend across stocks, bonds, cash, and alternatives. That blend is a stable benchmark to compare against your actual portfolio—not a financial product and not an automatic instruction.",
    profileBullet1:
      "The design reflects widely used suitability best practices and industry-recognised frameworks; you can review or update your answers anytime from your profile.",
    profileBullet2:
      "There’s no single “best” profile—the right one is the one that fits you and your goals.",
    stocksTitle: "Analysis for each holding",
    stocksLead:
      "When you explore a ticker, we combine available market context with public fundamental perspective whenever that information is accessible inside the product.",
    stocksP2:
      "You’ll see contextual indicators, recent history, and—when applicable—our own concise read on how “intense” that name looks within Matrix (“Matrix risk”). It bundles signals such as perceived volatility or recent behaviour versus the broader market: it’s informational context, not a buy or sell instruction.",
    stocksBullet1:
      "You can also compare that context to your profile through an orientation score that suggests whether the name’s intensity sits closer to conservative or more adventurous preferences.",
    recoTitle: "Personalized guidance",
    recoLead:
      "Portfolio analysis shows how your wealth is split today across asset classes and compares it to the reference blend tied to your profile.",
    recoP2:
      "From that gap we prioritize educational suggestions—what kinds of exposure could move you closer to an allocation aligned with your preferences, always at a high level (by asset class or focus), without placing trades for you.",
    recoBullet1:
      "Your profile area may include supporting narrative text to help you interpret results; it remains guidance, not regulated personal investment advice.",
    transparencyTitle: "Transparency and boundaries",
    transparencyP:
      "Matrix is built to structure data, add context, and cut through noise. It does not replace personal advice or country-specific tax rules—the final decisions are always yours. For taxes, MiFID-style suitability, or concrete investment offers, speak with a licensed professional.",
    disclaimer:
      "Information shown is for education and context only and does not constitute an offer, solicitation, or personalized investment recommendation.",
  },
  investorReport: {
    copy: "Copy",
    copied: "Copied",
    copyFail: "Could not copy",
  },
  googleAuth: {
    continue: "Continue with Google",
    redirecting: "Redirecting…",
  },
  authDivider: {
    or: "or",
  },
};

export function getUiMessages(locale: AppLocale): MessageTree {
  return locale === "en" ? EN : ES;
}

/** Simple template: replaces `{key}` placeholders. */
export function formatMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Server components: resolve a UI string for a locale. */
export function translateUi(locale: AppLocale, path: string): string {
  return messageAtPath(getUiMessages(locale) as Record<string, unknown>, path);
}
