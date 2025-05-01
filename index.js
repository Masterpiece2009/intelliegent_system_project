// Main server file for Weather Market Integration
const express = require('express');
const axios = require('axios');

// Direct API keys (no need for .env)
const WEATHER_API_KEY = '47d794ebddbd476fab8123002252904';
const ALPHAVANTAGE_API_KEY = 'OERPBB9P6QWJ33I7'; // Removed extra space

const app = express();
// Change to port 3004 as requested
const PORT = process.env.PORT || 3004;

// Middleware to serve static files
app.use(express.static('public'));

// Weather API endpoint - ENHANCED to include additional fields
app.get('/api/weather', async (req, res) => {
  try {
    // Get location from query params or use default
    const location = req.query.location || 'Cairo';
    
    console.log('Fetching weather for:', location);
    
    // Handle Egypt specifically (convert to Cairo)
    const searchLocation = location.toLowerCase() === 'egypt' ? 'Cairo' : location;
    
    // Call the WeatherAPI with increased timeout
    const response = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
      params: {
        key: WEATHER_API_KEY,
        q: searchLocation,
        days: 5,
        aqi: 'no'
      },
      timeout: 15000 // Increase timeout to 15 seconds
    });
    
    console.log('Weather API response received');
    
    // Extract the data directly from the response
    const rawData = response.data;
    
    // Check for essential data
    if (!rawData || !rawData.location || !rawData.current) {
      throw new Error('Incomplete weather data received');
    }
    
    // Build a properly structured response with additional fields
    const weatherData = {
      location: {
        name: rawData.location.name || searchLocation,
        country: rawData.location.country || 'Unknown',
        lat: rawData.location.lat,
        lon: rawData.location.lon
      },
      current: {
        temp_c: rawData.current.temp_c,
        condition: rawData.current.condition ? rawData.current.condition.text : 'Unknown',
        humidity: rawData.current.humidity || 0,
        wind_kph: rawData.current.wind_kph || 0,
        precip_mm: rawData.current.precip_mm || 0,
        // New fields added here
        uv: rawData.current.uv || 0,
        gust_kph: rawData.current.gust_kph || 0,
        feelslike_c: rawData.current.feelslike_c || 0
      },
      forecast: []
    };
    
    // Process forecast data
    if (rawData.forecast && Array.isArray(rawData.forecast.forecastday)) {
      weatherData.forecast = rawData.forecast.forecastday.map(day => {
        // Make sure day and day.day exist
        if (!day || !day.day || !day.day.condition) {
          return {
            date: day ? day.date : new Date().toISOString().split('T')[0],
            maxtemp_c: 0,
            mintemp_c: 0,
            avgtemp_c: 0,
            condition: 'Unknown',
            daily_chance_of_rain: 0,
            totalprecip_mm: 0
          };
        }
        
        return {
          date: day.date,
          maxtemp_c: day.day.maxtemp_c,
          mintemp_c: day.day.mintemp_c,
          avgtemp_c: day.day.avgtemp_c,
          condition: day.day.condition ? day.day.condition.text : 'Unknown',
          daily_chance_of_rain: day.day.daily_chance_of_rain,
          totalprecip_mm: day.day.totalprecip_mm,
          // New field for forecast
          uv: day.day.uv || 0
        };
      });
    }
    
    console.log('Weather data processed successfully');
    res.json(weatherData);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data || {}, null, 2));
    } else if (error.request) {
      console.error('No response received, request was:', error.request);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch weather data', 
      details: error.message 
    });
  }
});

