// DOM Elements
const locationTypeSelect = document.getElementById('location-type');
const globalCityGroup = document.getElementById('global-city-group');
const globalCitiesSelect = document.getElementById('global-cities');
const productSelect = document.getElementById('product');
const updateButton = document.getElementById('update-btn');
const weatherContainer = document.getElementById('weather-container');
const marketContainer = document.getElementById('market-container');
const planningContainer = document.getElementById('planning-container');

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Load data initially
  loadData();
  
  // Add event listener to update button
  updateButton.addEventListener('click', loadData);
});

// Get the current location value based on selected type
function getLocationValue() {
  return globalCitiesSelect.value || 'New York';
}

// Main function to load all data
async function loadData() {
  const location = getLocationValue();
  const product = productSelect.value || 'Corn';
  
  console.log('Loading data for:', location, 'and product:', product);
  
  // Show loading states
  weatherContainer.innerHTML = '<div class="loading">Loading weather data...</div>';
  marketContainer.innerHTML = '<div class="loading">Loading market data...</div>';
  planningContainer.innerHTML = '<div class="loading">Generating insights...</div>';
  
  // Load weather data
  try {
    console.log('Fetching weather data...');
    
    // Build weather API URL
    const weatherUrl = `/api/weather?location=${encodeURIComponent(location)}`;
    
    const weatherData = await fetchData(weatherUrl);
    console.log('Weather data received:', weatherData);
    displayWeatherData(weatherData);
  } catch (error) {
    console.error('Weather data error:', error);
    weatherContainer.innerHTML = `<div class="error">Failed to fetch weather data: ${error.message}</div>`;
  }
  
  // Load market data
  try {
    console.log('Fetching market data...');
    const marketData = await fetchData(`/api/market?symbol=${encodeURIComponent(product)}`);
    console.log('Market data received:', marketData);
    displayMarketData(marketData);
  } catch (error) {
    console.error('Market data error:', error);
    marketContainer.innerHTML = `<div class="error">Failed to load market data: ${error.message}</div>`;
  }
  
  // Load planning insights
  try {
    console.log('Fetching planning insights...');
    
    // Build planning API URL
    const planningUrl = `/api/planning?location=${encodeURIComponent(location)}&symbol=${encodeURIComponent(product)}`;
    
    const planningData = await fetchData(planningUrl);
    console.log('Planning data received:', planningData);
    displayPlanningInsights(planningData);
  } catch (error) {
    console.error('Planning insights error:', error);
    planningContainer.innerHTML = `<div class="error">Failed to generate planning insights: ${error.message}</div>`;
  }
}

// Generic fetch data function with better error handling
async function fetchData(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    console.log('Fetching from URL:', url);
    const response = await fetch(url, { signal: controller.signal });

    // Log response details for debugging
    console.log('Response status:', response.status);
    console.log('Response type:', response.headers.get('content-type'));

    // If response isn't OK, handle as an error
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        // Try to parse as JSON
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If not JSON, use text as is
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      throw new Error(errorData.error || errorData.details || `Request failed with status ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw error;
  } finally {
    clearTimeout(timeoutId); // Clear the timeout
  }
}

function displayWeatherData(data) {
  console.log('Displaying weather data');
  
  // Validate data structure
  if (!data || !data.current) {
    console.error('Invalid weather data structure:', data);
    weatherContainer.innerHTML = '<div class="error">No weather data available or invalid format</div>';
    return;
  }
  
  try {
    // Current weather HTML - simplified to remove details section
    let html = `
      <div class="weather-current">
        <div class="weather-temp">${data.current.temp_c || '0'}°C</div>
        <div class="weather-condition">${data.current.condition || 'Unknown'}</div>
        <div class="weather-location">${data.location?.name || 'Unknown'}, ${data.location?.country || 'Unknown'}</div>
      </div>
    `;
    
    // Update container
    weatherContainer.innerHTML = html;
    console.log('Weather data displayed successfully');
  } catch (error) {
    console.error('Error displaying weather data:', error);
    weatherContainer.innerHTML = '<div class="error">Error displaying weather data: ' + error.message + '</div>';
  }
}

// Display market data with improved error handling
function displayMarketData(data) {
  console.log('Displaying market data');

  if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
    console.error('Invalid market data structure:', data);
    marketContainer.innerHTML = `
      <div class="error">
        <p>No market data available for the selected product. Please try a different product or check back later.</p>
      </div>
    `;
    return;
  }

  try {
    // Format the date
    const formatMarketDate = (dateStr) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric'
        });
      } catch (e) {
        console.error('Date formatting error:', e);
        return 'Unknown Date';
      }
    };

    // Calculate price change with safety checks
    const latestPrice = data.data[data.data.length - 1]?.close || 0;
    const firstPrice = data.data[0]?.close || 0;
    const priceDiff = firstPrice !== 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
    const changeClass = priceDiff >= 0 ? 'positive' : 'negative';
    const changeSymbol = priceDiff >= 0 ? '+' : '';

    // Build HTML
    let html = `
      <div class="market-price">$${latestPrice.toFixed(2)}</div>
      <div class="market-change ${changeClass}">
        ${changeSymbol}${priceDiff.toFixed(2)}%
      </div>
      <div class="market-product">
        ${data.symbol || 'Unknown'} - Last ${data.data.length} trading days
      </div>
      
      <table class="market-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
            <th>Close</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Add table rows
    data.data.forEach(item => {
      if (!item) return; // Skip if item is null or undefined

      html += `
        <tr>
          <td>${formatMarketDate(item.date || 'Unknown')}</td>
          <td>$${(item.open || 0).toFixed(2)}</td>
          <td>$${(item.high || 0).toFixed(2)}</td>
          <td>$${(item.low || 0).toFixed(2)}</td>
          <td>$${(item.close || 0).toFixed(2)}</td>
          <td>${Number(item.volume || 0).toLocaleString()}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    // Update container
    marketContainer.innerHTML = html;
    console.log('Market data displayed successfully');
  } catch (error) {
    console.error('Error displaying market data:', error);
    marketContainer.innerHTML = '<div class="error">Error displaying market data: ' + error.message + '</div>';
  }
}

// Display planning insights with improved error handling
function displayPlanningInsights(data) {
  console.log('Displaying planning insights');
  
  if (!data || !data.insights || !Array.isArray(data.insights) || data.insights.length === 0) {
    console.error('Invalid planning data structure:', data);
    planningContainer.innerHTML = '<div class="error">No planning insights available or invalid format</div>';
    return;
  }
  
  try {
    // Title section
    let html = `
      <div class="planning-header">
        <p>Planning insights for ${data.product || 'Unknown'} in ${data.location || 'Unknown'}</p>
      </div>
    `;
    
    // Add all insights
    data.insights.forEach(insight => {
      if (!insight) return; // Skip if insight is null or undefined
      
      html += `
        <div class="insight ${insight.type || 'planning'}">
          <div class="insight-title">${insight.title || 'Insight'}</div>
          <div class="insight-description">${insight.description || 'No description available'}</div>
        </div>
      `;
    });
    
    // Update container
    planningContainer.innerHTML = html;
    console.log('Planning insights displayed successfully');
  } catch (error) {
    console.error('Error displaying planning insights:', error);
    planningContainer.innerHTML = '<div class="error">Error displaying planning insights: ' + error.message + '</div>';
  }
}