# AgriPlanner - Weather & Market Integration

A web application that integrates weather forecasts, market pricing data, and agricultural insights to provide intelligent planning recommendations for farmers and agricultural businesses.

## Features

- Real-time weather data from WeatherAPI.com with 5-day forecasts
- Enhanced weather insights including UV index, humidity, and wind gust data
- Market pricing data from Alpha Vantage with multi-tier fallback mechanisms
- Intelligent planning insights by correlating weather conditions and market trends
- Crop-specific recommendations based on environmental factors
- Responsive design that works on mobile and desktop

## Key Improvements

- **Enhanced Weather Data**: Added UV index, humidity, and wind gust analysis to provide sophisticated agricultural insights
- **Market Data Reliability**: Implemented multiple fallback mechanisms to handle API limitations, trying alternative symbols and API functions
- **Data Validation**: Added temperature value validation with crop-specific thresholds for more accurate recommendations
- **Crop-Specific Parameters**: Implemented tailored thresholds for temperature, humidity, and UV index for different agricultural products
- **API Resilience**: Supporting both TIME_SERIES_DAILY and GLOBAL_QUOTE API functions to improve market data reliability

## Technical Details

- **Frontend**: HTML, CSS, JavaScript with responsive design
- **Backend**: Node.js with Express
- **APIs**: WeatherAPI.com and Alpha Vantage
- **Data Structure**: Organized in a card-based UI with a 1fr-2fr-1fr grid layout

## API Keys

- **WeatherAPI**: 47d794ebddbd476fab8123002252904
- **Alpha Vantage**: FBIT1KBBYBQ9C8GV (Limited to 25 requests per day on free tier)

## Usage Limitations

- Alpha Vantage free tier is limited to 25 requests per day
- Market data uses a multi-tier fallback approach with futures contracts, backup symbols, ETF symbols, and stock market tickers as proxies when needed

## Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Start the server with `npm start`
4. Access the application at http://localhost:3004

## Future Enhancements

- Implement caching system to store market data responses and refresh only once per day to stay within API limits
- Add export functionality for planning insights
- Expand crop database with more detailed agricultural parameters
- Implement historical data analysis for seasonal planning
