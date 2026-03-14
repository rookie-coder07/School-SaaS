import XLSX from 'xlsx';

const file = 'C:\\Users\\ASUS\\OneDrive\\Desktop\\test_student.xlsx';

try {
  const workbook = XLSX.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
  console.log('\n=== File Analysis ===\n');
  console.log(`Sheet: ${sheetName}`);
  console.log(`Total rows: ${rows.length}\n`);
  
  if (rows.length > 0) {
    console.log('Columns in file:');
    const columns = Object.keys(rows[0]);
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });
    
    console.log('\nFirst row data:');
    const firstRow = rows[0];
    columns.forEach(col => {
      console.log(`  ${col}: ${firstRow[col]}`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
