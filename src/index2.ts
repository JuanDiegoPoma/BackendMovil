import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { process_doc } from './lang_script';
import { Configuration, OpenAIApi } from 'openai';
import * as path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

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
const PORT = process.env.PORT || 9004;

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

// Middleware de autorización
const authorize = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log('Authorization Header:', authHeader);
  if (!authHeader) {
    return res.status(401).send({ error: 'Acceso denegado: No se proporcionó token' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token:', token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key') as { email: string };
    console.log('Decoded Token:', decoded);
    if (!decoded.email.endsWith('@uce.edu.ec')) {
      console.log('Email no autorizado:', decoded.email);
      return res.status(403).send({ error: 'Acceso denegado: Email no autorizado' });
    }
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).send({ error: 'Acceso denegado: Token no válido' });
  }
};

// Endpoint para generar token
app.post('/generateToken', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email.endsWith('@uce.edu.ec')) {
    return res.status(400).send({ error: 'El correo debe ser de dominio uce.edu.ec' });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });
  res.send({ token });
});

// Rutas de la API
app.get('/ping', (req: Request, res: Response) => {
  console.log('alguien ha dado pin!!');
  res.setHeader('Content-Type', 'application/json');
  res.send('pong');
});

app.post('/upload', upload.single('file'), authorize, async (req, res) => {
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

app.post('/openapi', authorize, async (req: Request, res: Response) => {
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
