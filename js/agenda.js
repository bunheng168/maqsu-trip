const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQYZZZbzCKQ5X4If91dMyhDKwJAil4qtK23fsDBctNciNemV-qMRSiN0rUHTazIxuWmpNrbQ6ghD6gu/pub?gid=685795691&single=true&output=csv';

const loadingState = document.getElementById('agendaLoading');
const tableWrapper = document.getElementById('agendaTableWrapper');
const tableBody = document.getElementById('agendaTableBody');
const emptyState = document.getElementById('agendaEmpty');
const summaryEl = document.getElementById('agendaSummary');
const totalEl = document.getElementById('agendaTotal');
const completedEl = document.getElementById('agendaCompleted');
const upcomingEl = document.getElementById('agendaUpcoming');
const updatedEl = document.getElementById('agendaUpdated');

function formatDuration(durationStr) {
    if (!durationStr) return '-';
    const parts = durationStr.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (hours && minutes) return `${hours}h ${minutes}m`;
        if (hours) return `${hours}h`;
        if (minutes) return `${minutes}m`;
    }
    return durationStr;
}

function formatTimeValue(value) {
    if (!value) return '-';

    // Already formatted time (HH:MM AM)
    if (/am|pm/i.test(value)) return value;

    // Handle DD/MM/YYYY HH:MM:SS
    const dateTimeMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})(:\d{2})?$/);
    if (dateTimeMatch) {
        const [ , day, month, year, timePart ] = dateTimeMatch;
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}:00`;
        const date = new Date(isoString);
        if (!isNaN(date)) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    return value;
}

function parseCSV(text) {
    const rows = text.trim().split('\n').map((row) => {
        const columns = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                columns.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        columns.push(current.trim().replace(/^"|"$/g, ''));
        return columns;
    });

    const headers = rows.shift().map((header) => header.trim());
    return rows.map((row) => {
        const field = (name) => {
            const index = headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
            return index >= 0 ? (row[index] || '').trim() : '';
        };

        return {
            day: field('Day') || field('day'),
            activity: field('Description'),
            location: field('ទីតាំង') || field('Location') || field('location'),
            start: formatTimeValue(field('ផ្តើម')),
            end: formatTimeValue(field('ចប់')),
            duration: formatDuration(field('រយៈពេល')),
            status: field('Status') || field('status'),
        };
    });
}

function renderTable(data) {
    tableBody.innerHTML = '';

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.day || '-'}</td>
            <td>${item.activity || '-'}</td>
            <td>${item.location || '-'}</td>
            <td>${item.start || '-'}</td>
            <td>${item.end || '-'}</td>
            <td>${item.duration || '-'}</td>
            <td>
                <span class="status-pill status-${(item.status || 'unknown').toLowerCase()}">
                    ${item.status || 'Unknown'}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadAgenda() {
    try {
        const response = await fetch(`${csvUrl}&_t=${Date.now()}`, {
            cache: 'no-store'
        });
        const text = await response.text();
        const parsedData = parseCSV(text).filter((item) => item.activity);

        loadingState.classList.add('hidden');

        if (!parsedData.length) {
            emptyState.classList.remove('hidden');
            return;
        }

        tableWrapper.classList.remove('hidden');
        renderTable(parsedData);

        const total = parsedData.length;
        const completed = parsedData.filter((item) => (item.status || '').toLowerCase() === 'complete').length;
        const upcoming = total - completed;

        totalEl.textContent = total;
        completedEl.textContent = completed;
        upcomingEl.textContent = upcoming;

        const firstDay = parsedData[0]?.day || '';
        const lastDay = parsedData[parsedData.length - 1]?.day || '';
        summaryEl.textContent = firstDay && lastDay ? `${firstDay} → ${lastDay}` : 'Agenda';
        updatedEl.textContent = `Last synced: ${new Date().toLocaleString()}`;
    } catch (error) {
        console.error('Failed to load agenda', error);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = '<p>Unable to load agenda. Please try again later.</p>';
    }
}

loadAgenda();

