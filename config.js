// ============================================================================
//  CONFIGURACIÓN DEL PANEL
// ============================================================================
//
//  Aquí es donde CONECTAS el dashboard con tu app (el poller + Supabase).
//
//  1. Pon DEMO_MODE en false.
//  2. Pega la URL de tu proyecto Supabase y la clave ANON (pública, la de
//     lectura desde el navegador — NO la service_role).
//  3. En Supabase activa políticas RLS de solo-lectura para estas tablas
//     (ver README, sección "Conectar el dashboard").
//
//  El poller (src/poller.ts) ESCRIBE a Supabase → este dashboard LEE de Supabase.
//  Los dos hablan con la misma base de datos; ese es el punto de conexión.
// ============================================================================

window.CONFIG = {
  // Déjalo en true hasta que el poller haya corrido al menos una vez (si no,
  // el panel sale vacío porque aún no hay datos). Luego ponlo en false.
  DEMO_MODE: false, // modo real (prueba con celular de Hector)

  // EPWQ-Main (ya configurado). La anon key es pública, es seguro tenerla aquí.
  SUPABASE_URL: "https://jcmbbkakqqdgtetjvhxu.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_VZW7cTkVSDYrfp4GbfTTDA_W5400EoJ",

  REFRESH_SECONDS: 4, // cada cuánto refresca el panel (bajo = más "tiempo real")
};
