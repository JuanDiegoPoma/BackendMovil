import pdf from 'pdf-parse';
import { Configuration, OpenAIApi } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const process_doc = async (filePath: string, question: string) => {
  const normalizedPath = path.normalize(filePath);
  console.log('Ruta del archivo en process_doc:', normalizedPath);

  if (!fs.existsSync(normalizedPath)) {
    throw new Error('El archivo no existe');
  }

  const dataBuffer = await fs.promises.readFile(normalizedPath);
  const data = await pdf(dataBuffer);
  const content = data.text;

  if (!content) {
    throw new Error('El contenido del PDF no se pudo leer');
  }

  const response = await openai.createChatCompletion({
    model: 'gpt-4-0613',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: `Aquí está el contenido del PDF:\n${content}\n\nPregunta: ${question}` }
    ],
    temperature: 0.5,
    max_tokens: 500,
  });

  const choices = response.data.choices;
  if (choices && choices.length > 0 && choices[0].message?.content) {
    const tokensUsed = response.data.usage?.total_tokens || 0; // Asegurarse de que usage existe
    return {
      response: choices[0].message.content.trim(),
      tokensUsed: tokensUsed
    };
  } else {
    throw new Error('No se recibieron respuestas válidas del modelo.');
  }
};


