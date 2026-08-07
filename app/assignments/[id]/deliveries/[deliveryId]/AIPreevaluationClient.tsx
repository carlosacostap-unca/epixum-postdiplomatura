'use client';

import { useState, useEffect, useRef } from 'react';
import { updateAssignmentSystemPrompt, getDeliveryDownloadUrl, updateDeliveryEvaluation } from '@/lib/actions';
import { generateAIEvaluation } from '@/app/actions/openai';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

interface AIPreevaluationClientProps {
  assignmentId: string;
  deliveryId: string;
  initialPrompt: string;
  initialGrade?: number;
  initialFeedback?: string;
  initialVerdict?: 'Aprobado' | 'Corregir y reenviar';
  initialStatus?: 'pending' | 'draft' | 'published';
}

export default function AIPreevaluationClient({ 
  assignmentId, 
  deliveryId, 
  initialPrompt,
  initialGrade,
  initialFeedback,
  initialVerdict,
  initialStatus
}: AIPreevaluationClientProps) {
  const { notify } = useToast();
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });
  
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isEditingUserPrompt, setIsEditingUserPrompt] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // AI Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ nota: number; devolucion: string; verdicto?: 'Aprobado' | 'Corregir y reenviar'; status?: string } | null>(
    initialGrade !== undefined && initialFeedback 
      ? { nota: initialGrade, devolucion: initialFeedback, verdicto: initialVerdict, status: initialStatus }
      : null
  );
  const [evaluationError, setEvaluationError] = useState('');
  
  // AI Evaluation Edit State
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [editedNota, setEditedNota] = useState<number>(initialGrade || 0);
  const [editedDevolucion, setEditedDevolucion] = useState<string>(initialFeedback || '');
  const [editedVerdicto, setEditedVerdicto] = useState<'Aprobado' | 'Corregir y reenviar' | undefined>(initialVerdict);
  
  const hasAttemptedGeneration = useRef(false);

  useEffect(() => {
    if (!hasAttemptedGeneration.current) {
      hasAttemptedGeneration.current = true;
      generateUserPrompt();
    }
    // La generación automática debe ejecutarse una sola vez por montaje. La
    // acción manual disponible en pantalla permite reintentar explícitamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSystemPrompt = async () => {
    setIsSaving(true);
    setSaveMessage({ text: '', type: '' });
    
    const result = await updateAssignmentSystemPrompt(assignmentId, prompt);
    
    if (result.success) {
      setSaveMessage({ text: 'Prompt guardado exitosamente.', type: 'success' });
      setIsEditing(false);
    } else {
      setSaveMessage({ text: 'Error al guardar el prompt.', type: 'error' });
    }
    
    setIsSaving(false);
    
    // Clear success message after 3 seconds
    if (result.success) {
      setTimeout(() => {
        setSaveMessage({ text: '', type: '' });
      }, 3000);
    }
  };

  const generateUserPrompt = async () => {
    setIsProcessingZip(true);
    setUserPrompt('');
    setProcessingStatus('Obteniendo enlace de descarga del ZIP...');

    try {
      // 1. Obtener la URL firmada del archivo ZIP usando la Server Action existente
      const result = await getDeliveryDownloadUrl(deliveryId);
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'No se pudo obtener el enlace de descarga');
      }

      setProcessingStatus('Descargando archivo ZIP de la entrega...');
      
      // 2. Descargar el ZIP usando la URL firmada
      const response = await fetch(result.url, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`No se pudo descargar el archivo ZIP: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      setProcessingStatus('Descomprimiendo y leyendo archivos...');

      // Función auxiliar para procesar un archivo ZIP
      const textExtensions = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.md', '.txt'];
      
      const processZip = async (
        zipData: Blob | ArrayBuffer | Uint8Array,
      ): Promise<{ promptText: string; textFilesCount: number; innerZipEntry: JSZip.JSZipObject | null }> => {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipData);
        
        let promptText = '';
        let textFilesCount = 0;
        let innerZipEntry: JSZip.JSZipObject | null = null;
        
        const filePromises: Promise<void>[] = [];
        
        loadedZip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
            
            // Ignorar carpetas comunes
            if (relativePath.includes('node_modules/') || relativePath.includes('.git/')) {
              return;
            }

            if (textExtensions.includes(ext) || !relativePath.includes('.')) {
              textFilesCount++;
              const promise = zipEntry.async('string').then(content => {
                const fileName = relativePath.split('/').pop() || relativePath;
                promptText += `\n\n=== ARCHIVO ===\n`;
                promptText += `Ubicación: ${relativePath}\n`;
                promptText += `Nombre: ${fileName}\n`;
                promptText += `Extensión: ${ext || 'Sin extensión'}\n`;
                promptText += `--- CONTENIDO ---\n`;
                promptText += `${content}\n`;
                promptText += `=================\n`;
              });
              filePromises.push(promise);
            } else if (ext === '.zip') {
              innerZipEntry = zipEntry;
            }
          }
        });

        await Promise.all(filePromises);
        return { promptText, textFilesCount, innerZipEntry };
      };

      // 3. Procesar el ZIP principal
      let generatedUserPrompt = '';
      const zipProcessResult = await processZip(blob);

      // 4. Si no hay archivos de texto pero hay un ZIP anidado, descomprimir ese
      if (zipProcessResult.textFilesCount === 0 && zipProcessResult.innerZipEntry) {
        setProcessingStatus('Se detectó un archivo ZIP anidado. Descomprimiendo contenido interno...');
        const innerZipData = await zipProcessResult.innerZipEntry.async('blob');
        const innerResult = await processZip(innerZipData);
        generatedUserPrompt = innerResult.promptText;
      } else {
        generatedUserPrompt = zipProcessResult.promptText;
      }
      
      setProcessingStatus('¡Procesamiento completado!');
      setUserPrompt(generatedUserPrompt || 'No se encontraron archivos de texto legibles en el ZIP.');
      
      // 5. El blob descargado no se guarda físicamente en el cliente, 
      // y al terminar la función, se liberará de la memoria por el Garbage Collector de JS,
      // logrando así el comportamiento de "eliminarlo después de procesar" 
      // sin afectar la base de datos (PocketBase).
      
    } catch (error) {
      console.error("Error al procesar el ZIP:", error);
      setProcessingStatus('Error al procesar el archivo ZIP. Inténtalo de nuevo.');
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!evaluationResult && !isEditingEvaluation) return;
    
    const notaToSave = isEditingEvaluation ? editedNota : (evaluationResult?.nota || 0);
    const devolucionToSave = isEditingEvaluation ? editedDevolucion : (evaluationResult?.devolucion || '');
    const verdictoToSave = isEditingEvaluation ? editedVerdicto : evaluationResult?.verdicto;
    
    setIsSavingEvaluation(true);
    const result = await updateDeliveryEvaluation(deliveryId, notaToSave, devolucionToSave, verdictoToSave, 'draft');
    
    if (result.success) {
      setEvaluationResult({
        nota: notaToSave,
        devolucion: devolucionToSave,
        verdicto: verdictoToSave,
        status: 'draft'
      });
      setIsEditingEvaluation(false);
      setProcessingStatus('Borrador guardado con éxito.');
    } else {
      setEvaluationError(result.error || 'Error al guardar el borrador');
    }
    setIsSavingEvaluation(false);
  };

  const handlePublishEvaluation = async () => {
    if (!evaluationResult && !isEditingEvaluation) return;
    
    const notaToSave = isEditingEvaluation ? editedNota : (evaluationResult?.nota || 0);
    const devolucionToSave = isEditingEvaluation ? editedDevolucion : (evaluationResult?.devolucion || '');
    const verdictoToSave = isEditingEvaluation ? editedVerdicto : evaluationResult?.verdicto;
    
    setIsSavingEvaluation(true);
    const result = await updateDeliveryEvaluation(deliveryId, notaToSave, devolucionToSave, verdictoToSave, 'published');
    
    if (result.success) {
      setEvaluationResult({
        nota: notaToSave,
        devolucion: devolucionToSave,
        verdicto: verdictoToSave,
        status: 'published'
      });
      setIsEditingEvaluation(false);
      setProcessingStatus('Evaluación enviada al estudiante con éxito.');
    } else {
      setEvaluationError(result.error || 'Error al enviar la evaluación');
    }
    setIsSavingEvaluation(false);
  };

  const handleCancelEvaluationEdit = () => {
    if (evaluationResult) {
      setEditedNota(evaluationResult.nota);
      setEditedDevolucion(evaluationResult.devolucion);
      setEditedVerdicto(evaluationResult.verdicto);
      setIsEditingEvaluation(false);
    } else {
      // Si se cancela una evaluación manual nueva (no había resultado previo)
      setIsEditingEvaluation(false);
    }
  };

  const handleManualEvaluation = () => {
    // Si no hay resultado previo, inicializamos con valores por defecto
    if (!evaluationResult) {
      setEditedNota(0);
      setEditedDevolucion('');
      setEditedVerdicto(undefined);
    }
    setIsEditingEvaluation(true);
  };

  const handlePreevaluate = async () => {
    if (!prompt || !userPrompt) {
      setEvaluationError('Ambos prompts (Sistema y Usuario) son necesarios para la preevaluación.');
      return;
    }

    setIsEvaluating(true);
    setEvaluationError('');
    setEvaluationResult(null);
    setProcessingStatus('Enviando datos a la IA y generando preevaluación... Esto puede tardar unos segundos.');

    try {
      const result = await generateAIEvaluation(prompt, userPrompt);
      
      if (result.success && result.evaluation) {
        setEvaluationResult(result.evaluation);
        setEditedNota(result.evaluation.nota);
        setEditedDevolucion(result.evaluation.devolucion);
        setEditedVerdicto(result.evaluation.verdicto);
        setProcessingStatus('¡Preevaluación generada con éxito!');
      } else {
        throw new Error(result.error || 'Error desconocido al generar la evaluación');
      }
    } catch (error: unknown) {
      console.error("Error al generar la preevaluación:", error);
      setEvaluationError(getErrorMessage(error, 'Error al comunicarse con la IA. Inténtalo de nuevo.'));
      setProcessingStatus('');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Evaluación
        </h2>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleManualEvaluation}
            disabled={isProcessingZip || isEvaluating || isEditingEvaluation}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Evaluar Manualmente
          </button>
          
          <button
            onClick={handlePreevaluate}
            disabled={isProcessingZip || isEvaluating || !userPrompt || !prompt}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            {isProcessingZip || isEvaluating ? (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {isProcessingZip ? 'Preparando...' : isEvaluating ? 'Evaluando...' : 'Preevaluación con IA'}
          </button>
        </div>
      </div>

      {/* Estado del procesamiento o evaluación */}
      {(processingStatus || evaluationError) && (
        <div className={`mb-4 text-sm px-4 py-3 rounded-md border flex items-center gap-2 ${
          evaluationError || processingStatus.includes('Error') 
            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' 
            : processingStatus.includes('éxito') || processingStatus.includes('completado')
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
        }`}>
          {(isProcessingZip || isEvaluating || isSavingEvaluation) && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {evaluationError || processingStatus}
        </div>
      )}

      {/* 1. Prompt del Sistema (Arriba) */}
      <div className="mb-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Prompt del Sistema (Instrucciones)
          </h3>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Editar
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(prompt);
                    notify({ title: 'Prompt copiado', description: 'Ya podés pegarlo donde lo necesites.', tone: 'success' });
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center gap-1 ml-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setPrompt(initialPrompt || '');
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSystemPrompt}
                  disabled={isSaving}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-4 min-h-[300px] bg-transparent border-0 focus:ring-0 resize-y text-zinc-700 dark:text-zinc-300 font-mono text-sm"
            placeholder="Escribe el prompt del sistema aquí..."
          />
        ) : (
          <div className="p-4 max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-sm text-zinc-700 dark:text-zinc-300">
            {prompt || <span className="italic text-zinc-400">No hay prompt del sistema configurado.</span>}
          </div>
        )}
      </div>

      {/* Mensaje de guardado del prompt del sistema */}
      {saveMessage.text && (
        <div className={`mb-6 text-sm px-4 py-2 rounded-md ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {saveMessage.text}
        </div>
      )}

      {/* 2. Prompt del Usuario (Abajo) */}
      {userPrompt && (
        <div className="mb-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Prompt de Usuario (Archivos del Estudiante)
            </h3>
            <div className="flex items-center gap-2">
              {!isEditingUserPrompt ? (
                <>
                  <button
                    onClick={() => setIsEditingUserPrompt(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userPrompt);
                      setProcessingStatus('¡Prompt de Usuario copiado al portapapeles!');
                      setTimeout(() => setProcessingStatus(''), 3000);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingUserPrompt(false)}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                >
                  Hecho
                </button>
              )}
            </div>
          </div>
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {isEditingUserPrompt ? (
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full h-[350px] p-3 text-sm font-mono text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Ingresa el prompt del usuario aquí..."
              />
            ) : (
              <pre className="text-sm font-mono text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap break-words">
                {userPrompt}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Resultados de la Evaluación (IA o Manual) */}
      {(evaluationResult || isEditingEvaluation) && (
        <div className="mb-6 bg-white dark:bg-zinc-900/50 rounded-xl border-2 border-purple-200 dark:border-purple-900/50 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10 flex justify-between items-center">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              {evaluationResult ? 'Resultado de la Evaluación' : 'Evaluación Manual'}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nota</span>
              {isEditingEvaluation ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editedNota}
                    onChange={(e) => setEditedNota(Number(e.target.value))}
                    className="w-20 text-3xl font-black text-purple-700 dark:text-purple-300 bg-white dark:bg-zinc-800 border-2 border-purple-300 dark:border-purple-700 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-lg text-purple-400 dark:text-purple-600">/10</span>
                </div>
              ) : (
                <span className="text-3xl font-black text-purple-700 dark:text-purple-300 leading-none mt-1">
                  {evaluationResult?.nota || 0}
                  <span className="text-lg text-purple-400 dark:text-purple-600">/10</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/30 bg-white dark:bg-zinc-900">
            <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Veredicto</h4>
            {isEditingEvaluation ? (
              <select
                value={editedVerdicto || ''}
                onChange={(e) => setEditedVerdicto(e.target.value as 'Aprobado' | 'Corregir y reenviar')}
                className="w-full sm:w-auto px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-2 border-purple-200 dark:border-purple-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-zinc-800 dark:text-zinc-200 font-medium"
              >
                <option value="" disabled>Selecciona un veredicto</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Corregir y reenviar">Corregir y reenviar</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                evaluationResult?.verdicto === 'Aprobado' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : evaluationResult?.verdicto === 'Corregir y reenviar'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {evaluationResult?.verdicto || 'Sin veredicto'}
              </span>
            )}
          </div>
          
          <div className="p-6">
            <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Devolución / Feedback</h4>
            {isEditingEvaluation ? (
              <textarea
                value={editedDevolucion}
                onChange={(e) => setEditedDevolucion(e.target.value)}
                className="w-full h-[300px] p-4 text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-purple-200 dark:border-purple-800/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none leading-relaxed"
                placeholder="Escribe la devolución detallada aquí..."
              />
            ) : (
              <div className="prose prose-purple dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {evaluationResult?.devolucion || ''}
                </ReactMarkdown>
              </div>
            )}
            
            <div className="mt-6 flex flex-wrap justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {isEditingEvaluation ? (
                <>
                  <button
                    onClick={handleCancelEvaluationEdit}
                    disabled={isSavingEvaluation}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md transition-colors border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSavingEvaluation}
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-md transition-colors border border-purple-200 dark:border-purple-800 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingEvaluation && <svg className="animate-spin h-4 w-4 text-purple-700 dark:text-purple-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    Guardar Borrador
                  </button>
                  <button
                    onClick={handlePublishEvaluation}
                    disabled={isSavingEvaluation}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {isSavingEvaluation && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    Enviar evaluación al estudiante
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingEvaluation(true)}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar Evaluación
                  </button>
                  {evaluationResult?.status !== 'published' && (
                    <>
                      <button
                        onClick={handleSaveDraft}
                        disabled={isSavingEvaluation}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-md transition-colors border border-purple-200 dark:border-purple-800 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSavingEvaluation && <svg className="animate-spin h-4 w-4 text-purple-700 dark:text-purple-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        Guardar Borrador
                      </button>
                      <button
                        onClick={handlePublishEvaluation}
                        disabled={isSavingEvaluation}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                      >
                        {isSavingEvaluation && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        Enviar evaluación al estudiante
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
