// Backend URL for secure proxy (never use direct Databricks connection from frontend)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

// Fetch triples at /latest endpoint via backend proxy
async function fetchLatestTriples() {
  console.log('📡 Fetching latest triples via backend proxy:', BACKEND_URL);
  const response = await fetch(`${BACKEND_URL}/latest`, {
    method: 'GET',
    headers: {
      'Accept': 'text/turtle'
    }
  });
  if (!response.ok) {
    throw new Error(`Error fetching latest triples: ${response.statusText}`);
  }
  const turtleText = await response.text();
  console.log('✅ Received triples data:', turtleText.substring(0, 100) + '...');
  return turtleText;
}

// Fetch triples at /pit?timestamp=... endpoint via backend proxy
async function fetchTriplesAtTimestamp(timestamp) {
  console.log('📡 Fetching triples at timestamp via backend proxy:', timestamp);
  const url = `${BACKEND_URL}/pit?timestamp=${encodeURIComponent(timestamp)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'text/turtle'
    }
  });
  if (!response.ok) {
    throw new Error(`Error fetching triples at timestamp: ${response.statusText}`);
  }
  const turtleText = await response.text();
  console.log('✅ Received triples data at timestamp:', turtleText.substring(0, 100) + '...');
  return turtleText;
}

export  {fetchTriplesAtTimestamp,fetchLatestTriples}