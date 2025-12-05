// ========================================
// CHECK PAYMENT STATUS - POLLING
// ========================================

/**
 * Endpoint para frontend verificar status do pagamento
 * Frontend chama a cada 3 segundos para ver se PIX foi pago
 */
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Responder OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Apenas GET permitido
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Método não permitido',
            message: 'Use GET para esta rota' 
        });
    }
    
    try {
        // Pegar ID da transação da query string
        const { transactionId } = req.query;
        
        if (!transactionId) {
            return res.status(400).json({ 
                error: 'ID da transação obrigatório',
                message: 'Envie ?transactionId=xxx' 
            });
        }
        
        // Pegar SECRET_KEY do ambiente
        const SECRET_KEY = process.env.PAYEVO_SECRET_KEY;
        
        if (!SECRET_KEY) {
            console.error('❌ PAYEVO_SECRET_KEY não configurada!');
            return res.status(500).json({ 
                error: 'Configuração inválida' 
            });
        }
        
        // Preparar autorização
        const authString = Buffer.from(SECRET_KEY + ':').toString('base64');
        
        console.log(`🔍 Consultando transação: ${transactionId}`);
        
        // Chamar API PayEvo para buscar status
        const response = await fetch(
            `https://apiv2.payevo.com.br/functions/v1/transactions/${transactionId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('❌ Erro ao consultar PayEvo:', response.status);
            return res.status(response.status).json({ 
                error: 'Erro ao consultar pagamento'
            });
        }
        
        const data = await response.json();
        
        console.log(`📊 Status da transação: ${data.status}`);
        
        // Verificar se foi pago
        const isPaid = ['paid', 'approved', 'authorized'].includes(data.status);
        
        return res.status(200).json({
            transactionId: data.id,
            status: data.status,
            isPaid: isPaid,
            amount: data.amount,
            customer: data.customer,
            createdAt: data.createdAt,
            paidAt: data.paidAt || null
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar pagamento:', error);
        
        return res.status(500).json({ 
            error: 'Erro interno',
            message: error.message
        });
    }
}
