import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { process_doc } from './lang_script';
import { Configuration, OpenAIApi } from 'openai';
import * as path from 'path';
import fs from 'fs';


// Configuración de dotenv para cargar variables de entorno desde el archivo .env
dotenv.config();

let consultas: string[] = [];

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
    callback(null, uploadDir); // Establecer la carpeta de destino para los archivos subidos
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
      return callback(new Error('Only PDFs are allowed')); // Solo permitir archivos PDF
    }
    callback(null, true);
  },
});

// Función para generar el prompt para clasificar texto
const ClasificarPrompt = (text: string): string => {
  // Generar el listado de consultas
  let listado: string = consultas.map((consulta) => `${consulta}`).join('\n');

  return `
Tienes el rol de clasificar el texto que se te proporcione de la siguiente manera:
Ejemplo de entrada:

1.La política es corrupta

El número que ingrese el usuario antes del texto puede ser cualquier número.
Por favor, sigue estos pasos:

1. Clasifica el texto en una de las categorías: 1. Cine, 2. Política, 3. Religión.
 Ejemplo de salida: 
1.La política es corrupta - 2. Politica
2. Guarda el número y el texto ingresado con su respectiva clasificación.
3. Vas a guardar en una lista todas las consultas que se te envíen en varias peticiones, junto con las clasificaciones de cada texto, para luego mostrar el texto con su clasificación de la siguiente manera:

Ejemplo de listado:
1. Dios es bueno - 3. Religión
2. La política es corrupta - 2. Política
30. Ayer se estrenó una película - 1. Cine

Y así, irás agregando en la lista de manera vertical todos los demás textos que se ingresen y su respectiva clasificación.
4. Finalmente, actualiza y muestra el listado con la ultima consulta realizada.
Listado actual:
${listado}
Texto: "${text}"`;
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

//Ruta de clasificar texto
app.post('/clasificartexto', async (req: Request, res: Response) => {
  const { text } = req.body;
  try {
    const prompt = ClasificarPrompt(text); // Generar el prompt usando la función ClasificarPrompt
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    });
    const result = completion.data.choices?.[0]?.message?.content?.trim(); // Obtener el resultado del modelo
    const tokens = completion.data.usage?.total_tokens; // Obtener el número de tokens utilizados
    console.log('Result:', result);
    console.log('Tokens:', tokens);
    if (result) {
      consultas.push(`${text} - ${result}`); // Agregar el texto y la clasificación a la lista de consultas
      let listado: string = consultas.join('\n');  // Generar el listado actualizado
      res.send({ result: listado, tokens });
    } else {
      res.status(500).send({ error: 'No se pudo obtener una respuesta válida del modelo' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).send({ error: errorMessage });
  }
});

//Demas Rutas
// Ruta para verificar si el servidor está funcionando
app.get('/ping', (req: Request, res: Response) => {
  console.log('alguien ha dado pin!!');
  res.setHeader('Content-Type', 'application/json');
  res.send('pong');
});

// Ruta para subir archivos PDF y procesarlos
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
//Otras Rutas
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
//Ruta de clasificar texto
app.post('/clasificartexto', async (req: Request, res: Response) => {
  const { text } = req.body;
  try {
    const prompt = ClasificarPrompt(text);
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    });
    const result = completion.data.choices?.[0]?.message?.content?.trim();
    const tokens = completion.data.usage?.total_tokens; // Obtener el número de tokens utilizados
    if (result) {
      consultas.push(`${text} - ${result}`);
      let listado: string = consultas.join('\n');
      res.send({ result: listado, tokens });
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
