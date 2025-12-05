// ========================================
// WEBHOOK PAYEVO - NOTIFICAÇÃO DE PAGAMENTO
// ========================================

/**
 * Recebe notificações da PayEvo quando o status de pagamento muda
 * PayEvo envia POST para esta URL quando PIX é pago
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
        console.log('🔔 Webhook recebido da PayEvo');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        
        // PayEvo envia dados do pagamento no body
        const { 
            id,              // ID da transação
            status,          // Status do pagamento
            amount,          // Valor
            customer,        // Dados do cliente
            pix 
        } = req.body;
        
        // Validar dados recebidos
        if (!id || !status) {
            console.error('❌ Dados inválidos recebidos');
            return res.status(400).json({ 
                error: 'Dados inválidos',
                message: 'ID e status são obrigatórios' 
            });
        }
        
        console.log(`📊 Transação: ${id}`);
        console.log(`📊 Status: ${status}`);
        console.log(`💰 Valor: ${amount}`);
        
        // Processar status
        switch (status) {
            case 'paid':
            case 'approved':
            case 'authorized':
                console.log('✅ PAGAMENTO APROVADO!');
                
                // TODO: Aqui você pode:
                // 1. Salvar no banco de dados
                // 2. Enviar email de confirmação
                // 3. Liberar acesso ao curso
                // 4. Gerar certificado
                // 5. Integrar com CRM
                
                // Retornar sucesso para PayEvo
                return res.status(200).json({
                    success: true,
                    message: 'Webhook processado com sucesso',
                    transactionId: id,
                    status: 'processed'
                });
                
            case 'pending':
            case 'waiting_payment':
                console.log('⏳ Pagamento pendente');
                return res.status(200).json({
                    success: true,
                    message: 'Pagamento pendente',
                    transactionId: id
                });
                
            case 'refused':
            case 'canceled':
            case 'failed':
                console.log('❌ Pagamento recusado/cancelado');
                return res.status(200).json({
                    success: true,
                    message: 'Pagamento não aprovado',
                    transactionId: id
                });
                
            default:
                console.log(`⚠️ Status desconhecido: ${status}`);
                return res.status(200).json({
                    success: true,
                    message: 'Status recebido',
                    transactionId: id
                });
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        
        // IMPORTANTE: Sempre retornar 200 para PayEvo
        // Se retornar erro, PayEvo vai tentar reenviar
        return res.status(200).json({ 
            success: false,
            error: 'Erro interno',
            message: error.message
        });
    }
}
