/**
 * University Data MCP Client
 * 
 * This is a client-side implementation that makes it easy to interact with 
 * the University Data MCP Server.
 */

// For Node.js versions before 18, uncomment the line below
// const fetch = require('node-fetch');

class UniversityDataClient {
  /**
   * Initialize the client with the MCP server URL
   * 
   * @param {string} baseUrl - The base URL of the MCP server
   */
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper method to make HTTP requests
   * 
   * @param {string} endpoint - The API endpoint to call
   * @param {string} method - The HTTP method (GET, POST, etc.)
   * @param {object} data - The request payload for POST requests
   * @returns {Promise<object>} - The API response
   */
  async _request(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Set up request options
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Add body data for POST requests
    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    try {
      // Make the fetch request
      const response = await fetch(url, options);
      const result = await response.json();

      // Check for errors
      if (!response.ok) {
        throw new Error(result.error?.message || 'Request failed');
      }

      return result;
    } catch (error) {
      console.error(`Error in ${method} request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get the MCP schema that describes available endpoints and parameters
   * 
   * @returns {Promise<object>} - The MCP schema
   */
  async getSchema() {
    return this._request('/schema');
  }

  /**
   * Search for universities based on criteria
   * 
   * @param {object} params - Search parameters
   * @param {string} [params.query] - Full-text search query
   * @param {string} [params.state] - Filter by state (e.g., 'CA', 'NY')
   * @param {string} [params.city] - Filter by city name
   * @param {number} [params.limit=10] - Maximum number of results to return
   * @param {number} [params.offset=0] - Number of results to skip (for pagination)
   * @returns {Promise<object>} - Search results
   */
  async searchUniversities(params = {}) {
    return this._request('/search', 'POST', params);
  }

  /**
   * Get detailed information for a specific university by ID
   * 
   * @param {string} id - The university record ID
   * @returns {Promise<object>} - University details
   */
  async getUniversity(id) {
    return this._request(`/getUniversity?id=${encodeURIComponent(id)}`);
  }

  /**
   * Get all available fields in the university dataset
   * 
   * @returns {Promise<object>} - List of available fields
   */
  async getFields() {
    return this._request('/getFields');
  }

  /**
 * Get university by name
 * 
 * @param {string} name - The name of the university to fetch
 * @returns {Promise<object>} - University details
 */
async getUniversityByName(name) {
  return this._request(`/getUniversityByName?name=${encodeURIComponent(name)}`);
}

  /**
   * Get statistical information about universities
   * 
   * @param {object} params - Statistics parameters
   * @param {string} params.field - Field to analyze
   * @param {string} params.aggregation - Type of aggregation (count, sum, avg, min, max)
   * @param {string} [params.groupBy] - Field to group by
   * @param {object} [params.filter] - Filter conditions to apply
   * @returns {Promise<object>} - Statistical results
   */
  async getStatistics(params) {
    return this._request('/statistics', 'POST', params);
  }
}

/**
 * Example usage of the UniversityDataClient
 */
async function exampleUsage() {
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
    searchResults.data.results.forEach((result, index) => {
      const university = result.record.fields;
      console.log(`${index + 1}. ${university.name} (${university.city}, ${university.state})`);
    });
    
    // 3. Get all available fields
    console.log('\nFetching available fields...');
    const fields = await client.getFields();
    console.log(`Available fields: ${fields.data.slice(0, 5).map(f => f.name).join(', ')}... (${fields.data.length} total fields)`);
    
    // 4. Get statistics - average enrollment by state
    console.log('\nCalculating average enrollment by state...');
    const statistics = await client.getStatistics({
      field: 'tot_enrollment',
      aggregation: 'avg',
      groupBy: 'state'
    });
    
    // Sort states by average enrollment (descending)
    const stateStats = statistics.data.results
      .filter(result => result.state && result.average)
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);
    
    console.log('Top 5 states by average enrollment:');
    stateStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.state}: ${Math.round(stat.average)} students`);
    });
    
    // 5. Get details for a specific university (if we have an ID from the search)
    if (searchResults.data.results.length > 0) {
      const universityId = searchResults.data.results[0].record.id;
      console.log(`\nFetching details for university ID: ${universityId}...`);
      const universityDetails = await client.getUniversity(universityId);
      const university = universityDetails.data.record.fields;
      console.log('University details:');
      console.log(`Name: ${university.name}`);
      console.log(`Location: ${university.city}, ${university.state}`);
      console.log(`Total Enrollment: ${university.tot_enrollment || 'Unknown'}`);
      console.log(`Campus Setting: ${university.campus_setting || 'Unknown'}`);
    }
  } catch (error) {
    console.error('Error in example usage:', error.message);
  }
}

// You can uncomment this line to run the example when the file is executed
// exampleUsage();

// Export the client for use in other modules
module.exports = UniversityDataClient;