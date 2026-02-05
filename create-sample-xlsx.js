import XLSX from 'xlsx';

// Sample data for testing the new simplified coverage structure
const sampleData = [
    {
        Network: 'FTTH',
        'Site ID': 'SITE-001',
        'Ampli Lat': -6.2088,
        'Ampli Long': 106.8456,
        Locality: 'Jakarta Pusat'
    },
    {
        Network: 'HFC',
        'Site ID': 'SITE-002',
        'Ampli Lat': -6.1751,
        'Ampli Long': 106.8650,
        Locality: 'Jakarta Timur'
    },
    {
        Network: 'FTTH',
        'Site ID': 'SITE-003',
        'Ampli Lat': -6.2297,
        'Ampli Long': 106.6890,
        Locality: 'Jakarta Barat'
    },
    {
        Network: 'HFC',
        'Site ID': 'SITE-004',
        'Ampli Lat': -6.2615,
        'Ampli Long': 106.7810,
        Locality: 'Jakarta Selatan'
    },
    {
        Network: 'FTTH',
        'Site ID': 'SITE-005',
        'Ampli Lat': -6.1385,
        'Ampli Long': 106.8134,
        Locality: 'Jakarta Utara'
    }
];

// Create workbook and worksheet
const ws = XLSX.utils.json_to_sheet(sampleData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Coverage Data');

// Write to file
XLSX.writeFile(wb, 'sample-coverage-import.xlsx');

console.log('✅ Sample XLSX file created: sample-coverage-import.xlsx');
console.log('📋 Contains 5 sample coverage sites with the new simplified structure:');
console.log('   - Network');
console.log('   - Site ID');
console.log('   - Ampli Lat');
console.log('   - Ampli Long');
console.log('   - Locality');
