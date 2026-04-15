const API_BASE = 'http://localhost:8080/api';

// Helper for fetch with error handling
async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

// Dashboard (single call)
export const fetchDashboard = () => request('/dashboard');

// Tanks
export const fetchTanks = () => request('/tanks');
export const updateTankLevel = (tankCode, level) =>
  request(`/tanks/${tankCode}/level`, {
    method: 'PUT',
    body: JSON.stringify({ level }),
  });

// Flow Meters
export const fetchFlowMeters = () => request('/flowmeters');
export const updateFlowRate = (meterCode, flow) =>
  request(`/flowmeters/${meterCode}/flow`, {
    method: 'PUT',
    body: JSON.stringify({ flow }),
  });

// Valves
export const fetchValves = () => request('/valves');
export const toggleValve = (valveCode, open) =>
  request(`/valves/${valveCode}/toggle`, {
    method: 'PUT',
    body: JSON.stringify({ open }),
  });