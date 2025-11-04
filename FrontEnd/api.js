
const GRAPHQL_URL = 'http://localhost:4000/graphql';


async function graphqlRequest(query, variables = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); 

  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables }),
      mode: 'cors',
      signal: controller.signal
    });

    if (!res.ok) {

      let msg = `HTTP ${res.status}`;
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
      throw new Error(`Error de red: ${msg}`);
    }

    const payload = await res.json();

    if (payload.errors && payload.errors.length) {

      throw new Error(payload.errors.map(e => e.message).join(' | '));
    }

    return payload.data;
  } catch (err) {

    if (err.name === 'AbortError') {
      throw new Error('La solicitud excedió el tiempo de espera');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}


window.graphqlRequest = graphqlRequest;
