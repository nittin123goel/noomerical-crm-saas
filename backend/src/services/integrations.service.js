const supabase = require('./supabase');

// Fetch an active integration's config for a tenant, or null if not configured/disabled.
async function getIntegration(tenantId, provider) {
  const { data } = await supabase
    .from('integrations')
    .select('config, is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  return data.config || {};
}

module.exports = { getIntegration };
