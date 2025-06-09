document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES DE ELEMENTOS ---
    const slides = document.querySelectorAll('.slide');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnProximo = document.getElementById('btn-proximo');
    const navLinks = document.querySelectorAll('.nav-link');
    const cardContainers = document.querySelectorAll('.card-container');
    const exploreButtons = document.querySelectorAll('.btn-card');
    let slideAtual = 0;
    let isAnimating = false;

    // --- INICIALIZAÇÃO DE EFEITOS SONOROS (Tone.js) ---
    // Sons foram ajustados para serem mais suaves e ambientes.
    const soundPlayer = {
        isReady: false,
        synths: {},
        init: function() {
            // Um som de 'whoosh' suave para a transição de slides.
            this.synths.slide = new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
            }).toDestination();

            // Um som de 'pluck' com reverb, mais etéreo.
            const reverb = new Tone.Reverb(0.5).toDestination();
            this.synths.card = new Tone.PluckSynth({
                attackNoise: 0.5,
                dampening: 4000,
                resonance: 0.9
            }).connect(reverb);

            // Um 'click' sutil e agudo.
            this.synths.click = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.1 }
            }).toDestination();

            this.isReady = true;
        },
        play: function(sound) {
            if (!this.isReady) return;
            try {
                if (sound === 'slide') this.synths.slide.triggerAttack();
                if (sound === 'card') this.synths.card.triggerAttackRelease("C5", "8n");
                if (sound === 'click') this.synths.click.triggerAttackRelease("G5", "32n");
            } catch (error) {
                console.error("Erro ao tocar som com Tone.js:", error);
            }
        }
    };
    
    document.body.addEventListener('click', () => {
        if (!soundPlayer.isReady && typeof Tone !== 'undefined') {
            Tone.start();
            soundPlayer.init();
        }
    }, { once: true });


    // --- FUNÇÕES DE NAVEGAÇÃO DE SLIDE ---
    function mostrarSlide(proximoIndice) {
        // A condição Impede a re-animação do slide atual.
        if (isAnimating || proximoIndice < 0 || proximoIndice >= slides.length || proximoIndice === slideAtual) {
            return;
        }
        isAnimating = true;
        soundPlayer.play('slide');
        
        const slideAntigo = slides[slideAtual];
        const slideNovo = slides[proximoIndice];

        slideAntigo.classList.add('slide-saindo');
        slideNovo.classList.add('slide-ativo');
        
        slideAtual = proximoIndice;
        atualizarControles();

        setTimeout(() => {
            slideAntigo.classList.remove('slide-ativo', 'slide-saindo');
            isAnimating = false;
        }, 700); // Duração da transição em CSS
    }

    function atualizarControles() {
        btnAnterior.style.visibility = slideAtual === 0 ? 'hidden' : 'visible';
        btnProximo.style.visibility = slideAtual === slides.length - 1 ? 'hidden' : 'visible';
        navLinks.forEach(link => {
            link.classList.toggle('active-link', parseInt(link.dataset.slideTo) === slideAtual);
        });
    }

    // --- NOVA FUNÇÃO DE INICIALIZAÇÃO ---
    // Esta função prepara o estado inicial da apresentação.
    function inicializarApresentacao() {
        // Ativa o primeiro slide diretamente, sem animação.
        if (slides.length > 0) {
            slides[0].classList.add('slide-ativo');
        }
        // Configura o estado inicial dos botões e da navegação.
        atualizarControles();
    }


    // --- CONFIGURAÇÃO DOS EVENT LISTENERS ---
    btnProximo.addEventListener('click', () => mostrarSlide(slideAtual + 1));
    btnAnterior.addEventListener('click', () => mostrarSlide(slideAtual - 1));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') mostrarSlide(slideAtual + 1);
        if (event.key === 'ArrowLeft') mostrarSlide(slideAtual - 1);
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            soundPlayer.play('click');
            mostrarSlide(parseInt(link.dataset.slideTo, 10));
        });
    });

    exploreButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            soundPlayer.play('click');
            mostrarSlide(parseInt(button.dataset.slideTo, 10));
        });
    });

    cardContainers.forEach(container => {
        container.addEventListener('click', () => {
            soundPlayer.play('card');
            container.classList.toggle('virado');
        });
    });

    // --- ANIMAÇÃO DO CANVAS DE PARTÍCULAS INTERATIVO ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const mouse = { x: null, y: null, radius: 100 };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });
    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    class Particle {
        constructor(x, y, dirX, dirY, size, color) {
            this.x = x;
            this.y = y;
            this.dirX = dirX;
            this.dirY = dirY;
            this.size = size;
            this.color = color;
            this.density = (Math.random() * 20) + 5; // Densidade para interação com o mouse
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            // Movimento autônomo constante das partículas
            this.x += this.dirX;
            this.y += this.dirY;

            // Lógica para as partículas reaparecerem do outro lado da tela (wrapping)
            if (this.x > canvas.width + this.size) this.x = -this.size;
            if (this.x < -this.size) this.x = canvas.width + this.size;
            if (this.y > canvas.height + this.size) this.y = -this.size;
            if (this.y < -this.size) this.y = canvas.height + this.size;

            // Interação com o mouse (empurrar partículas)
            if (mouse.x !== null && mouse.y !== null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    let maxDistance = mouse.radius;
                    let force = (maxDistance - distance) / maxDistance;
                    let directionX = forceDirectionX * force * this.density * 0.5;
                    let directionY = forceDirectionY * force * this.density * 0.5;
                    this.x -= directionX;
                    this.y -= directionY;
                }
            }
            this.draw();
        }
    }

    function initParticles() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];
        const numberOfParticles = (canvas.width * canvas.height) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            const size = (Math.random() * 2) + 1; // Tamanho das estrelas
            const x = (Math.random() * innerWidth);
            const y = (Math.random() * innerHeight);
            // Velocidade e direção aleatória para cada estrela
            const dirX = (Math.random() * 0.4) - 0.2; 
            const dirY = (Math.random() * 0.4) - 0.2;
            const color = 'rgba(56, 189, 248, 0.6)';
            particles.push(new Particle(x, y, dirX, dirY, size, color));
        }
    }

    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        particles.forEach(particle => particle.update());
    }
    
    // --- INICIALIZAÇÃO ---
    window.addEventListener('resize', () => {
        initParticles();
    });

    initParticles();
    animateParticles();
    inicializarApresentacao();

});
