// Import the client
const UniversityDataClient = require('./client/index');

// Run the example usage function
async function runTest() {
  // Create a client instance
  const client = new UniversityDataClient();

  try {
    // 1. Get the MCP schema
    console.log('Fetching MCP schema...');
    const schema = await client.getSchema();
    console.log('Available endpoints:', schema.endpoints.map(e => e.path));
    
    // 2. Search for universities in California
    console.log('\nSearching for universities in California...');
    const searchResults = await client.searchUniversities({
      state: 'CA',
      limit: 5
    });
    
    console.log(`Found ${searchResults.data.total_count} universities in CA. Showing ${searchResults.data.results.length} results:`);
    
    // Display the results
    let firstUniversityName;
    searchResults.data.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name || 'Unknown'} (${result.city || 'Unknown'}, ${result.state || 'Unknown'})`);
      if (index === 0) {
        firstUniversityName = result.name;
        console.log(`   ID: ${result.objectid}`);
        console.log(`   Population: ${result.population}`);
      }
    });
    
    // 3. Get all available fields
    console.log('\nFetching available fields...');
    const fields = await client.getFields();
    console.log(`Available fields: ${fields.data.slice(0, 5).map(f => f.name).join(', ')}... (${fields.data.length} total fields)`);
    
    // 4. Get statistics - count by state
    console.log('\nCounting universities by state...');
    try {
      const statistics = await client.getStatistics({
        field: 'objectid', // Using objectid is safe for counting
        aggregation: 'count',
        groupBy: 'state'
      });
      
      if (statistics.data.results && statistics.data.results.length > 0) {
        const topStates = statistics.data.results
          .filter(result => result.state !== undefined && result.count !== undefined)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        console.log('Top 5 states by university count:');
        topStates.forEach((stat, index) => {
          console.log(`${index + 1}. ${stat.state}: ${stat.count} universities`);
        });
      } else {
        console.log("No statistics data available");
      }
    } catch (error) {
      console.log('Could not fetch count statistics:', error.message);
    }
    
    // 5. Get university details by name
    if (firstUniversityName) {
      console.log(`\nFetching details for university name: ${firstUniversityName}...`);
      try {
        const universityDetails = await client.getUniversityByName(firstUniversityName);
        
        // Display university details
        const university = universityDetails.data;
        console.log('University details:');
        console.log(`Name: ${university.name || 'Unknown'}`);
        console.log(`Location: ${university.city || 'Unknown'}, ${university.state || 'Unknown'}`);
        console.log(`Address: ${university.address || 'Unknown'}`);
        console.log(`Telephone: ${university.telephone || 'Unknown'}`);
        console.log(`Population: ${university.population || 'Unknown'}`);
        console.log(`Type: ${university.type || 'Unknown'}`);
      } catch (error) {
        console.log('Could not fetch university details:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error in example usage:', error);
  }
}

// Run the test
runTest();