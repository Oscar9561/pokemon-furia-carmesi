// ===================== CONEXIÓN CON EL RANKING MUNDIAL (Supabase) =====================
// Pega aquí los datos de tu proyecto de Supabase (Project Settings → API):
//   supabaseUrl:     la «Project URL» (https://xxxxxxxx.supabase.co)
//   supabaseAnonKey: la clave «anon public» (es pública a propósito: los datos los protegen las reglas del servidor).
// NUNCA pongas aquí la clave «service_role»: esa es secreta.
// Mientras estén vacíos, el multijugador funciona igual, con los puntos guardados solo en tu partida.
const ONLINE_CONFIG = {
    supabaseUrl: "https://zgmpeetwvyvvizygmurc.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbXBlZXR3dnl2dml6eWdtdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODQ4MDksImV4cCI6MjEwNzU2MDgwOX0.qAOc3Z_ddTwbHDKfxUDgKjvvTHg1n4vnzxcC2jNhqcU",
    // Opcional: servidores TURN para los jugadores cuya red no deja conectar directamente (algunos datos móviles).
    // Ejemplo: [{ urls: "turn:servidor:3478", username: "usuario", credential: "clave" }]
    iceServers: [],
};
