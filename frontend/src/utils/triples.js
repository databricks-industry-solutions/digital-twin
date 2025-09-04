// Fetch triples at /api/latest
async function fetchLatestTriples() {
  const response = await fetch(`${import.meta.env.VITE_APP_HOST}/api/latest`, {
    method: 'GET',
    headers: {
      'Accept': 'text/turtle'
    }
  });
  if (!response.ok) {
    throw new Error(`Error fetching latest triples: ${response.statusText}`);
  }
  const turtleText = await response.text();
  return turtleText;
}

// Fetch triples at /api/pit?timestamp=...
async function fetchTriplesAtTimestamp(timestamp) {
  const url = `${import.meta.env.VITE_APP_HOST}/api/pit?timestamp=${encodeURIComponent(timestamp)}`;
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
  return turtleText;
}

export  {fetchTriplesAtTimestamp,fetchLatestTriples}