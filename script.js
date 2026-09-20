document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector('.app-container');

    initializeMaskedLightAnimation();

    const scrollLinks = document.querySelectorAll('a[href^="#page-"]');
    scrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetPage = document.querySelector(targetId);
            if (container && targetPage) {
                container.scrollTo({ top: targetPage.offsetTop, behavior: 'smooth' });
            }
        });
    });

    const callTrigger = document.getElementById('call-intercept-trigger');
    const modalOverlay = document.getElementById('call-modal-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');

    if (callTrigger && modalOverlay && closeModalBtn) {
        callTrigger.addEventListener('click', () => modalOverlay.classList.add('modal-visible'));
        closeModalBtn.addEventListener('click', () => modalOverlay.classList.remove('modal-visible'));
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('modal-visible');
        });
    }

    function syncGoogleOperationalHours() {
        const orderButtons = document.querySelectorAll('.dynamic-order-btn');
        if (orderButtons.length === 0) return;

        const url = "/.netlify/functions/opening-hours";

        const request = fetch(url).then(response => {
            if (!response.ok) throw new Error('Places request failed');
            return response.json();
        });
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Places request timed out')), 5000));

        Promise.race([request, timeout])
            .then(data => {
                if (typeof data.openNow === "boolean") {
                    applyOrderingStatus(data.openNow, orderButtons, false);
                } else {
                    runLocalTimeFallback(orderButtons);
                }
            })
            .catch(() => runLocalTimeFallback(orderButtons));
    }

    function applyOrderingStatus(isOpen, buttons, isTuesdayLocal = false) {
        buttons.forEach(btn => {
            if (isOpen) {
                btn.classList.remove('disabled-closed');
                btn.style.pointerEvents = "auto";
                const label = btn.querySelector('.wa-label');
                if (label) label.textContent = "ORDER NOW";
                const inlineText = btn.querySelector('.inline-btn-text');
                if (inlineText) inlineText.textContent = "ORDER NOW";
                const number = btn.querySelector('.wa-number');
                if (number) number.hidden = false;
            } else {
                btn.classList.add('disabled-closed');
                btn.style.pointerEvents = "none";
                let msg = "Temporarily closed";
                if (isTuesdayLocal) {
                    msg = "Closed today";
                } else {
                    const hr = new Date().getHours();
                    if ((hr >= 15 && hr < 19) || hr >= 22 || hr < 12) {
                        msg = "We are currently resting the steamers";
                    }
                }
                const label = btn.querySelector('.wa-label');
                if (label) label.textContent = msg;
                const inlineText = btn.querySelector('.inline-btn-text');
                if (inlineText) inlineText.textContent = msg;
                const number = btn.querySelector('.wa-number');
                if (number) number.hidden = true;
            }
        });
    }

    function runLocalTimeFallback(buttons) {
        const indianTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const day = indianTime.getDay();
        const min = (indianTime.getHours() * 60) + indianTime.getMinutes();
        
        let isTuesday = (day === 2);
        let isOpen = false;

        if (!isTuesday) {
            if ((min >= 750 && min <= 930) || (min >= 1140 && min <= 1350)) isOpen = true;
        }
        applyOrderingStatus(isOpen, buttons, isTuesday);
    }

    syncGoogleOperationalHours();
});

