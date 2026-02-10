const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SCHEDULE = [
    { day: 'Tuesday', startTime: '20:00', endTime: '22:00', title: 'Huta Zwierzyniecka 4', dj: 'Sebastian Semi Michałowski' },
    { day: 'Friday', startTime: '18:00', endTime: '22:00', title: 'Kultywator', dj: 'Magdalena Juchnowicz' },
    { day: 'Sunday', startTime: '20:00', endTime: '22:00', title: 'Blues pod gwiazdami', dj: 'Konrad Sikora' },
];

function buildFilename(entry, date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${entry.title} - ${entry.dj} - ${dd}-${mm}-${yy}.txt`;
}

module.exports = { DAY_NAMES, SCHEDULE, buildFilename };
