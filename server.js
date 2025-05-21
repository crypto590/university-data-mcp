// Import required packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());  // Allow cross-origin requests
app.use(bodyParser.json());  // Parse JSON request bodies

// Base URL for the university dataset API
const API_BASE_URL = 'https://public.opendatasoft.com/api/explore/v2.1';
const DATASET_ID = 'us-colleges-and-universities';

/**
 * Helper function to format error responses
 */
function formatError(message, status = 400) {
  return {
    success: false,
    error: {
      message,
      status
    }
  };
}

// Root endpoint - provides basic information about the API
app.get('/', (req, res) => {
  res.json({
    name: "University Data MCP API",
    description: "A Machine Controllable Program (MCP) for querying university data",
    version: "1.0.0",
    documentation: "/schema",
    status: "operational"
  });
});

/**
 * MCP schema definition endpoint
 * This endpoint returns the schema that describes the capabilities of this MCP
 */
app.get('/schema', (req, res) => {
  const schema = {
    name: "UniversityDataMCP",
    description: "An MCP for querying university data from the OpenDataSoft API",
    version: "1.0.0",
    endpoints: [
      {
        path: "/search",
        method: "POST",
        description: "Search for universities based on criteria",
        parameters: {
          query: {
            type: "string",
            description: "Full-text search query",
            required: false
          },
          state: {
            type: "string",
            description: "Filter by state (e.g., 'CA', 'NY')",
            required: false
          },
          city: {
            type: "string",
            description: "Filter by city name",
            required: false
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default: 10, max: 100)",
            required: false
          },
          offset: {
            type: "number",
            description: "Number of results to skip (for pagination)",
            required: false
          }
        },
        returns: {
          type: "object",
          description: "Search results including university records"
        }
      },
      {
        path: "/getFields",
        method: "GET",
        description: "Get all available fields in the university dataset",
        parameters: {},
        returns: {
          type: "array",
          description: "List of available fields and their descriptions"
        }
      },
      {
        path: "/statistics",
        method: "POST",
        description: "Get statistical information about universities",
        parameters: {
          field: {
            type: "string",
            description: "Field to analyze (e.g., 'objectid', 'population')",
            required: true
          },
          aggregation: {
            type: "string",
            description: "Type of aggregation (count, sum, avg, min, max)",
            required: true
          },
          groupBy: {
            type: "string",
            description: "Field to group by (e.g., 'state', 'city')",
            required: false
          },
          filter: {
            type: "object",
            description: "Filter conditions to apply",
            required: false
          }
        },
        returns: {
          type: "object",
          description: "Statistical results"
        }
      },
      {
        path: "/getUniversityByName",
        method: "GET",
        description: "Get details for a specific university by name",
        parameters: {
          name: {
            type: "string",
            description: "University name",
            required: true
          }
        },
        returns: {
          type: "object",
          description: "Detailed university information"
        }
      }
    ]
  };
  
  res.json(schema);
});

/**
 * Search endpoint - allows searching for universities with various filters
 */
app.post('/search', async (req, res) => {
  try {
    const { 
      query = '',
      state = '',
      city = '',
      limit = 10,
      offset = 0
    } = req.body;
    
    // Validate input
    if (limit > 100) {
      return res.status(400).json(formatError("Limit cannot exceed 100"));
    }
    
    // Build query parameters
    let whereClause = [];
    if (state) {
      whereClause.push(`state = '${state}'`);
    }
    if (city) {
      whereClause.push(`city = '${city}'`);
    }
    
    const params = {
      limit,
      offset,
      // Use ODSQL syntax for the where clause
      where: whereClause.length > 0 ? whereClause.join(' AND ') : undefined,
    };
    
    // Add full-text search if provided
    if (query) {
      params.q = query;
    }
    
    // Make the API request
    const response = await axios.get(`${API_BASE_URL}/catalog/datasets/${DATASET_ID}/records`, {
      params
    });
    
    res.json({
      success: true,
      data: response.data,
      metadata: {
        total: response.data.total_count,
        offset: offset,
        limit: limit,
        query_parameters: {
          query,
          state,
          city
        }
      }
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json(formatError(
      error.response?.data?.message || "Failed to search universities",
      error.response?.status || 500
    ));
  }
});

/**
 * Get University Details - fetch details for a specific university by ID
 */
app.get('/getUniversity', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json(formatError("University ID is required"));
    }
    
    console.log(`Getting university with ID: ${id}`);
    
    // Use the where clause to find by objectid
    const requestUrl = `${API_BASE_URL}/catalog/datasets/${DATASET_ID}/records`;
    const params = {
      where: `objectid = '${id}'`,
      limit: 1
    };
    
    console.log(`Making request to: ${requestUrl}`);
    console.log(`With params:`, params);
    
    const response = await axios.get(requestUrl, { params });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, JSON.stringify(response.data).substring(0, 300) + '...');
    
    if (response.data.results && response.data.results.length > 0) {
      console.log(`Found university with ID: ${id}`);
      res.json({
        success: true,
        data: response.data.results[0]
      });
    } else {
      console.log(`No university found with ID: ${id}`);
      return res.status(404).json(formatError("University not found", 404));
    }
  } catch (error) {
    console.error('Error fetching university:', error);
    
    // Handle 404 specifically
    if (error.response?.status === 404) {
      return res.status(404).json(formatError("University not found", 404));
    }
    
    res.status(500).json(formatError(
      error.response?.data?.message || "Failed to fetch university details",
      error.response?.status || 500
    ));
  }
});

