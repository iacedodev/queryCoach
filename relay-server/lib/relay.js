import { WebSocketServer } from 'ws';
import { RealtimeClient } from '@openai/realtime-api-beta';
import OpenAI from 'openai';
import { executeQuery } from '../utils/database.js';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { uploadFilesToVectorStore } from '../lib/vectorStore.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar que existe el directorio uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Mantener la extensión original del archivo
    const extension = path.extname(file.originalname)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + extension)
  }
})

export class RealtimeRelay {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey });
    this.activeConnections = new Set();
    this.wss = null;
    this.app = express();
    this.setupExpress();
  }

  setupExpress() {
    const upload = multer({ storage: storage });
    this.app.use(cors());
    
    this.app.post('/upload', upload.array('files'), async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log('Files received:', req.files);
        this.log('Files received:', req.files);
        await uploadFilesToVectorStore(req.files, this.apiKey);
        
        res.json({ 
          success: true, 
          message: 'Files uploaded successfully',
          files: req.files.map(f => f.originalname)
        });
      } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).json({ 
          error: 'Error processing files',
          details: error.message 
        });
      }
    });

    this.app.listen(8082, () => {
      console.log('Express server running on port 8082');
    });
  }

  listen(port) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', this.connectionHandler.bind(this));
    this.log(`Listening on ws://localhost:${port}`);
  }

  async connectionHandler(ws, req) {
    if (!req.url) {
      this.log('No URL provided, closing connection.');
      ws.close();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== '/') {
      this.log(`Invalid pathname: "${pathname}"`);
      ws.close();
      return;
    }

    // Instantiate new client
    this.log(`Connecting with key "${this.apiKey.slice(0, 3)}..."`);
    const client = new RealtimeClient({ apiKey: this.apiKey });

    // Relay: OpenAI Realtime API Event -> Browser Event
    client.realtime.on('server.*', (event) => {
      this.log(`Relaying "${event.type}" to Client`);
      ws.send(JSON.stringify(event));
    });
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
      async ({ query }) => {
        const result = executeQuery(query);
        ws.send(JSON.stringify({ type: 'hello', data: 'test' }));
        this.log('runing query...')
        // Enviamos el evento al cliente usando ws.send
        ws.send(JSON.stringify({
          type: 'server.sql_result', // Match the 'server.*' pattern
          data: {
            success: result.success,
            results: result.data,
            message: result.message,
            query: query
          }
        }));

        return JSON.stringify(result);
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
      async ({ question }) => {
        try {
          // Create a new thread for each question
          const thread = await this.openai.beta.threads.create();
          this.log('Thread created:', thread.id);

          // Add the message to the thread
          await this.openai.beta.threads.messages.create(
            thread.id,
            {
              role: "user",
              content: question
            }
          );

          ws.send(JSON.stringify({
            type: 'server.sql_theory_status',
            data: {
              status: 'generating',
              question: question
            }
          }));

          // Create and poll the run
          const run = await this.openai.beta.threads.runs.createAndPoll(
            thread.id,
            {
              assistant_id: 'asst_CdCTg96Dr2lbl9YoFQ3sJZUP',
              instructions: `
              Actúa como un profesor experto en SQL respondiendo a una pregunta teórica.
              Incluye un titulo pero que no sea de un tamaño demasiado grande.
              Incluye ejemplos prácticos cuando sea posible.
              Usa bullets unificados cuando lo veas necesario(•)
              No uses enumeraciones.
              
          Pregunta: ${question}
          
          Estructura de la respuesta:
          1. "📚 Explicación:"
             - Responde de forma clara y concisa
             - Usa ejemplos prácticos cuando sea posible
             - Incluye emojis relevantes
          
          2. "💡 Puntos clave:"
             - Lista 2-3 conceptos importantes
             - Destaca mejores prácticas
          
          3. "🔍 Recursos adicionales:"
             - Sugiere temas relacionados para profundizar
             - Menciona conceptos avanzados relacionados

          Nunca des pie a una posible respuesta adicional del usuario , ya que esto es una explicacion unica no una conversacion.
          
              Usa markdown para formatear la respuesta y mantén un tono didáctico y amigable.`
            }
          );

          if (run.status === 'completed') {
            const messages = await this.openai.beta.threads.messages.list(thread.id);
            const lastMessage = messages.data.find(msg => 
              msg.role === 'assistant' && msg.run_id === run.id
            );
            
            if (lastMessage) {
              ws.send(JSON.stringify({
                type: 'server.sql_theory',
                data: {
                  explanation: lastMessage.content[0].text.value
                }
              }));
            }

            ws.send(JSON.stringify({
              type: 'server.sql_theory_status',
              data: {
                status: 'completed',
                question: question
              }
            }));
          }
          return "Explicacion teorica generada correctamente";
        } catch (error) {
          console.error('Error:', error);
          return "Error al generar la explicación teórica";
        }
      }
    );
    client.realtime.on('close', () => ws.close());

    // Relay: Browser Event -> OpenAI Realtime API Event
    // We need to queue data waiting for the OpenAI connection
    const messageQueue = [];
    const messageHandler = (data) => {
      try {
        const event = JSON.parse(data);
        this.log(`Relaying "${event.type}" to OpenAI`);
        client.realtime.send(event.type, event);
      } catch (e) {
        console.error(e.message);
        this.log(`Error parsing event from client: ${data}`);
      }
    };
    ws.on('message', (data) => {
      if (!client.isConnected()) {
        messageQueue.push(data);
      } else {
        messageHandler(data);
      }
    });
    ws.on('close', () => {
      this.activeConnections.delete(ws);
      client.disconnect();
    });

    // Connect to OpenAI Realtime API
    try {
      this.log(`Connecting to OpenAI...`);
      await client.connect();
    } catch (e) {
      this.log(`Error connecting to OpenAI: ${e.message}`);
      ws.close();
      return;
    }
    this.log(`Connected to OpenAI successfully!`);
    while (messageQueue.length) {
      messageHandler(messageQueue.shift());
    }

    // Agregar conexión activa
    this.activeConnections.add(ws);
  }

  log(...args) {
    // Console log in server
    console.log(`[RealtimeRelay]`, ...args);
    
    // If we have an active WebSocket, send the log to the client
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'server.log',
            data: {
              timestamp: new Date().toISOString(),
              message: args.join(' ')
            }
          }));
        }
      });
    }
  }
}
