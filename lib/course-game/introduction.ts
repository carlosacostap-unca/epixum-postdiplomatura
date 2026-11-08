import type { BoardResult } from './board';
export const INTRODUCTION_ID = 'course-introduction';
export const INTRODUCTION_TITLE = 'Bienvenida al curso';
export function courseIntroduction(courseTitle: string): BoardResult {
  const safeTitle = courseTitle.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  return {success:true,content:{title:INTRODUCTION_TITLE,resources:[],description:`
    <h2>${safeTitle}</h2>
    <p>Bienvenido al Aula 0, un espacio siempre abierto para orientarte antes de comenzar o volver a consultar durante el curso.</p>
    <h3>Una forma de aprender</h3>
    <p>El pensamiento crítico nos invita a preguntar, examinar evidencias y justificar nuestras decisiones. Al resolver problemas con inteligencia artificial, es útil distinguir hechos de interpretaciones, reconocer supuestos y contrastar las respuestas con fuentes confiables.</p>
    <h3>Preguntas para llevar a cada clase</h3>
    <ul><li>¿Qué problema queremos resolver y qué información nos falta?</li><li>¿Qué evidencia respalda una afirmación? ¿Cómo podemos verificarla?</li><li>¿Qué alternativas, limitaciones o sesgos debemos considerar?</li><li>¿Cómo explicaríamos y revisaríamos nuestra decisión?</li></ul>
    <h3>Tu recorrido por el Nodo</h3>
    <p>Hacé clic o tap en el suelo para caminar, o usá flechas y WASD. Elegí una puerta para acercarte y entrar automáticamente. Dentro de cada aula, acercate a la pizarra para consultar el contenido. Hacé clic o tap en una silla para sentarte, o en una notebook para caminar hasta ella y consultar las consignas y materiales del encuentro. Para levantarte, elegí otro destino o usá el botón Levantarse.</p>
    <p>Las clases se habilitan en su fecha y horario de inicio, según el reloj del servidor mostrado en horario de Argentina. En Encuentros podés consultar los horarios. El Aula 0 permanece abierta, incluso antes de la primera clase.</p>
    <h3>Materiales, actividades y progreso</h3>
    <p>En la pizarra encontrarás los textos y materiales publicados de cada clase. Misiones reúne los trabajos publicados y Mi diario muestra tu avance. Consultá las consignas de cada actividad para conocer sus requisitos y entregas.</p>
    <p>Desde el menú podés consultar cómo jugar, abrir el aula clásica o volver a Epixum. Esta bienvenida orienta sobre el recorrido; las consignas y materiales de cada encuentro son la referencia para las actividades del curso.</p>`}};
}
