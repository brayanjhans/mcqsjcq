document.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.querySelector('.login-card');
    const submitBtn = document.getElementById('submitBtn');
    const showPwdBtn = document.getElementById('showPwdBtn');
    const pwdInput = document.getElementById('password');

    // 1. MAGNETIC BUTTON EFFECT
    const magneticArea = document.querySelector('.button-magnetic-area');
    
    if (magneticArea && submitBtn) {
        magneticArea.addEventListener('mousemove', (e) => {
            const rect = submitBtn.getBoundingClientRect();
            const btnX = rect.left + rect.width / 2;
            const btnY = rect.top + rect.height / 2;
            
            const distance = Math.hypot(e.clientX - btnX, e.clientY - btnY);
            const radius = 100; // Activation radius
            
            if (distance < radius) {
                const moveX = (e.clientX - btnX) * 0.3;
                const moveY = (e.clientY - btnY) * 0.3;
                submitBtn.style.transform = `translate(${moveX}px, ${moveY}px)`;
            } else {
                submitBtn.style.transform = `translate(0px, 0px)`;
            }
        });

        magneticArea.addEventListener('mouseleave', () => {
            submitBtn.style.transform = `translate(0px, 0px)`;
        });
    }

    // 2. PASSWORD TOGGLE
    if (showPwdBtn && pwdInput) {
        showPwdBtn.addEventListener('click', () => {
            const type = pwdInput.getAttribute('type') === 'password' ? 'text' : 'password';
            pwdInput.setAttribute('type', type);
            showPwdBtn.textContent = type === 'password' ? 'VER' : 'OCULTAR';
        });
    }

    // 3. SNOW EFFECT GENERATOR (Multi-layered & Dense)
    const snowBg = document.querySelector('.snow-bg');
    const snowFg = document.querySelector('.snow-fg');
    
    const createSnowflake = () => {
        // Random properties for natural look and 3D depth
        const isForeground = Math.random() > 0.75; // 25% pass in front of form
        const container = isForeground ? snowFg : snowBg;
        if (!container) return;
        
        const snowflake = document.createElement('div');
        snowflake.classList.add('snowflake');
        
        // Multi-layered sizing (bigger = more like flakes, less like dots)
        const sizeValue = isForeground ? (Math.random() * 10 + 10) : (Math.random() * 5 + 3);
        const size = sizeValue + 'px';
        const left = (Math.random() * 100) + '%';
        
        // Motion physics
        const duration = isForeground ? (Math.random() * 3 + 4) : (Math.random() * 6 + 10);
        const drift = (Math.random() * 200 - 100) + 'px';
        const swayDuration = (Math.random() * 2 + 2) + 's';
        const opacity = isForeground ? (Math.random() * 0.3 + 0.3) : (Math.random() * 0.4 + 0.2);
        
        snowflake.style.width = size;
        snowflake.style.height = size;
        snowflake.style.left = left;
        snowflake.style.opacity = opacity;
        
        // Inject CSS variables for the animations
        snowflake.style.setProperty('--duration', duration + 's');
        snowflake.style.setProperty('--drift', drift);
        snowflake.style.setProperty('--sway-duration', swayDuration);
        
        container.appendChild(snowflake);
        
        setTimeout(() => {
            snowflake.remove();
        }, duration * 1000);
    };

    // Very high frequency for maximum density
    setInterval(createSnowflake, 30);

    // 4. FORM SHAKE ON FAKE ERROR (Example)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted!');
        });
    }
});
