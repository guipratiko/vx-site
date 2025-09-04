require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 85;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Conectado ao MongoDB com sucesso');
}).catch((err) => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
});

// Schema do MongoDB
const contatoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true },
    telefone: { type: String, required: true },
    empresa: { type: String, required: true },
    faturamento: { type: String, required: true },
    mensagem: { type: String, required: true },
    data: { type: Date, default: Date.now }
});

const Contato = mongoose.model('Contato', contatoSchema, 'AgenciaVXsite');

// Configuração do Google Sheets
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Função para renovar os tokens do Google
async function renovarTokensGoogle() {
    try {
        if (!global.googleTokens || !global.googleTokens.refresh_token) {
            throw new Error('Refresh token não disponível');
        }

        oauth2Client.setCredentials({
            refresh_token: global.googleTokens.refresh_token
        });

        const { tokens } = await oauth2Client.refreshAccessToken();
        global.googleTokens = tokens;
        oauth2Client.setCredentials(tokens);
        
        console.log('Tokens renovados com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao renovar tokens:', error);
        return false;
    }
}

// Função para verificar e renovar tokens se necessário
async function verificarERenovarTokens() {
    if (!global.googleTokens) {
        return false;
    }

    // Verifica se o token está expirado ou próximo de expirar (5 minutos antes)
    const expiracao = global.googleTokens.expiry_date;
    const agora = Date.now();
    const cincoMinutos = 5 * 60 * 1000;

    if (!expiracao || agora + cincoMinutos >= expiracao) {
        return await renovarTokensGoogle();
    }

    return true;
}

// Função para salvar no Google Sheets
async function salvarNoGoogleSheets(dados) {
    try {
        // Verifica e renova os tokens se necessário
        const tokensValidos = await verificarERenovarTokens();
        if (!tokensValidos) {
            throw new Error('Não autenticado. Por favor, autentique primeiro.');
        }

        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        const SPREADSHEET_ID = '11OoQ7XECZ2VklJ53y8wDd-ZoVW3ETsRd_qqhO5Jwyx8';
        
        const values = [[
            dados.nome,
            dados.email,
            dados.telefone,
            dados.empresa,
            dados.faturamento,
            dados.mensagem,
            new Date().toISOString()
        ]];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Página1!A:G',
            valueInputOption: 'RAW',
            resource: { values }
        });

        console.log('Dados salvos no Google Sheets com sucesso:', response.data);
    } catch (error) {
        console.error('Erro ao salvar no Google Sheets:', error);
        throw error;
    }
}

// Rota para receber os dados do formulário
app.post('/api/contato', async (req, res) => {
    try {
        console.log('Recebendo dados do formulário:', req.body);
        
        const { nome, email, telefone, empresa, faturamento, mensagem } = req.body;

        // Validação básica dos campos
        if (!nome || !email || !telefone || !empresa || !faturamento || !mensagem) {
            console.log('Campos inválidos:', { nome, email, telefone, empresa, faturamento, mensagem });
            return res.status(400).json({ 
                error: 'Todos os campos são obrigatórios',
                details: { nome, email, telefone, empresa, faturamento, mensagem }
            });
        }

        // Salvar no MongoDB
        const novoContato = new Contato({
            nome,
            email,
            telefone,
            empresa,
            faturamento,
            mensagem
        });

        console.log('Tentando salvar contato:', novoContato);
        await novoContato.save();
        console.log('Contato salvo com sucesso:', novoContato);

        // Tentar salvar no Google Sheets
        try {
            await salvarNoGoogleSheets(novoContato);
        } catch (sheetsError) {
            console.error('Erro ao salvar no Google Sheets:', sheetsError);
            // Não interrompe o fluxo se falhar ao salvar no Google Sheets
        }

        res.status(200).json({ 
            message: 'Dados salvos com sucesso!',
            contato: novoContato
        });
    } catch (error) {
        console.error('Erro detalhado ao salvar contato:', error);
        res.status(500).json({ 
            error: 'Erro ao salvar os dados',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Rota para verificar se o servidor está funcionando
app.get('/api/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    console.log('Status do MongoDB:', mongoStatus);
    
    res.status(200).json({ 
        status: 'ok',
        mongodb: mongoStatus,
        timestamp: new Date().toISOString()
    });
});

// Rota para iniciar o processo de autenticação
app.get('/api/auth/google', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/drive.metadata',
        'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.addons.current.message.action',
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        include_granted_scopes: true
    });

    res.redirect(authUrl);
});

// Rota de callback do Google OAuth
app.get('/api/auth/callback/google', async (req, res) => {
    const { code } = req.query;
    
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Salvar os tokens em uma variável global
        global.googleTokens = tokens;
        
        // Verificar se temos o refresh_token
        if (!tokens.refresh_token) {
            console.warn('Aviso: Refresh token não recebido. A renovação automática pode não funcionar.');
        }
        
        res.send('Autenticação realizada com sucesso! Você pode fechar esta janela.');
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(500).send('Erro na autenticação');
    }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Acesse: http://localhost:${port}`);
    console.log('Ambiente:', process.env.NODE_ENV || 'development');
}); 