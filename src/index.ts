import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { process_doc } from './lang_script';
import { Configuration, OpenAIApi } from 'openai';
import * as path from 'path';
import fs from 'fs';


const db = require('./db');  // Importa la configuración de la base de datos

// Configuración de dotenv para cargar variables de entorno desde el archivo .env
dotenv.config();

// Configuración de OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Crear una aplicación Express
const app = express();

// Middleware para parsear JSON y habilitar CORS
app.use(express.json());
app.use(cors());

// Crear la carpeta uploads si no existe
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuración del puerto
const PORT = process.env.PORT || 9012;

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter(req, file, callback) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (fileExtension !== '.pdf') {
      return callback(new Error('Only PDFs are allowed'));
    }
    callback(null, true);
  },
});

const generatePrompt = (numberToConvert: number) => {
  return `Tu tienes un rol de convertidor binario y requiero que conviertas este numero ${numberToConvert} a binario`;
};

const ClasificarPrompt = (text: string) => {
  return `Clasifique el siguiente texto en una de estas categorías: Cine, Politica, Religion.\n\nText: "${text}`;
};


let names = [
  {
    id: uuidv4(),
    firstName: 'Pablo',
    lastName: 'Caiza',
  },
  {
    id: uuidv4(),
    firstName: 'Lea',
    lastName: 'Rolfes',
  },
];

// Rutas de la API
app.get('/ping', (req: Request, res: Response) => {
  console.log('alguien ha dado pin!!');
  res.setHeader('Content-Type', 'application/json');
  res.send('pong');
});

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('File:', req.file);
  console.log('Body:', req.body);

  if (!req.file || !req.body?.question) {
    return res.status(400).send({ error: 'Archivo PDF y pregunta son requeridos' });
  }
  const filePath = path.join(uploadDir, req.file.filename);
  const normalizedPath = path.normalize(filePath);
  console.log('Ruta del archivo guardado:', normalizedPath);

  try {
    const { response, tokensUsed } = await process_doc(normalizedPath, req.body.question);
    res.send({ response, tokensUsed });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error instanceof Error ? error.message : 'Error desconocido' });
  }
});

app.get('/hola/:nombre/:apellido', (req: Request, res: Response) => {
  console.log('alguien ha dado pin!!');
  res.setHeader('Content-Type', 'application/json');
  const { nombre, apellido } = req.params;
  console.log('alguien ha ingresado su nombre');
  res.send({ nombre, apellido });
});

app.get('/nombres', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(names);
});

app.post('/nombres', (req: Request, res: Response) => {
  const item = { ...req.body, id: uuidv4() };
  names.push(item);
  res.send(item);
});


//NUEVO ENDPOINT
 
// Ruta para usar OpenAI para clasificar el texto

/*
app.post("/classify-text", async (req, res) => {
  const { text } = req.body;

  try {
      const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
      });
      const openai = new OpenAIApi(configuration);

      const prompt = `Classify the following text into one of these categories: cinema, politics, religion.\n\nText: "${text}"`;

      const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
      });

      const result = completion.data.choices?.[0]?.message?.content?.trim();

      // Guarda la clasificación en la base de datos SQLite
      db.run("INSERT INTO classifications (originalText, classification) VALUES (?, ?)", [text, result], function(err) {
          if (err) {
              return console.error(err.message);
          }
          res.send({
              id: this.lastID,
              originalText: text,
              classification: result,
          });
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Error using OpenAI.");
  }
});*/

app.post('/openapi', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4-0613',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: generatePrompt(prompt) }
      ],
      temperature: 0.1,
    });

    const result = completion.data.choices?.[0]?.message?.content?.trim();
    const tokens = completion.data.usage?.total_tokens; // Obtener el número de tokens utilizados

    console.log('Result:', result);
    console.log('Tokens:', tokens);

    if (result) {
      res.send({ result, tokens }); // Incluir los tokens en la respuesta
    } else {
      res.status(500).send({ error: 'No se pudo obtener una respuesta válida del modelo' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).send({ error: errorMessage });
  }
});

//EndPoint clasificar texto
app.post('/clasificartexto', async (req: Request, res: Response) => {
  const { text } = req.body;
  try {
    const prompt = ClasificarPrompt(text);
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: ClasificarPrompt(text) }
      ],
      temperature: 0.2,
    });

    const result = completion.data.choices?.[0]?.message?.content?.trim();
    const tokens = completion.data.usage?.total_tokens; // Obtener el número de tokens utilizados

    console.log('Result:', result);
    console.log('Tokens:', tokens);

    if (result) {
      res.send({ result, tokens }); // Incluir los tokens en la respuesta
    } else {
      res.status(500).send({ error: 'No se pudo obtener una respuesta válida del modelo' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).send({ error: errorMessage });
  }
});



app.delete('/nombres/:id', (req: Request, res: Response) => {
  names = names.filter(n => n.id !== req.params.id);
  res.status(204).end();
});

app.get('/nombres/:id', (req: Request, res: Response) => {
  const searchedName = names.find(n => n.id === req.params.id);
  if (!searchedName) return res.status(400).end();
  res.send(searchedName);
});

app.put('/nombres/:id', (req: Request, res: Response) => {
  const index = names.findIndex(n => n.id === req.params.id);
  if (index === -1) return res.status(404).end();
  names[index] = { ...req.body, id: req.params.id };
  res.status(204).end();
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Running application on port ${PORT}`);
});