function initializeMaskedLightAnimation() {
    const page = document.getElementById('page-1');
    const canvas = page?.querySelector('.background-light-canvas');
    if (!page || !canvas) return;

    const background = new Image();
    const mask = new Image();
    background.src = 'background.jpg';
    mask.src = 'background-mask.png';

    Promise.all([background.decode(), mask.decode()]).then(() => {
        const maskCanvas = document.createElement('canvas');
        const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
        const maskWidth = mask.naturalWidth;
        const maskHeight = mask.naturalHeight;
        maskCanvas.width = maskWidth;
        maskCanvas.height = maskHeight;
        maskContext.drawImage(mask, 0, 0);

        const maskPixels = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
        const visited = new Uint8Array(maskWidth * maskHeight);
        const components = [];
        const threshold = 80;

        for (let y = 0; y < maskHeight; y += 1) {
            for (let x = 0; x < maskWidth; x += 1) {
                const index = y * maskWidth + x;
                const pixelIndex = index * 4;
                const isLight = maskPixels[pixelIndex] > threshold || maskPixels[pixelIndex + 1] > threshold || maskPixels[pixelIndex + 2] > threshold;
                if (!isLight || visited[index]) continue;

                const queue = [index];
                const pixels = [];
                visited[index] = 1;
                while (queue.length) {
                    const current = queue.pop();
                    const currentX = current % maskWidth;
                    const currentY = Math.floor(current / maskWidth);
                    pixels.push(current);
                    const neighbors = [current - 1, current + 1, current - maskWidth, current + maskWidth];
                    neighbors.forEach(neighbor => {
                        if (neighbor < 0 || neighbor >= visited.length || visited[neighbor]) return;
                        const neighborX = neighbor % maskWidth;
                        const neighborY = Math.floor(neighbor / maskWidth);
                        if (Math.abs(neighborX - currentX) + Math.abs(neighborY - currentY) !== 1) return;
                        const neighborPixel = neighbor * 4;
                        const neighborIsLight = maskPixels[neighborPixel] > threshold || maskPixels[neighborPixel + 1] > threshold || maskPixels[neighborPixel + 2] > threshold;
                        if (neighborIsLight) {
                            visited[neighbor] = 1;
                            queue.push(neighbor);
                        }
                    });
                }
                if (pixels.length > 20) components.push(pixels);
            }
        }

        const context = canvas.getContext('2d');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const lights = components.map((pixels, index) => {
            const componentMask = document.createElement('canvas');
            componentMask.width = maskWidth;
            componentMask.height = maskHeight;
            const componentContext = componentMask.getContext('2d');
            const componentData = componentContext.createImageData(maskWidth, maskHeight);
            pixels.forEach(pixel => {
                const sourcePixel = pixel * 4;
                const luminance = (maskPixels[sourcePixel] * 0.2126) + (maskPixels[sourcePixel + 1] * 0.7152) + (maskPixels[sourcePixel + 2] * 0.0722);
                componentData.data[sourcePixel + 3] = Math.round(luminance * (maskPixels[sourcePixel + 3] / 255));
            });
            componentContext.putImageData(componentData, 0, 0);
            return {
                componentMask,
                buffer: document.createElement('canvas'),
                phase: Math.random() * Math.PI * 2,
                speed: 0.0007 + Math.random() * 0.0008,
                offset: index * 0.37
            };
        });

        function render(timestamp) {
            const rect = page.getBoundingClientRect();
            const hero = page.querySelector('.hero-background').getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.round(rect.width * pixelRatio));
            const height = Math.max(1, Math.round(rect.height * pixelRatio));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            context.clearRect(0, 0, width, height);

            const imageScaleX = hero.width / background.naturalWidth;
            const imageScaleY = hero.height / background.naturalHeight;
            const sourceToCanvasX = pixelRatio * imageScaleX;
            const sourceToCanvasY = pixelRatio * imageScaleY;
            const heroOffsetX = (hero.left - rect.left) * pixelRatio;
            const heroOffsetY = (hero.top - rect.top) * pixelRatio;

            lights.forEach(light => {
                const brightness = reduceMotion ? 0.56 : Math.max(0, Math.sin(timestamp * light.speed + light.phase + light.offset) * 0.5 + 0.5) * 0.56;
                if (brightness < 0.03) return;
                const bufferContext = light.buffer.getContext('2d');
                if (light.buffer.width !== width || light.buffer.height !== height) {
                    light.buffer.width = width;
                    light.buffer.height = height;
                }
                bufferContext.clearRect(0, 0, width, height);
                bufferContext.globalCompositeOperation = 'source-over';
                bufferContext.drawImage(background, heroOffsetX, heroOffsetY, background.naturalWidth * sourceToCanvasX, background.naturalHeight * sourceToCanvasY);
                bufferContext.globalCompositeOperation = 'destination-in';
                bufferContext.filter = 'blur(8px)';
                bufferContext.drawImage(light.componentMask, heroOffsetX, heroOffsetY, maskWidth * sourceToCanvasX, maskHeight * sourceToCanvasY);
                bufferContext.filter = 'none';
                context.globalAlpha = brightness;
                context.drawImage(light.buffer, 0, 0);
            });
            context.globalAlpha = 1;
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }).catch(() => {});
}