export function logInfo(message: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", message, timestamp: new Date().toISOString(), ...payload }));
}

export function logError(message: string, payload: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: "error", message, timestamp: new Date().toISOString(), ...payload }));
}
