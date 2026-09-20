document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector('.app-container');

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

