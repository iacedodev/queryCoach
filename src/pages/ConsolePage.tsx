/**
 * Running a local relay server will allow you to hide your API key
 * and run custom logic on the server
 *
 * Set the local relay server address to:
 * REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 *
 * This will also require you to set OPENAI_API_KEY= in a `.env` file
 * You can run it with `npm run relay`, in parallel with `npm start`
 */
const LOCAL_RELAY_SERVER_URL: string = process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('tmp::voice_api_key');

import { useEffect, useRef, useCallback, useState, memo } from 'react';
import { IgsLineChart } from '../components/IgsLineChart';

import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { instructions } from '../utils/conversation_config.js';
import { WavRenderer } from '../utils/wav_renderer';

import { X, Edit, Zap, ArrowUp, ArrowDown, Upload } from 'react-feather';
import { Button } from '../components/button/Button';
import { Toggle } from '../components/toggle/Toggle';

import './ConsolePage.scss';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import ReactMarkdown from 'react-markdown';
import { TypewriterText } from '../components/typewriter/TypewriterText';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as showdown from 'showdown';
import { SQLResultTable } from '../components/SQLResultTable';
import { dbContext } from '../utils/dbContext';
import { TableInfoCards } from '../components/TableInfoCards';

// Al inicio del componente ConsolePage
const markdownConverter = new showdown.Converter({
  tables: true,
  tasklists: true,
  emoji: true,
  simpleLineBreaks: true,
  ghCodeBlocks: true,
  strikethrough: true,
  ghMentions: true
});

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface HealthData {
  current: {
    alimentacion: number;
    psicosalud: number;
    cancer: number;
    corazon: number;
    tabaco: number;
    hepatico: number;
    osteomuscular: number;
    patientName: string;
    igs: number;
  };
  future: {
    alimentacion: number;
    psicosalud: number;
    cancer: number;
    corazon: number;
    tabaco: number;
    hepatico: number;
    osteomuscular: number;
    igs: number;
  };
}

// Add these functions after the existing imports
const HEALTH_DATA_STORAGE_KEY = 'health_assistant_data';

