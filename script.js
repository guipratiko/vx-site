// Inicializa as animações AOS
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    mirror: false
});

// Adiciona classe ativa ao menu quando scrollar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});

// Validação do formulário
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            nome: this.querySelector('input[name="nome"]').value,
            email: this.querySelector('input[name="email"]').value,
            telefone: this.querySelector('input[name="telefone"]').value,
            empresa: this.querySelector('input[name="empresa"]').value,
            faturamento: this.querySelector('select[name="faturamento"]').value,
            mensagem: this.querySelector('textarea[name="mensagem"]').value
        };
        
        const button = this.querySelector('button[type="submit"]');
        if (!button) {
            console.error('Botão de submit não encontrado');
            return;
        }
        
        const originalText = button.textContent;
        
        button.disabled = true;
        button.textContent = 'Enviando...';
        
        try {
            console.log('Enviando dados:', formData);
            
            const response = await fetch('https://www.agenciavx.com.br/api/contato', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao enviar formulário');
            }
            
            console.log('Resposta do servidor:', data);
            
            button.textContent = 'Mensagem Enviada!';
            button.classList.add('btn-success');
            
            // Reseta o formulário
            this.reset();
            
            // Restaura o botão após 3 segundos
            setTimeout(() => {
                button.disabled = false;
                button.textContent = originalText;
                button.classList.remove('btn-success');
            }, 3000);
        } catch (error) {
            console.error('Erro detalhado:', error);
            button.textContent = 'Erro ao Enviar';
            button.classList.add('btn-danger');
            
            // Mostra o erro para o usuário
            alert(`Erro ao enviar formulário: ${error.message}`);
            
            setTimeout(() => {
                button.disabled = false;
                button.textContent = originalText;
                button.classList.remove('btn-danger');
            }, 3000);
        }
    });
}

// Efeito de parallax suave no hero
window.addEventListener('scroll', function() {
    const hero = document.querySelector('.hero-section');
    const scrolled = window.pageYOffset;
    hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
});

// Função para animar os contadores
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    const progressBars = document.querySelectorAll('.progress-bar');
    
    counters.forEach((counter, index) => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000; // 2 segundos
        const step = target / (duration / 16); // 60fps
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
                // Anima a barra de progresso quando o contador terminar
                progressBars[index].style.width = '100%';
            }
        };
        
        updateCounter();
    });
}

// Observador de interseção para iniciar a animação quando a seção estiver visível
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.5
});

// Observa a seção de números
const numerosSection = document.querySelector('#numeros');
if (numerosSection) {
    observer.observe(numerosSection);
}

// Função para destacar o item do menu ativo
function highlightActiveMenuItem() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// Inicializa a função de highlight do menu
highlightActiveMenuItem();

// Suaviza o scroll para os links do menu
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
}); 