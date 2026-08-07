"use server";

import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/pocketbase-server';
import { getErrorMessage } from '@/lib/errors';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIEvaluation(systemPrompt: string, userPrompt: string) {
  try {
    const user = await getCurrentUser();
    
    // Solo docentes o admins pueden generar preevaluaciones
    if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
      return { success: false, error: 'No autorizado' };
    }

    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'La API Key de OpenAI no está configurada en el servidor' };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Usamos gpt-4o-mini ya que gpt-5-mini no existe aún y es el reemplazo más rápido y económico
      max_tokens: 16384, // gpt-4o-mini soporta hasta 16384 tokens de salida. Esto evita que la respuesta se corte.
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "evaluation_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              nota: {
                type: "number",
                description: "La nota numérica de la evaluación"
              },
              devolucion: {
                type: "string",
                description: "El feedback o devolución detallada para el estudiante"
              },
              verdicto: {
                type: "string",
                enum: ["Aprobado", "Corregir y reenviar"],
                description: "El veredicto final de la evaluación"
              }
            },
            required: ["nota", "devolucion", "verdicto"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return { success: false, error: 'No se recibió respuesta de la IA' };
    }

    const evaluation = JSON.parse(content);

    return { 
      success: true, 
      evaluation: {
        nota: evaluation.nota,
        devolucion: evaluation.devolucion,
        verdicto: evaluation.verdicto
      }
    };
  } catch (error: unknown) {
    console.error("Error generating AI evaluation:", error);
    return { success: false, error: getErrorMessage(error, 'Error al comunicarse con OpenAI') };
  }
}
