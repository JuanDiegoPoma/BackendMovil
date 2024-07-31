"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_doc = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const openai_1 = require("openai");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new openai_1.OpenAIApi(configuration);
const process_doc = (filePath, question) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const normalizedPath = path.normalize(filePath);
    console.log('Ruta del archivo en process_doc:', normalizedPath);
    if (!fs.existsSync(normalizedPath)) {
        throw new Error('El archivo no existe');
    }
    const dataBuffer = yield fs.promises.readFile(normalizedPath);
    const data = yield (0, pdf_parse_1.default)(dataBuffer);
    const content = data.text;
    if (!content) {
        throw new Error('El contenido del PDF no se pudo leer');
    }
    const response = yield openai.createChatCompletion({
        model: 'gpt-4-0613',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: `Aquí está el contenido del PDF:\n${content}\n\nPregunta: ${question}` }
        ],
        temperature: 0.5,
        max_tokens: 500,
    });
    const choices = response.data.choices;
    if (choices && choices.length > 0 && ((_a = choices[0].message) === null || _a === void 0 ? void 0 : _a.content)) {
        const tokensUsed = ((_b = response.data.usage) === null || _b === void 0 ? void 0 : _b.total_tokens) || 0; // Asegurarse de que usage existe
        return {
            response: choices[0].message.content.trim(),
            tokensUsed: tokensUsed
        };
    }
    else {
        throw new Error('No se recibieron respuestas válidas del modelo.');
    }
});
exports.process_doc = process_doc;
