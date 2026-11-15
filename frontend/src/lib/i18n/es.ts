// Textos en español. Un archivo por idioma; en.ts debe tener las mismas llaves.
// Pantalla del agricultor: lenguaje llano, sin siglas (AGENTS.md sección 9).
export const es = {
  common: {
    appName: "Field Shift",
    skipToContent: "Saltar al contenido",
    language: "Idioma",
    loading: "Cargando…",
    loadError: "No se pudo cargar la información.",
    fixtureTitle: "Datos de ejemplo",
    fixtureDetail:
      "Estas cifras son de muestra. No describen una parcela real.",
    localCopy:
      "No hay conexión con el servidor. Se muestra la copia guardada en la aplicación.",
    noData: "sin dato",
    // Unidades del contrato en palabras llanas. Lo que no está aquí se muestra tal cual.
    units: {
      "mm/yr": "mm al año",
      "days/yr": "días al año",
      days: "días",
      months: "meses",
      "m3/m3": "m³ de agua por m³ de suelo",
      index: "",
      relative_index_0_1: "(índice relativo de 0 a 1)",
    } as Record<string, string>,
    source: "Fuente",
    date: "Fecha",
    scale: "Escala",
    kind: "Tipo",
    kinds: {
      observed: "observado",
      modeled: "modelado",
      assumed: "supuesto",
      fixture: "dato de ejemplo",
    },
    yes: "Sí",
    no: "No",
    months: [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ],
    monthsLong: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
  },
  home: {
    title: "Field Shift",
    lead: "Compara tres rotaciones de cultivo para tu parcela con datos de satélite de la NASA, y te dice de dónde sale cada cifra.",
    toolTitle: "Abrir la herramienta",
    toolText: "Para el agricultor y su técnico.",
    showcaseTitle: "Presentación",
    showcaseText: "La parcela en 3D, para los jueces.",
    engineerTitle: "Modo ingeniero",
    engineerText: "Modelos, métricas e intervalos.",
    remoteTitle: "Control desde el teléfono",
    remoteText: "Maneja la presentación con tu teléfono.",
  },
  tool: {
    stepsLabel: "Pasos",
    stepOf: (current: number, total: number) => `Paso ${current} de ${total}`,
    previous: "Anterior",
    next: "Siguiente",
    steps: {
      parcel: {
        name: "Parcela",
        title: "¿Cuál de las siguientes es tu parcela?",
      },
      portrait: {
        name: "Retrato",
        title: "Tu parcela vista desde el satélite",
      },
      constraints: {
        name: "Restricciones",
        title: "¿Con qué recursos cuentas?",
      },
      rotations: { name: "Rotaciones", title: "Tres rotaciones para comparar" },
      evidence: { name: "Evidencia", title: "¿De dónde sale cada cifra?" },
      share: { name: "Compartir", title: "Hoja para compartir" },
    },
    parcel: {
      legend: "Elige una parcela piloto",
      area: "Superficie",
      labeled: "Con registros de cultivo",
      unlabeled: "Sin registros de cultivo",
      saved: "Esta elección queda guardada en este dispositivo.",
      coordinatesLabel: "Coordenadas del centro",
      cropRecords: "Registro de cultivos",
      footprintsTitle: "Tamaño real del píxel de cada fuente sobre tu campo",
      footprintsHelp:
        "Cada fuente mira el campo con un tamaño de píxel distinto. Las de varios kilómetros describen la región, no tu campo.",
      metersPerPixel: "metros por píxel",
      sourceNames: {
        hls_landsat: "Color del campo (satélites Landsat y Sentinel)",
        openet: "Agua que usó el campo (OpenET)",
        usda_cdl: "Cultivos sembrados por año",
        srtm: "Altura y pendiente del terreno",
        soilgrids: "Textura y materia orgánica del suelo",
        smap: "Humedad de la región por satélite",
        nasa_power: "Lluvia, temperatura y heladas de la región",
      } as Record<string, string>,
      cases: "Casos del reto",
      whereTitle: "¿Dónde está tu campo?",
      tabMine: "Marcar mi campo",
      tabExamples: "Ver un campo de ejemplo",
      examplesIntro:
        "Campos reales de Diamond Valley, Nevada, el caso del reto. Elige uno de la lista o toca un punto amarillo en el mapa.",
      chosenTitle: "El campo que vas a evaluar",
      analyzedOk: "Listo: tu campo ya está analizado.",
      seePortrait: "Ver tu campo desde el satélite →",
      detected: (n: number) =>
        `Diamond Valley: ${n} pivotes detectados con satélite`,
      detectedNote: (n: number) =>
        `Los ${n} pivotes de Diamond Valley se encontraron con datos de satélite (manchas de cultivo de USDA y vigor de verano de Landsat). Cada uno se evalúa en el servidor con sus propios datos al elegirlo. Su forma es un círculo aproximado, no un lindero oficial.`,
      noneViableShort: "ninguna rotación viable",
      mapTitle: "Mapa",
      mapHelp:
        "Los puntos amarillos son otros campos de ejemplo: toca uno para verlo.",
    },
    constraints: {
      intro:
        "Primero revisamos lo que tienes. Si una rotación no cabe aquí, se descarta antes de calcular lo demás.",
      water: "Agua máxima por año",
      machinery: "Maquinaria disponible",
      noBuyer: "Cultivos sin comprador",
      none: "Ninguno",
      window: "Ventana de siembra",
      editTitle: "Cambia lo que no corresponda a tu parcela",
      editIntro:
        "Estos valores salen de datos de la zona, no de ti. Si conoces los tuyos, cámbialos: las tres rotaciones se vuelven a revisar con lo que declares.",
      mmPerYear: "mm por año",
      machineryNames: {
        pivote_central: "Riego de pivote central",
        riego_aspersion: "Riego por aspersión",
        riego_compuerta: "Riego por compuertas o surcos",
        riego_goteo: "Riego por goteo",
        sembradora_grano: "Sembradora de grano",
        sembradora_convencional: "Sembradora convencional",
        sembradora_directa: "Sembradora de siembra directa",
        empacadora: "Empacadora de heno",
      } as Record<string, string>,
      noBuyerHelp:
        "Marca los cultivos que nadie te compraría. Una rotación que los lleve se descarta.",
      from: "De",
      to: "a",
      apply: "Aplicar y volver a revisar",
      applying: "Revisando…",
      applied:
        "Listo. Rotaciones, evidencia y la hoja para compartir ya usan estos valores.",
      declaredNote:
        "Estás viendo los valores que declaraste en este dispositivo.",
      reset: "Volver a los valores de la zona",
    },
    rotations: {
      noneViable: "Ninguna rotación es viable con lo que declaraste.",
      viable: "Viable",
      ruledOut: "Descartada",
      waterPerYear: "Agua por año",
      prioritiesTitle: "¿Qué te importa más?",
      prioritiesLead:
        "Elige lo más importante para ti. Ordenamos las rotaciones con eso. No usamos puntajes inventados: solo las cifras de abajo.",
      firstPriority: "Lo más importante para mí",
      secondPriority: "Si empatan, después me importa",
      noPriority: "Nada más",
      priorityNames: {
        water: "Ahorrar agua",
        soil: "Cuidar el suelo",
        climate: "Menos helada y calor",
        market: "Vender lo que siembro",
      },
      priorityHelp: {
        water: "Menos agua al año.",
        soil: "Más meses con el suelo cubierto.",
        climate: "Menos días de riesgo de helada y de calor.",
        market: "Precio y comprador.",
      },
      marketMissing:
        "Información que falta: todavía no tenemos precios ni compradores confiables para tu zona, así que no podemos ordenar por esto. Pregunta a tu comprador o cooperativa. Si un cultivo no tiene comprador, márcalo en el paso Límites y la rotación se descarta.",
      noPriorityChosen:
        "Todavía no elegiste qué te importa más. Las rotaciones están en su orden normal.",
      orderedBy: (first: string, second?: string) =>
        second
          ? `Ordenadas por: ${first.toLowerCase()} y, si empatan, ${second.toLowerCase()}. Las descartadas van al final.`
          : `Ordenadas por: ${first.toLowerCase()}. Las descartadas van al final.`,
      firstBecause: (name: string, priority: string, detail: string) =>
        `«${name}» va primero porque elegiste ${priority.toLowerCase()}: ${detail}.`,
      tied: (priority: string) =>
        `Empatan en ${priority.toLowerCase()}; decide tu segunda prioridad.`,
      detail: {
        water: (amount: string) => `usa ${amount}, lo menos entre las viables`,
        soil: (months: string) =>
          `tiene el suelo cubierto ${months} de 36 meses, lo más entre las viables`,
        climate: (frost: string, heat: string) =>
          `suma ${frost} días de riesgo de helada y ${heat} de calor al año, lo menos entre las viables`,
      },
      best: {
        water: "Gasta menos agua",
        soil: "Más suelo cubierto",
        climate: "Menos helada y calor",
      },
      compareTitle: "Las tres rotaciones lado a lado",
      compareCaption:
        "Cifras de cada rotación. Abre «De dónde sale» para ver la fuente, la fecha y la escala.",
      rowNames: {
        annual_water_mm: "Agua al año",
        water_delta_vs_current_mm: "Diferencia de agua frente a la actual",
        soil_cover_months_36m: "Meses con el suelo cubierto (de 36)",
        frost_risk_days_year: "Días con riesgo de helada al año",
        heat_risk_days_year: "Días con riesgo de calor al año",
        prior_crop_vigor_delta_pct:
          "Vigor en campos parecidos según el cultivo anterior (no es causa)",
      },
      whereFrom: "De dónde sale",
      notCompared: "No se compara: está descartada.",
      whyRuledOut: "Por qué se descartó",
      calendarTitle: "Calendario de 36 meses",
      calendarLead:
        "Cada cuadro es un mes. El color y la trama dicen qué hay en el campo. Las tres rotaciones están alineadas mes con mes.",
      calendarLabel: (count: number, from: string, to: string) =>
        `Calendario de ${count} rotaciones, de ${from} a ${to}. La misma información está en la tabla de abajo.`,
      legendTitle: "Qué significa cada cuadro",
      showCalendarTable: "Ver el calendario como tabla",
      calendarCaption: "Qué hay en el campo cada mes, en cada rotación",
      month: "Mes",
      ruledOutTag: "descartada",
      seeEvidence: "Ver por qué se sugiere cada una",
    },
    evidence: {
      why: "Por qué se sugiere",
      support: "Evidencia que la apoya",
      benefits: "Beneficios",
      gaps: "Información que falta",
      risks: "Riesgos que debe revisar alguien local",
      rejected: "Esta rotación está descartada",
    },
    share: {
      intro:
        "Esta hoja se puede imprimir o guardar como PDF desde el navegador.",
      print: "Imprimir o guardar como PDF",
      cover: "Meses con cultivo vivo (de 36)",
      listen: "Escuchar el resumen",
      stopListening: "Detener la lectura",
      linkTitle: "Enlace para tu técnico",
      linkIntro:
        "Crea un enlace para que tu técnico vea esta misma hoja y deje su revisión. Quien no tenga el enlace no puede verla. No se guarda tu nombre ni tus datos de contacto.",
      linkCreate: "Crear enlace",
      linkSaving: "Guardando…",
      linkReady: "Enlace para compartir",
      linkError:
        "No se pudo crear el enlace. Lo demás de la herramienta sigue funcionando.",
      copy: "Copiar enlace",
      copied: "Enlace copiado",
      openReview: "Abrir la vista del técnico",
      parcel: "Parcela",
      rotation: "Rotación",
      status: "Estado",
    },
    readings: {
      loading: "Preguntando a los modelos qué leen en esta parcela…",
      title: "Lo que leen los modelos en tu parcela",
      intro:
        "Dos redes neuronales miran las mismas imágenes de satélite y dicen qué hubo en el campo cada año. No cambian las cifras de arriba: se muestran para que veas cuándo aciertan y cuándo no.",
      experimental:
        "Experimental aquí: el modelo de cultivos aprendió en campos de Estados Unidos y en esta zona no hay registro oficial para comprobarlo.",
      caption: "Lectura de cada año",
      year: "Año",
      model3: "Nuestro modelo de cultivos lee",
      official: "Registro oficial de cultivos (EE. UU.)",
      world: "Google Dynamic World",
      agrees: "coincide",
      disagrees: "no coincide",
      worldValue: (p: string, label: string) =>
        `${p} cultivo (lo más probable: ${label})`,
      model3Metric: (f1: string, base: string) =>
        `Nuestro modelo de cultivos es una red neuronal que lee 12 meses de satélite. En un valle que no vio al entrenar acertó con una puntuación F1 de ${f1}, contra ${base} de decir siempre alfalfa.`,
      worldNote:
        "Google Dynamic World es una red neuronal de Google sobre imágenes Sentinel-2 de 10 m. La cifra es la probabilidad media de cultivo en el año, contando también los meses sin cultivo. Es un producto externo: no lo medimos nosotros.",
      worldOff:
        "Google Dynamic World no está disponible ahora para esta parcela.",
    },
    picker: {
      title: "Marca tu campo",
      viewLabel: "Vista del mapa",
      views: { satellite: "Satélite", relief: "Relieve 3D", map: "Mapa" },
      reliefHint:
        "Relieve 3D: el terreno se ve en tres dimensiones, con la altura exagerada para que se noten las sierras. Gíralo o inclínalo con dos dedos (en computadora, clic derecho y arrastrar). Un toque normal sigue marcando tu campo.",
      step1: "Encuentra tu campo",
      useLocation: "Usar mi ubicación",
      or: "o",
      searchLabel: "Busca tu pueblo, rancho o carretera",
      searchPlaceholder: "Pueblo, rancho o carretera",
      search: "Buscar",
      findHelp:
        "Si estás en tu campo, usa tu ubicación. Si no, busca el pueblo más cercano y acércate con el mapa.",
      noGps:
        "Este teléfono o navegador no da la ubicación. Busca el pueblo más cercano.",
      locating: "Buscando tu ubicación…",
      located: "Listo: el mapa está donde estás.",
      gpsDenied:
        "No hay permiso para usar tu ubicación. Busca el pueblo más cercano.",
      searching: "Buscando…",
      notFound:
        "No encontré ese lugar en Estados Unidos. Prueba con el pueblo más cercano.",
      found: (name: string) =>
        `Encontrado: ${name}. Acércate hasta ver tu campo.`,
      searchError:
        "No se pudo buscar ahora. Mueve el mapa con el dedo hasta tu campo.",
      step2: "Marca tu campo en el mapa",
      methodCenter: "Mi campo es un pivote (círculo)",
      methodEdges: "Mi campo tiene otra forma",
      sizeLabel: "Tamaño del pivote",
      sizes: {
        small: "Pivote chico (unas 13 ha)",
        medium: "Pivote mediano (unas 50 ha)",
        large: "Pivote grande (unas 200 ha)",
      },
      tapCenter: "Toca el centro de tu pivote en el mapa.",
      readyCenter:
        "Listo. Si el círculo amarillo no cubre tu pivote, toca otra vez o cambia el tamaño.",
      tapFirstCorner: "Toca una esquina de tu campo en el mapa.",
      tapMoreCorners: (n: number) =>
        n === 1
          ? "Toca una esquina más."
          : `Toca ${n} esquinas más, siguiendo la orilla del campo.`,
      readyEdges: (n: number) =>
        `Listo: ${n} esquinas. Puedes tocar más para seguir la orilla, o seguir al paso 3.`,
      undo: "Quitar la última esquina",
      restart: "Empezar de nuevo",
      mapLabel: "Mapa de satélite para marcar tu campo",
      typeCoordinates: "Prefiero escribir las coordenadas del centro",
      lat: "Latitud",
      lon: "Longitud",
      placeCenter: "Poner el centro aquí",
      badCoordinates: "Escribe una latitud y una longitud con números.",
      step3: "Analiza tu campo",
      analyzeDisabled: "Primero marca tu campo en el mapa",
      analyzeArea: (ha: string) => `Analizar mi campo (${ha} ha)`,
      analyzing: "Analizando tu campo…",
      working: (s: number) =>
        `Trabajando… ${s} s (suele tardar de 30 a 60 segundos)`,
      workImages: "Pide 36 meses de imágenes de satélite de tu campo",
      workClimate: "Junta el agua que usó, el suelo y el clima de la NASA",
      workModels: "Calcula el agua de cada rotación y corre los modelos",
      error: "No se pudo analizar tu campo.",
      note: "Por ahora solo en los 48 estados contiguos de Estados Unidos. La figura marcada aproxima tu campo; no es un lindero oficial. La búsqueda de lugares usa OpenStreetMap y las imágenes del mapa son de Esri.",
    },
    ask: {
      title: "Pregunta en tus palabras",
      intro:
        "Escribe o dicta tu pregunta. La respuesta sale solo de las cifras de esta hoja; si no hay dato, te lo dice.",
      label: "Tu pregunta",
      placeholder: "¿Cuánta agua usa la rotación que ahorra agua?",
      submit: "Preguntar",
      dictate: "Dictar con la voz",
      stopListening: "Dejar de escuchar",
      examplesLabel: "O elige una pregunta:",
      examples: [
        "¿Cuál rotación es viable?",
        "¿Cuánta agua usa cada rotación?",
        "¿Por qué se sugiere la de menos agua?",
        "¿Qué riesgos debo revisar?",
        "¿Cuántos días de helada hay?",
      ],
      answer: "Respuesta",
      notAnswered: "No hay dato para responder eso",
      sources: "De dónde sale",
      listen: "Escuchar la respuesta",
      error: "No se pudo obtener una respuesta.",
      micDenied: "No hay permiso para usar el micrófono. Escribe la pregunta.",
      micNothing: "No se escuchó nada. Intenta de nuevo o escribe la pregunta.",
    },
    review: {
      title: "Revisión del técnico",
      intro:
        "Esta es la hoja que te compartió el agricultor. Revisa las cifras y deja tu veredicto. No escribas nombres, teléfonos ni correos.",
      missingToken:
        "Este enlace no trae la clave de la hoja. Pide al agricultor que te lo comparta de nuevo.",
      loadError: "No se pudo abrir la hoja compartida.",
      sharedOn: "Compartida el",
      listTitle: "Revisiones anteriores",
      none: "Todavía nadie ha revisado esta hoja.",
      formTitle: "Tu revisión",
      verdictLegend: "Tu veredicto",
      verdicts: { approve: "Aprueba", correct: "Corrige", discard: "Descarta" },
      verdictHelp: {
        approve: "Las cifras y los límites corresponden a la parcela.",
        correct: "Algo no corresponde; anota el límite correcto.",
        discard: "La comparación no sirve para esta parcela.",
      },
      correctedWater: "Agua máxima corregida",
      comments: "Comentarios",
      noPersonalData:
        "Sin nombres, teléfonos ni correos. Hasta 2000 caracteres.",
      submit: "Guardar revisión",
      chooseVerdict: "Elige un veredicto antes de guardar.",
      saved: "Revisión guardada.",
      saveError: "No se pudo guardar la revisión.",
    },
  },
  strip: {
    title: "La tira de la parcela",
    lead: "Cada cuadro es un mes. Su color es el color medio de la parcela vista desde el satélite ese mes.",
    summary: (from: string, to: string) =>
      `Calendario de 36 meses, de ${from} a ${to}. Los datos de cada mes están en la tabla que sigue.`,
    showTable: "Ver los mismos datos en una tabla",
    caption: "Datos de cada mes de la tira",
    month: "Mes",
    color: "Color",
    crop: "Cultivo",
    vigor: "Vigor de la planta",
    rain: "Lluvia",
    waterUse: "Agua que usó",
    frost: "Días con helada",
    heat: "Días de calor",
  },
  showcase: {
    title: "Presentación",
    lead: "Vista para jueces: zoom satelital, parcela en 3D, comparación de tres rotaciones del contrato y control por gestos o teclado.",
    canvasTitle: "Lienzo 3D",
    canvasLoading: "Cargando el lienzo 3D…",
    canvasAlt:
      "Escena 3D interactiva de la parcela con órbita satelital y el tono observado del mes elegido.",
    month: "Mes",
    previousMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    parcelGroup: "Parcela evaluada",
    rotationsTitle: "Rotaciones del contrato",
    rotationsNote:
      "Pulsa R, usa la mano abierta frente a la cámara o elige una rotación para ver su cultivo en este mes y sus cifras con ficha.",
    noViable: "Ninguna rotación pasó todas las restricciones declaradas.",
    rotationCrop: "Cultivo en la secuencia",
    rotationViable: "Viable",
    yes: "Sí",
    no: "No",
    rotationWater: "Agua anual",
    rotationCover: "Meses con suelo cubierto (36 meses)",
    gesturesTitle: "Control por gestos",
    gesturesNote:
      "Pellizca para avanzar un mes y abre la palma para cambiar de rotación. La cámara solo se activa con este botón; con el teclado usa las flechas izquierda y derecha y la tecla R.",
    enableGestures: "Activar control por gestos",
    cameraAsking: "Pidiendo permiso de cámara…",
    cameraGranted:
      "Control activo. Pellizca para avanzar un mes y mantén la mano abierta para cambiar de rotación.",
    disableGestures: "Apagar cámara y gestos",
    cameraPreview: "Vista previa de la cámara para detectar la mano",
    gestureError:
      "No se pudo iniciar el reconocimiento de la mano. Puedes seguir con el teclado.",
    cameraDenied: "Sin permiso de cámara. Puedes seguir con el teclado.",
    cameraUnavailable:
      "Este navegador no ofrece cámara. Puedes seguir con el teclado.",
    raw: "Evaluación en crudo",
  },
  engineer: {
    title: "Modo ingeniero",
    lead: "Auditoría técnica de la evaluación real: métricas de los cuatro modelos, pesos temporales y lectura del contrato completo.",
    models: "Modelos",
    model: "Modelo",
    status: "Estado",
    algorithm: "Algoritmo",
    metric: "Métrica",
    baseline: "Línea base",
    note: "Nota",
    attention: "Meses que más pesaron en la lectura",
    weight: "Peso",
  },
  remote: {
    title: "Control desde el teléfono",
    lead: "Esqueleto. Hoy solo lee la evaluación; todavía no se conecta con la pantalla grande.",
    supabaseOn: "Supabase está configurado.",
    supabaseOff:
      "Supabase no está configurado: el control remoto no puede conectarse.",
    month: "Mes",
    rotation: "Rotación",
    raw: "Lo que mostrará el control",
  },
};

export type Dictionary = typeof es;