const saveHealthDataToStorage = (data: HealthData) => {
  try {
    localStorage.setItem(HEALTH_DATA_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving health data to localStorage:', error);
  }
};

const loadHealthDataFromStorage = (): HealthData | null => {
  try {
    const storedData = localStorage.getItem(HEALTH_DATA_STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error('Error loading health data from localStorage:', error);
    return null;
  }
};













  const options = {
    layout: {
      padding: {
        top: 5 // Adjust this value to increase or decrease the top margin
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 10,
        ticks: {
          font: {
            family: "'Roboto Mono', monospace",
            size: 10
          }
        },
        pointLabels: {
          font: {
            family: "'Roboto Mono', monospace",
            size: 8
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            family: "'Roboto Mono', monospace",
            size: 12
          },
        }
      },
      tooltip: {
        bodyFont: {
          family: "'Roboto Mono', monospace",
          size: 12
        },
        titleFont: {
          family: "'Roboto Mono', monospace",
          size: 12
        }
      }
    }
  };

/**
 * Type for result from get_weather() function call
 */
interface Coordinates {
  lat: number;
  lng: number;
  location?: string;
  temperature?: {
    value: number;
    units: string;
  };
  wind_speed?: {
    value: number;
    units: string;
  };
}

/**
 * Type for all event logs
 */
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

export function ConsolePage() {
  const [typewriterComplete, setTypewriterComplete] = useState<(() => void) | null>(null);
  /**
   * Ask user for API Key
   * If we're using the local relay server, we don't need this
   */
  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : localStorage.getItem('tmp::voice_api_key') ||
      prompt('OpenAI API Key') ||
      '';
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey);
  }

  /**
   * Instantiate:
   * - WavRecorder (speech input)
   * - WavStreamPlayer (speech output)
   * - RealtimeClient (API client)
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  /**
   * References for
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  /**
   * All of our variables for displaying application state
   * - items are all conversation items (dialog)
   * - realtimeEvents are event logs, which can be expanded
   * - memoryKv is for set_memory() function
   * - coords, marker are for get_weather() function
   */
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const [textInput, setTextInput] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [sqlResults, setSqlResults] = useState<any[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [sqlExplanation, setSqlExplanation] = useState<string>('');
  const [hasQueryExplanation, setHasQueryExplanation] = useState(false);

  const [isAskingTheory, setIsAskingTheory] = useState(false);
  const [theoryQuestion, setTheoryQuestion] = useState('');

  

  /**
   * Utility for formatting the timing of logs
   */
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  /**
   * When you click the API key
   */
  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  /**
   * Connect to conversation:
   * WavRecorder taks speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setSqlResults([]);
    setTheoryQuestion('');
    setCurrentQuery('');
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hola!`,
        // text: `For testing purposes, I want you to list ten car brands. Number each item, e.g. "one (or whatever number you are one): the item name".`
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setCurrentQuery('');
    setSqlResults([]);
    setSqlExplanation('');
    setHasQueryExplanation(false);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * In push-to-talk mode, start recording
   * .appendInputAudio() for each sample
   */
  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };
  const handleTextSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (textInput.trim() === '') return;

  const client = clientRef.current;
  client.sendUserMessageContent([
    {
      type: 'input_text',
      text: textInput,
    },
  ]);
    setTextInput('');
  };

  /**
   * Switch between Manual <> VAD mode for communication
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === 'none');
  };

  async function generateSQLExplanation(query: string, results: any[]): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }
  
      const prompt = `
      Actúa como un profesor de bases de datos explicando una consulta SQL a sus estudiantes.
  
      Consulta: ${query}
      Datos: ${results.length} resultados, Columnas: ${Object.keys(results[0] || {}).join(', ')}
  
      Contexto de la DB:
      ${dbContext}
  
      Estructura de la respuesta:
      1. "📊 ¡Veamos qué hace esta consulta!"
         - Explica el propósito y funcionamiento en máximo 3 líneas
         - Usa emojis relevantes y markdown
         - Destaca números y datos importantes
  
      2. "💡 Consejos y Observaciones:"
         - 2-3 consejos prácticos sobre la consulta
         - Menciona posibles optimizaciones o mejores prácticas
         - Destaca aspectos importantes a considerar
  
      3. "🔄 Variaciones interesantes:"
         - Sugiere 2-3 variaciones de la consulta que:
           * Muestren diferentes enfoques
           * Aprovechen otras tablas relacionadas
           * Agreguen análisis adicionales
      
      - Usa bullets unificados cuando lo veas necesario(•)
  
      Mantén un tono didáctico y amigable, usando markdown para resaltar elementos importantes , no uses enumeraciones`;
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Eres un experto en SQL que explica consultas de manera clara y concisa."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
  
      if (!response.ok) {
        throw new Error('Error en la llamada a OpenAI API');
      }
  
      const result = await response.json();
      setHasQueryExplanation(true);
      return result.choices[0].message.content;
    } catch (error: any) {
      console.error('Error generando explicación SQL:', error);
      return `Error generando explicación: ${error.message}`;
    }
  }

  /**
   * Auto-scroll the event logs
   */
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions with db context
    client.updateSession({ instructions: instructions + dbContext });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    client.addTool(
      {
        name: 'execute_sql',
        description: 'Executes a SQL query and returns the results',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The SQL query to execute',
            },
          },
          required: ['query'],
        },
      },
      async ({ query }: {query: string}) => {
        return 'procesando peticion...'
      }
    );
    client.addTool(
      {
        name: 'ask_sql_theory',
        description: 'Provides theoretical explanations about SQL concepts and best practices',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The SQL theoretical question to be answered',
            },
          },
          required: ['question'],
        },
      },
      async ({ question }: { question: string }) => {
        return 'procesando peticion...'
      }
    );
    client.addTool(
      {
        name: 'export_sql_to_csv',
        description: 'Exports the current SQL query results to a CSV file',
        parameters: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Name for the exported CSV file (optional)',
            },
          },
        },
      },
      async ({ filename }: { filename?: string }) => {
        console.log('sqlResults', sqlResults);
        if (!sqlResults || sqlResults.length === 0) {
          return 'No hay resultados SQL disponibles para exportar.';
        }
    
        try {
          // Get headers from the first result object
          const headers = Object.keys(sqlResults[0]);
          
          // Convert data to CSV format
          const csvContent = [
            // Headers row
            headers.join(','),
            // Data rows
            ...sqlResults.map(row => 
              headers.map(header => {
                const value = row[header];
                // Handle values that might contain commas
                return typeof value === 'string' && value.includes(',') 
                  ? `"${value}"` 
                  : value;
              }).join(',')
            )
          ].join('\n');
    
          // Create blob and download link
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', `${filename || 'sql_results'}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
    
          return 'Resultados exportados exitosamente a CSV.';
        } catch (error) {
          console.error('Error exporting to CSV:', error);
          return 'Error al exportar los resultados a CSV.';
        }
      }
    );

    // handle realtime events from client + server for event logging
    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      if (realtimeEvent.event.type === 'execute_sql') {
        try {
          const result = JSON.parse(realtimeEvent.event.content);
          if (result.success && result.data) {
            setSqlResults(result.data);
          } else {
            setSqlResults([]);
          }
        } catch (error) {
          console.error('Error parsing SQL results:', error);
          setSqlResults([]);
        }
      }
      
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset();
    };
  }, []);

  useEffect(() => {
    const client = clientRef.current;

    if (client) {
      // Escuchar eventos del servidor
      client.realtime.on('server.*', (event: any) => {
        // console.log('Received server event:', event);
        
        if (event.type === 'server.sql_result') {
          console.log('SQL Results:', event.data);
          if (event.data?.success && event.data?.results) {
            setSqlResults(event.data.results);
            setCurrentQuery(event.data.query);
            
            // Generar explicación de la consulta
            setIsGeneratingExplanation(true);
            generateSQLExplanation(event.data.query, event.data.results)
              .then(explanation => {
                setSqlExplanation(explanation);
                setIsGeneratingExplanation(false);
              })
              .catch(error => {
                console.error('Error generating SQL explanation:', error);
                setIsGeneratingExplanation(false);
              });
          }
        }
        else if (event.type === 'server.sql_theory_status') {
          setIsGeneratingExplanation(true);
          setTheoryQuestion(event.data.question);
          if (event.data.status === 'completed') {
            setHasQueryExplanation(true);
            setIsGeneratingExplanation(false);
          }

        }
        else if (event.type === 'server.sql_theory') {
          console.log('SQL Theory:', event.data.explanation);
          setSqlExplanation(event.data.explanation);
        }
      });
    }

    // Cleanup function
    return () => {
      if (client) {
        client.realtime.off('server.*');
      }
    };
  }, []);

  /**
   * Render the application
   */
  return (
    <div data-component="ConsolePage">
      <div className="content-top">
        <div className="content-title">
          <img src="/icon-aitaly.svg" />
          <span>Asistente de salud</span>
          </div>
        <div className="content-api-key">
          {!LOCAL_RELAY_SERVER_URL && (
            <Button
              icon={Edit}
              iconPosition="end"
              buttonStyle="flush"
              label={`api key: ${apiKey.slice(0, 3)}...`}
              onClick={() => resetAPIKey()}
            />
          )}
            </div>
            <div className="file-upload-container">
              <input
                type="file"
                accept=".pdf,.txt"
                multiple
                onChange={handleFileUpload}
                className="file-input"
                style={{ display: 'none' }}
                id="file-upload"
              />
              <Button
                label="Subir PDFs"
                icon={Upload}
                style={{borderRadius: '10px'}}
                buttonStyle="regular"
                onClick={() => document.getElementById('file-upload')?.click()}
              />
            </div>
            </div>
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
            <div className="content-block-title">eventos</div>
            <div className="content-block-body" ref={eventsScrollRef}>
              {!realtimeEvents.length && `Esperando conexión...`}
              {realtimeEvents.map((realtimeEvent, i) => {
                const count = realtimeEvent.count;
                const event = { ...realtimeEvent.event };
                if (event.type === 'input_audio_buffer.append') {
                  event.audio = `[trimmed: ${event.audio.length} bytes]`;
                } else if (event.type === 'response.audio.delta') {
                  event.delta = `[trimmed: ${event.delta.length} bytes]`;
                }
                return (
                  <div className="event" key={event.event_id}>
                    <div className="event-timestamp">
                      {formatTime(realtimeEvent.time)}
                    </div>
                    <div className="event-details">
                      <div
                        className="event-summary"
                        onClick={() => {
                          // toggle event details
                          const id = event.event_id;
                          const expanded = { ...expandedEvents };
                          if (expanded[id]) {
                            delete expanded[id];
                          } else {
                            expanded[id] = true;
                          }
                          setExpandedEvents(expanded);
                        }}
                      >
                        <div
                          className={`event-source ${
                            event.type === 'error'
                              ? 'error'
                              : realtimeEvent.source
                          }`}
                        >
                          {realtimeEvent.source === 'client' ? (
                            <ArrowUp />
                          ) : (
                            <ArrowDown />
                          )}
                          <span>
                            {event.type === 'error'
                              ? 'error!'
                              : realtimeEvent.source}
                          </span>
            </div>
                        <div className="event-type">
                          {event.type}
                          {count && ` (${count})`}
          </div>
        </div>
                      {!!expandedEvents[event.event_id] && (
                        <div className="event-payload">
                          {JSON.stringify(event, null, 2)}
            </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content-block conversation">
            <div className="content-block-title">conversación</div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && `Esperando conexión...`}
              {items.map((conversationItem, i) => {
                return (
                  <div className="conversation-item" key={conversationItem.id}>
                    <div className={`speaker ${conversationItem.role || ''}`}>
                      <div>
                        {(
                          conversationItem.role || conversationItem.type
                        ).replaceAll('_', ' ')}
                      </div>
                      <div
                        className="close"
                        onClick={() =>
                          deleteConversationItem(conversationItem.id)
                        }
                      >
                        <X />
                            </div>
                          </div>
                    <div className={`speaker-content`}>
                      {/* tool response */}
                      {conversationItem.type === 'function_call_output' && (
                        <div>{conversationItem.formatted.output}</div>
                      )}
                      {/* tool call */}
                      {!!conversationItem.formatted.tool && (
                        <div>
                          {conversationItem.formatted.tool.name}(
                          {conversationItem.formatted.tool.arguments})
                            </div>
                      )}
                      {!conversationItem.formatted.tool &&
                        conversationItem.role === 'user' && (
                          <div>
                            {conversationItem.formatted.transcript ||
                              (conversationItem.formatted.audio?.length
                                ? '(awaiting transcript)'
                                : conversationItem.formatted.text ||
                                  '(item sent)')}
                          </div>
                        )}
                      {!conversationItem.formatted.tool &&
                        conversationItem.role === 'assistant' && (
                          <div>
                            {conversationItem.formatted.transcript ||
                              conversationItem.formatted.text ||
                              '(truncated)'}
                      </div>
                        )}
                      {conversationItem.formatted.file && (
                        <audio
                          src={conversationItem.formatted.file.url}
                          controls
                        />
                      )}
                    </div>
                </div>
                );
              })}
              </div>
            </div>
          <div className="content-actions">
            <form onSubmit={handleTextSubmit} className="text-input-form">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
              />
            </form>
            <Toggle
              defaultValue={false}
              labels={['manual', 'fluid']}
              values={['none', 'server_vad']}
              onChange={(_, value) => changeTurnEndType(value)}
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? 'release to send' : 'push to talk'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? 'desconectar' : 'conectar'}
              iconPosition={isConnected ? 'end' : 'start'}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={
                isConnected ? disconnectConversation : connectConversation
              }
            />
          </div>
            </div>
        <div className="content-right">
          <div className={`content-block map ${hasQueryExplanation ? 'recommendations-active' : ''}`}>
            <div className="content-block-title bottom">
              {currentQuery ? `Mostrando ${sqlResults.length} resultados` : 'Query viewer'}
            </div>
            <div className="right-panel">
              <div className="sql-results-section">
                {!currentQuery ? (
                  <div className="initial-state">
                    <TableInfoCards />
                  </div>
                ) : (
                  <>
                    {sqlResults && sqlResults.length > 0 ? (
                      <SQLResultTable data={sqlResults} />
                    ) : (
                      <div className="no-results">
                        No hay resultados SQL para mostrar
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
          </div>
          <div className={`content-block kv ${hasQueryExplanation ? 'recommendations-active' : ''}`}>
            <div className="content-block-title top">
              {!theoryQuestion && !currentQuery ? 'Query guide' : ''}
              {currentQuery}
              {theoryQuestion || ''}
            </div>
            <div 
              className={`collapse-button ${!hasQueryExplanation ? 'collapsed' : ''}`} 
              onClick={() => setHasQueryExplanation(!hasQueryExplanation)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
                          </div>
            <div className="content-block-body content-kv">
              <div className="recommendations-container" ref={scrollContainerRef}>
                {isGeneratingExplanation ? (
                  <div className="generating-text">
                    Generando explicación de la consulta<span className="dots">...</span>
                          </div>
                ) : (
                  <>
                    <div className="recommendations-text">
                      <TypewriterText 
                        text={sqlExplanation || ''} 
                        speed={10} 
                        onTextUpdate={() => {
                          if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTo({
                              top: scrollContainerRef.current.scrollHeight,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        onComplete={() => {
                        }}
                      />
                        </div>

                  </>
                )}
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
  );
}


const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files) return;
  console.log('Files received:', files);

  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });

  try {
    const response = await fetch(`http://localhost:8082/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error al subir los archivos');
    }

    console.log('Archivos subidos:', result);
    // Aquí podrías mostrar un mensaje de éxito al usuario
  } catch (error) {
    console.error('Error:', error);
    // Aquí podrías mostrar un mensaje de error al usuario
  }
};