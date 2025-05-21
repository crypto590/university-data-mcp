# University Data MCP

A Machine Controllable Program (MCP) that provides structured access to university data from the OpenDataSoft API. This MCP is designed to be easily used by AI agents to query information about US colleges and universities.

## Features

- Search for universities by state, city, and other criteria
- Get statistical information about universities (counts, averages, etc.)
- Retrieve detailed information about specific universities
- Get available data fields and their descriptions

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `node server.js` to start the server
4. The server will be available at http://localhost:3000

## API Endpoints

- `/schema` - Get information about available endpoints
- `/search` - Search for universities with various filters
- `/statistics` - Get aggregated statistics on universities
- `/getFields` - Get all available fields in the dataset
- `/getUniversityByName` - Get details for a specific university by name

## Technologies Used

- Node.js
- Express
- Axios
- OpenDataSoft API