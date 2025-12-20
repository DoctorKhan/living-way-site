document.addEventListener('DOMContentLoaded', () => {
	    const form = document.getElementById('waitlist-form');
	    if (!form) return;

	    const successMessage = document.querySelector('.success-message');
	    const errorMessage = document.querySelector('.error-message');
	    const input = form.querySelector('input[type="email"]');
	    const button = form.querySelector('button');
	    let sealedEmail = ''; // Store the user's email after success
	    const defaultButtonText = button.textContent;

	    const shareTitle = document.body.dataset.shareTitle || 'The Second Coming';
	    const shareText = document.body.dataset.shareText || 'The Scroll is opening. I have been sealed. Join the 144,000.';

    // 1. Check for Referral Code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');
    if (referrer) {
        const refInput = document.getElementById('referred_by');
        if (refInput) refInput.value = referrer;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = input.value;
        if (!email) return;

        // Reset error state
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';

        // Collect data BEFORE disabling inputs
        const formData = new FormData(form);
        const jsonData = Object.fromEntries(formData.entries());

        // UI State: Loading
        button.textContent = 'SEALING...';
        button.disabled = true;
        input.disabled = true;

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: JSON.stringify(jsonData),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                // Success
                sealedEmail = email; // Save for referral link
                form.style.display = 'none';
                successMessage.classList.remove('hidden');
	            } else {
                // Error
                const data = await response.json();
                console.error("Formspree Error:", data);
                
                let msg = "Unable to seal your place. Please try again.";
                if (Object.hasOwn(data, 'errors')) {
                    msg = data["errors"].map(error => error["message"]).join(", ");
                } else if (data.error) {
                    msg = data.error;
                }
                
                errorMessage.textContent = msg;
                errorMessage.classList.remove('hidden');

	                // Reset UI
	                button.textContent = defaultButtonText;
                button.disabled = false;
                input.disabled = false;
            }
        } catch (error) {
	            console.error("Network Error:", error);
            errorMessage.textContent = "Connection error. Please try again.";
            errorMessage.classList.remove('hidden');
            
	            button.textContent = defaultButtonText;
            button.disabled = false;
            input.disabled = false;
        }
    });

    // Helper to get Referral URL
    function getReferralUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        return sealedEmail 
            ? `${baseUrl}?ref=${encodeURIComponent(sealedEmail)}`
            : window.location.href;
    }

    // WhatsApp
    const waBtn = document.getElementById('share-whatsapp');
    if (waBtn) {
        waBtn.addEventListener('click', () => {
            const url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + getReferralUrl())}`;
            window.open(url, '_blank');
        });
    }

    // Telegram
    const tgBtn = document.getElementById('share-telegram');
    if (tgBtn) {
        tgBtn.addEventListener('click', () => {
            const url = `https://t.me/share/url?url=${encodeURIComponent(getReferralUrl())}&text=${encodeURIComponent(shareText)}`;
            window.open(url, '_blank');
        });
    }

    // Native / Copy Link
    const shareBtn = document.getElementById('share-native');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const referralUrl = getReferralUrl();
            const shareData = {
	                title: shareTitle,
                text: shareText,
                url: referralUrl
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    // User cancelled
                }
            } else {
                try {
                    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    const originalText = shareBtn.textContent;
                    shareBtn.textContent = 'COPIED';
                    setTimeout(() => {
                        shareBtn.textContent = originalText;
                    }, 2000);
                } catch (err) {
                    prompt('Copy this link:', referralUrl);
                }
            }
        });
    }

    // If the user clicks the 'Seal My Place' link, ensure the waitlist is focused
    const waitAnchor = document.querySelector('a[href="#waitlist-form"]');
    if (waitAnchor) {
        waitAnchor.addEventListener('click', (e) => {
            e.preventDefault();
            const el = document.getElementById('waitlist-form');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inputEl = el.querySelector('input[type="email"]');
                if (inputEl) inputEl.focus();
            }
        });
    }

    // Normalize links that point into the public-knowledge folder so they work
    // both when viewing the root `index.html` and when viewing pages inside
    // `public-knowledge/` directly (file:// or via different servers).
    (function normalizePublicKnowledgeLinks() {
        const anchors = document.querySelectorAll('a[href^="public-knowledge/"]');
        const insidePublic = window.location.pathname.includes('/public-knowledge/');

        anchors.forEach(a => {
            const href = a.getAttribute('href');
            if (insidePublic) {
                // If we're already inside public-knowledge/, convert
                // public-knowledge/X -> ./X so it resolves correctly.
                if (href === 'public-knowledge/' || href === 'public-knowledge') {
                    a.setAttribute('href', './');
                } else {
                    a.setAttribute('href', href.replace(/^public-knowledge\//, ''));
                }
            } else {
                // If we're at root, make sure the link explicitly points to
                // the public directory. Preserve existing href.
                // If someone opens a page from elsewhere with a different
                // base, this helps the links remain consistent when served.
                if (!href.startsWith('/')) {
                    // keep as-is (relative to current document root)
                }
            }
        });
    })();

});