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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
const lang_script_1 = require("./lang_script");
const openai_1 = require("openai");
const path = __importStar(require("path"));
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Configuración de dotenv para cargar variables de entorno desde el archivo .env
dotenv.config();
// Configuración de OpenAI API
const configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new openai_1.OpenAIApi(configuration);
//console.log('OpenAI API Key:', process.env.OPENAI_API_KEY); // Verificación
// Crear una aplicación Express
const app = (0, express_1.default)();
// Middleware para parsear JSON y habilitar CORS
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Crear la carpeta uploads si no existe
const uploadDir = './uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
}
// Configuración del puerto
const PORT = process.env.PORT || 9012;
// Configuración de multer para la subida de archivos
const storage = multer_1.default.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter(req, file, callback) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (fileExtension !== '.pdf') {
            return callback(new Error('Only PDFs are allowed'));
        }
        callback(null, true);
    },
});
const generatePrompt = (numberToConvert) => {
    return `Tu tienes un rol de convertidor binario y requiero que conviertas este numero ${numberToConvert} a binario`;
};
let names = [
    {
        id: (0, uuid_1.v4)(),
        firstName: 'Pablo',
        lastName: 'Caiza',
    },
    {
        id: (0, uuid_1.v4)(),
        firstName: 'Lea',
        lastName: 'Rolfes',
    },
];
// Función para validar emails de UCE
const validateUCEEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@uce\.edu\.ec$/;
    return emailRegex.test(email);
};
// Función para generar token JWT
const secretKey = process.env.JWT_SECRET || 'your_secret_key'; // Asegúrate de tener una clave secreta en el .env
const generateToken = (email) => {
    const payload = { email };
    return jsonwebtoken_1.default.sign(payload, secretKey, { expiresIn: '1h' });
};
// Middleware de autorización
const authorize = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ error: 'Acceso denegado: No se proporcionó token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secretKey);
        if (!validateUCEEmail(decoded.email)) {
            return res.status(403).send({ error: 'Acceso denegado: Email no autorizado' });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).send({ error: 'Acceso denegado: Token no válido' });
    }
};
// Endpoint para generar token
app.post('/generate-token', (req, res) => {
    const { email } = req.body;
    if (!validateUCEEmail(email)) {
        return res.status(400).send({ error: 'Email no válido' });
    }
    const token = generateToken(email);
    res.send({ token });
});
// Rutas de la API
app.get('/ping', (req, res) => {
    console.log('alguien ha dado pin!!');
    res.setHeader('Content-Type', 'application/json');
    res.send('pong');
});
app.post('/upload', authorize, upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log('File:', req.file);
    console.log('Body:', req.body);
    if (!req.file || !((_a = req.body) === null || _a === void 0 ? void 0 : _a.question)) {
        return res.status(400).send({ error: 'Archivo PDF y pregunta son requeridos' });
    }
    const filePath = path.join(uploadDir, req.file.filename);
    const normalizedPath = path.normalize(filePath);
    console.log('Ruta del archivo guardado:', normalizedPath);
    try {
        const { response, tokensUsed } = yield (0, lang_script_1.process_doc)(normalizedPath, req.body.question);
        res.send({ response, tokensUsed });
    }
    catch (error) {
        console.error(error);
        res.status(500).send({ error: error instanceof Error ? error.message : 'Error desconocido' });
    }
}));
app.get('/hola/:nombre/:apellido', (req, res) => {
    console.log('alguien ha dado pin!!');
    res.setHeader('Content-Type', 'application/json');
    const { nombre, apellido } = req.params;
    console.log('alguien ha ingresado su nombre');
    res.send({ nombre, apellido });
});
app.get('/nombres', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(names);
});
app.post('/nombres', (req, res) => {
    const item = Object.assign(Object.assign({}, req.body), { id: (0, uuid_1.v4)() });
    names.push(item);
    res.send(item);
});
app.post('/openapi', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f;
    const { prompt } = req.body;
    try {
        const completion = yield openai.createChatCompletion({
            model: 'gpt-4-0613',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: generatePrompt(prompt) }
            ],
            temperature: 0.1,
        });
        const result = (_e = (_d = (_c = (_b = completion.data.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim();
        const tokens = (_f = completion.data.usage) === null || _f === void 0 ? void 0 : _f.total_tokens; // Obtener el número de tokens utilizados
        console.log('Result:', result);
        console.log('Tokens:', tokens);
        if (result) {
            res.send({ result, tokens }); // Incluir los tokens en la respuesta
        }
        else {
            res.status(500).send({ error: 'No se pudo obtener una respuesta válida del modelo' });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        res.status(500).send({ error: errorMessage });
    }
}));
app.delete('/nombres/:id', (req, res) => {
    names = names.filter(n => n.id !== req.params.id);
    res.status(204).end();
});
app.get('/nombres/:id', (req, res) => {
    const searchedName = names.find(n => n.id === req.params.id);
    if (!searchedName)
        return res.status(400).end();
    res.send(searchedName);
});
app.put('/nombres/:id', (req, res) => {
    const index = names.findIndex(n => n.id === req.params.id);
    if (index === -1)
        return res.status(404).end();
    names[index] = Object.assign(Object.assign({}, req.body), { id: req.params.id });
    res.status(204).end();
});
// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Running application on port ${PORT}`);
});
