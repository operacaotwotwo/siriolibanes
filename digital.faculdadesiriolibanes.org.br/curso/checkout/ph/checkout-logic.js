// ========================================
// CHECKOUT LOGIC - FACULDADE SÍRIO-LIBANÊS
// ========================================

// Constantes
const VALID_COUPONS = ['SELECIONADON1', 'SELECIONADON2', 'SELECIONADON3', 'SELECIONADON4', 'SELECIONADON5', 'SELECIONADON6', 'SELECIONADON7'];
const ORIGINAL_PRICE = 7806.96;
const DISCOUNT_PERCENTAGE = 0.90;

// Estado da aplicação
let couponApplied = false;
let currentStep = 1;
let formData = {};
let pixCode = '';
let pixQRCodeUrl = '';
let pollingInterval = null;

// ========================================
// MÁSCARAS E FORMATAÇÃO
// ========================================

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
function maskCPF(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Aplica máscara de telefone: (00) 00000-0000
 */
function maskPhone(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
}

/**
 * Remove caracteres não numéricos
 */
function onlyNumbers(value) {
    return value.replace(/\D/g, '');
}

// ========================================
// VALIDAÇÕES
// ========================================

/**
 * Valida nome (mínimo 3 caracteres)
 */
function validateName(name) {
    return name.trim().length >= 3;
}

/**
 * Valida email com regex
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida CPF com algoritmo oficial (dígitos verificadores)
 * Rejeita CPFs conhecidos (111.111.111-11, etc)
 */
function validateCPF(cpf) {
    cpf = onlyNumbers(cpf);
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;
    
    // Rejeita CPFs conhecidos inválidos
    const invalidCPFs = [
        '00000000000', '11111111111', '22222222222',
        '33333333333', '44444444444', '55555555555',
        '66666666666', '77777777777', '88888888888',
        '99999999999'
    ];
    
    if (invalidCPFs.includes(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = remainder >= 10 ? 0 : remainder;
    
    if (digit1 !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = remainder >= 10 ? 0 : remainder;
    
    if (digit2 !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

/**
 * Valida telefone (mínimo 10 dígitos)
 */
function validatePhone(phone) {
    const numbers = onlyNumbers(phone);
    return numbers.length >= 10 && numbers.length <= 11;
}

/**
 * Formata telefone para API: 5511999999999
 */
function formatPhoneForAPI(phone) {
    const numbers = onlyNumbers(phone);
    return '55' + numbers;
}

/**
 * Converte valor para centavos
 */
function toCents(value) {
    return Math.round(value * 100);
}

// ========================================
// UI - FEEDBACK VISUAL
// ========================================

/**
 * Mostra erro em campo
 */
function showError(fieldId) {
    const wrapper = document.getElementById(`${fieldId}-wrapper`);
    const error = document.getElementById(`${fieldId}-error`);
    
    if (wrapper) wrapper.classList.add('error');
    if (error) error.classList.add('show');
}

/**
 * Remove erro de campo
 */
function clearError(fieldId) {
    const wrapper = document.getElementById(`${fieldId}-wrapper`);
    const error = document.getElementById(`${fieldId}-error`);
    
    if (wrapper) wrapper.classList.remove('error');
    if (error) error.classList.remove('show');
}

/**
 * Marca campo como válido
 */
function markValid(fieldId) {
    const wrapper = document.getElementById(`${fieldId}-wrapper`);
    if (wrapper) {
        wrapper.classList.remove('error');
        wrapper.classList.add('valid');
    }
}

// ========================================
// NAVEGAÇÃO ENTRE STEPS
// ========================================

function goToStep(step) {
    document.querySelectorAll('.step-container').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    currentStep = step;
    window.scrollTo(0, 0);
}

// ========================================
// STEP 1 - VALIDAÇÕES E MÁSCARAS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Campos Step 1
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const cpfInput = document.getElementById('cpf');
    const telefoneInput = document.getElementById('telefone');
    const consentimentoCheck = document.getElementById('consentimento');
    const cienteCheck = document.getElementById('ciente');
    const btnStep1 = document.getElementById('btn-step-1');
    
    // Aplicar máscaras
    cpfInput.addEventListener('input', (e) => {
        e.target.value = maskCPF(e.target.value);
        if (validateCPF(e.target.value)) {
            markValid('cpf');
            clearError('cpf');
        } else {
            clearError('cpf');
        }
    });
    
    telefoneInput.addEventListener('input', (e) => {
        e.target.value = maskPhone(e.target.value);
        if (validatePhone(e.target.value)) {
            markValid('telefone');
            clearError('telefone');
        } else {
            clearError('telefone');
        }
    });
    
    // Validação em tempo real
    nomeInput.addEventListener('input', () => {
        if (validateName(nomeInput.value)) {
            markValid('nome');
            clearError('nome');
        } else {
            clearError('nome');
        }
        checkStep1Form();
    });
    
    nomeInput.addEventListener('blur', () => {
        if (nomeInput.value && !validateName(nomeInput.value)) {
            showError('nome');
        }
        checkStep1Form();
    });
    
    emailInput.addEventListener('input', () => {
        if (validateEmail(emailInput.value)) {
            markValid('email');
            clearError('email');
        } else {
            clearError('email');
        }
        checkStep1Form();
    });
    
    emailInput.addEventListener('blur', () => {
        if (emailInput.value && !validateEmail(emailInput.value)) {
            showError('email');
        }
        checkStep1Form();
    });
    
    cpfInput.addEventListener('blur', () => {
        if (!validateCPF(cpfInput.value)) {
            showError('cpf');
        }
        checkStep1Form();
    });
    
    telefoneInput.addEventListener('blur', () => {
        if (!validatePhone(telefoneInput.value)) {
            showError('telefone');
        }
        checkStep1Form();
    });
    
    consentimentoCheck.addEventListener('change', checkStep1Form);
    cienteCheck.addEventListener('change', checkStep1Form);
    
    // Verificar se form está válido
    function checkStep1Form() {
        const isValid = 
            validateName(nomeInput.value) &&
            validateEmail(emailInput.value) &&
            validateCPF(cpfInput.value) &&
            validatePhone(telefoneInput.value) &&
            consentimentoCheck.checked &&
            cienteCheck.checked;
        
        btnStep1.disabled = !isValid;
    }
    
    // Avançar para Step 2
    btnStep1.addEventListener('click', () => {
        // Validar tudo novamente
        let hasError = false;
        
        if (!validateName(nomeInput.value)) {
            showError('nome');
            hasError = true;
        }
        
        if (!validateEmail(emailInput.value)) {
            showError('email');
            hasError = true;
        }
        
        if (!validateCPF(cpfInput.value)) {
            showError('cpf');
            hasError = true;
        }
        
        if (!validatePhone(telefoneInput.value)) {
            showError('telefone');
            hasError = true;
        }
        
        if (hasError) return;
        
        // Salvar dados
        formData = {
            turma: document.getElementById('turma').value,
            nome: nomeInput.value.trim(),
            email: emailInput.value.trim(),
            cpf: cpfInput.value,
            telefone: telefoneInput.value
        };
        
        // Preencher Step 2
        const nomeCompleto = formData.nome.split(' ');
        const primeiroNome = nomeCompleto[0];
        const sobrenome = nomeCompleto.slice(1).join(' ') || '';
        
        document.getElementById('nome-step2').value = primeiroNome;
        document.getElementById('sobrenome-step2').value = sobrenome;
        document.getElementById('cpf-step2').value = formData.cpf.trim();
checkStep2Form();
        
        goToStep(2);
    });
    
    // ========================================
    // STEP 2 - VALIDAÇÕES E CUPOM
    // ========================================
    
    const nomeStep2 = document.getElementById('nome-step2');
    const sobrenomeStep2 = document.getElementById('sobrenome-step2');
    const cpfStep2 = document.getElementById('cpf-step2');
    const pixBtn = document.getElementById('pix-btn');
    
    // Aplicar máscara no CPF do Step 2
    cpfStep2.addEventListener('input', (e) => {
        e.target.value = maskCPF(e.target.value);
        if (validateCPF(e.target.value)) {
            markValid('cpf-step2');
            clearError('cpf-step2');
        }
        checkStep2Form();
    });
    
    // Validações Step 2

    
    cpfStep2.addEventListener('blur', () => {
        if (!validateCPF(cpfStep2.value)) {
            showError('cpf-step2');
        }
    });
    
function checkStep2Form() {
    const isValid = validateCPF(cpfStep2.value);
    pixBtn.disabled = !isValid;
}

    
    // Sistema de Cupom
    const couponField = document.getElementById('coupon-field');
    const applyBtn = document.getElementById('apply-btn');
    const couponHint = document.getElementById('coupon-hint');
    const discountValue = document.getElementById('discount-value');
    const totalValue = document.getElementById('total-value');
    
    function applyCoupon(code) {
        if (VALID_COUPONS.includes(code.toUpperCase().trim())) {
            const discount = ORIGINAL_PRICE * DISCOUNT_PERCENTAGE;
            const finalPrice = ORIGINAL_PRICE - discount;
            
            discountValue.textContent = `R$ ${discount.toFixed(2).replace('.', ',')}`;
            discountValue.classList.add('active');
            totalValue.textContent = `1x de R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
            
            couponField.classList.add('valid');
            couponField.classList.remove('invalid');
            couponHint.textContent = `✓ Cupom "${code.toUpperCase()}" aplicado! Você economizou 90%`;
            couponHint.classList.add('success');
            couponHint.classList.remove('error');
            
            applyBtn.classList.add('success');
            couponApplied = true;
            
            // Atualizar formData com desconto
            formData.valorFinal = finalPrice;
            formData.cupom = code.toUpperCase();
            
            return true;
        } else {
            couponField.classList.add('invalid');
            couponField.classList.remove('valid');
            couponHint.textContent = '✗ Código inválido. Tente novamente.';
            couponHint.classList.add('error');
            couponHint.classList.remove('success');
            
            return false;
        }
    }
    
    applyBtn.addEventListener('click', () => {
        const code = couponField.value;
        if (code.trim()) applyCoupon(code);
    });
    
    couponField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyBtn.click();
        }
    });
    
    // Popup de Cupom
    const overlay = document.getElementById('overlay');
    const popupInput = document.getElementById('popup-coupon-input');
    const popupApplyBtn = document.getElementById('popup-apply-btn');
    const popupSkipBtn = document.getElementById('popup-skip-btn');
    const popupMessage = document.getElementById('popup-message');
    
    popupApplyBtn.addEventListener('click', () => {
        const code = popupInput.value;
        if (code.trim()) {
            if (applyCoupon(code)) {
                popupInput.classList.add('valid');
                popupMessage.textContent = '✓ Cupom aplicado com sucesso!';
                popupMessage.classList.add('success');
                
                couponField.value = code.toUpperCase();
                
                setTimeout(() => {
                    overlay.classList.remove('active');
                }, 1000);
            } else {
                popupInput.classList.add('invalid');
                popupMessage.textContent = '✗ Código inválido. Tente novamente.';
                popupMessage.classList.add('error');
            }
        }
    });
    
    popupInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            popupApplyBtn.click();
        }
    });
    
    popupSkipBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
    
    // Gerar PIX
    pixBtn.addEventListener('click', async () => {
        // Validar campos Step 2
        let hasError = false;        

        if (!validateCPF(cpfStep2.value)) {
            showError('cpf-step2');
            hasError = true;
        }
        
        if (hasError) return;
        
        // Se não tem cupom, mostrar popup
        if (!couponApplied) {
            overlay.classList.add('active');
            popupInput.value = '';
            popupInput.classList.remove('valid', 'invalid');
            popupMessage.textContent = '';
            popupInput.focus();
            return;
        }
        
        // Atualizar formData com dados do Step 2
        formData.nomeCompleto = `${nomeStep2.value} ${sobrenomeStep2.value}`.trim();
        formData.cpfFinal = cpfStep2.value;
        
        // Chamar API para gerar PIX
        await generatePix();
    });
    
    // ========================================
    // INTEGRAÇÃO COM API PIX
    // ========================================
    
    async function generatePix() {
        try {
            // Preparar dados para API
            const payload = {
                amount: toCents(formData.valorFinal || ORIGINAL_PRICE),
                paymentMethod: "pix",
                customer: {
                    name: formData.nomeCompleto,
                    email: formData.email,
                    phone: formatPhoneForAPI(formData.telefone),
                    document: {
                        type: "cpf",
                        number: onlyNumbers(formData.cpfFinal)
                    }
                },
                items: [{
                    title: "ph",
                    quantity: 1,
                    unitPrice: toCents(formData.valorFinal || ORIGINAL_PRICE),
                    tangible: false
                }]
            };
            
            console.log('Enviando dados para API:', payload);
            
            // Chamar backend
            const response = await fetch('https://digital.faculdadesiriolibanes.site/api/pix', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Resposta da API:', data);
            
            // Salvar dados do PIX
            pixCode = data.pix.qrcode;
            pixQRCodeUrl = data.pix.qrcode_url || `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pixCode)}`;
            formData.transactionId = data.id;
            
            // Ir para Step 3
            goToStep(3);
            displayPix();
            
        } catch (error) {
            console.error('Erro ao gerar PIX:', error);
            alert('Erro ao gerar código PIX. Por favor, tente novamente.');
        }
    }
    
    // ========================================
    // STEP 3 - EXIBIR PIX
    // ========================================
    
function displayPix() {
    // Mostrar loading
    const qrLoading = document.getElementById('qr-loading');
    const qrImg = document.getElementById('qr-code-img');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    
    qrLoading.classList.add('show');
    qrPlaceholder.style.display = 'none';
    
    // Carregar QR Code
    qrImg.src = pixQRCodeUrl;
    qrImg.onload = () => {
        qrLoading.classList.remove('show');
        qrImg.style.display = 'block';
    };
    
    // Gerar data de expiração (+1 hora)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('pix-expiration-date').textContent = 
        `${day}/${month}/${year} às ${hours}:${minutes}`;
    
    // NOVO: Iniciar polling
    startPaymentPolling();
}
    // Verificar status do pagamento a cada 3 segundos
function startPaymentPolling() {
    console.log('🔄 Iniciando polling de pagamento...');
    
    // Limpar interval anterior se existir
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Verificar a cada 3 segundos
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`https://digital.faculdadesiriolibanes.site/api/check-payment?transactionId=${formData.transactionId}`);
            
            if (!response.ok) {
                console.error('Erro ao verificar pagamento:', response.status);
                return;
            }
            
            const data = await response.json();
            console.log('📊 Status do pagamento:', data.status);
            
            // Se foi pago, redirecionar
            if (data.isPaid) {
                console.log('✅ PAGAMENTO APROVADO!');
                
                // Parar polling
                clearInterval(pollingInterval);
                
                // Redirecionar para página de sucesso
                window.location.href = `./obrigado.html?transactionId=${data.transactionId}&amount=${data.amount}`;
            }
            
        } catch (error) {
            console.error('Erro no polling:', error);
        }
    }, 3000); // 3 segundos
    
    // Parar polling após 10 minutos (timeout)
    setTimeout(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            console.log('⏱️ Polling timeout - 10 minutos');
        }
    }, 600000); // 10 minutos
}

    
    // Copiar código PIX
    document.getElementById('copy-pix-btn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(pixCode);
            
            const btn = document.getElementById('copy-pix-btn');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fa-solid fa-check"></i> CÓDIGO COPIADO!';
            btn.style.background = '#07893C';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#0B62F6';
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao copiar:', error);
            alert('Erro ao copiar código. Por favor, copie manualmente.');
        }
    });
});