// Market data endpoint - Fixed to use symbols that work with Alpha Vantage
app.get('/api/market', async (req, res) => {
  try {
    // Get symbol from query params or use default
    let symbol = req.query.symbol || 'CORN';
    
    // Map product names to actual stock symbols - Alpha Vantage doesn't accept "Corn" directly
    const symbolMap = {
      'Corn': 'CORN',
      'Wheat': 'WEAT',
      'Soybeans': 'SOYB',
      'Coffee': 'JO',
      'Cotton': 'BAL',
      'Sugar': 'SGG',
      'Rice': 'RJA',
      'Oranges': 'JO', // Using Coffee ETF as proxy
      'Tomatoes': 'MOO', // Using VanEck Agribusiness ETF as proxy
      'Apples': 'MOO'  // Using VanEck Agribusiness ETF as proxy
    };
    
    // Convert to proper symbol if needed
    if (symbolMap[symbol]) {
      symbol = symbolMap[symbol];
    }
    
    console.log('Fetching market data for symbol:', symbol);
    
    // Call Alpha Vantage API with increased timeout
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: ALPHAVANTAGE_API_KEY.trim() // Ensure no whitespace
      },
      timeout: 15000 // Increase timeout to 15 seconds
    });
    
    // Handle Alpha Vantage error responses
    if (response.data.Note) {
      console.log('Alpha Vantage API limit message:', response.data.Note);
      return res.status(429).json({ error: response.data.Note });
    }
    
    if (response.data['Error Message']) {
      console.log('Alpha Vantage error message:', response.data['Error Message']);
      return res.status(400).json({ error: response.data['Error Message'] });
    }
    
    const timeSeriesData = response.data['Time Series (Daily)'];
    if (!timeSeriesData) {
      console.log('No market data found for symbol:', symbol);
      return res.status(404).json({ error: 'No market data found' });
    }
    
    // Convert to array format and extract last 7 days
    const marketData = Object.entries(timeSeriesData)
      .slice(0, 7)
      .map(([date, values]) => ({
        date,
        open: parseFloat(values['1. open'] || 0),
        high: parseFloat(values['2. high'] || 0),
        low: parseFloat(values['3. low'] || 0),
        close: parseFloat(values['4. close'] || 0),
        volume: parseFloat(values['5. volume'] || 0)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending
    
    console.log('Market data processed successfully');
    res.json({
      symbol,
      data: marketData
    });
  } catch (error) {
    console.error('Market API Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data || {}, null, 2));
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch market data', 
      details: error.message 
    });
  }
});
// Planning insights endpoint - ENHANCED with UV, humidity and wind gust data
app.get('/api/planning', async (req, res) => {
  try {
    // Get location and symbol from query params
    const location = req.query.location || 'Cairo';
    const symbol = req.query.symbol || 'CORN';
    
    console.log('Generating planning insights for location:', location, 'and product:', symbol);
    
    // Fetch data internally from our API endpoints
    let weatherData, marketData;
    
    try {
      // Build weather API URL
      let weatherUrl = `/api/weather?location=${encodeURIComponent(location)}`;
      
      const weatherResponse = await axios.get(`http://localhost:${PORT}${weatherUrl}`, {
        timeout: 15000 // Increase timeout to 15 seconds
      });
      weatherData = weatherResponse.data;
      console.log('Weather data fetched for insights');
      
      // Log the additional fields
      if (weatherData && weatherData.current) {
        console.log('UV Index:', weatherData.current.uv);
        console.log('Humidity:', weatherData.current.humidity);
        console.log('Wind Gust:', weatherData.current.gust_kph);
      }
    } catch (error) {
      console.error('Failed to fetch weather for insights:', error.message);
      // Continue with null weatherData
    }
    
    try {
      const marketResponse = await axios.get(`http://localhost:${PORT}/api/market?symbol=${encodeURIComponent(symbol)}`, {
        timeout: 15000 // Increase timeout to 15 seconds
      });
      marketData = marketResponse.data;
      console.log('Market data fetched for insights');
    } catch (error) {
      console.error('Failed to fetch market data for insights:', error.message);
      // Continue with null marketData
    }
    
    // Generate insights based on the data
    const insights = [];
    const productName = getProductName(symbol);
    
    // Weather insights - including current conditions and forecast
    if (weatherData) {
      // Current Weather UV Index insights - NEW
      if (weatherData.current && weatherData.current.uv !== undefined) {
        const uvIndex = weatherData.current.uv;
        
        if (uvIndex >= 8) {
          insights.push({
            type: 'weather',
            title: 'Extreme UV Alert',
            description: `Current UV index of ${uvIndex} is extremely high. May cause sunscald damage to ${productName} and poses risk to field workers. Consider shade structures or postponing field work to early morning/late afternoon.`
          });
        } else if (uvIndex >= 6) {
          insights.push({
            type: 'weather',
            title: 'High UV Alert',
            description: `Current UV index of ${uvIndex} is high. Sensitive ${productName} varieties may benefit from protective measures. Field workers should use appropriate sun protection.`
          });
        }
      }
      
      // Current Weather Humidity insights - NEW
      if (weatherData.current && weatherData.current.humidity !== undefined) {
        const humidity = weatherData.current.humidity;
        
        // Crop-specific humidity thresholds
        const getHumidityThresholds = (crop) => {
          const thresholds = {
            'Corn': { high: 85, low: 30 },
            'Wheat': { high: 85, low: 35 },
            'Soybeans': { high: 80, low: 35 },
            'Coffee': { high: 90, low: 40 },
            'Cotton': { high: 80, low: 25 },
            'Rice': { high: 95, low: 40 },
            'Oranges': { high: 85, low: 35 },
            'Tomatoes': { high: 80, low: 40 },
            'Apples': { high: 80, low: 35 },
            'Sugar': { high: 85, low: 30 },
            'default': { high: 85, low: 35 }
          };
          
          return thresholds[crop] || thresholds.default;
        };
        
        const humidityThresholds = getHumidityThresholds(productName);
        
        if (humidity > humidityThresholds.high) {
          insights.push({
            type: 'weather',
            title: 'High Humidity Alert',
            description: `Current humidity of ${humidity}% exceeds optimal levels for ${productName}. Increased disease risk - monitor for fungal development and consider preventative treatments.`
          });
        } else if (humidity < humidityThresholds.low) {
          insights.push({
            type: 'weather',
            title: 'Low Humidity Alert',
            description: `Current humidity of ${humidity}% is below optimal levels for ${productName}. May increase water stress - consider increasing irrigation frequency.`
          });
        }
      }
      
      // Current Weather Wind Gust insights - NEW
      if (weatherData.current && weatherData.current.gust_kph !== undefined) {
        const windGust = weatherData.current.gust_kph;
        
        if (windGust > 40) {
          insights.push({
            type: 'weather',
            title: 'High Wind Gust Alert',
            description: `Current wind gusts of ${windGust.toFixed(1)} km/h may cause physical damage to ${productName}. Delay spraying operations and secure any vulnerable structures or equipment.`
          });
        } else if (windGust > 25) {
          insights.push({
            type: 'weather',
            title: 'Spray Caution Alert',
            description: `Current wind gusts of ${windGust.toFixed(1)} km/h exceed optimal spraying conditions. Consider delaying chemical applications to prevent drift and ensure even coverage.`
          });
        }
      }
      
      // Forecast insights (if available)
      if (weatherData.forecast && weatherData.forecast.length > 0) {
        // Rain forecast insight
        const rainyDays = weatherData.forecast.filter(day => 
          (day.daily_chance_of_rain > 30 || day.totalprecip_mm > 0)
        );
        
        if (rainyDays && rainyDays.length > 0) {
          insights.push({
            type: 'weather',
            title: 'Rainfall Alert',
            description: `${rainyDays.length} days with significant rain chance in the forecast period. Plan field operations accordingly.`
          });
        }
        
        // Temperature insight - safely calculate average with 0.0°C validation fix
        try {
          const avgTemp = weatherData.forecast.reduce((sum, day) => sum + (day.avgtemp_c || 0), 0) / weatherData.forecast.length;
          
          // Crop-specific temperature thresholds
          const getTempThresholds = (crop) => {
            const thresholds = {
              'Corn': { high: 32, low: 10 },
              'Wheat': { high: 30, low: 4 },
              'Soybeans': { high: 35, low: 10 },
              'Coffee': { high: 30, low: 15 },
              'Cotton': { high: 38, low: 15 },
              'Rice': { high: 35, low: 16 },
              'Oranges': { high: 35, low: 12 },
              'Tomatoes': { high: 32, low: 14 },
              'Apples': { high: 30, low: 5 },
              'Sugar': { high: 35, low: 14 },
              'default': { high: 30, low: 10 }
            };
            
            return thresholds[crop] || thresholds.default;
          };
          
          const tempThresholds = getTempThresholds(productName);
          
          if (avgTemp > tempThresholds.high) {
            insights.push({
              type: 'weather',
              title: 'High Temperature Alert',
              description: `Average temperature of ${avgTemp.toFixed(1)}°C exceeds optimal growing conditions for ${productName}. Consider increased irrigation and monitor for heat stress.`
            });
          } else if (avgTemp < tempThresholds.low && Math.abs(avgTemp) > 0.5) {
            insights.push({
              type: 'weather',
              title: 'Low Temperature Alert',
              description: `Average temperature of ${avgTemp.toFixed(1)}°C may slow growth for ${productName}. Monitor crops closely.`
            });
          }
        } catch (err) {
          console.error('Error calculating average temperature:', err.message);
        }
      }
    }    
    // Market insights - Keep existing code
    if (marketData && marketData.data && marketData.data.length > 1) {
      try {
        const firstDay = marketData.data[0];
        const lastDay = marketData.data[marketData.data.length - 1];
        const priceDiff = ((lastDay.close - firstDay.close) / firstDay.close) * 100;
        
        if (Math.abs(priceDiff) > 1) { // Only if price change is significant
          const direction = priceDiff >= 0 ? 'increased' : 'decreased';
          
          insights.push({
            type: 'market',
            title: 'Price Trend Alert',
            description: `${productName} prices have ${direction} by ${Math.abs(priceDiff).toFixed(2)}% over the last ${marketData.data.length} days.`
          });
          
          // Additional selling/holding advice
          if (priceDiff >= 3) {
            insights.push({
              type: 'market',
              title: 'Selling Opportunity',
              description: `With rising ${productName} prices, consider selling if inventory is available.`
            });
          } else if (priceDiff <= -3) {
            insights.push({
              type: 'market',
              title: 'Holding Recommendation',
              description: `With declining ${productName} prices, consider holding inventory if possible.`
            });
          }
        }
      } catch (err) {
        console.error('Error calculating price difference:', err.message);
      }
    }
    
    // Enhanced Combined insights (weather + market) - NEW integration with additional fields
    if (weatherData && weatherData.current && marketData && marketData.data) {
      // Basic integrated planning
      insights.push({
        type: 'planning',
        title: 'Integrated Planning',
        description: `Adjust ${productName} management based on both current weather conditions and market prices.`
      });
      
      // NEW: Enhanced spray/harvest planning based on wind gust and humidity
      if (weatherData.current.gust_kph !== undefined && weatherData.current.humidity !== undefined) {
        const windGust = weatherData.current.gust_kph;
        const humidity = weatherData.current.humidity;
        
        // ENHANCED: Weather-based operational decisions
        let isSuitableForSpraying = windGust < 20 && humidity > 40 && humidity < 85;
        let isSuitableForHarvesting = windGust < 30 && humidity < 75;
        
        // Determine market trend
        const marketTrend = marketData.data.length > 2 ? 
          (marketData.data[marketData.data.length-1].close > marketData.data[marketData.data.length-3].close ? 'rising' : 'falling') :
          'stable';
        
        if (isSuitableForSpraying) {
          insights.push({
            type: 'planning',
            title: 'Optimal Spraying Conditions',
            description: `Current weather conditions (wind gust: ${windGust.toFixed(1)} km/h, humidity: ${humidity}%) are favorable for pesticide/herbicide application for ${productName}.`
          });
        }
        
        if (isSuitableForHarvesting && marketTrend === 'rising') {
          insights.push({
            type: 'planning',
            title: 'Optimal Harvest & Sell Timing',
            description: `Current weather conditions favor harvesting ${productName}, and market prices are rising. Consider accelerating harvest operations to capitalize on favorable conditions.`
          });
        } else if (isSuitableForHarvesting && marketTrend === 'falling') {
          insights.push({
            type: 'planning',
            title: 'Harvest with Market Caution',
            description: `Weather conditions are suitable for harvesting ${productName}, but market prices are declining. Consider harvesting but delaying sales if storage is available.`
          });
        }
      }
      
      // Specific forecast-based recommendations
      if (weatherData.forecast && weatherData.forecast.some(day => day.daily_chance_of_rain > 50)) {
        insights.push({
          type: 'planning',
          title: 'Weather-Market Planning',
          description: `High rain probability in the forecast may affect ${productName} quality and quantity. Plan harvesting, storage and market timing accordingly.`
        });
      }
    }
    
    // If no insights were generated
    if (insights.length === 0) {
      insights.push({
        type: 'planning',
        title: 'Baseline Planning',
        description: `Continue monitoring weather and market trends for ${productName}.`
      });
    }
    
    console.log('Generated', insights.length, 'planning insights');
    
    res.json({
      location: weatherData && weatherData.location ? 
        `${weatherData.location.name}, ${weatherData.location.country}` : 
        location,
      product: productName,
      insights
    });
  } catch (error) {
    console.error('Planning Insights Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate planning insights', 
      details: error.message 
    });
  }
});

// Helper function to get product name from symbol
function getProductName(symbol) {
  const productMap = {
    'CORN': 'Corn',
    'WEAT': 'Wheat',
    'SOYB': 'Soybeans',
    'RICE': 'Rice',
    'JO': 'Coffee',
    'BAL': 'Cotton',
    'SGG': 'Sugar',
    'RJA': 'Rice',
    'MOO': 'Agricultural Products',
    // Add direct product names
    'Corn': 'Corn',
    'Wheat': 'Wheat',
    'Soybeans': 'Soybeans',
    'Coffee': 'Coffee',
    'Cotton': 'Cotton',
    'Sugar': 'Sugar',
    'Rice': 'Rice',
    'Oranges': 'Oranges',
    'Tomatoes': 'Tomatoes',
    'Apples': 'Apples'
  };
  
  return productMap[symbol] || symbol;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Weather API Key: Configured (${WEATHER_API_KEY.substring(0, 5)}...)`);
  console.log(`Alpha Vantage API Key: Configured (${ALPHAVANTAGE_API_KEY.substring(0, 5)}...)`);
});