/**
 * Get University By Name - fetch details for a university by name
 */
app.get('/getUniversityByName', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json(formatError("University name is required"));
    }
    
    console.log(`Getting university with name: ${name}`);
    
    // Use the where clause to find by name
    const response = await axios.get(`${API_BASE_URL}/catalog/datasets/${DATASET_ID}/records`, {
      params: {
        where: `name = '${name}'`,
        limit: 1
      }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      res.json({
        success: true,
        data: response.data.results[0]
      });
    } else {
      return res.status(404).json(formatError("University not found", 404));
    }
  } catch (error) {
    console.error('Error fetching university by name:', error);
    res.status(500).json(formatError(
      error.response?.data?.message || "Failed to fetch university details",
      error.response?.status || 500
    ));
  }
});

/**
 * Get Fields - fetch all available fields in the dataset
 */
app.get('/getFields', async (req, res) => {
  try {
    // Get a sample record to determine the available fields
    const response = await axios.get(`${API_BASE_URL}/catalog/datasets/${DATASET_ID}/records`, {
      params: { limit: 1 }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      const sampleRecord = response.data.results[0];
      
      // Extract fields from the sample record
      const fields = Object.keys(sampleRecord).map(key => {
        let type = typeof sampleRecord[key];
        // Try to infer more specific types
        if (key.includes('date') || key.includes('time')) {
          type = 'date';
        } else if (!isNaN(Number(sampleRecord[key]))) {
          type = 'number';
        }
        
        return {
          name: key,
          type: type,
          description: key.replace(/_/g, ' ')
        };
      });
      
      res.json({
        success: true,
        data: fields
      });
    } else {
      throw new Error("No sample records found to determine fields");
    }
  } catch (error) {
    console.error('Error fetching fields:', error);
    res.status(500).json(formatError(
      error.response?.data?.message || "Failed to fetch dataset fields",
      error.response?.status || 500
    ));
  }
});

/**
 * Statistics endpoint - get aggregated statistics on universities
 */
app.post('/statistics', async (req, res) => {
  try {
    const {
      field,
      aggregation,
      groupBy,
      filter
    } = req.body;
    
    if (!field || !aggregation) {
      return res.status(400).json(formatError("Field and aggregation are required"));
    }
    
    // Validate aggregation type
    const validAggregations = ['count', 'sum', 'avg', 'min', 'max'];
    if (!validAggregations.includes(aggregation)) {
      return res.status(400).json(formatError(`Invalid aggregation. Must be one of: ${validAggregations.join(', ')}`));
    }
    
    // For numeric fields, ensure they're cast properly
    // Convert the field to a number for aggregations
    let selectClause;
    
    if (aggregation === 'count') {
      selectClause = `count(*) as count`;
    } else {
      // For the other aggregations, we need to make sure we're working with a number
      // Since population is stored as a string in the API but contains numeric data
      selectClause = `${aggregation}(int(${field})) as ${aggregation === 'avg' ? 'average' : aggregation}`;
    }
    
    // Build where clause from filter if provided
    let whereClause = '';
    if (filter && Object.keys(filter).length > 0) {
      whereClause = Object.entries(filter)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key} = '${value}'`;
          }
          return `${key} = ${value}`;
        })
        .join(' AND ');
    }
    
    // Add group by if provided
    const params = {
      select: selectClause
    };
    
    if (groupBy) {
      params.group_by = groupBy;
    }
    
    if (whereClause) {
      params.where = whereClause;
    }
    
    console.log("Statistics params:", params);
    
    // Make API request for aggregate data
    const response = await axios.get(`${API_BASE_URL}/catalog/datasets/${DATASET_ID}/records`, {
      params
    });
    
    res.json({
      success: true,
      data: response.data,
      metadata: {
        field,
        aggregation,
        groupBy,
        filter
      }
    });
  } catch (error) {
    console.error('Error calculating statistics:', error);
    res.status(500).json(formatError(
      error.response?.data?.message || "Failed to calculate statistics",
      error.response?.status || 500
    ));
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`University Data MCP server running on port ${PORT}`);
});