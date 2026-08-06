export function subscribeToJobStream(jobId, onUpdate, onError) {
  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token');

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const url = token
    ? `${baseUrl}/jobs/${jobId}/stream?token=${encodeURIComponent(token)}`
    : `${baseUrl}/jobs/${jobId}/stream`;

  // Create EventSource connection
  const eventSource = new EventSource(url);

  eventSource.addEventListener('job_update', (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
      if (data.status === 'READY' || data.status === 'FAILED') {
        eventSource.close();
      }
    } catch (e) {
      console.error('Failed to parse SSE data:', e);
    }
  });

  eventSource.onerror = (err) => {
    console.error('SSE Job Stream Error:', err);
    if (onError) onError(err);
    eventSource.close();
  };

  return () => eventSource.close();
}
