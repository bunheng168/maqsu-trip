const sponsorCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQYZZZbzCKQ5X4If91dMyhDKwJAil4qtK23fsDBctNciNemV-qMRSiN0rUHTazIxuWmpNrbQ6ghD6gu/pub?gid=1790075283&single=true&output=csv';

function parseCSV(text) {
    const rows = text.trim().split('\n').map((row) => {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        return values;
    });

    const headers = rows.shift().map((header) => header.trim().toLowerCase());
    return rows.map((row) => {
        const field = (name) => {
            const index = headers.indexOf(name.toLowerCase());
            return index >= 0 ? (row[index] || '').trim() : '';
        };
        return {
            name: field('name') || field('sponsor') || '-',
            image: field('image') || field('image url') || '',
        };
    });
}

function renderSponsors(data, sponsorGridEl) {
    sponsorGridEl.innerHTML = '';
    const defaultImage = 'https://i.postimg.cc/mZ9sfBH8/Cambodia-temple-9.jpg';

    data.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'sponsor-card';
        card.innerHTML = `
            <div class="sponsor-avatar">
                <img src="${item.image || defaultImage}" alt="${item.name}" loading="lazy"/>
            </div>
            <div class="sponsor-name">${item.name}</div>
        `;
        sponsorGridEl.appendChild(card);
    });
}

async function loadSponsors(elements) {
    const { sponsorGridEl, sponsorEmptyEl, sponsorCountEl } = elements;

    try {
        const response = await fetch(`${sponsorCsvUrl}&_t=${Date.now()}`, {
            cache: 'no-store',
        });
        const text = await response.text();
        const sponsors = parseCSV(text).filter((item) => item.name !== '-');

        if (!sponsors.length) {
            sponsorGridEl.classList.add('hidden');
            sponsorEmptyEl.classList.remove('hidden');
            return;
        }

        sponsorEmptyEl.classList.add('hidden');
        sponsorGridEl.classList.remove('hidden');
        renderSponsors(sponsors, sponsorGridEl);
        sponsorCountEl.textContent = `${sponsors.length} supporter${sponsors.length === 1 ? '' : 's'}`;
    } catch (error) {
        console.error('Failed to load sponsors', error);
        sponsorGridEl.classList.add('hidden');
        sponsorEmptyEl.classList.remove('hidden');
        sponsorEmptyEl.innerHTML = '<p>Unable to load sponsors right now.</p>';
    }
}

function initSponsorPage() {
    const sponsorGridEl = document.getElementById('sponsorGrid');
    const sponsorEmptyEl = document.getElementById('sponsorEmpty');
    const sponsorCountEl = document.getElementById('sponsorCount');

    if (!sponsorGridEl || !sponsorEmptyEl || !sponsorCountEl) {
        console.warn('Sponsor elements not found on page.');
        return;
    }

    loadSponsors({ sponsorGridEl, sponsorEmptyEl, sponsorCountEl });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSponsorPage);
} else {
    initSponsorPage();
}

