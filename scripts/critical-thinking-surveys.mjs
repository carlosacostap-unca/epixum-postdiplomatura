export const CRITICAL_THINKING_COURSE = {
  id: 'mgk8u25zr4krpaw',
  title: 'Pensamiento Crítico y Resolución de Problemas en Entornos de Inteligencia Artificial',
};
const single = (id, title, labels) => ({ id, title, type: 'single', required: false, options: labels.map((label, i) => ({ id: `o${i + 1}`, label })) });
const multiple = (id, title, labels) => ({ ...single(id, title, labels), type: 'multiple' });
const text = (id, title) => ({ id, title, type: 'text', required: false, options: [] });

export function criticalThinkingSurveys() {
  const common = [
    single('claridad', '¿Qué tan claras te resultaron las explicaciones y consignas del curso?', ['Muy claras', 'Bastante claras', 'Poco claras', 'Nada claras', 'No participé lo suficiente para valorar']),
    single('materiales', '¿Qué tan útiles te resultaron los materiales y ejemplos para comprender los temas?', ['Muy útiles', 'Bastante útiles', 'Poco útiles', 'Nada útiles', 'No los consulté o no puedo valorar']),
    single('ritmo', '¿Cómo te resultó el ritmo del curso en relación con el tiempo que necesitabas para practicar?', ['Más lento de lo que necesitaba', 'Adecuado', 'Más rápido de lo que necesitaba', 'No participé lo suficiente para valorar']),
    single('acompanamiento', 'Cuando necesitaste orientación o devolución, ¿cómo fue tu experiencia?', ['Recibí la orientación que necesitaba', 'Recibí orientación, pero necesité más', 'Busqué orientación y no pude obtenerla', 'No busqué orientación', 'No puedo valorar']),
    multiple('actividades', '¿Qué actividades te ayudaron a aprender? Podés marcar varias; si no podés valorar, elegí solo esa opción.', ['Analizar ejemplos de respuestas de inteligencia artificial', 'Reformular preguntas y comparar respuestas', 'Contrastar información y revisar fuentes', 'Trabajar con una situación o problema propio', 'Conversar y comparar criterios con el grupo', 'Leer materiales o revisar las grabaciones disponibles', 'No participé o no puedo valorar']),
    text('mejora', '¿Qué cambiarías del curso para mejorar la experiencia de aprendizaje? Evitá incluir nombres o datos personales.'),
  ];
  const description = 'Queremos conocer tu experiencia para mejorar el curso. Responder es voluntario: todas las preguntas son opcionales y podés saltear las que no correspondan. Tiempo estimado: 5 minutos. Tus respuestas se presentan sin tu nombre dentro del grupo al que se dirige esta encuesta y no modifican tu resultado de cursada. En los textos libres evitá nombres, datos personales o detalles que permitan identificarte.';
  return [
    { key: 'approved', design: {
      title: 'Balance del aprendizaje y aplicación del pensamiento crítico', description, anonymous: true, audience: 'approved', closesAt: '',
      questions: [...common,
        single('criterio', 'Comparando con el inicio del curso, ¿cómo evaluás hoy tu capacidad para revisar críticamente una respuesta de inteligencia artificial?', ['Me siento mucho más capaz', 'Me siento algo más capaz', 'Me siento igual de capaz', 'Me siento menos capaz', 'No puedo comparar']),
        multiple('aplicacion', '¿En qué situaciones pensás aplicar lo trabajado? Podés marcar varias.', ['Estudio y formación', 'Tareas de trabajo', 'Decisiones de la vida cotidiana', 'Evaluación de información y fuentes', 'Resolución de problemas concretos', 'Todavía no tengo una aplicación definida']),
        text('aprendizaje', '¿Qué idea o práctica del curso te resultó más valiosa? Si querés, contá una aplicación breve sin datos personales.'),
        multiple('profundizar', '¿Qué te gustaría profundizar en una próxima instancia? Podés marcar varias.', ['Evaluación de fuentes y evidencias', 'Reconocimiento de sesgos y supuestos', 'Formulación y revisión de consultas a la inteligencia artificial', 'Comparación de alternativas para tomar decisiones', 'Verificación de respuestas y datos', 'Más práctica con casos completos']),
      ],
    } },
    { key: 'not_approved_or_incomplete', design: {
      title: 'Tu experiencia y próximos pasos en pensamiento crítico', description, anonymous: true, audience: 'not_approved_or_incomplete', closesAt: '',
      questions: [...common,
        single('participacion', '¿Cómo describirías tu participación en el curso?', ['Participé en la mayor parte del recorrido', 'Participé en algunas clases o actividades', 'Consulté principalmente materiales o grabaciones', 'Comencé, pero no pude continuar', 'No pude comenzar', 'Prefiero no responder']),
        multiple('dificultades', 'Si querés contarlo, ¿qué dificultó sostener o completar el recorrido? Podés marcar varias; si preferís no responder, elegí solo esa opción.', ['Tiempo disponible y otras responsabilidades', 'Horarios de los encuentros', 'Conectividad o acceso a dispositivos', 'Acceso o manejo de herramientas de inteligencia artificial', 'Conocimientos previos que necesitaba reforzar', 'Dificultad para comprender consignas o requisitos de entrega', 'Dificultad con las actividades o la evaluación', 'Ritmo o cantidad de tareas', 'Otros motivos que prefiero no detallar', 'Prefiero no responder']),
        multiple('apoyos', '¿Qué apoyos podrían ayudarte a retomar o aprovechar mejor una próxima instancia? Podés marcar varios.', ['Ejemplos de entregas y criterios de evaluación más claros', 'Prácticas breves y guiadas paso a paso', 'Más oportunidades de consulta o devolución', 'Más tiempo para las actividades', 'Opciones de participación con horarios flexibles', 'Ayuda para acceder a las herramientas', 'Un repaso de conocimientos previos', 'No planeo retomar por ahora', 'Todavía no sé']),
        text('proximos_pasos', '¿Qué necesitarías para dar un próximo paso con estos aprendizajes? Podés proponer un cambio concreto sin explicar circunstancias personales.'),
      ],
    } },
  ];
}
