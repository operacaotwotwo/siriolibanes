// ========================================
// BACKEND PIX - VERCEL SERVERLESS FUNCTION
// ========================================

/**
 * Handler principal da API PIX
 * Recebe dados do frontend e chama PayEvo API
 */
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Responder OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Apenas POST permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Método não permitido',
            message: 'Use POST para esta rota' 
        });
    }
    
    try {
        // Pegar SECRET_KEY do ambiente
        const SECRET_KEY = process.env.PAYEVO_SECRET_KEY;
        
        if (!SECRET_KEY) {
            console.error('❌ PAYEVO_SECRET_KEY não configurada!');
            return res.status(500).json({ 
                error: 'Configuração inválida',
                message: 'Chave de API não configurada no servidor' 
            });
        }
        
        // Validar dados recebidos
        const { amount, customer, items } = req.body;
        
        if (!amount || !customer || !items) {
            return res.status(400).json({ 
                error: 'Dados inválidos',
                message: 'Campos obrigatórios: amount, customer, items' 
            });
        }
        
        // Validar customer
        if (!customer.name || !customer.email || !customer.phone || !customer.document) {
            return res.status(400).json({ 
                error: 'Dados do cliente inválidos',
                message: 'customer deve conter: name, email, phone, document' 
            });
        }
        
        // Preparar autorização (Base64)
        const authString = Buffer.from(SECRET_KEY + ':').toString('base64');
        
        // Preparar payload para PayEvo
        const payload = {
            amount: amount,
            paymentMethod: "pix",
            customer: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                document: {
                    type: customer.document.type || "cpf",
                    number: customer.document.number
                }
            },
            items: items
        };
        
        console.log('📤 Enviando para PayEvo API:', {
            amount: payload.amount,
            customer: payload.customer.name,
            email: payload.customer.email
        });
        
        // Chamar API PayEvo
        const payevoResponse = await fetch('https://apiv2.payevo.com.br/functions/v1/transactions', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            timeout: 30000 // 30 segundos
        });
        
        // Verificar resposta
        if (!payevoResponse.ok) {
            const errorData = await payevoResponse.text();
            console.error('❌ Erro PayEvo:', errorData);
            
            return res.status(payevoResponse.status).json({ 
                error: 'Erro na API de pagamento',
                message: 'Não foi possível gerar o código PIX',
                details: errorData
            });
        }
        
        // Parse resposta
        const payevoData = await payevoResponse.json();
        
        console.log('✅ PIX gerado com sucesso:', payevoData.id);
        
        // Validar resposta da PayEvo
        if (!payevoData.pix || !payevoData.pix.qrcode) {
            console.error('❌ Resposta da PayEvo sem dados PIX:', payevoData);
            return res.status(500).json({ 
                error: 'Resposta inválida',
                message: 'API não retornou código PIX' 
            });
        }
        
        // Retornar sucesso
        return res.status(200).json({
            success: true,
            id: payevoData.id,
            status: payevoData.status,
            pix: {
                qrcode: payevoData.pix.qrcode,
                qrcode_url: payevoData.pix.qrcode_url || null
            },
            createdAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro no servidor:', error);
        
        return res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}